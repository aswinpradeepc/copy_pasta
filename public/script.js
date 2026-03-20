class ChatApp {
    constructor() {
        this.socket = null;
        this.deviceId = this.generateDeviceId();
        this.selectedFiles = [];
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

        // File upload button
        const fileBtn = document.getElementById('file-btn');
        const fileInput = document.getElementById('file-input');
        
        if (fileBtn && fileInput) {
            fileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
            
            // Add touch support for mobile
            fileBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                fileInput.click();
            });
        }

        // Scroll to bottom button
        const messagesContainer = document.querySelector('.messages-container');
        const scrollBtn = document.getElementById('scroll-bottom-btn');
        
        if (messagesContainer && scrollBtn) {
            messagesContainer.addEventListener('scroll', () => {
                const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
                if (isNearBottom) {
                    scrollBtn.classList.add('hidden');
                } else {
                    scrollBtn.classList.remove('hidden');
                }
            });
            
            scrollBtn.addEventListener('click', () => {
                messagesContainer.scrollTo({
                    top: messagesContainer.scrollHeight,
                    behavior: 'smooth'
                });
            });
        }

        // Message input auto-focus and auto-resize
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            // Auto-resize textarea based on content
            messageInput.addEventListener('input', () => {
                messageInput.style.height = 'auto';
                messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
            });
            
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

        // Handle file upload if files are selected
        if (this.selectedFiles.length > 0) {
            await this.uploadFiles();
            return;
        }

        if (text && this.socket) {
            this.socket.emit('message', {
                text: text,
                deviceId: this.deviceId,
                timestamp: new Date().toISOString()
            });
            input.value = '';
            // Reset textarea height
            input.style.height = 'auto';
            input.focus();
        }
    }
    
    async uploadFiles() {
        if (this.selectedFiles.length === 0) return;
        
        const formData = new FormData();
        this.selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
                // Don't set Content-Type header, let browser set it with boundary
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Send message with file information
                this.socket.emit('message', {
                    text: '',
                    deviceId: this.deviceId,
                    timestamp: new Date().toISOString(),
                    files: result.files
                });
                
                // Clear file selection
                this.clearFileSelection();
            } else {
                const error = await response.json();
                console.error('Upload error response:', error);
                alert('Upload failed: ' + error.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed. Please try again.');
        }
    }
    
    clearFileSelection() {
        this.selectedFiles = [];
        const fileInput = document.getElementById('file-input');
        fileInput.value = '';
        document.getElementById('file-preview').classList.add('hidden');
        document.getElementById('file-preview').innerHTML = '';
    }

    displayMessage(message, container = null) {
        const messagesContainer = container || document.getElementById('messages');
        const scrollContainer = document.querySelector('.messages-container');
        
        const isNearBottom = scrollContainer ? (scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 150) : true;
        
        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        messageEl.dataset.messageId = message.id;
        
        const date = new Date(message.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString();
        
        let messageContent = '';
        
        // Add text content if present
        if (message.text) {
            messageContent += `<div class="message-text">${this.preserveWhitespace(this.escapeHtml(message.text))}</div>`;
        }
        
        // Add file attachments if present
        if (message.files && message.files.length > 0) {
            messageContent += '<div class="message-files">';
            message.files.forEach(file => {
                messageContent += this.createFileElement(file);
            });
            messageContent += '</div>';
        }
        
        messageEl.innerHTML = `
            ${messageContent}
            <div class="message-meta">
                <span>${dateStr} ${timeStr}</span>
                <span class="copy-hint">Copy</span>
            </div>
        `;

        let isTouch = false;
        let pressTimer;

        // Mobile long press logic
        const startPress = (e) => {
            isTouch = true;
            if (e.target.closest('.message-files') || e.target.closest('.download-btn')) return;
            pressTimer = window.setTimeout(() => {
                this.copyMessage(message.text, messageEl);
                if (navigator.vibrate) navigator.vibrate(50);
            }, 500); // 500ms for long press
        };

        const cancelPress = () => {
            if (pressTimer) clearTimeout(pressTimer);
        };

        messageEl.addEventListener('touchstart', startPress, { passive: true });
        messageEl.addEventListener('touchend', cancelPress);
        messageEl.addEventListener('touchmove', cancelPress, { passive: true });
        messageEl.addEventListener('touchcancel', cancelPress);
        
        messageEl.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.message-files') || e.target.closest('.download-btn')) return;
            if (isTouch) {
                e.preventDefault(); // Prevent native context menu on long press on mobile
            }
        });

        // Desktop click logic
        messageEl.addEventListener('click', (e) => {
            if (e.target.closest('.message-files') || e.target.closest('.download-btn')) return;
            
            // On mobile we rely on long press, so ignore clicks triggered by touch
            if (isTouch) {
                // reset isTouch so that if they use mouse later on the same device it works
                setTimeout(() => { isTouch = false; }, 500); 
                return;
            }
            
            e.preventDefault();
            this.copyMessage(message.text, messageEl);
        });
        
        messagesContainer.appendChild(messageEl);
        if (!container && scrollContainer) {
            const isFromMe = message.deviceId === this.deviceId;
            if (isFromMe || isNearBottom) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }

    displayMessages(messages) {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';
        
        messages.forEach(message => this.displayMessage(message));
        
        const scrollContainer = document.querySelector('.messages-container');
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
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
        if (copyHint) {
            copyHint.textContent = success ? 'Copied!' : 'Copy failed';
            
            setTimeout(() => {
                element.classList.remove('copied', 'copy-failed');
                copyHint.textContent = 'Copy';
            }, 2000);
        }
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

    handleFileSelect(files) {
        const filePreview = document.getElementById('file-preview');
        
        // Clear previous selection
        this.selectedFiles = [];
        filePreview.innerHTML = '';
        
        if (files.length === 0) {
            filePreview.classList.add('hidden');
            return;
        }
        
        filePreview.classList.remove('hidden');
        
        Array.from(files).forEach((file, index) => {
            // Check file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                alert(`File ${file.name} is too large. Maximum size is 10MB.`);
                return;
            }
            
            this.selectedFiles.push(file);
            
            const previewItem = document.createElement('div');
            previewItem.className = 'file-preview-item';
            
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-preview-info';
            
            const fileName = document.createElement('div');
            fileName.className = 'file-preview-name';
            fileName.textContent = file.name;
            
            const fileSize = document.createElement('div');
            fileSize.className = 'file-preview-size';
            fileSize.textContent = this.formatFileSize(file.size);
            
            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileSize);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'file-remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => this.removeFile(index);
            
            previewItem.appendChild(fileInfo);
            previewItem.appendChild(removeBtn);
            filePreview.appendChild(previewItem);
        });
    }
    
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        
        // Update file input
        const fileInput = document.getElementById('file-input');
        const dt = new DataTransfer();
        this.selectedFiles.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;
        
        // Update preview
        this.handleFileSelect(fileInput.files);
    }
    
    createFileElement(file) {
        const isImage = file.mimetype.startsWith('image/');
        const fileUrl = file.url.startsWith('/') ? file.url : `/${file.url}`;
        
        if (isImage) {
            const element = `
                <div class="message-file message-image">
                    <img src="${fileUrl}" alt="${file.originalName}" loading="lazy" 
                         onclick="window.open('${fileUrl}', '_blank')" 
                         style="max-width: 200px; max-height: 200px; border-radius: 4px; cursor: pointer;">
                    <div class="file-info">
                        <div class="file-name">${file.originalName}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                        <a href="${fileUrl}" download="${file.originalName}" class="download-btn" onclick="event.stopPropagation()">⬇ Download</a>
                    </div>
                </div>
            `;
            return element;
        } else {
            const icon = this.getFileIcon(file.mimetype);
            const element = `
                <div class="message-file message-document">
                    <div class="file-content">
                        <div class="file-link" onclick="window.open('${fileUrl}', '_blank')">
                            <span class="file-icon">${icon}</span>
                            <div class="file-info">
                                <div class="file-name">${file.originalName}</div>
                                <div class="file-size">${this.formatFileSize(file.size)}</div>
                            </div>
                        </div>
                        <a href="${fileUrl}" download="${file.originalName}" class="download-btn" onclick="event.stopPropagation()">⬇ Download</a>
                    </div>
                </div>
            `;
            return element;
        }
    }
    
    getFileIcon(mimetype) {
        const icons = {
            'application/pdf': '📄',
            'text/plain': '📝',
            'application/msword': '📄',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📄',
            'application/zip': '📦'
        };
        return icons[mimetype] || '📎';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    preserveWhitespace(text) {
        return text.replace(/ /g, '\u00A0').replace(/\t/g, '\u0009');
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
