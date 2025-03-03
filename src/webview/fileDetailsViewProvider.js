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
    // Use the existing template.html file
    const templatePath = path.join(this.context.extensionPath, 'src', 'webview', 'html', 'template.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // Replace the title
    html = html.replace('{{title}}', 'File Details');

    // Replace the body content with our file details view
    const bodyContent = `
      <div class="header">
        <div class="file-name" id="fileName">Loading...</div>
        <div class="file-path" id="filePath"></div>
        <div class="file-details" id="fileDetails"></div>
      </div>
      
      <div class="children-container" id="childrenContainer"></div>
    `;

    html = html.replace('{{body}}', bodyContent);

    // Add our custom styles
    const styles = `
      body {
        margin: 0;
        padding: 20px;
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: column;
        background-color: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        font-family: var(--vscode-font-family);
        box-sizing: border-box;
      }
      
      .header {
        padding: 10px;
        margin-bottom: 20px;
        border-bottom: 1px solid var(--vscode-panel-border);
      }
      
      .file-name {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .file-path {
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 10px;
      }
      
      .file-details {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .detail-item {
        display: flex;
        flex-direction: column;
      }
      
      .detail-label {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }
      
      .detail-value {
        font-size: 14px;
      }
      
      .view-controls {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
        padding: 5px;
        border-bottom: 1px solid var(--vscode-panel-border);
      }
      
      .view-button {
        padding: 5px 10px;
        background-color: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border: none;
        border-radius: 3px;
        cursor: pointer;
      }
      
      .view-button.active {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }
      
      /* List View */
      .children-container.list-view {
        display: flex;
        flex-direction: column;
        gap: 5px;
        overflow-y: auto;
        flex: 1;
      }
      
      .children-container.list-view .child-item {
        display: grid;
        grid-template-columns: 30px 1fr 80px 1fr;
        grid-template-areas: "icon name cover stickers";
        align-items: center;
        padding: 8px;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        cursor: pointer;
        background-color: var(--vscode-editor-background);
      }
      
      /* Icons View */
      .children-container.icons-view {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 15px;
        overflow-y: auto;
        flex: 1;
        padding: 15px;
      }
      
      .children-container.icons-view .child-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 10px;
        border: 1px solid transparent;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .children-container.icons-view .child-item:hover {
        border-color: var(--vscode-panel-border);
        background-color: var(--vscode-list-hoverBackground);
      }
      
      .children-container.icons-view .child-icon {
        font-size: 32px;
        margin-bottom: 8px;
      }
      
      .children-container.icons-view .child-name {
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100px;
      }
      
      .children-container.icons-view .child-cover,
      .children-container.icons-view .child-stickers {
        display: none;
      }
      
      /* Columns View */
      .children-container.columns-view {
        display: flex;
        overflow-x: auto;
        flex: 1;
      }
      
      .column {
        min-width: 250px;
        max-width: 300px;
        border-right: 1px solid var(--vscode-panel-border);
        overflow-y: auto;
        height: 100%;
      }
      
      .column-header {
        padding: 8px;
        font-weight: bold;
        border-bottom: 1px solid var(--vscode-panel-border);
        background-color: var(--vscode-editor-background);
        position: sticky;
        top: 0;
      }
      
      .children-container.columns-view .child-item {
        display: flex;
        align-items: center;
        padding: 8px;
        border-bottom: 1px solid var(--vscode-panel-border);
        cursor: pointer;
      }
      
      .children-container.columns-view .child-icon {
        margin-right: 8px;
      }
      
      .children-container.columns-view .child-cover,
      .children-container.columns-view .child-stickers {
        display: none;
      }
      
      /* Gallery View */
      .children-container.gallery-view {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
        overflow-y: auto;
        flex: 1;
        padding: 15px;
      }
      
      .children-container.gallery-view .child-item {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        overflow: hidden;
        cursor: pointer;
      }
      
      .children-container.gallery-view .child-cover {
        width: 100%;
        height: 120px;
        background-color: #333;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .children-container.gallery-view .child-cover img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .children-container.gallery-view .child-info {
        padding: 8px;
        display: flex;
        align-items: center;
      }
      
      .children-container.gallery-view .child-icon {
        margin-right: 8px;
      }
      
      .children-container.gallery-view .child-stickers {
        display: none;
      }
      
      /* Accordion behavior */
      .folder-children {
        margin-left: 20px;
        border-left: 1px solid var(--vscode-panel-border);
        padding-left: 10px;
        overflow: hidden;
        max-height: 0;
        transition: max-height 0.3s ease-out;
      }
      
      .folder-children.expanded {
        max-height: 1000px; /* Arbitrary large value */
        transition: max-height 0.5s ease-in;
      }
      
      .child-item:hover {
        background-color: var(--vscode-list-hoverBackground);
      }
      
      .child-icon {
        grid-area: icon;
        font-size: 18px;
        text-align: center;
      }
      
      .child-name {
        grid-area: name;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 10px;
      }
      
      .child-cover {
        grid-area: cover;
        width: 60px;
        height: 40px;
        background-color: #333;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: #999;
        margin: 0 10px;
        cursor: pointer;
        position: relative;
      }
      
      .child-cover:hover::after {
        content: "Click to set cover";
        position: absolute;
        bottom: -20px;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        background-color: var(--vscode-editor-background);
        padding: 2px;
        border-radius: 2px;
        z-index: 10;
      }
      
      .child-stickers {
        grid-area: stickers;
        display: flex;
        gap: 5px;
        overflow-x: auto;
        padding: 0 5px;
        min-height: 30px;
        align-items: center;
        cursor: pointer;
      }
      
      .child-stickers:empty::after {
        content: "No stickers. Click to add some.";
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
        font-style: italic;
      }
      
      .sticker {
        width: 24px;
        height: 24px;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .sticker img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 2px;
      }
      
      .error-message {
        color: var(--vscode-errorForeground);
        padding: 10px;
        margin-top: 10px;
        border: 1px solid var(--vscode-errorForeground);
        border-radius: 4px;
      }
      
      /* Comments container */
      .comments-container {
        padding: 10px;
        overflow-y: auto;
        flex: 1;
      }
      
      .comment {
        margin-bottom: 15px;
        padding: 8px;
        background-color: var(--vscode-editor-inactiveSelectionBackground);
        border-radius: 4px;
      }
      
      .comment pre {
        margin: 0;
        white-space: pre-wrap;
        font-family: var(--vscode-editor-font-family);
        font-size: 13px;
      }
    `;

    html = html.replace('{{styles}}', styles);

    // Add script
    const script = `
      (function() {
        const vscode = acquireVsCodeApi();
        
        // State
        let currentFileUri = null;
        let currentFileDetails = null;
        let children = [];
        
        // Elements
        const fileNameElement = document.getElementById('fileName');
        const filePathElement = document.getElementById('filePath');
        const fileDetailsElement = document.getElementById('fileDetails');
        const childrenContainerElement = document.getElementById('childrenContainer');
        
        // Function to format file size
        function formatFileSize(size) {
          if (size < 1024) {
            return size + ' B';
          } else if (size < 1024 * 1024) {
            return (size / 1024).toFixed(2) + ' KB';
          } else if (size < 1024 * 1024 * 1024) {
            return (size / (1024 * 1024)).toFixed(2) + ' MB';
          } else {
            return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
          }
        }
        
        // Function to format date
        function formatDate(date) {
          return new Date(date).toLocaleString();
        }
        
        // Function to get icon for file type
        function getFileTypeIcon(type) {
          switch (type) {
            case 'directory':
              return '📁';
            case 'javascript':
              return '📄 JS';
            case 'typescript':
              return '📄 TS';
            case 'json':
              return '📄 JSON';
            case 'html':
              return '📄 HTML';
            case 'css':
              return '📄 CSS';
            case 'markdown':
              return '📄 MD';
            case 'python':
              return '📄 PY';
            case 'image':
              return '🖼️';
            default:
              return '📄';
          }
        }
        
        // Function to display file details
        function displayFileDetails(details) {
          // Update state
          currentFileDetails = details;
          
          // Update file name and path
          fileNameElement.textContent = details.name;
          filePathElement.textContent = details.path;
          
          // Update file details
          fileDetailsElement.innerHTML = '';
          
          // Type
          const typeItem = document.createElement('div');
          typeItem.className = 'detail-item';
          
          const typeLabel = document.createElement('div');
          typeLabel.className = 'detail-label';
          typeLabel.textContent = 'Type';
          typeItem.appendChild(typeLabel);
          
          const typeValue = document.createElement('div');
          typeValue.className = 'detail-value';
          typeValue.textContent = details.type;
          typeItem.appendChild(typeValue);
          
          fileDetailsElement.appendChild(typeItem);
          
          // Size (if not a directory)
          if (!details.isDirectory) {
            const sizeItem = document.createElement('div');
            sizeItem.className = 'detail-item';
            
            const sizeLabel = document.createElement('div');
            sizeLabel.className = 'detail-label';
            sizeLabel.textContent = 'Size';
            sizeItem.appendChild(sizeLabel);
            
            const sizeValue = document.createElement('div');
            sizeValue.className = 'detail-value';
            sizeValue.textContent = formatFileSize(details.size);
            sizeItem.appendChild(sizeValue);
            
            fileDetailsElement.appendChild(sizeItem);
          }
          
          // Created
          const createdItem = document.createElement('div');
          createdItem.className = 'detail-item';
          
          const createdLabel = document.createElement('div');
          createdLabel.className = 'detail-label';
          createdLabel.textContent = 'Created';
          createdItem.appendChild(createdLabel);
          
          const createdValue = document.createElement('div');
          createdValue.className = 'detail-value';
          createdValue.textContent = formatDate(details.created);
          createdItem.appendChild(createdValue);
          
          fileDetailsElement.appendChild(createdItem);
          
          // Modified
          const modifiedItem = document.createElement('div');
          modifiedItem.className = 'detail-item';
          
          const modifiedLabel = document.createElement('div');
          modifiedLabel.className = 'detail-label';
          modifiedLabel.textContent = 'Modified';
          modifiedItem.appendChild(modifiedLabel);
          
          const modifiedValue = document.createElement('div');
          modifiedValue.className = 'detail-value';
          modifiedValue.textContent = formatDate(details.modified);
          modifiedItem.appendChild(modifiedValue);
          
          fileDetailsElement.appendChild(modifiedItem);
        }
        
        // Current view mode
        let currentViewMode = 'list';
        
        // Function to create view controls
        function createViewControls() {
          const viewControlsElement = document.createElement('div');
          viewControlsElement.className = 'view-controls';
          
          const viewModes = [
            { id: 'list', label: 'List' },
            { id: 'icons', label: 'Icons' },
            { id: 'columns', label: 'Columns' },
            { id: 'gallery', label: 'Gallery' }
          ];
          
          viewModes.forEach(mode => {
            const button = document.createElement('button');
            button.className = 'view-button' + (mode.id === currentViewMode ? ' active' : '');
            button.textContent = mode.label;
            button.dataset.mode = mode.id;
            
            button.addEventListener('click', () => {
              // Update active button
              document.querySelectorAll('.view-button').forEach(btn => {
                btn.classList.remove('active');
              });
              button.classList.add('active');
              
              // Update view mode
              currentViewMode = mode.id;
              
              // Update container class
              childrenContainerElement.className = 'children-container ' + mode.id + '-view';
              
              // Save view mode preference
              if (currentFileDetails && currentFileDetails.isDirectory) {
                const updatedDetails = { ...currentFileDetails, viewMode: mode.id };
                vscode.postMessage({
                  command: 'saveFileDetails',
                  fileUri: currentFileUri,
                  details: updatedDetails
                });
              }
              
              // Redisplay children with new view mode
              displayChildren(children, mode.id);
            });
            
            viewControlsElement.appendChild(button);
          });
          
          return viewControlsElement;
        }
        
        // Function to display children
        function displayChildren(childrenData, viewMode = currentViewMode) {
          // Update state
          children = childrenData;
          currentViewMode = viewMode;
          
          // Clear container
          childrenContainerElement.innerHTML = '';
          
          // Set view mode class
          childrenContainerElement.className = 'children-container ' + viewMode + '-view';
          
          // Add view controls if we have children and this is a directory
          if (currentFileDetails && currentFileDetails.isDirectory) {
            const viewControls = createViewControls();
            childrenContainerElement.appendChild(viewControls);
          }
          
          // Handle different view modes
          switch (viewMode) {
            case 'list':
              displayListView(children);
              break;
            case 'icons':
              displayIconsView(children);
              break;
            case 'columns':
              displayColumnsView(children);
              break;
            case 'gallery':
              displayGalleryView(children);
              break;
            default:
              displayListView(children);
          }
        }
        
        // Function to display list view
        function displayListView(children) {
          children.forEach(child => {
            const childElement = document.createElement('div');
            childElement.className = 'child-item';
            childElement.dataset.uri = child.uri;
            
            // Icon
            const iconElement = document.createElement('div');
            iconElement.className = 'child-icon';
            iconElement.textContent = getFileTypeIcon(child.type);
            childElement.appendChild(iconElement);
            
            // Name
            const nameElement = document.createElement('div');
            nameElement.className = 'child-name';
            nameElement.textContent = child.name;
            childElement.appendChild(nameElement);
            
            // Cover
            const coverElement = document.createElement('div');
            coverElement.className = 'child-cover';
            if (child.coverImage) {
              const imgElement = document.createElement('img');
              imgElement.src = child.coverImage;
              coverElement.appendChild(imgElement);
            } else {
              coverElement.textContent = 'No cover';
            }
            
            // Add click handler for cover image
            coverElement.addEventListener('click', (e) => {
              e.stopPropagation();
              // Send message to select cover image
              vscode.postMessage({
                command: 'selectCoverImage',
                fileUri: child.uri
              });
            });
            
            childElement.appendChild(coverElement);
            
            // Stickers
            const stickersElement = document.createElement('div');
            stickersElement.className = 'child-stickers';
            if (child.stickers && child.stickers.length > 0) {
              child.stickers.forEach(sticker => {
                const stickerElement = document.createElement('div');
                stickerElement.className = 'sticker';
                
                // If sticker is a path to an image
                if (typeof sticker === 'string' && (sticker.endsWith('.png') || sticker.endsWith('.jpg') || sticker.endsWith('.jpeg') || sticker.endsWith('.gif'))) {
                  const imgElement = document.createElement('img');
                  imgElement.src = sticker;
                  stickerElement.appendChild(imgElement);
                } else {
                  stickerElement.textContent = sticker;
                }
                
                stickersElement.appendChild(stickerElement);
              });
            }
            
            // Add click handler for stickers
            stickersElement.addEventListener('click', (e) => {
              e.stopPropagation();
              // Send message to select stickers
              vscode.postMessage({
                command: 'selectStickers',
                fileUri: child.uri
              });
            });
            
            childElement.appendChild(stickersElement);
            
            // Click handler for folders (accordion behavior)
            if (child.isDirectory) {
              childElement.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Check if folder children already exist
                const existingChildren = document.querySelector('.folder-children[data-parent="' + child.uri + '"]');
                
                if (existingChildren) {
                  // Toggle expanded state
                  existingChildren.classList.toggle('expanded');
                } else {
                  // Create folder children container
                  const folderChildren = document.createElement('div');
                  folderChildren.className = 'folder-children expanded';
                  folderChildren.dataset.parent = child.uri;
                  
                  // Add loading indicator
                  const loadingElement = document.createElement('div');
                  loadingElement.textContent = 'Loading...';
                  folderChildren.appendChild(loadingElement);
                  
                  // Insert after the current child
                  childElement.parentNode.insertBefore(folderChildren, childElement.nextSibling);
                  
                  // Request children
                  vscode.postMessage({
                    command: 'getChildren',
                    fileUri: child.uri
                  });
                }
              });
            } else {
              // Click handler for files
              childElement.addEventListener('click', () => {
                vscode.postMessage({
                  command: 'openFile',
                  fileUri: child.uri
                });
              });
            }
            
            childrenContainerElement.appendChild(childElement);
          });
        }
        
        // Function to display icons view
        function displayIconsView(children) {
          children.forEach(child => {
            const childElement = document.createElement('div');
            childElement.className = 'child-item';
            childElement.dataset.uri = child.uri;
            
            // Icon
            const iconElement = document.createElement('div');
            iconElement.className = 'child-icon';
            iconElement.textContent = getFileTypeIcon(child.type);
            childElement.appendChild(iconElement);
            
            // Name
            const nameElement = document.createElement('div');
            nameElement.className = 'child-name';
            nameElement.textContent = child.name;
            childElement.appendChild(nameElement);
            
            // Click handler
            if (child.isDirectory) {
              childElement.addEventListener('click', () => {
                vscode.postMessage({
                  command: 'getFileDetails',
                  fileUri: child.uri
                });
              });
            } else {
              childElement.addEventListener('click', () => {
                vscode.postMessage({
                  command: 'openFile',
                  fileUri: child.uri
                });
              });
            }
            
            childrenContainerElement.appendChild(childElement);
          });
        }
        
        // Function to display columns view
        function displayColumnsView(children) {
          // Create column
          const column = document.createElement('div');
          column.className = 'column';
          
          // Add column header
          const header = document.createElement('div');
          header.className = 'column-header';
          header.textContent = currentFileDetails ? currentFileDetails.name : 'Files';
          column.appendChild(header);
          
          // Add children
          children.forEach(child => {
            const childElement = document.createElement('div');
            childElement.className = 'child-item';
            childElement.dataset.uri = child.uri;
            
            // Icon
            const iconElement = document.createElement('div');
            iconElement.className = 'child-icon';
            iconElement.textContent = getFileTypeIcon(child.type);
            childElement.appendChild(iconElement);
            
            // Name
            const nameElement = document.createElement('div');
            nameElement.className = 'child-name';
            nameElement.textContent = child.name;
            childElement.appendChild(nameElement);
            
            // Click handler
            if (child.isDirectory) {
              childElement.addEventListener('click', () => {
                // Remove any columns to the right
                const columns = document.querySelectorAll('.column');
                let foundCurrent = false;
                
                columns.forEach(col => {
                  if (foundCurrent) {
                    col.remove();
                  }
                  if (col === column) {
                    foundCurrent = true;
                  }
                });
                
                // Request children
                vscode.postMessage({
                  command: 'getChildren',
                  fileUri: child.uri
                });
              });
            } else {
              childElement.addEventListener('click', () => {
                vscode.postMessage({
                  command: 'openFile',
                  fileUri: child.uri
                });
              });
            }
            
            column.appendChild(childElement);
          });
          
          childrenContainerElement.appendChild(column);
        }
        
        // Function to display gallery view
        function displayGalleryView(children) {
          children.forEach(child => {
            const childElement = document.createElement('div');
            childElement.className = 'child-item';
            childElement.dataset.uri = child.uri;
            
            // Cover
            const coverElement = document.createElement('div');
            coverElement.className = 'child-cover';
            if (child.coverImage) {
              const imgElement = document.createElement('img');
              imgElement.src = child.coverImage;
              coverElement.appendChild(imgElement);
            } else {
              // If no cover, show icon
              coverElement.textContent = getFileTypeIcon(child.type);
              coverElement.style.fontSize = '32px';
            }
            childElement.appendChild(coverElement);
            
            // Info section (icon + name)
            const infoElement = document.createElement('div');
            infoElement.className = 'child-info';
            
            // Icon
            const iconElement = document.createElement('div');
            iconElement.className = 'child-icon';
            iconElement.textContent = getFileTypeIcon(child.type);
            infoElement.appendChild(iconElement);
            
            // Name
            const nameElement = document.createElement('div');
            nameElement.className = 'child-name';
            nameElement.textContent = child.name;
            infoElement.appendChild(nameElement);
            
            childElement.appendChild(infoElement);
            
            // Click handler
            if (child.isDirectory) {
              childElement.addEventListener('click', () => {
                vscode.postMessage({
                  command: 'getFileDetails',
                  fileUri: child.uri
                });
              });
            } else {
              childElement.addEventListener('click', () => {
                vscode.postMessage({
                  command: 'openFile',
                  fileUri: child.uri
                });
              });
            }
            
            childrenContainerElement.appendChild(childElement);
          });
        }
        
        // Function to display file comments
        function displayFileComments(comments, filePath) {
          // Clear container
          childrenContainerElement.innerHTML = '';
          
          // Create comments container
          const commentsContainer = document.createElement('div');
          commentsContainer.className = 'comments-container';
          
          // Add heading
          const heading = document.createElement('h3');
          heading.textContent = 'Comments from ' + path.basename(filePath);
          heading.style.marginBottom = '15px';
          commentsContainer.appendChild(heading);
          
          if (comments.length === 0) {
            // No comments found
            const noComments = document.createElement('p');
            noComments.textContent = 'No comments found in this file.';
            noComments.style.fontStyle = 'italic';
            noComments.style.color = 'var(--vscode-descriptionForeground)';
            commentsContainer.appendChild(noComments);
          } else {
            // Display each comment
            comments.forEach((comment, index) => {
              const commentElement = document.createElement('div');
              commentElement.className = 'comment';
              
              // Format the comment text
              const commentText = document.createElement('pre');
              commentText.textContent = comment;
              
              commentElement.appendChild(commentText);
              commentsContainer.appendChild(commentElement);
            });
          }
          
          childrenContainerElement.appendChild(commentsContainer);
        }
        
        // Function to show error
        function showError(message) {
          const errorElement = document.createElement('div');
          errorElement.className = 'error-message';
          errorElement.textContent = message;
          
          // Add to body
          document.body.appendChild(errorElement);
          
          // Remove after 5 seconds
          setTimeout(() => {
            errorElement.remove();
          }, 5000);
        }
        
        // Function to show no workspace message
        function showNoWorkspaceMessage() {
          // Clear containers
          fileDetailsElement.innerHTML = '';
          childrenContainerElement.innerHTML = '';
          
          // Update title
          fileNameElement.textContent = 'No Workspace Open';
          filePathElement.textContent = '';
          
          // Create message
          const messageElement = document.createElement('div');
          messageElement.style.textAlign = 'center';
          messageElement.style.padding = '20px';
          messageElement.style.marginTop = '50px';
          
          // Create message paragraph
          const p1 = document.createElement('p');
          p1.textContent = 'No workspace is currently open.';
          messageElement.appendChild(p1);
          
          const p2 = document.createElement('p');
          p2.textContent = 'Please open a folder or browse for a file to view details.';
          messageElement.appendChild(p2);
          
          // Create browse button
          const browseButton = document.createElement('button');
          browseButton.id = 'browseButton';
          browseButton.textContent = 'Browse...';
          browseButton.style.marginTop = '20px';
          browseButton.style.padding = '8px 16px';
          messageElement.appendChild(browseButton);
          
          childrenContainerElement.appendChild(messageElement);
          
          // Add click handler to browse button
          document.getElementById('browseButton').addEventListener('click', () => {
            vscode.postMessage({
              command: 'browseWorkspace'
            });
          });
        }
        
        // Handle messages from the extension
        window.addEventListener('message', event => {
          const message = event.data;
          
          switch (message.command) {
            case 'setCurrentFile':
              currentFileUri = message.fileUri;
              fileNameElement.textContent = message.fileName;
              break;
              
            case 'fileDetails':
              displayFileDetails(message.details);
              // Set current view mode from details
              if (message.details.viewMode) {
                currentViewMode = message.details.viewMode;
              }
              break;
              
            case 'children':
              // Check if this is a response to a folder expansion
              if (message.parentUri && message.parentUri !== currentFileUri) {
                // Find the folder children container
                const folderChildren = document.querySelector('.folder-children[data-parent="' + message.parentUri + '"]');
                
                if (folderChildren) {
                  // Clear loading indicator
                  folderChildren.innerHTML = '';
                  
                  // Display children in the folder container
                  message.children.forEach(child => {
                    const childElement = document.createElement('div');
                    childElement.className = 'child-item';
                    childElement.dataset.uri = child.uri;
                    
                    // Icon
                    const iconElement = document.createElement('div');
                    iconElement.className = 'child-icon';
                    iconElement.textContent = getFileTypeIcon(child.type);
                    childElement.appendChild(iconElement);
                    
                    // Name
                    const nameElement = document.createElement('div');
                    nameElement.className = 'child-name';
                    nameElement.textContent = child.name;
                    childElement.appendChild(nameElement);
                    
                    // Click handler
                    if (child.isDirectory) {
                      childElement.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        // Check if folder children already exist
                        const existingChildren = document.querySelector('.folder-children[data-parent="' + child.uri + '"]');
                        
                        if (existingChildren) {
                          // Toggle expanded state
                          existingChildren.classList.toggle('expanded');
                        } else {
                          // Create folder children container
                          const nestedFolderChildren = document.createElement('div');
                          nestedFolderChildren.className = 'folder-children expanded';
                          nestedFolderChildren.dataset.parent = child.uri;
                          
                          // Add loading indicator
                          const loadingElement = document.createElement('div');
                          loadingElement.textContent = 'Loading...';
                          nestedFolderChildren.appendChild(loadingElement);
                          
                          // Insert after the current child
                          childElement.parentNode.insertBefore(nestedFolderChildren, childElement.nextSibling);
                          
                          // Request children
                          vscode.postMessage({
                            command: 'getChildren',
                            fileUri: child.uri
                          });
                        }
                      });
                    } else {
                      childElement.addEventListener('click', (e) => {
                        e.stopPropagation();
                        vscode.postMessage({
                          command: 'openFile',
                          fileUri: child.uri
                        });
                      });
                    }
                    
                    folderChildren.appendChild(childElement);
                  });
                }
              } else {
                // Display children in the main container
                displayChildren(message.children, message.viewMode);
              }
              break;
              
            case 'clearChildren':
              childrenContainerElement.innerHTML = '';
              break;
              
            case 'fileComments':
              displayFileComments(message.comments, message.filePath);
              break;
              
            case 'error':
              showError(message.message);
              break;
              
            case 'noWorkspace':
              showNoWorkspaceMessage();
              break;
              
            case 'detailsSaved':
              // Could show a notification or update UI if needed
              break;
          }
        });
        
        // Initial request for file details if we have a URI
        if (currentFileUri) {
          vscode.postMessage({
            command: 'getFileDetails',
            fileUri: currentFileUri
          });
        }
      })();
    `;

    html = html.replace('{{script}}', script);

    return html;
  }
}

module.exports = FileDetailsViewProvider;
