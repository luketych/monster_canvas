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
   * Gets the HTML content for the webview
   * @param {vscode.Webview} webview - The webview to get HTML content for
   * @returns {string} The HTML content
   */
  _getHtmlForWebview(webview) {
    // Get paths to the template files
    const templatePath = path.join(this.context.extensionPath, 'src', 'webview', 'html', 'drawingViewTemplate.html');
    const stylesPath = path.join(this.context.extensionPath, 'src', 'webview', 'styles', 'drawingViewStyles.css');
    const scriptPath = path.join(this.context.extensionPath, 'src', 'webview', 'js', 'drawingView.js');

    // Read the template files
    let html = fs.readFileSync(templatePath, 'utf8');
    const styles = fs.readFileSync(stylesPath, 'utf8');
    const script = fs.readFileSync(scriptPath, 'utf8');

    // Replace the title
    html = html.replace('{{title}}', 'Drawing Canvas');

    // Replace styles and script placeholders
    html = html.replace('{{styles}}', styles);
    html = html.replace('{{script}}', script);

    return html;
  }
}

module.exports = DrawingViewProvider;
