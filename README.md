# Simple Chat App

A lightweight, real-time chat application perfect for homelab use. Features login authentication, multi-device support, and copy-paste functionality.

## Features

- **Simple Login**: Single password authentication configured via environment variable
- **Real-time Sync**: Messages instantly sync across all connected devices
- **Multi-device Support**: Each device gets a unique identifier
- **Copy-Paste Friendly**: Click any message to copy it to clipboard
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
   PORT=3000
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

## Security Notes

- Change the default password in `.env` before deployment
- The JWT secret can be customized via `JWT_SECRET` environment variable
- Messages are stored in memory only (lost on server restart)
- Designed for trusted homelab environments

## Environment Variables

- `CHAT_PASSWORD`: Authentication password (required)
- `PORT`: Server port (default: 3111)
- `JWT_SECRET`: JWT signing secret (auto-generated if not set)

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
