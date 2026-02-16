<div align="center">

# 🎬 YouTube Screenshot Capture

### Capture YouTube video frames at custom intervals with intelligent chunking for long videos.

<br>

<img src="icon128.png" width="120" />

<br><br>

<a href="https://github.com/akshitsutharr/Youtube-Screen-capture/releases/download/v1.0.0/youtube-screen-capture-extension-v1.0.0.zip">
  <img src="https://img.shields.io/badge/⬇ Download%20v1.0.0-1f6feb?style=for-the-badge&logo=google-chrome&logoColor=white" />
</a>

<a href="https://github.com/akshitsutharr/Youtube-Screen-capture/releases/tag/v1.0.0">
  <img src="https://img.shields.io/badge/📄 Release%20Notes-222222?style=for-the-badge" />
</a>
<br><br>

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Chrome-success)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

</div>


## 📸 Screenshots

<table border="1" align="center">
  <tr>
    <td align="center">
      <img src="https://raw.githubusercontent.com/akshitsutharr/Youtube-Screen-capture/main/assets/Screenshot%202026-02-17%20004619.png" width="400"><br>
      <b>Main Extension UI</b>
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/akshitsutharr/Youtube-Screen-capture/main/assets/Screenshot%202026-02-17%20004709.png" width="400"><br>
      <b>Interval Selection Section</b>
    </td>
  </tr>

  <tr>
    <td align="center">
      <img src="https://raw.githubusercontent.com/akshitsutharr/Youtube-Screen-capture/main/assets/Screenshot%202026-02-17%20005115.png" width="400"><br>
      <b>All Images Downloaded as a ZIP at Custom Intervals</b>
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/akshitsutharr/Youtube-Screen-capture/main/assets/Screenshot%202026-02-17%20004930.png" width="400"><br>
      <b>Processing Progress</b>
    </td>
  </tr>

  <tr>
    <td colspan="2" align="center">
      <img src="https://raw.githubusercontent.com/akshitsutharr/Youtube-Screen-capture/main/assets/Screenshot%202026-02-17%20004834.png" width="820"><br>
      <b>Direct Button For Single Screen Capture or Screenshot</b>
    </td>
  </tr>
</table>




## ✨ Features

- **Custom Time Range**: Capture screenshots from any start time to any end time (supports HH:MM:SS and MM:SS formats)
- **Flexible Intervals**: Set screenshot intervals from 1 second to 1 hour
- **Quality Control**: Choose between High, Medium, and Low quality settings
- **Smart Chunking**: Automatically processes videos longer than 1 hour in 1-hour chunks
- **Bulk Download**: Downloads all screenshots in a convenient ZIP file
- **Progress Tracking**: Real-time progress updates with percentage and screenshot count
- **Modern UI**: Beautiful, intuitive interface with gradient design
- **Large Video Support**: Handles videos from 1 minute to 10+ hours efficiently

## 🚀 Installation

### Method 1: Load Unpacked Extension (For Development/Testing)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `youtube-screenshot-extension` folder
6. The extension icon will appear in your Chrome toolbar!

### Method 2: From Chrome Web Store (If Published)

*Coming soon - This extension can be published to the Chrome Web Store*

## 📖 How to Use

1. **Open a YouTube Video**
   - Navigate to any YouTube video
   - Click the extension icon in your toolbar

2. **Configure Capture Settings**
   - **Start Time**: Enter the starting point (e.g., `1:20` or `0:01:20`)
   - **End Time**: Enter the ending point (e.g., `9:23` or `0:09:23`)
   - **Interval**: Set how often to capture (default: 10 seconds)
   - Use preset buttons for quick intervals: 5s, 10s, 30s, 1m
   - **Quality**: Choose High (recommended), Medium, or Low

3. **Review Estimates**
   - The extension shows estimated screenshot count
   - Estimated file size for planning storage

4. **Start Capturing**
   - Click "Start Capture"
   - Watch real-time progress
   - For videos > 1 hour, multiple ZIP files will be downloaded (one per hour chunk)

5. **Download Results**
   - Screenshots are automatically downloaded as ZIP files
   - Each ZIP contains:
     - All screenshots in JPEG format
     - `info.txt` file with capture details
     - Organized by timestamp

