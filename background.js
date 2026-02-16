// Background service worker for the extension
// Handles background tasks and message passing

chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Screenshot Capture Extension Installed');
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateProgress') {
    // Forward progress updates to popup
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup might be closed, ignore error
    });
  }
  
  if (message.action === 'downloadZip') {
    // Handle ZIP download through Chrome downloads API
    return handleDownload(message.url, message.filename, sendResponse);
  }

  if (message.action === 'downloadFile') {
    return handleDownload(message.url, message.filename, sendResponse);
  }
  
  return true;
});

function handleDownload(url, filename, sendResponse) {
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download error:', chrome.runtime.lastError);
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      console.log('Download started with ID:', downloadId);
      sendResponse({ success: true, downloadId: downloadId });
    }
  });
  return true;
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes('youtube.com/watch')) {
    chrome.action.openPopup();
  }
});
