let isCapturing = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ ok: true });
    return true;
  }
  if (message.action === 'getVideoDuration') {
    const video = document.querySelector('video');
    if (video) {
      sendResponse({ duration: video.duration });
    } else {
      sendResponse({ duration: 0 });
    }
    return true;
  }
  
  if (message.action === 'captureScreenshots') {
    isCapturing = true;
    captureScreenshots(
      message.startTime,
      message.endTime,
      message.interval,
      message.quality,
      message.chunkNum,
      message.totalChunks
    ).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      console.error('Capture error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (message.action === 'stopCapture') {
    isCapturing = false;
    sendResponse({ success: true });
    return true;
  }
});

async function captureScreenshots(startTime, endTime, interval, quality, chunkNum, totalChunks) {
  const video = document.querySelector('video');
  if (!video) {
    throw new Error('Video element not found');
  }
  
  // Create canvas for capturing
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size to video dimensions
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const screenshots = [];
  const duration = endTime - startTime;
  const totalScreenshots = Math.floor(duration / interval);
  
  // Pause video if playing
  const wasPlaying = !video.paused;
  if (wasPlaying) {
    video.pause();
  }
  
  // Store original volume and mute
  const originalVolume = video.volume;
  video.volume = 0;
  
  let currentIndex = 0;
  
  // Capture all screenshots first
  for (let time = startTime; time < endTime && isCapturing; time += interval) {
    currentIndex++;
    
    // Seek to time
    video.currentTime = time;
    
    // Wait for video to seek
    await new Promise((resolve) => {
      let seeked = false;
      const checkSeek = () => {
        if (!seeked && (Math.abs(video.currentTime - time) < 0.5 || !isCapturing)) {
          seeked = true;
          video.removeEventListener('seeked', checkSeek);
          resolve();
        }
      };
      video.addEventListener('seeked', checkSeek);
      
      // Timeout fallback
      setTimeout(() => {
        if (!seeked) {
          seeked = true;
          video.removeEventListener('seeked', checkSeek);
          resolve();
        }
      }, 2000);
    });
    
    if (!isCapturing) break;
    
    // Small delay to ensure frame is rendered
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Capture frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    
    const timestamp = formatTimestamp(time);
    screenshots.push({
      blob: blob,
      filename: `screenshot_${timestamp}.jpg`,
      time: time
    });
    
    // Update progress
    const progress = (currentIndex / totalScreenshots) * 100;
    chrome.runtime.sendMessage({
      action: 'updateProgress',
      progress: progress,
      current: currentIndex,
      total: totalScreenshots
    });
    
    // Small delay between captures to prevent overload
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Restore video state
  video.volume = originalVolume;
  if (wasPlaying && isCapturing) {
    video.play();
  }
  
  // Create and download ZIP file if we have screenshots
  if (screenshots.length > 0 && isCapturing) {
    await createAndDownloadZip(screenshots, chunkNum, totalChunks, startTime, endTime);
  }
}

function formatTimestamp(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}h${mins.toString().padStart(2, '0')}m${secs.toString().padStart(2, '0')}s`;
  }
  return `${mins}m${secs.toString().padStart(2, '0')}s`;
}

async function createAndDownloadZip(screenshots, chunkNum, totalChunks, startTime, endTime) {
  try {
    console.log('Creating ZIP file with', screenshots.length, 'screenshots...');

    const folderName = `screenshots_${formatTimestamp(startTime)}_to_${formatTimestamp(endTime)}`;
    const files = [];

    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];
      files.push({
        name: `${folderName}/${screenshot.filename}`,
        blob: screenshot.blob
      });

      if (i % 10 === 0) {
        chrome.runtime.sendMessage({
          action: 'updateProgress',
          progress: 100,
          current: screenshots.length,
          total: screenshots.length,
          message: `Preparing ZIP... ${i}/${screenshots.length}`
        });
      }
    }

    const info = `YouTube Screenshot Capture

Capture Information:
- Start Time: ${formatTimestamp(startTime)}
- End Time: ${formatTimestamp(endTime)}
- Total Screenshots: ${screenshots.length}
- Chunk: ${chunkNum} of ${totalChunks}
- Captured: ${new Date().toLocaleString()}

Screenshot List:
${screenshots.map(s => `${s.filename} (${formatTimestamp(s.time)})`).join('\n')}
`;

    files.push({
      name: `${folderName}/info.txt`,
      text: info
    });

    console.log('Generating ZIP blob...');
    const zipBlob = await createZipBlob(files);
    
    console.log('ZIP created successfully, size:', (zipBlob.size / 1024 / 1024).toFixed(2), 'MB');
    
    // Create filename
    let filename;
    if (totalChunks > 1) {
      filename = `youtube_screenshots_chunk${chunkNum}_of_${totalChunks}.zip`;
    } else {
      filename = `youtube_screenshots.zip`;
    }
    
    // Use Chrome downloads API for reliable downloading
    const url = URL.createObjectURL(zipBlob);
    
    chrome.runtime.sendMessage({
      action: 'downloadZip',
      url: url,
      filename: filename
    }, (response) => {
      console.log('Download triggered:', response);
      // Clean up URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
    
    console.log('Download initiated for:', filename);
    
  } catch (error) {
    console.error('Error creating ZIP:', error);
    alert('Error creating ZIP file: ' + error.message + '\n\nPlease try again with fewer screenshots or lower quality.');
  }
}

function createZipBlob(files) {
  const fileRecords = [];
  const encoder = new TextEncoder();
  let offset = 0;

  const addBytes = (list, bytes) => {
    list.push(bytes);
    offset += bytes.length;
  };

  const writeUint16 = (value) => {
    return new Uint8Array([value & 0xff, (value >> 8) & 0xff]);
  };

  const writeUint32 = (value) => {
    return new Uint8Array([
      value & 0xff,
      (value >> 8) & 0xff,
      (value >> 16) & 0xff,
      (value >> 24) & 0xff
    ]);
  };

  const crc32 = (data) => {
    let crc = -1;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  };

  const localParts = [];

  return (async () => {
    for (const file of files) {
      const nameBytes = encoder.encode(file.name);
      let dataBytes;

      if (file.blob) {
        const buffer = await file.blob.arrayBuffer();
        dataBytes = new Uint8Array(buffer);
      } else {
        dataBytes = encoder.encode(file.text || '');
      }

      const crc = crc32(dataBytes);
      const localHeaderOffset = offset;

      addBytes(localParts, writeUint32(0x04034b50));
      addBytes(localParts, writeUint16(20));
      addBytes(localParts, writeUint16(0));
      addBytes(localParts, writeUint16(0));
      addBytes(localParts, writeUint16(0));
      addBytes(localParts, writeUint16(0));
      addBytes(localParts, writeUint32(crc));
      addBytes(localParts, writeUint32(dataBytes.length));
      addBytes(localParts, writeUint32(dataBytes.length));
      addBytes(localParts, writeUint16(nameBytes.length));
      addBytes(localParts, writeUint16(0));
      addBytes(localParts, nameBytes);
      addBytes(localParts, dataBytes);

      fileRecords.push({
        nameBytes: nameBytes,
        crc: crc,
        size: dataBytes.length,
        offset: localHeaderOffset
      });
    }

    const centralParts = [];
    let centralSize = 0;
    const centralOffset = offset;

    const addCentral = (bytes) => {
      centralParts.push(bytes);
      centralSize += bytes.length;
    };

    for (const record of fileRecords) {
      addCentral(writeUint32(0x02014b50));
      addCentral(writeUint16(20));
      addCentral(writeUint16(20));
      addCentral(writeUint16(0));
      addCentral(writeUint16(0));
      addCentral(writeUint16(0));
      addCentral(writeUint16(0));
      addCentral(writeUint32(record.crc));
      addCentral(writeUint32(record.size));
      addCentral(writeUint32(record.size));
      addCentral(writeUint16(record.nameBytes.length));
      addCentral(writeUint16(0));
      addCentral(writeUint16(0));
      addCentral(writeUint16(0));
      addCentral(writeUint16(0));
      addCentral(writeUint32(0));
      addCentral(writeUint32(record.offset));
      addCentral(record.nameBytes);
    }

    const endParts = [];
    const addEnd = (bytes) => endParts.push(bytes);

    addEnd(writeUint32(0x06054b50));
    addEnd(writeUint16(0));
    addEnd(writeUint16(0));
    addEnd(writeUint16(fileRecords.length));
    addEnd(writeUint16(fileRecords.length));
    addEnd(writeUint32(centralSize));
    addEnd(writeUint32(centralOffset));
    addEnd(writeUint16(0));

    return new Blob([...localParts, ...centralParts, ...endParts], { type: 'application/zip' });
  })();
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

// --- Single Screenshot Button Logic ---

function createScreenshotButton() {
  const btn = document.createElement('button');
  btn.className = 'ytp-button ytp-screenshot-button';
  btn.title = 'Screenshot';
  btn.setAttribute('aria-label', 'Screenshot');
  btn.setAttribute('aria-keyshortcuts', 's');
  
  // Camera Icon SVG - cleaner path, standard YouTube size (box 36x36 usually, but paths often centered)
  // Using a more standard path without the fill background to match "outline" feel of other icons
  btn.innerHTML = `
    <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
      <use class="ytp-svg-shadow" xlink:href="#ytp-id-screenshot-icon"></use>
      <path class="ytp-svg-fill" d="M23.5,10h-2.2l-1.3-3H16l-1.3,3h-2.2c-1.7,0-3,1.3-3,3v11c0,1.7,1.3,3,3,3h11c1.7,0,3-1.3,3-3V13C26.5,11.3,25.2,10,23.5,10z M18,22c-2.8,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S20.8,22,18,22z M18,13.5c-1.9,0-3.5,1.6-3.5,3.5s1.6,3.5,3.5,3.5s3.5-1.6,3.5-3.5S19.9,13.5,18,13.5z" id="ytp-id-screenshot-icon"></path>
    </svg>
  `;

  // Removed vertical-align: top which was causing misalignment
  // Adjusted opacity to standard unhovered state (usually handled by ytp-button but ensuring defaults)
  // Added some padding correction if needed, but usually just removing separate align fixes it.
  btn.style.cssText = `
    fill: #fff; 
    vertical-align: top;
    margin-top: -2px; 
  `;

  btn.addEventListener('click', captureSingleScreenshot);
  
  return btn;
}

function injectScreenshotButton() {
  // Check if button already exists
  if (document.querySelector('.ytp-screenshot-button')) return;

  const rightControls = document.querySelector('.ytp-right-controls');
  if (rightControls) {
    const btn = createScreenshotButton();
    // Insert before the settings button or at the beginning of right controls
    // Usually settings button is a good landmark, or just prepend.
    // YouTube's right controls order: [Autoplay, Subtitles, Settings, Miniplayer, Theater, Fullscreen]
    // Let's insert it as the first item in right controls for visibility
    rightControls.prepend(btn);
    console.log('Screenshot button injected');
  }
}

async function captureSingleScreenshot() {
  try {
    const video = document.querySelector('video');
    if (!video) throw new Error('Video element not found');

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    if (!blob) throw new Error('Failed to create image blob');

    const url = URL.createObjectURL(blob);
    const timestamp = formatTimestamp(video.currentTime).replace(/:/g, '-'); // Safe filename
    const filename = `youtube_screenshot_${timestamp}.jpg`;

    // Send to background to download
    chrome.runtime.sendMessage({
      action: 'downloadFile',
      url: url,
      filename: filename
    }, (response) => {
        if (response && response.success) {
            // Success animation or feedback could go here
            console.log('Screenshot saved:', filename);
        } else {
            console.error('Failed to save screenshot:', response ? response.error : 'Unknown error');
        }
        // Revoke URL after a delay to ensure download starts
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    });

  } catch (error) {
    console.error('Screenshot failed:', error);
    alert('Failed to take screenshot: ' + error.message);
  }
}

// Observer to handle navigation and dynamic loading
const observer = new MutationObserver((mutations) => {
  if (!document.querySelector('.ytp-screenshot-button')) {
    injectScreenshotButton();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial injection try
injectScreenshotButton();
