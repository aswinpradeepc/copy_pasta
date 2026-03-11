require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3111;
const CHAT_PASSWORD = process.env.CHAT_PASSWORD;

// In-memory message storage (for homelab use)
let messages = [];
let messageIdCounter = 1;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// JWT Secret (use a more secure secret in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_this';

// Routes
app.post('/login', (req, res) => {
    const { password } = req.body;
    
    if (!CHAT_PASSWORD) {
        return res.status(500).json({ error: 'Server not configured properly' });
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
    socket.on('message', (data) => {
        const message = {
            id: messageIdCounter++,
            text: data.text,
            deviceId: data.deviceId,
            timestamp: data.timestamp || new Date().toISOString()
        };
        
        messages.push(message);
        
        // Keep only last 100 messages to prevent memory issues
        if (messages.length > 100) {
            messages = messages.slice(-100);
        }
        
        // Broadcast to all connected clients
        io.emit('message', message);
        
        console.log(`Message from ${message.deviceId}: ${message.text}`);
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
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});