## 🎯 Use Cases

- **Educational**: Capture key frames from lectures and tutorials
- **Analysis**: Create frame-by-frame analysis of videos
- **Documentation**: Document video content at regular intervals
- **Research**: Extract visual data from long-form content
- **Storyboarding**: Create storyboards from video content
- **Quality Control**: Review video content at specific intervals

## 🛠️ Technical Details

### Files Structure

```
youtube-screenshot-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Main UI interface
├── popup.css             # Styling
├── popup.js              # UI logic and controls
├── content.js            # Video capture logic
├── background.js         # Background service worker
├── icon16.png           # Extension icon (16x16)
├── icon48.png           # Extension icon (48x48)
├── icon128.png          # Extension icon (128x128)
└── README.md            # This file
```

### Key Technologies

- **Manifest V3**: Latest Chrome extension standard
- **Canvas API**: For capturing video frames
- **JSZip**: For creating ZIP archives (loaded dynamically from CDN)
- **Chrome Storage API**: For saving user preferences
- **Chrome Downloads API**: For automatic file downloads

### How It Works

1. **Video Detection**: Detects YouTube video element on the page
2. **Time Seeking**: Programmatically seeks to specific timestamps
3. **Frame Capture**: Uses Canvas API to capture video frames
4. **Image Processing**: Converts frames to JPEG with quality control
5. **Chunking Logic**: For videos > 1 hour, processes in 1-hour segments
6. **ZIP Creation**: Bundles screenshots with metadata
7. **Auto Download**: Triggers browser download for each ZIP

### Performance Optimizations

- **Muting**: Automatically mutes video during capture to prevent audio artifacts
- **Pause Control**: Pauses video during capture for stability
- **Memory Management**: Processes in chunks to avoid memory overflow
- **Progress Throttling**: Updates UI at reasonable intervals
- **Blob Cleanup**: Properly cleans up object URLs to prevent memory leaks

## 📊 Limitations & Considerations

- **Video DRM**: Cannot capture DRM-protected content
- **Processing Time**: Large captures take time (e.g., 360 screenshots ≈ 2-3 minutes)
- **Storage**: High-quality captures can be several hundred MB
- **Browser Tab**: Must keep YouTube tab open during capture
- **Network**: Video must be fully buffered at each timestamp

## 🎨 Customization

### Changing Intervals

Modify preset buttons in `popup.html`:
```html
<button class="preset-btn" data-value="15">15s</button>
```

### Adjusting Quality Levels

Modify quality options in `popup.html`:
```html
<button class="quality-btn" data-quality="0.95">Ultra</button>
```

### Chunk Duration

Change chunk size in `popup.js`:
```javascript
const CHUNK_DURATION = 7200; // 2 hours instead of 1
```

## 🐛 Troubleshooting

**Extension doesn't appear**
- Ensure you're on a YouTube video page
- Refresh the page after installing extension

**Capture not starting**
- Check that end time > start time
- Verify video is loaded and playable
- Try refreshing the page

**Poor quality screenshots**
- Select "High" quality setting
- Ensure video is playing at highest resolution
- Check your internet connection

**Download fails**
- Check Chrome download settings
- Ensure sufficient disk space
- Disable popup blockers

**Progress stuck**
- Video may not be fully buffered
- Try pausing and letting video buffer
- Refresh page and retry

## 🔒 Privacy & Permissions

This extension requires:
- **activeTab**: To access current YouTube tab
- **storage**: To save user preferences
- **downloads**: To save ZIP files
- **host_permissions**: Only for youtube.com

**No data is collected or transmitted.** All processing happens locally in your browser.

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see below:

```
MIT License

Copyright (c) 2026 YouTube Screenshot Capture

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🌟 Acknowledgments

- JSZip library by [Stuart Knightley](https://stuk.github.io/jszip/)
- Inspired by the need to analyze educational content efficiently

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section

---

**Made with ❤️ for YouTube content creators and researchers**

**By Akshit Suthar**

**Version**: 1.0.0  
**Last Updated**: February 2026
