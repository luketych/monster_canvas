const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * Provider for the depth viewer webview
 */
class DepthViewProvider {
  static viewType = 'fileDrawer.depthView';

  constructor(context) {
    this.context = context;
    this._panel = null;
    this._view = null;
    this.currentFileUri = null;
    this.imageData = {};
  }

  /**
   * Opens the depth viewer for a file or folder
   * @param {vscode.Uri} fileUri - The file or folder URI (optional)
   */
  openDepthView(fileUri) {
    const config = vscode.workspace.getConfiguration('fileDrawer');
    const location = config.get('depthViewLocation', 'editor');

    if (location === 'sidebar') {
      // If in sidebar mode, ensure the view is initialized
      if (!this._view) {
        vscode.window.showErrorMessage('Depth Viewer is not properly initialized. Please reload the window.');
        return;
      }

      // Show the view
      this._view.show(true);

      // If we have a fileUri, update the view with the file
      if (fileUri) {
        this.currentFileUri = fileUri;
        this._view.webview.postMessage({
          command: 'setCurrentFile',
          fileUri: fileUri.toString(),
          fileName: path.basename(fileUri.fsPath)
        });

        // Get file details
        this._getFileDetails(fileUri.toString());
      } else {
        // No file URI provided, show workspace root
        this._showWorkspaceRoot();
      }
    } else {
      // If in editor mode, show or create the panel
      if (this._panel) {
        this._panel.reveal(vscode.ViewColumn.One);
      } else {
        this._panel = vscode.window.createWebviewPanel(
          DepthViewProvider.viewType,
          'Depth Viewer',
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
              vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
              vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'webview')),
              vscode.Uri.file(path.join(this.context.extensionPath, '..', 'monster-cache')),
              // Add workspace folders as trusted resource roots
              ...(vscode.workspace.workspaceFolders || []).map(folder => folder.uri)
            ]
          }
        );

        // Set the HTML content
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(message => {
          this._handleMessage(message);
        });

        // Handle panel close
        this._panel.onDidDispose(() => {
          this._panel = null;
        });
      }

      // If we have a fileUri, update the panel with the file
      if (fileUri) {
        this.currentFileUri = fileUri;
        this._panel.webview.postMessage({
          command: 'setCurrentFile',
          fileUri: fileUri.toString(),
          fileName: path.basename(fileUri.fsPath)
        });

        // Get file details
        this._getFileDetails(fileUri.toString());
      } else {
        // No file URI provided, show workspace root
        this._showWorkspaceRoot();
      }
    }
  }

  /**
   * Resolves the webview view
   * @param {vscode.WebviewView} webviewView - The webview view
   */
  resolveWebviewView(webviewView) {
    try {
      this._view = webviewView;

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
          vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'webview')),
          vscode.Uri.file(path.join(this.context.extensionPath, '..', 'monster-cache')),
          // Add workspace folders as trusted resource roots
          ...(vscode.workspace.workspaceFolders || []).map(folder => folder.uri)
        ]
      };

      // Set initial HTML content
      webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

      // Handle messages from the webview
      webviewView.webview.onDidReceiveMessage(message => {
        this._handleMessage(message);
      });

      // Handle view visibility changes
      webviewView.onDidChangeVisibility(() => {
        if (webviewView.visible) {
          // When view becomes visible, ensure it's properly initialized
          this._showWorkspaceRoot();
        }
      });

      // Initial setup
      this._showWorkspaceRoot();
    } catch (err) {
      console.error('Error initializing Depth Viewer:', err);
      vscode.window.showErrorMessage('Failed to initialize Depth Viewer. Please reload the window.');
    }
  }

  /**
   * Handles messages from the webview
   * @param {Object} message - The message from the webview
   */
  _handleMessage(message) {
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
      case 'updateSettings':
        this._updateSettings(message.settings);
        break;
    }
  }

  /**
   * Shows the workspace root or prompts to open a folder
   */
  _showWorkspaceRoot() {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;

      // Get the appropriate webview based on the current mode
      const config = vscode.workspace.getConfiguration('fileDrawer');
      const location = config.get('depthViewLocation', 'editor');
      const webview = location === 'sidebar' ? this._view?.webview : this._panel?.webview;

      if (!webview) {
        console.error('No webview available');
        return;
      }

      if (workspaceFolders && workspaceFolders.length > 0) {
        // Use the first workspace folder
        const rootUri = workspaceFolders[0].uri;
        this.currentFileUri = rootUri;

        // Send the file URI to the webview
        webview.postMessage({
          command: 'setCurrentFile',
          fileUri: rootUri.toString(),
          fileName: path.basename(rootUri.fsPath)
        });

        // Get file details
        this._getFileDetails(rootUri.toString());

        // Get children of the workspace root
        this._getChildren(rootUri.toString());
      } else {
        // No workspace open, show a message
        webview.postMessage({
          command: 'noWorkspace'
        });
      }
    } catch (err) {
      console.error('Error showing workspace root:', err);
      const webview = this._view?.webview || this._panel?.webview;
      if (webview) {
        webview.postMessage({
          command: 'error',
          message: `Error showing workspace root: ${err.message}`
        });
      }
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
        this.openDepthView(fileUri[0]);
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

      // Get the appropriate webview based on the current mode
      const config = vscode.workspace.getConfiguration('fileDrawer');
      const location = config.get('depthViewLocation', 'editor');
      const webview = location === 'sidebar' ? this._view?.webview : this._panel?.webview;

      if (webview) {
        if (savedFileDetails) {
          // Convert local URIs to webview URIs
          details.stickers = (savedFileDetails.stickers || []).map(stickerUri => {
            try {
              return webview.asWebviewUri(vscode.Uri.parse(stickerUri)).toString();
            } catch (err) {
              console.error('Error converting sticker URI:', err);
              return null;
            }
          }).filter(uri => uri !== null);

          details.coverImage = savedFileDetails.coverImage ?
            webview.asWebviewUri(vscode.Uri.parse(savedFileDetails.coverImage)).toString() :
            null;
        } else {
          details.stickers = [];
          details.coverImage = null;
        }

        // Send the details to the webview
        webview.postMessage({
          command: 'fileDetails',
          details
        });

        // If it's a directory, get its children
        if (stats.isDirectory()) {
          this._getChildren(fileUri);
        } else {
          // Clear children container for files
          webview.postMessage({
            command: 'clearChildren'
          });
        }
      }
    } catch (err) {
      console.error('Error getting file details:', err);
      const config = vscode.workspace.getConfiguration('fileDrawer');
      const location = config.get('depthViewLocation', 'editor');
      const webview = location === 'sidebar' ? this._view?.webview : this._panel?.webview;

      if (webview) {
        webview.postMessage({
          command: 'error',
          message: `Error getting file details: ${err.message}`
        });
      }
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
   */
  _getChildren(fileUri) {
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

      // Get the appropriate webview based on the current mode
      const config = vscode.workspace.getConfiguration('fileDrawer');
      const location = config.get('depthViewLocation', 'editor');
      const webview = location === 'sidebar' ? this._view?.webview : this._panel?.webview;

      if (!webview) {
        return;
      }

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
              // Convert local URIs to webview URIs
              stickers = (savedFileDetails.stickers || []).map(stickerUri => {
                try {
                  return webview.asWebviewUri(vscode.Uri.parse(stickerUri)).toString();
                } catch (err) {
                  console.error('Error converting sticker URI:', err);
                  return null;
                }
              }).filter(uri => uri !== null);

              coverImage = savedFileDetails.coverImage ?
                webview.asWebviewUri(vscode.Uri.parse(savedFileDetails.coverImage)).toString() :
                null;
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
      webview.postMessage({
        command: 'children',
        children,
        parentUri: fileUri
      });
    } catch (err) {
      console.error('Error getting children:', err);
      const config = vscode.workspace.getConfiguration('fileDrawer');
      const location = config.get('depthViewLocation', 'editor');
      const webview = location === 'sidebar' ? this._view?.webview : this._panel?.webview;

      if (webview) {
        webview.postMessage({
          command: 'error',
          message: `Error getting children: ${err.message}`
        });
      }
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

      // Get the appropriate webview based on the current mode
      const config = vscode.workspace.getConfiguration('fileDrawer');
      const location = config.get('depthViewLocation', 'editor');
      const webview = location === 'sidebar' ? this._view?.webview : this._panel?.webview;

      if (webview) {
        webview.postMessage({
          command: 'error',
          message: `Error opening file: ${err.message}`
        });
      }
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

      // Confirm to the webview - using appropriate webview based on mode
      const config = vscode.workspace.getConfiguration('fileDrawer');
      const location = config.get('depthViewLocation', 'editor');
      const webview = location === 'sidebar' ? this._view?.webview : this._panel?.webview;

      if (webview) {
        webview.postMessage({
          command: 'detailsSaved',
          fileUri
        });
      }
    } catch (err) {
      console.error('Error saving file details:', err);

      // Get the appropriate webview based on the current mode
      const config = vscode.workspace.getConfiguration('fileDrawer');
      const location = config.get('depthViewLocation', 'editor');
      const webview = location === 'sidebar' ? this._view?.webview : this._panel?.webview;

      if (webview) {
        webview.postMessage({
          command: 'error',
          message: `Error saving file details: ${err.message}`
        });
      }
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
    // Get the HTML template
    const templatePath = path.join(this.context.extensionPath, 'src', 'webview', 'html', 'depthViewTemplate.html');

    // Choose appropriate CSS file based on view location
    const config = vscode.workspace.getConfiguration('fileDrawer');
    const location = config.get('depthViewLocation', 'editor');

    // Use sidebar-specific styles when in sidebar mode
    const stylesFileName = location === 'sidebar' ? 'depthViewSidebarStyles.css' : 'depthViewStyles.css';
    const stylesUri = webview.asWebviewUri(vscode.Uri.file(
      path.join(this.context.extensionPath, 'src', 'webview', 'styles', stylesFileName)
    ));

    const scriptUri = webview.asWebviewUri(vscode.Uri.file(
      path.join(this.context.extensionPath, 'src', 'webview', 'js', 'depthView.js')
    ));

    // Read the HTML template
    let html = fs.readFileSync(templatePath, 'utf8');

    // Replace placeholders with proper file references
    html = html.replace('{{title}}', 'Depth Viewer');
    html = html.replace('{{styles}}', `<link rel="stylesheet" href="${stylesUri}">`);
    html = html.replace('{{script}}', `<script src="${scriptUri}"></script>`);

    // Add view mode as a data attribute
    html = html.replace('<body>', `<body data-view-mode="${location}">`);

    return html;
  }

  /**
   * Updates the settings
   * @param {Object} settings - The new settings
   */
  _updateSettings(settings) {
    const config = vscode.workspace.getConfiguration('fileDrawer');
    config.update('depthViewMaxHeight', settings.maxHeight, true);
    config.update('depthViewShowStickers', settings.showStickers, true);
    config.update('depthViewShowCover', settings.showCover, true);
  }
}

module.exports = DepthViewProvider;
