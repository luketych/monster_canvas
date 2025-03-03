const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Provider for the image viewer webview
 */
class DrawingViewProvider {
  static viewType = 'fileDrawer.drawingCanvas';

  constructor(context) {
    this.context = context;
    this._view = null;
    this.currentFileUri = null;
    this.imageData = {};

    // Create monster-cache directory if it doesn't exist
    const imagesDir = path.join(this.context.extensionPath, '..', 'monster-cache');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
  }

  /**
   * Called when the view is first created
   * @param {vscode.WebviewView} webviewView - The webview view
   */
  resolveWebviewView(webviewView, context, token) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
        vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'webview')),
        vscode.Uri.file(path.join(this.context.extensionPath, '..', 'monster-cache'))
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'uploadImage':
          this._saveImage(message.fileUri, message.fileName, message.imageData);
          break;
        case 'getImage':
          this._loadImage(message.fileUri);
          break;
        case 'openInFinder':
          this._openInFinder(message.imagePath);
          break;
        case 'copyFilePath':
          this._copyFilePath(message.imagePath);
          break;
      }
    });

    // Set the title
    webviewView.title = 'Image Viewer';
  }

  /**
   * Open the drawing canvas for a file
   * @param {vscode.Uri} fileUri - The file URI
   */
  openDrawingCanvas(fileUri) {
    if (!this._view) {
      vscode.commands.executeCommand('fileDrawer.focusDrawingCanvas');
      return;
    }

    this.currentFileUri = fileUri.toString();

    // Send message to webview to load the image for this file
    this._view.webview.postMessage({
      command: 'openFile',
      fileUri: fileUri.toString(),
      fileName: path.basename(fileUri.fsPath)
    });

    // Load the image data if it exists
    this._loadImage(fileUri.toString());
  }

  /**
   * Save the uploaded image
   * @param {string} fileUri - The file URI
   * @param {string} fileName - The original file name
   * @param {string} imageData - The image data as a base64 string
   */
  _saveImage(fileUri, fileName, imageData) {
    if (!fileUri) return;

    // Create a hash of the file URI to use as part of the filename
    const fileHash = crypto.createHash('md5').update(fileUri).digest('hex').substring(0, 8);

    // Get file extension from the original filename
    const fileExt = path.extname(fileName);

    // Create a unique filename
    const uniqueFileName = `${path.basename(fileName, fileExt)}_${fileHash}${fileExt}`;

    // Path to save the image
    const imagesDir = path.join(this.context.extensionPath, '..', 'monster-cache');
    const imagePath = path.join(imagesDir, uniqueFileName);

    // Convert base64 to buffer and save
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    fs.writeFileSync(imagePath, buffer);

    // Update the in-memory cache
    this.imageData[fileUri] = {
      path: imagePath,
      fileName: uniqueFileName
    };

    // Convert the file path to a webview URI
    const imageUri = this._view.webview.asWebviewUri(vscode.Uri.file(imagePath));

    // Send the image info back to the webview
    this._view.webview.postMessage({
      command: 'imageUploaded',
      imagePath: imageUri.toString(),
      fileName: uniqueFileName
    });

    vscode.window.showInformationMessage(`Image saved to ${imagePath}`);
  }

  /**
   * Load the image data for a file
   * @param {string} fileUri - The file URI
   */
  _loadImage(fileUri) {
    if (!fileUri || !this._view) return;

    // Check if we have the image data in memory
    if (this.imageData[fileUri]) {
      const imagePath = this.imageData[fileUri].path;
      const fileName = this.imageData[fileUri].fileName;

      // Convert the file path to a webview URI
      const imageUri = this._view.webview.asWebviewUri(vscode.Uri.file(imagePath));

      this._view.webview.postMessage({
        command: 'loadImage',
        imagePath: imageUri.toString(),
        fileName: fileName
      });
      return;
    }

    // Check if there's an image for this file in the monster-cache directory
    const imagesDir = path.join(this.context.extensionPath, '..', 'monster-cache');
    const fileHash = crypto.createHash('md5').update(fileUri).digest('hex').substring(0, 8);

    // Look for files with the hash in their name
    const files = fs.readdirSync(imagesDir);
    const matchingFile = files.find(file => file.includes(fileHash));

    if (matchingFile) {
      const imagePath = path.join(imagesDir, matchingFile);

      // Cache the image data
      this.imageData[fileUri] = {
        path: imagePath,
        fileName: matchingFile
      };

      // Convert the file path to a webview URI
      const imageUri = this._view.webview.asWebviewUri(vscode.Uri.file(imagePath));

      // Send the image info to the webview
      this._view.webview.postMessage({
        command: 'loadImage',
        imagePath: imageUri.toString(),
        fileName: matchingFile
      });
    } else {
      // No image exists for this file yet
      this._view.webview.postMessage({
        command: 'noImage'
      });
    }
  }

  /**
   * Open the image in Finder
   * @param {string} imagePath - The path to the image
   */
  _openInFinder(imagePath) {
    // Find the actual file path from our cache
    const actualPath = this._findActualPathFromCache(imagePath);
    if (!actualPath) {
      vscode.window.showErrorMessage('Could not find the image file');
      return;
    }

    // Use the appropriate command based on the platform
    let command;
    switch (process.platform) {
      case 'darwin': // macOS
        command = `open -R "${actualPath}"`;
        break;
      case 'win32': // Windows
        command = `explorer.exe /select,"${actualPath}"`;
        break;
      case 'linux': // Linux
        command = `xdg-open "${path.dirname(actualPath)}"`;
        break;
      default:
        vscode.window.showErrorMessage(`Unsupported platform: ${process.platform}`);
        return;
    }

    const cp = require('child_process');
    cp.exec(command, (err) => {
      if (err) {
        vscode.window.showErrorMessage(`Failed to open in finder: ${err.message}`);
      }
    });
  }

  /**
   * Copy the file path to the clipboard
   * @param {string} imagePath - The path to the image
   */
  _copyFilePath(imagePath) {
    // Find the actual file path from our cache
    const actualPath = this._findActualPathFromCache(imagePath);
    if (!actualPath) {
      vscode.window.showErrorMessage('Could not find the image file');
      return;
    }

    vscode.env.clipboard.writeText(actualPath).then(() => {
      vscode.window.showInformationMessage('Image path copied to clipboard');
    });
  }

  /**
   * Find the actual file path from the cache based on the webview URI
   * @param {string} webviewUri - The webview URI
   * @returns {string|null} - The actual file path or null if not found
   */
  _findActualPathFromCache(webviewUri) {
    // Look through the imageData cache to find the matching path
    for (const fileUri in this.imageData) {
      const entry = this.imageData[fileUri];
      const imageUri = this._view.webview.asWebviewUri(vscode.Uri.file(entry.path)).toString();

      if (imageUri === webviewUri) {
        return entry.path;
      }
    }
    return null;
  }

  /**
   * Get the HTML for the webview
   * @param {vscode.Webview} webview - The webview
   * @returns {string} - The HTML
   */
  _getHtmlForWebview(webview) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Image Viewer</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
          }
          
          .header {
            padding: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .file-name {
            font-weight: bold;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .image-container {
            flex: 1;
            overflow: auto;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #1e1e1e;
          }
          
          .image-container img {
            display: block;
          }
          
          .image-container img.exact-size {
            max-width: none;
            max-height: none;
          }
          
          .image-container img.fit-width {
            max-width: 100%;
            height: auto;
          }
          
          .toolbar {
            display: flex;
            flex-direction: column;
            padding: 5px;
            border-top: 1px solid var(--vscode-panel-border);
            gap: 5px;
          }
          
          .toolbar > div {
            display: flex;
            align-items: center;
          }
          
          .view-options {
            display: flex;
            gap: 10px;
            font-size: 12px;
          }
          
          button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            margin-right: 5px;
            cursor: pointer;
            border-radius: 2px;
          }
          
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          
          .message {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: var(--vscode-descriptionForeground);
          }
          
          .image-info {
            margin-top: 5px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="file-name">Select a file to view image</div>
        </div>
        
        <div class="image-container">
          <div class="message" id="message">Select a file or folder from the explorer to view or upload an image</div>
          <img id="imageElement" style="display: none;" />
          <div class="image-info" id="imageInfo" style="display: none;"></div>
        </div>
        
        <div class="toolbar">
          <div>
            <button id="uploadBtn">Upload Image</button>
            <button id="openInFinderBtn" disabled>Open in Finder</button>
            <button id="copyPathBtn" disabled>Copy Path</button>
            <input type="file" id="imageInput" accept="image/*" style="display: none;">
          </div>
          <div class="view-options">
            <label><input type="radio" name="viewMode" value="exact" checked> Exact Size</label>
            <label><input type="radio" name="viewMode" value="fit"> Fit Width</label>
          </div>
        </div>
        
        <script>
          (function() {
            const vscode = acquireVsCodeApi();
            
            // Elements
            const imageElement = document.getElementById('imageElement');
            const message = document.getElementById('message');
            const imageInfo = document.getElementById('imageInfo');
            const fileNameElement = document.querySelector('.file-name');
            const uploadBtn = document.getElementById('uploadBtn');
            const openInFinderBtn = document.getElementById('openInFinderBtn');
            const copyPathBtn = document.getElementById('copyPathBtn');
            const imageInput = document.getElementById('imageInput');
            
            // State
            let currentFileUri = null;
            let currentFileName = 'Select a file to view image';
            let currentImagePath = null;
            let viewMode = 'exact'; // 'exact' or 'fit'
            
            // Upload button click handler
            uploadBtn.addEventListener('click', () => {
              if (!currentFileUri) {
                vscode.postMessage({ command: 'showError', message: 'Please select a file first' });
                return;
              }
              imageInput.click();
            });
            
            // Open in Finder button click handler
            openInFinderBtn.addEventListener('click', () => {
              if (currentImagePath) {
                vscode.postMessage({ 
                  command: 'openInFinder', 
                  imagePath: currentImagePath 
                });
              }
            });
            
            // Copy Path button click handler
            copyPathBtn.addEventListener('click', () => {
              if (currentImagePath) {
                vscode.postMessage({ 
                  command: 'copyFilePath', 
                  imagePath: currentImagePath 
                });
              }
            });
            
            // Image input change handler
            imageInput.addEventListener('change', (e) => {
              if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                uploadImage(file);
              }
            });
            
            // Function to upload an image
            function uploadImage(file) {
              const reader = new FileReader();
              
              reader.onload = (event) => {
                vscode.postMessage({
                  command: 'uploadImage',
                  fileUri: currentFileUri,
                  fileName: file.name,
                  imageData: event.target.result
                });
              };
              
              reader.readAsDataURL(file);
            }
            
            // Set up view mode radio buttons
            document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
              radio.addEventListener('change', (e) => {
                viewMode = e.target.value;
                updateImageDisplay();
              });
            });
            
            // Function to update the image display based on the current view mode
            function updateImageDisplay() {
              if (!imageElement.src) return;
              
              imageElement.classList.remove('exact-size', 'fit-width');
              imageElement.classList.add(viewMode === 'exact' ? 'exact-size' : 'fit-width');
            }
            
            // Function to display an image
            function displayImage(imagePath, fileName) {
              // Update state
              currentImagePath = imagePath;
              
              // Show the image
              imageElement.src = imagePath;
              imageElement.style.display = 'block';
              message.style.display = 'none';
              
              // Apply the current view mode
              updateImageDisplay();
              
              // Enable buttons
              openInFinderBtn.disabled = false;
              copyPathBtn.disabled = false;
              
              // Get image dimensions and display info
              imageElement.onload = function() {
                var width = imageElement.naturalWidth;
                var height = imageElement.naturalHeight;
                imageInfo.textContent = fileName + ' (' + width + 'x' + height + ')';
                imageInfo.style.display = 'block';
              };
            }
            
            // Handle messages from the extension
            window.addEventListener('message', event => {
              const message = event.data;
              
              switch (message.command) {
                case 'openFile':
                  currentFileUri = message.fileUri;
                  currentFileName = message.fileName;
                  fileNameElement.textContent = currentFileName;
                  document.getElementById('message').style.display = 'block';
                  imageElement.style.display = 'none';
                  imageInfo.style.display = 'none';
                  openInFinderBtn.disabled = true;
                  copyPathBtn.disabled = true;
                  break;
                  
                case 'loadImage':
                  displayImage(message.imagePath, message.fileName);
                  break;
                  
                case 'imageUploaded':
                  displayImage(message.imagePath, message.fileName);
                  break;
                  
                case 'noImage':
                  imageElement.style.display = 'none';
                  imageInfo.style.display = 'none';
                  const messageElement = document.getElementById('message');
                  if (messageElement) {
                    messageElement.style.display = 'block';
                    messageElement.textContent = 'No image available. Click "Upload Image" to add one.';
                  }
                  openInFinderBtn.disabled = true;
                  copyPathBtn.disabled = true;
                  break;
              }
            });
            
            // Request image data if we have a file URI
            if (currentFileUri) {
              vscode.postMessage({
                command: 'getImage',
                fileUri: currentFileUri
              });
            }
          }());
        </script>
      </body>
      </html>
    `;
  }
}

module.exports = DrawingViewProvider;
