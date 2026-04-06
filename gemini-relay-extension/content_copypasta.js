console.log("Gemini Relay: copypasta script loaded");

let lastSentText = null;

// Listen for messages from Gemini
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'RECEIVE_FROM_GEMINI') {
        const inputField = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        
        if (inputField && sendBtn) {
            // Append Gemini prefix to make it obvious
            inputField.value = "Gemini: " + request.text;
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Allow a small delay for UI updates before clicking send
            setTimeout(() => {
                sendBtn.click();
            }, 100);
        } else {
            console.error("Gemini Relay: Input field or send button not found in copy_pasta!");
        }
    }
});

let isInitialLoad = true;
setTimeout(() => { isInitialLoad = false; }, 2000); // Ignore history load

// Observe new messages
const observeMessages = () => {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) {
        setTimeout(observeMessages, 1000);
        return;
    }
    
    console.log("Gemini Relay: observing messages");
    
    // We only want to send messages that the user typed.
    // The chat app adds `.message` elements for all users.
    // We can assume if the message starts with `@gemini `, we relay it.
    const observer = new MutationObserver((mutations) => {
        if (isInitialLoad) return;
        
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('message')) {
                        const textEl = node.querySelector('.message-text');
                        if (textEl) {
                            // The chat app replaces spaces with non-breaking spaces (\u00A0), we need to revert this for our check
                            const text = textEl.textContent.trim().replace(/\u00A0/g, ' ');
                            if (text.toLowerCase().startsWith('@gemini ')) {
                                const prompt = text.substring(8).trim();
                                if (prompt !== lastSentText) {
                                    lastSentText = prompt;
                                    console.log("Gemini Relay: Sending to Gemini ->", prompt);
                                    chrome.runtime.sendMessage({
                                        source: 'copypasta',
                                        type: 'SEND_TO_GEMINI',
                                        text: prompt
                                    });
                                }
                            }
                        }
                    }
                });
            }
        }
    });
    
    observer.observe(messagesContainer, { childList: true });
};

observeMessages();
