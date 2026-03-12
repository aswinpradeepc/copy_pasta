# Simple Chat App

A lightweight, real-time chat application perfect for homelab use. Features login authentication, multi-device support, and copy-paste functionality.

## Features

- **Simple Login**: Single password authentication configured via environment variable
- **Real-time Sync**: Messages instantly sync across all connected devices
- **Multi-device Support**: Each device gets a unique identifier
- **Copy-Paste Friendly**: Click any message to copy it to clipboard
- **Code Indentation Support**: Preserves indentation in code snippets and formatted text
- **File & Image Sharing**: Upload and share files with preview functionality
- **Optional Message Logging**: Configure whether to persist messages to disk
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Lightweight**: Minimal dependencies and resource usage
- **Memory Efficient**: Keeps only last 100 messages in memory

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure password**:
   Edit `.env` file and set your secure password:
   ```
   CHAT_PASSWORD=your_secure_password_here
   PORT=3111
   ENABLE_MESSAGE_LOGGING=true
   JWT_SECRET=your_jwt_secret_key
   ```

3. **Start the server**:
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Access the app**:
   Open your browser and navigate to `http://localhost:3111`

## Usage

1. Login with the password you set in `.env`
2. The app will assign a unique device ID to each device
3. Type messages and hit Enter or click Send
4. Messages sync in real-time across all connected devices
5. Click any message to copy it to the clipboard
6. Device type and partial ID shown in header
7. **File Sharing**: Click the 📎 button to attach files (images, PDFs, documents, ZIP files)
8. **File Limits**: Maximum 10MB per file, 5 files per message
9. **Supported Formats**: Images (JPG, PNG, GIF, WebP), PDF, TXT, Word docs, ZIP
10. **Download**: Click the download button on any shared file to save it

## Security Notes

- Change the default password in `.env` before deployment
- The JWT secret can be customized via `JWT_SECRET` environment variable
- Messages are stored in memory only (lost on server restart)
- Designed for trusted homelab environments

## Environment Variables

- `CHAT_PASSWORD`: Authentication password (required)
- `PORT`: Server port (default: 3111)
- `ENABLE_MESSAGE_LOGGING`: Whether to persist messages to disk (default: true)
- `JWT_SECRET`: JWT signing secret (auto-generated if not set)
- `MAX_FILE_SIZE`: Maximum file size in bytes (default: 10485760 = 10MB)

### Message Logging Control

Set `ENABLE_MESSAGE_LOGGING=false` to disable message persistence. When disabled:
- Messages are only stored in memory
- Messages are lost when the server restarts
- Search functionality only works on current session messages
- No message files are created on disk

### File Sharing Configuration

- **File Size Limit**: 10MB per file (configurable via MAX_FILE_SIZE)
- **Files Per Message**: Maximum 5 files
- **Storage Location**: Files are stored in `/uploads` directory
- **Security**: File type validation and size limits enforced
- **Cleanup**: Consider implementing automated cleanup for old files

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Authentication**: JWT tokens
- **Real-time**: WebSocket connections

## Development

The project structure:
```
├── public/
│   ├── index.html    # Main HTML page
│   ├── style.css     # Responsive styles
│   └── script.js     # Client-side JavaScript
├── server.js         # Node.js server
├── package.json      # Dependencies
└── .env             # Environment variables
```

Perfect for personal use, family communication, or testing homelab setups!
