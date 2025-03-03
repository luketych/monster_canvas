const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * Provider for the file details view webview
 */
class FileDetailsViewProvider {
  static viewType = 'fileDrawer.fileDetailsView';

  constructor(context) {
    this.context = context;
    this._panel = null;
    this.currentFileUri = null;
    this.imageData = {};
  }

  /**
   * Opens the file details view for a file or folder
   * @param {vscode.Uri} fileUri - The file or folder URI (optional)
   */
  openFileDetailsView(fileUri) {
    // If we already have a panel, show it
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.One);
    } else {
      // Otherwise, create a new panel
      this._panel = vscode.window.createWebviewPanel(
        FileDetailsViewProvider.viewType,
        'File Details',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
            vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'webview')),
            vscode.Uri.file(path.join(this.context.extensionPath, '..', 'monster-cache'))
          ]
        }
      );

      // Set the HTML content
      this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

      // Handle messages from the webview
      this._panel.webview.onDidReceiveMessage(message => {
        switch (message.command) {
          case 'getFileDetails':
            this._getFileDetails(message.fileUri);
            break;
          case 'getChildren':
            this._getChildren(message.fileUri);
            break;
          case 'openFile':
            this._openFile(message.fileUri);
            break;
          case 'saveFileDetails':
            this._saveFileDetails(message.fileUri, message.details);
            break;
          case 'browseWorkspace':
            this._browseWorkspace();
            break;
          case 'selectCoverImage':
            this._selectCoverImage(message.fileUri);
            break;
          case 'selectStickers':
            this._selectStickers(message.fileUri);
            break;
        }
      });

      // Handle panel close
      this._panel.onDidDispose(() => {
        this._panel = null;
      });
    }

    if (fileUri) {
      // Set the current file URI
      this.currentFileUri = fileUri;

      // Send the file URI to the webview
      this._panel.webview.postMessage({
        command: 'setCurrentFile',
        fileUri: fileUri.toString(),
        fileName: path.basename(fileUri.fsPath)
      });

      // Get file details
      this._getFileDetails(fileUri.toString());
    } else {
      // No file URI provided, show workspace root or prompt to open a folder
      this._showWorkspaceRoot();
    }
  }

  /**
   * Shows the workspace root or prompts to open a folder
   */
  _showWorkspaceRoot() {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (workspaceFolders && workspaceFolders.length > 0) {
      // Use the first workspace folder
      const rootUri = workspaceFolders[0].uri;
      this.currentFileUri = rootUri;

      // Send the file URI to the webview
      this._panel.webview.postMessage({
        command: 'setCurrentFile',
        fileUri: rootUri.toString(),
        fileName: path.basename(rootUri.fsPath)
      });

      // Get file details
      this._getFileDetails(rootUri.toString());
    } else {
      // No workspace open, show a message
      this._panel.webview.postMessage({
        command: 'noWorkspace'
      });
    }
  }

  /**
   * Browses the workspace to select a folder
   */
  _browseWorkspace() {
    vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select'
    }).then(fileUri => {
      if (fileUri && fileUri.length > 0) {
        this.openFileDetailsView(fileUri[0]);
      }
    });
  }

  /**
   * Gets details for a file or folder
   * @param {string} fileUri - The file or folder URI
   */
  _getFileDetails(fileUri) {
    try {
      const uri = vscode.Uri.parse(fileUri);
      const filePath = uri.fsPath;
      const stats = fs.statSync(filePath);

      // Get file type
      let fileType = 'unknown';
      if (stats.isDirectory()) {
        fileType = 'directory';
      } else {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
          case '.js':
            fileType = 'javascript';
            break;
          case '.ts':
            fileType = 'typescript';
            break;
          case '.json':
            fileType = 'json';
            break;
          case '.html':
            fileType = 'html';
            break;
          case '.css':
            fileType = 'css';
            break;
          case '.md':
            fileType = 'markdown';
            break;
          case '.py':
            fileType = 'python';
            break;
          case '.png':
          case '.jpg':
          case '.jpeg':
          case '.gif':
          case '.svg':
            fileType = 'image';
            break;
          default:
            fileType = 'file';
        }
      }

      // Get file details
      const details = {
        name: path.basename(filePath),
        path: filePath,
        uri: fileUri,
        type: fileType,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory()
      };

      // Get saved details from the data file
      const savedData = this._getSavedFileDetails();
      const fileHash = this._getFileHash(fileUri);
      const savedFileDetails = savedData.files.find(f => f.hash === fileHash);

      if (savedFileDetails) {
        details.stickers = savedFileDetails.stickers || [];
        details.coverImage = savedFileDetails.coverImage || null;
        details.viewMode = savedFileDetails.viewMode || 'list';
      } else {
        details.stickers = [];
        details.coverImage = null;
        details.viewMode = 'list'; // Default view mode
      }

      // Send the details to the webview
      this._panel.webview.postMessage({
        command: 'fileDetails',
        details
      });

      // If it's a directory, get its children
      if (stats.isDirectory()) {
        this._getChildren(fileUri, details.viewMode);
      } else {
        // Clear children container for files
        this._panel.webview.postMessage({
          command: 'clearChildren'
        });

        // For .js and .py files, extract and display comments
        if (fileType === 'javascript' || fileType === 'python') {
          this._extractAndDisplayComments(filePath, fileType);
        }
      }
    } catch (err) {
      console.error('Error getting file details:', err);
      this._panel.webview.postMessage({
        command: 'error',
        message: `Error getting file details: ${err.message}`
      });
    }
  }

  /**
   * Extracts and displays comments from a file
   * @param {string} filePath - The file path
   * @param {string} fileType - The file type
   */
  _extractAndDisplayComments(filePath, fileType) {
    try {
      // Read the file
      const content = fs.readFileSync(filePath, 'utf8');

      // Extract comments based on file type
      let comments = [];

      if (fileType === 'javascript') {
        // Extract JavaScript comments (both // and /* */)
        const singleLineComments = content.match(/\/\/.*$/gm) || [];

        // Extract multi-line comments
        const multiLineRegex = /\/\*[\s\S]*?\*\//g;
        const multiLineComments = content.match(multiLineRegex) || [];

        // Combine all comments
        comments = [...singleLineComments, ...multiLineComments];
      } else if (fileType === 'python') {
        // Extract Python comments (# and """ """)
        const singleLineComments = content.match(/#.*$/gm) || [];

        // Extract docstrings
        const docstringRegex = /"""[\s\S]*?"""|'''[\s\S]*?'''/g;
        const docstrings = content.match(docstringRegex) || [];

        // Combine all comments
        comments = [...singleLineComments, ...docstrings];
      }

      // Send comments to the webview
      this._panel.webview.postMessage({
        command: 'fileComments',
        comments,
        filePath
      });

    } catch (err) {
      console.error('Error extracting comments:', err);
      this._panel.webview.postMessage({
        command: 'error',
        message: `Error extracting comments: ${err.message}`
      });
    }
  }

  /**
   * Gets saved file details from the data file
   * @returns {Object} - The saved file details
   */
  _getSavedFileDetails() {
    const dataFilePath = path.join(this.context.extensionPath, '..', 'file-details-data.json');

    try {
      if (fs.existsSync(dataFilePath)) {
        return JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
      }
    } catch (err) {
      console.error('Error reading file details data:', err);
    }

    // Return default data if file doesn't exist or there's an error
    return {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      files: []
    };
  }

  /**
   * Gets children of a directory
   * @param {string} fileUri - The directory URI
   * @param {string} viewMode - The view mode (list, icons, columns, gallery)
   */
  _getChildren(fileUri, viewMode = 'list') {
    try {
      const uri = vscode.Uri.parse(fileUri);
      const dirPath = uri.fsPath;

      // Check if it's a directory
      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        return;
      }

      // Get saved details from the data file
      const savedData = this._getSavedFileDetails();

      // Read the directory
      const children = fs.readdirSync(dirPath)
        .map(name => {
          const childPath = path.join(dirPath, name);
          try {
            const childStats = fs.statSync(childPath);
            const isDir = childStats.isDirectory();

            // Get file type
            let fileType = 'unknown';
            if (isDir) {
              fileType = 'directory';
            } else {
              const ext = path.extname(name).toLowerCase();
              switch (ext) {
                case '.js':
                  fileType = 'javascript';
                  break;
                case '.ts':
                  fileType = 'typescript';
                  break;
                case '.json':
                  fileType = 'json';
                  break;
                case '.html':
                  fileType = 'html';
                  break;
                case '.css':
                  fileType = 'css';
                  break;
                case '.md':
                  fileType = 'markdown';
                  break;
                case '.py':
                  fileType = 'python';
                  break;
                case '.png':
                case '.jpg':
                case '.jpeg':
                case '.gif':
                case '.svg':
                  fileType = 'image';
                  break;
                default:
                  fileType = 'file';
              }
            }

            // Get saved details for this child
            const childUri = vscode.Uri.file(childPath).toString();
            const fileHash = this._getFileHash(childUri);
            const savedFileDetails = savedData.files.find(f => f.hash === fileHash);

            let stickers = [];
            let coverImage = null;

            if (savedFileDetails) {
              stickers = savedFileDetails.stickers || [];
              coverImage = savedFileDetails.coverImage || null;
            }

            return {
              name,
              path: childPath,
              uri: childUri,
              type: fileType,
              isDirectory: isDir,
              stickers,
              coverImage
            };
          } catch (err) {
            console.error(`Error getting stats for ${childPath}:`, err);
            return null;
          }
        })
        .filter(child => child !== null);

      // Sort children: directories first, then files, both in alphabetical order
      children.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      // Send the children to the webview
      this._panel.webview.postMessage({
        command: 'children',
        children,
        viewMode,
        parentUri: fileUri
      });
    } catch (err) {
      console.error('Error getting children:', err);
      this._panel.webview.postMessage({
        command: 'error',
        message: `Error getting children: ${err.message}`
      });
    }
  }

  /**
   * Opens a file or folder
   * @param {string} fileUri - The file or folder URI
   */
  _openFile(fileUri) {
    try {
      const uri = vscode.Uri.parse(fileUri);

      // Open the file in the default editor
      vscode.commands.executeCommand('vscode.open', uri);

      // Also update our view with the file details
      this._getFileDetails(fileUri);
    } catch (err) {
      console.error('Error opening file:', err);
      this._panel.webview.postMessage({
        command: 'error',
        message: `Error opening file: ${err.message}`
      });
    }
  }

  /**
   * Selects a cover image for a file or folder
   * @param {string} fileUri - The file or folder URI
   */
  _selectCoverImage(fileUri) {
    vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'Images': ['png', 'jpg', 'jpeg', 'gif', 'svg']
      },
      title: 'Select Cover Image'
    }).then(selectedFiles => {
      if (selectedFiles && selectedFiles.length > 0) {
        const imageUri = selectedFiles[0];

        // Create cache directory if it doesn't exist
        const cacheDir = path.join(this.context.extensionPath, '..', 'monster-cache');
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }

        // Generate a unique filename for the cached image
        const fileHash = this._getFileHash(fileUri);
        const ext = path.extname(imageUri.fsPath);
        const cachedImagePath = path.join(cacheDir, `cover_${fileHash}${ext}`);

        // Copy the image to the cache directory
        fs.copyFileSync(imageUri.fsPath, cachedImagePath);

        // Get the cached image URI
        const cachedImageUri = vscode.Uri.file(cachedImagePath).toString();

        // Update the file details
        const savedData = this._getSavedFileDetails();
        const savedFileDetails = savedData.files.find(f => f.hash === fileHash);

        if (savedFileDetails) {
          savedFileDetails.coverImage = cachedImageUri;
          savedFileDetails.lastUpdated = new Date().toISOString();
        } else {
          const uri = vscode.Uri.parse(fileUri);
          const fileName = path.basename(uri.fsPath);

          savedData.files.push({
            hash: fileHash,
            name: fileName,
            path: uri.fsPath,
            uri: fileUri,
            stickers: [],
            coverImage: cachedImageUri,
            lastUpdated: new Date().toISOString()
          });
        }

        // Update last updated timestamp
        savedData.lastUpdated = new Date().toISOString();

        // Save the data
        const dataFilePath = path.join(this.context.extensionPath, '..', 'file-details-data.json');
        fs.writeFileSync(dataFilePath, JSON.stringify(savedData, null, 2));

        // Refresh the view
        this._getFileDetails(fileUri);
      }
    });
  }

  /**
   * Selects stickers for a file or folder
   * @param {string} fileUri - The file or folder URI
   */
  _selectStickers(fileUri) {
    vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: true,
      filters: {
        'Images': ['png', 'jpg', 'jpeg', 'gif', 'svg']
      },
      title: 'Select Stickers'
    }).then(selectedFiles => {
      if (selectedFiles && selectedFiles.length > 0) {
        // Create cache directory if it doesn't exist
        const cacheDir = path.join(this.context.extensionPath, '..', 'monster-cache');
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }

        // Get file hash
        const fileHash = this._getFileHash(fileUri);

        // Get saved details
        const savedData = this._getSavedFileDetails();
        const savedFileDetails = savedData.files.find(f => f.hash === fileHash);

        // Array to store sticker URIs
        const stickerUris = [];

        // Process each selected image
        selectedFiles.forEach((imageUri, index) => {
          // Generate a unique filename for the cached image
          const ext = path.extname(imageUri.fsPath);
          const cachedImagePath = path.join(cacheDir, `sticker_${fileHash}_${index}${ext}`);

          // Copy the image to the cache directory
          fs.copyFileSync(imageUri.fsPath, cachedImagePath);

          // Get the cached image URI
          const cachedImageUri = vscode.Uri.file(cachedImagePath).toString();

          // Add to sticker URIs
          stickerUris.push(cachedImageUri);
        });

        // Update the file details
        if (savedFileDetails) {
          savedFileDetails.stickers = stickerUris;
          savedFileDetails.lastUpdated = new Date().toISOString();
        } else {
          const uri = vscode.Uri.parse(fileUri);
          const fileName = path.basename(uri.fsPath);

          savedData.files.push({
            hash: fileHash,
            name: fileName,
            path: uri.fsPath,
            uri: fileUri,
            stickers: stickerUris,
            coverImage: null,
            lastUpdated: new Date().toISOString()
          });
        }

        // Update last updated timestamp
        savedData.lastUpdated = new Date().toISOString();

        // Save the data
        const dataFilePath = path.join(this.context.extensionPath, '..', 'file-details-data.json');
        fs.writeFileSync(dataFilePath, JSON.stringify(savedData, null, 2));

        // Refresh the view
        this._getFileDetails(fileUri);
      }
    });
  }

  /**
   * Saves details for a file or folder
   * @param {string} fileUri - The file or folder URI
   * @param {Object} details - The details to save
   */
  _saveFileDetails(fileUri, details) {
    try {
      const dataFilePath = path.join(this.context.extensionPath, '..', 'file-details-data.json');
      const savedData = this._getSavedFileDetails();

      const uri = vscode.Uri.parse(fileUri);
      const fileName = path.basename(uri.fsPath);
      const fileHash = this._getFileHash(fileUri);

      // Find existing file details or create new entry
      const existingIndex = savedData.files.findIndex(f => f.hash === fileHash);
      const fileDetails = {
        hash: fileHash,
        name: fileName,
        path: uri.fsPath,
        uri: fileUri,
        stickers: details.stickers || [],
        coverImage: details.coverImage || null,
        viewMode: details.viewMode || 'list',
        lastUpdated: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        savedData.files[existingIndex] = fileDetails;
      } else {
        savedData.files.push(fileDetails);
      }

      // Update last updated timestamp
      savedData.lastUpdated = new Date().toISOString();

      // Save the data
      fs.writeFileSync(dataFilePath, JSON.stringify(savedData, null, 2));

      // Confirm to the webview
      this._panel.webview.postMessage({
        command: 'detailsSaved',
        fileUri
      });
    } catch (err) {
      console.error('Error saving file details:', err);
      this._panel.webview.postMessage({
        command: 'error',
        message: `Error saving file details: ${err.message}`
      });
    }
  }

  /**
   * Gets a hash for a file URI
   * @param {string} fileUri - The file URI
   * @returns {string} - The hash
   */
  _getFileHash(fileUri) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(fileUri).digest('hex').substring(0, 8);
  }

  /**
   * Gets the HTML for the webview
   * @param {vscode.Webview} webview - The webview
   * @returns {string} - The HTML
   */
  _getHtmlForWebview(webview) {
    // Get paths for HTML template, styles, and script
    const templatePath = path.join(this.context.extensionPath, 'src', 'webview', 'html', 'fileDetailsTemplate.html');
    const stylesPath = path.join(this.context.extensionPath, 'src', 'webview', 'styles', 'fileDetailsStyles.css');
    const scriptPath = path.join(this.context.extensionPath, 'src', 'webview', 'js', 'fileDetails.js');

    // Get the HTML template
    const html = fs.readFileSync(templatePath, 'utf8');

    // Create URIs for styles and script
    const stylesUri = webview.asWebviewUri(vscode.Uri.file(stylesPath));
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(scriptPath));

    // Replace placeholders in the HTML
    return html
      .replace('{{title}}', 'File Details')
      .replace('{{styles}}', `<link rel="stylesheet" href="${stylesUri}">`)
      .replace('{{script}}', `<script src="${scriptUri}"></script>`);
  }
}

module.exports = FileDetailsViewProvider;
