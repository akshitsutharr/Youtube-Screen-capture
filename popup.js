let isCapturing = false;
let selectedQuality = 0.9;

async function ensureContentScript(tabId) {
  const ping = () => new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(false);
        return;
      }
      resolve(Boolean(response && response.ok));
    });
  });

  if (await ping()) {
    return true;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
  } catch (error) {
    console.error('Inject content script failed:', error);
    return false;
  }

  return await ping();
}

async function getVideoDurationFromTab(tabId) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, { action: 'getVideoDuration' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Duration message error:', chrome.runtime.lastError);
        resolve(0);
        return;
      }
      resolve(response && response.duration ? Math.floor(response.duration) : 0);
    });
  });
}

// Time parsing helper
function parseTimeToSeconds(timeStr) {
  const parts = timeStr.trim().split(':').map(p => parseInt(p) || 0);
  
  if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  return 0;
}

// Format seconds to readable time
function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update estimates
function updateEstimates() {
  const startTime = parseTimeToSeconds(document.getElementById('start-time').value);
  const endTime = parseTimeToSeconds(document.getElementById('end-time').value);
  const interval = parseInt(document.getElementById('interval').value) || 10;
  
  if (endTime <= startTime) {
    document.getElementById('estimated-count').textContent = '0';
    document.getElementById('estimated-size').textContent = '~0 MB';
    return;
  }
  
  const duration = endTime - startTime;
  const count = Math.floor(duration / interval);
  const estimatedSizeMB = (count * 0.3 * selectedQuality).toFixed(1); // Rough estimate
  
  document.getElementById('estimated-count').textContent = count;
  document.getElementById('estimated-size').textContent = `~${estimatedSizeMB} MB`;
}

// Check if on YouTube
async function checkYouTube() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab && tab.url && tab.url.includes('youtube.com/watch')) {
    document.getElementById('not-youtube').style.display = 'none';
    document.getElementById('youtube-interface').style.display = 'block';

    const ready = await ensureContentScript(tab.id);
    if (!ready) {
      document.getElementById('status').textContent = 'Reload the page and try again';
      document.getElementById('status').className = 'value';
      return;
    }

    const duration = await getVideoDurationFromTab(tab.id);
    if (duration > 0) {
      document.getElementById('video-duration').textContent = formatTime(duration);
      document.getElementById('end-time').value = formatTime(duration);
      updateEstimates();
    }
  } else {
    document.getElementById('not-youtube').style.display = 'flex';
    document.getElementById('youtube-interface').style.display = 'none';
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  checkYouTube();
  
  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('interval').value = btn.dataset.value;
      updateEstimates();
    });
  });
  
  // Quality buttons
  document.querySelectorAll('.quality-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedQuality = parseFloat(btn.dataset.quality);
      updateEstimates();
    });
  });
  
  // Update estimates on input change
  document.getElementById('start-time').addEventListener('input', updateEstimates);
  document.getElementById('end-time').addEventListener('input', updateEstimates);
  document.getElementById('interval').addEventListener('input', updateEstimates);
  
  // Start capture button
  document.getElementById('start-capture').addEventListener('click', startCapture);
  
  // Stop capture button
  document.getElementById('stop-capture').addEventListener('click', stopCapture);
});

