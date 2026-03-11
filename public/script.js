class ChatApp {
    constructor() {
        this.socket = null;
        this.deviceId = this.generateDeviceId();
        this.init();
    }

    generateDeviceId() {
        return 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Message form
        const messageForm = document.getElementById('message-form');
        if (messageForm) {
            messageForm.addEventListener('submit', (e) => this.handleMessage(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Message input auto-focus
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleMessage(e);
                }
            });
        }
    }

    checkAuth() {
        const token = localStorage.getItem('chatToken');
        if (token) {
            this.showChat();
            this.connectSocket();
        } else {
            this.showLogin();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('chatToken', data.token);
                this.showChat();
                this.connectSocket();
                errorDiv.textContent = '';
            } else {
                errorDiv.textContent = data.error || 'Login failed';
            }
        } catch (err) {
            errorDiv.textContent = 'Connection error';
        }
    }

    handleLogout() {
        localStorage.removeItem('chatToken');
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.showLogin();
    }

    showLogin() {
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('chat-container').classList.add('hidden');
    }

    showChat() {
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('chat-container').classList.remove('hidden');
        this.updateDeviceInfo();
        document.getElementById('message-input').focus();
    }

    updateDeviceInfo() {
        const deviceInfo = document.getElementById('device-info');
        const userAgent = navigator.userAgent;
        let deviceType = 'Unknown';
        
        if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
            deviceType = 'Mobile';
        } else if (/Tablet|iPad/.test(userAgent)) {
            deviceType = 'Tablet';
        } else {
            deviceType = 'Desktop';
        }
        
        deviceInfo.textContent = `${deviceType} • ${this.deviceId.substr(-6)}`;
    }

    connectSocket() {
        const token = localStorage.getItem('chatToken');
        this.socket = io({
            auth: {
                token: token,
                deviceId: this.deviceId
            }
        });

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.loadMessages();
        });

        this.socket.on('message', (message) => {
            this.displayMessage(message);
        });

        this.socket.on('messages', (messages) => {
            this.displayMessages(messages);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('auth_error', (error) => {
            console.error('Authentication error:', error);
            this.handleLogout();
        });
    }

    async handleMessage(e) {
        e.preventDefault();
        const input = document.getElementById('message-input');
        const text = input.value.trim();

        if (text && this.socket) {
            this.socket.emit('message', {
                text: text,
                deviceId: this.deviceId,
                timestamp: new Date().toISOString()
            });
            input.value = '';
            input.focus();
        }
    }

    displayMessage(message) {
        const messagesContainer = document.getElementById('messages');
        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        messageEl.dataset.messageId = message.id;
        
        const date = new Date(message.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageEl.innerHTML = `
            <div class="message-text">${this.escapeHtml(message.text)}</div>
            <div class="message-meta">
                <span>${timeStr}</span>
                <span class="copy-hint">Click to copy</span>
            </div>
        `;

        messageEl.addEventListener('click', () => this.copyMessage(message.text, messageEl));
        
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    displayMessages(messages) {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';
        
        messages.forEach(message => this.displayMessage(message));
    }

    async copyMessage(text, element) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback
            element.classList.add('copied');
            const copyHint = element.querySelector('.copy-hint');
            copyHint.textContent = 'Copied!';
            
            setTimeout(() => {
                element.classList.remove('copied');
                copyHint.textContent = 'Click to copy';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    }

    loadMessages() {
        if (this.socket) {
            this.socket.emit('load_messages');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
