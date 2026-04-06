let geminiTabId = null;
let copypastaTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.source === 'copypasta' && request.type === 'SEND_TO_GEMINI') {
    copypastaTabId = sender.tab ? sender.tab.id : null;
    
    chrome.tabs.query({ url: "*://gemini.google.com/*" }, (tabs) => {
      if (tabs.length > 0) {
        geminiTabId = tabs[0].id;
        chrome.tabs.sendMessage(geminiTabId, { type: 'RECEIVE_FROM_COPYPASTA', text: request.text });
      } else {
        console.error("Gemini Relay: No Gemini tab found!");
      }
    });

  } else if (request.source === 'gemini' && request.type === 'RECEIVE_FROM_GEMINI') {
    geminiTabId = sender.tab ? sender.tab.id : null;
    
    chrome.tabs.query({ url: "*://schat.aswinpradeepc.com/*" }, (tabs) => {
      if (tabs.length > 0) {
        copypastaTabId = tabs[0].id;
        chrome.tabs.sendMessage(copypastaTabId, { type: 'RECEIVE_FROM_GEMINI', text: request.text });
      } else {
        console.error("Gemini Relay: No copypasta tab found!");
      }
    });
  }
});