async function startCapture() {
  const startTime = parseTimeToSeconds(document.getElementById('start-time').value);
  let endTime = parseTimeToSeconds(document.getElementById('end-time').value);
  const interval = parseInt(document.getElementById('interval').value) || 10;
  
  if (interval < 1) {
    alert('Interval must be at least 1 second!');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    alert('Unable to access the active tab.');
    return;
  }

  const ready = await ensureContentScript(tab.id);
  if (!ready) {
    alert('Unable to connect to the YouTube page. Please reload the tab and try again.');
    return;
  }

  const duration = await getVideoDurationFromTab(tab.id);
  if (endTime <= 0 && duration > 0) {
    endTime = duration;
    document.getElementById('end-time').value = formatTime(duration);
  }

  if (endTime <= startTime && duration > startTime) {
    endTime = duration;
    document.getElementById('end-time').value = formatTime(duration);
  }

  if (endTime <= startTime) {
    alert('End time must be greater than start time!');
    return;
  }

  isCapturing = true;

  // UI updates
  document.getElementById('start-capture').style.display = 'none';
  document.getElementById('stop-capture').style.display = 'flex';
  document.getElementById('progress-section').style.display = 'block';
  document.getElementById('status').textContent = 'Processing...';
  document.getElementById('status').className = 'value status-processing';

  const totalScreenshots = Math.floor((endTime - startTime) / interval);

  document.getElementById('total-screenshots').textContent = totalScreenshots;
  document.getElementById('current-screenshot').textContent = '0';
  document.getElementById('progress-fill').style.width = '0%';
  document.getElementById('progress-percent').textContent = '0%';
  
  try {
    // Determine if we need chunking (videos > 1 hour)
    const CHUNK_DURATION = 3600; // 1 hour
    const needsChunking = (endTime - startTime) > CHUNK_DURATION;
    
    if (needsChunking) {
      // Process in chunks
      const chunks = [];
      let chunkStart = startTime;
      
      while (chunkStart < endTime) {
        const chunkEnd = Math.min(chunkStart + CHUNK_DURATION, endTime);
        chunks.push({ start: chunkStart, end: chunkEnd });
        chunkStart = chunkEnd;
      }
      
      for (let i = 0; i < chunks.length; i++) {
        if (!isCapturing) break;
        
        const chunk = chunks[i];
        document.getElementById('progress-text').textContent = 
          `Processing chunk ${i + 1}/${chunks.length} (${formatTime(chunk.start)} - ${formatTime(chunk.end)})`;
        
        await processChunk(tab.id, chunk.start, chunk.end, interval, i + 1, chunks.length);
        
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      // Process entire video at once
      await processChunk(tab.id, startTime, endTime, interval, 1, 1);
    }
    
    if (isCapturing) {
      document.getElementById('status').textContent = 'Completed! Check your Downloads folder.';
      document.getElementById('status').className = 'value status-completed';
      document.getElementById('progress-text').textContent = 'Complete! ZIP file downloaded.';
    } else {
      document.getElementById('status').textContent = 'Stopped';
      document.getElementById('status').className = 'value';
    }
  } catch (error) {
    console.error('Capture error:', error);
    document.getElementById('status').textContent = 'Error occurred';
    document.getElementById('status').className = 'value';
    document.getElementById('progress-text').textContent = `Error: ${error.message}`;
    alert(`Error during capture: ${error.message}\n\nPlease try again or use a smaller time range/longer interval.`);
  }
  
  isCapturing = false;
  document.getElementById('start-capture').style.display = 'flex';
  document.getElementById('stop-capture').style.display = 'none';
}

async function processChunk(tabId, startTime, endTime, interval, chunkNum, totalChunks) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, {
      action: 'captureScreenshots',
      startTime: startTime,
      endTime: endTime,
      interval: interval,
      quality: selectedQuality,
      chunkNum: chunkNum,
      totalChunks: totalChunks
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Message error:', chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      if (response && response.success) {
        resolve();
      } else {
        console.error('Capture failed:', response);
        reject(new Error(response?.error || 'Capture failed'));
      }
    });
    
    // Listen for progress updates
    const progressListener = (message) => {
      if (message.action === 'updateProgress') {
        const percent = Math.round(message.progress);
        document.getElementById('progress-fill').style.width = `${percent}%`;
        document.getElementById('progress-percent').textContent = `${percent}%`;
        document.getElementById('current-screenshot').textContent = message.current;
        
        // Update progress text if message included
        if (message.message) {
          document.getElementById('progress-text').textContent = message.message;
        }
        
        if (message.progress >= 100) {
          chrome.runtime.onMessage.removeListener(progressListener);
        }
      }
    };
    
    chrome.runtime.onMessage.addListener(progressListener);
  });
}

function stopCapture() {
  isCapturing = false;
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'stopCapture' });
    }
  });
  
  document.getElementById('start-capture').style.display = 'flex';
  document.getElementById('stop-capture').style.display = 'none';
  document.getElementById('status').textContent = 'Stopped';
  document.getElementById('status').className = 'value';
}
