console.log("Gemini Relay: Gemini script loaded");

let lastResponse = null;

function findInput() {
    return document.querySelector('rich-textarea p') || document.querySelector('p[data-placeholder]') || document.querySelector('.ql-editor');
}

function findSubmitBtn() {
    return document.querySelector('button[aria-label="Send message"]') || document.querySelector('.send-button');
}

async function simulatePasting(input, text) {
    input.focus();
    
    // Simulate time taken to "read" the prompt from the other window
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1500) + 1000));

    // Inserting large blocks of text as a single action acts just like a user doing Ctrl+V.
    // Typing single characters rapidly often breaks the complex rich-text editor state in modern web apps.
    document.execCommand('insertText', false, text);

    // Simulate time taken to move mouse to the send button and click
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 800) + 400));
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'RECEIVE_FROM_COPYPASTA') {
        console.log("Gemini Relay: Received from copypasta", request.text);
        const input = findInput();
        if (input) {
            simulatePasting(input, request.text).then(() => {
                const btn = findSubmitBtn();
                if (btn) btn.click();
            });
        } else {
             console.log("Gemini Relay: Gemini input not found!");
        }
    }
});

let typingTimer;

const observer = new MutationObserver((mutations) => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        // Assume generation finished if no DOM changes for 1.5 seconds.
        checkForNewResponse();
    }, 1500);
});

observer.observe(document.body, { childList: true, subtree: true, characterData: true });

function checkForNewResponse() {
    const messageBlocks = document.querySelectorAll('message-content, .message-content, .model-response-text');
    if (messageBlocks.length > 0) {
        const lastBlock = messageBlocks[messageBlocks.length - 1];
        const text = lastBlock.innerText.trim();
        
        if (text && text !== lastResponse && text.length > 0) {
            lastResponse = text;
            console.log("Gemini Relay: Sending response back", text);
            chrome.runtime.sendMessage({
                source: 'gemini',
                type: 'RECEIVE_FROM_GEMINI',
                text: text
            });
        }
    }
}
