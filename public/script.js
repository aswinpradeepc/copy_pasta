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

        // Search form
        const searchBtn = document.getElementById('search-btn');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        const searchInput = document.getElementById('search-input');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }
        
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => this.clearSearch());
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearch();
                }
            });
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

        this.socket.on('search_results', (results) => {
            this.displaySearchResults(results);
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

    displayMessage(message, container = null) {
        const messagesContainer = container || document.getElementById('messages');
        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        messageEl.dataset.messageId = message.id;
        
        const date = new Date(message.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString();
        
        messageEl.innerHTML = `
            <div class="message-text">${this.escapeHtml(message.text)}</div>
            <div class="message-meta">
                <span>${dateStr} ${timeStr}</span>
                <span class="copy-hint">Tap to copy</span>
            </div>
        `;

        // Handle both click and touch events for mobile compatibility
        const copyHandler = (e) => {
            e.preventDefault();
            this.copyMessage(message.text, messageEl);
        };
        
        messageEl.addEventListener('click', copyHandler);
        messageEl.addEventListener('touchstart', copyHandler);
        
        messagesContainer.appendChild(messageEl);
        if (!container) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    displayMessages(messages) {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';
        
        messages.forEach(message => this.displayMessage(message));
    }

    async copyMessage(text, element) {
        try {
            // Fallback for mobile browsers that don't support clipboard API
            if (!navigator.clipboard) {
                // Create temporary textarea element
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    document.execCommand('copy');
                    this.showCopyFeedback(element, true);
                } catch (err) {
                    console.error('Fallback copy failed:', err);
                    this.showCopyFeedback(element, false);
                }
                
                document.body.removeChild(textArea);
                return;
            }
            
            // Modern clipboard API
            await navigator.clipboard.writeText(text);
            this.showCopyFeedback(element, true);
        } catch (err) {
            console.error('Failed to copy text:', err);
            this.showCopyFeedback(element, false);
        }
    }
    
    showCopyFeedback(element, success) {
        // Visual feedback
        element.classList.add(success ? 'copied' : 'copy-failed');
        const copyHint = element.querySelector('.copy-hint');
        copyHint.textContent = success ? 'Copied!' : 'Copy failed';
        
        setTimeout(() => {
            element.classList.remove('copied', 'copy-failed');
            copyHint.textContent = 'Tap to copy';
        }, 2000);
    }

    handleSearch() {
        const searchInput = document.getElementById('search-input');
        const keyword = searchInput.value.trim();
        
        if (keyword && this.socket) {
            this.socket.emit('search', { keyword });
            
            // Show loading state
            const resultsInfo = document.getElementById('search-results-info');
            resultsInfo.textContent = 'Searching...';
            resultsInfo.classList.remove('hidden');
        }
    }

    clearSearch() {
        document.getElementById('search-input').value = '';
        document.getElementById('search-results').classList.add('hidden');
        document.getElementById('search-results-info').classList.add('hidden');
        document.getElementById('clear-search-btn').classList.add('hidden');
        document.getElementById('messages').classList.remove('hidden');
    }

    displaySearchResults(results) {
        const searchResults = document.getElementById('search-results');
        const searchResultsInfo = document.getElementById('search-results-info');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        const messages = document.getElementById('messages');
        
        // Clear previous results
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            searchResultsInfo.textContent = 'No messages found';
        } else {
            searchResultsInfo.textContent = `Found ${results.length} message${results.length === 1 ? '' : 's'}`;
            
            // Add header
            const header = document.createElement('div');
            header.className = 'search-results-header';
            header.textContent = 'Search Results';
            searchResults.appendChild(header);
            
            // Display results
            results.forEach(message => {
                this.displayMessage(message, searchResults);
            });
        }
        
        // Show results and hide main messages
        searchResults.classList.remove('hidden');
        searchResultsInfo.classList.remove('hidden');
        clearSearchBtn.classList.remove('hidden');
        messages.classList.add('hidden');
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
