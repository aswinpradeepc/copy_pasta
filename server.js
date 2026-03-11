require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["https://schat.aswinpradeepc.com", "http://localhost:3111"],
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3111;
const CHAT_PASSWORD = process.env.CHAT_PASSWORD;

// File-based message storage
const MESSAGES_DIR = path.join(__dirname, 'messages');
const MESSAGES_PER_FILE = 50;
let messages = []; // Current messages in memory
let messageIdCounter = 1;
let currentFileIndex = 0;

// Ensure messages directory exists
async function ensureMessagesDir() {
    try {
        await fs.mkdir(MESSAGES_DIR, { recursive: true });
        await loadLatestMessages();
    } catch (error) {
        console.error('Error creating messages directory:', error);
    }
}

// Load latest messages from files
async function loadLatestMessages() {
    try {
        const files = await fs.readdir(MESSAGES_DIR);
        const messageFiles = files.filter(f => f.startsWith('messages_') && f.endsWith('.json'));
        
        if (messageFiles.length > 0) {
            // Sort by file index to get the latest
            messageFiles.sort((a, b) => {
                const aIndex = parseInt(a.match(/messages_(\d+)\.json/)[1]);
                const bIndex = parseInt(b.match(/messages_(\d+)\.json/)[1]);
                return bIndex - aIndex;
            });
            
            // Load the most recent file
            const latestFile = messageFiles[0];
            const filePath = path.join(MESSAGES_DIR, latestFile);
            const fileContent = await fs.readFile(filePath, 'utf8');
            const fileMessages = JSON.parse(fileContent);
            
            messages = fileMessages;
            currentFileIndex = parseInt(latestFile.match(/messages_(\d+)\.json/)[1]);
            
            // Update message counter
            if (messages.length > 0) {
                messageIdCounter = Math.max(...messages.map(m => m.id)) + 1;
            }
        }
    } catch (error) {
        console.log('No existing message files found, starting fresh');
    }
}

// Save messages to file
async function saveMessagesToFile() {
    try {
        if (messages.length === 0) return;
        
        const fileName = `messages_${currentFileIndex}.json`;
        const filePath = path.join(MESSAGES_DIR, fileName);
        await fs.writeFile(filePath, JSON.stringify(messages, null, 2));
        console.log(`Saved ${messages.length} messages to ${fileName}`);
    } catch (error) {
        console.error('Error saving messages:', error);
    }
}

// Rotate to new file when needed
async function rotateMessageFile() {
    try {
        currentFileIndex++;
        messages = [];
        console.log(`Rotated to new message file: messages_${currentFileIndex}.json`);
    } catch (error) {
        console.error('Error rotating message file:', error);
    }
}

// Search messages across all files
async function searchMessages(keyword) {
    try {
        const files = await fs.readdir(MESSAGES_DIR);
        const messageFiles = files.filter(f => f.startsWith('messages_') && f.endsWith('.json'));
        let allResults = [];
        
        for (const file of messageFiles) {
            const filePath = path.join(MESSAGES_DIR, file);
            const fileContent = await fs.readFile(filePath, 'utf8');
            const fileMessages = JSON.parse(fileContent);
            
            const results = fileMessages.filter(msg => 
                msg.text.toLowerCase().includes(keyword.toLowerCase())
            );
            
            allResults = allResults.concat(results);
        }
        
        // Sort by timestamp (newest first)
        allResults.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return allResults;
    } catch (error) {
        console.error('Error searching messages:', error);
        return [];
    }
}

// Rate limiting for login
const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // limit each IP to 30 requests per windowMs
    message: { error: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// JWT Secret (use a more secure secret in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_this';

// Routes
app.post('/login', loginLimiter, (req, res) => {
    const { password } = req.body;
    
    if (!CHAT_PASSWORD || CHAT_PASSWORD === 'your_secure_password_here') {
        console.warn('WARNING: Please set a custom CHAT_PASSWORD in .env file!');
    }
    
    if (password === CHAT_PASSWORD) {
        const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Socket.IO authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        return next(new Error('Authentication error'));
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Authentication error'));
        }
        socket.authenticated = true;
        socket.deviceId = socket.handshake.auth.deviceId || 'unknown';
        next();
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.deviceId}`);
    
    // Send existing messages to new client
    socket.emit('messages', messages);
    
    // Handle new messages
    socket.on('message', async (data) => {
        const message = {
            id: messageIdCounter++,
            text: data.text,
            deviceId: data.deviceId,
            timestamp: data.timestamp || new Date().toISOString()
        };
        
        messages.push(message);
        
        // Rotate file if we've reached the limit
        if (messages.length >= MESSAGES_PER_FILE) {
            await saveMessagesToFile();
            await rotateMessageFile();
        }
        
        // Auto-save every 10 messages
        if (messages.length % 10 === 0) {
            await saveMessagesToFile();
        }
        
        // Broadcast to all connected clients
        io.emit('message', message);
        
        console.log(`Message from ${message.deviceId}: ${message.text}`);
    });
    
    // Handle search requests
    socket.on('search', async (data) => {
        const results = await searchMessages(data.keyword);
        socket.emit('search_results', results);
    });
    
    // Handle load messages request
    socket.on('load_messages', () => {
        socket.emit('messages', messages);
    });
    
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.deviceId}`);
    });
    
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        messageCount: messages.length,
        connectedClients: io.engine.clientsCount 
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Simple Chat Server running on port ${PORT}`);
    console.log(`Access at: http://localhost:${PORT}`);
    
    if (!CHAT_PASSWORD || CHAT_PASSWORD === 'your_secure_password_here') {
        console.warn('WARNING: Please set CHAT_PASSWORD in .env file!');
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await saveMessagesToFile();
    server.close(() => {
        console.log('Process terminated');
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await saveMessagesToFile();
    server.close(() => {
        console.log('Process terminated');
    });
});

// Initialize
ensureMessagesDir();
