/**
 * WebView Provider for Monster Canvas
 */
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { getWebviewContent } = require('./webviewContent');
const {
  loadCharacterData,
  loadShapeData,
  saveCharacterData,
  saveShapeData,
  resetCharacterPositions,
  resetShapes
} = require('../utils/storage');
const { defaultCharacterData, defaultShapes, shapeTypes } = require('../utils/constants');

/**
 * Manages the webview panel for the Monster Canvas
 */
class monsterCanvasWebviewProvider {
  /**
   * Creates a new instance of the webview provider
   * @param {vscode.ExtensionContext} context - The extension context
   */
  constructor(context) {
    this.context = context;
    this.panel = null;
    this.currentImageState = null;
  }

  /**
   * Opens the webview panel
   */
  openWebview() {
    // If we already have a panel, show it
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    // Create and show a new webview panel
    this.panel = vscode.window.createWebviewPanel(
      'monsterCanvas', // Identifies the type of the webview
      'Monster Canvas', // Title displayed in the editor tab
      vscode.ViewColumn.One, // Editor column to show the webview in
      {
        // Enable scripts in the webview
        enableScripts: true,
        // Restrict the webview to only load resources from the extension's directory
        localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath))],
        // Retain context when hidden
        retainContextWhenHidden: true
      }
    );

    // Load saved data or use defaults
    const characterData = loadCharacterData(this.context, defaultCharacterData);
    const shapes = loadShapeData(this.context, defaultShapes);

    // Get workspace files and folders
    const workspaceFiles = this.getWorkspaceFiles();

    // Set the webview's HTML content
    this.panel.webview.html = getWebviewContent(
      characterData,
      shapes,
      JSON.stringify(defaultCharacterData),
      JSON.stringify(defaultShapes),
      JSON.stringify(shapeTypes),
      JSON.stringify(workspaceFiles)
    );

    // Set up message handling
    this.setupMessageHandling();

    // Handle panel disposal
    this.panel.onDidDispose(() => this.handlePanelDisposal(), null, this.context.subscriptions);
  }

  /**
   * Sets up message handling for the webview
   */
  setupMessageHandling() {
    this.panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'saveCoordinates':
            this.handleSaveCoordinates(message.data, !message.autoSave);
            return;
          case 'resetPositions':
            this.handleResetPositions();
            return;
          case 'saveShapes':
            this.handleSaveShapes(message.data, !message.autoSave);
            return;
          case 'resetShapes':
            this.handleResetShapes();
            return;
          case 'getWorkspaceFiles':
            this.handleGetWorkspaceFiles();
            return;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * Handles saving character coordinates
   * @param {Array} data - The character data to save
   * @param {boolean} showNotification - Whether to show a notification
   */
  handleSaveCoordinates(data, showNotification) {
    // Save the coordinates of the characters to extension storage
    saveCharacterData(
      this.context,
      data,
      showNotification,
      message => vscode.window.showInformationMessage(message)
    );

    // Update current state
    this.currentImageState = data;
  }

  /**
   * Handles resetting character positions
   */
  handleResetPositions() {
    // Update current state with default positions
    this.currentImageState = resetCharacterPositions(
      this.context,
      defaultCharacterData,
      message => vscode.window.showInformationMessage(message)
    );
  }

  /**
   * Handles saving shapes
   * @param {Array} data - The shape data to save
   * @param {boolean} showNotification - Whether to show a notification
   */
  handleSaveShapes(data, showNotification) {
    saveShapeData(
      this.context,
      data,
      showNotification,
      message => vscode.window.showInformationMessage(message)
    );
  }

  /**
   * Handles resetting shapes
   */
  handleResetShapes() {
    resetShapes(
      this.context,
      defaultShapes,
      message => vscode.window.showInformationMessage(message)
    );
  }

  /**
   * Handles panel disposal
   */
  handlePanelDisposal() {
    // Save positions when the panel is disposed
    if (this.currentImageState) {
      this.context.globalState.update('monsterCharacterData', this.currentImageState);
    }

    this.panel = null;
  }

  /**
   * Gets the workspace files and folders
   * @returns {Array} Array of file and folder objects
   */
  getWorkspaceFiles() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      console.log('No workspace folders found');
      return [];
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    console.log('Root path:', rootPath);
    const files = this.getFilesAndFoldersInDirectory(rootPath, '');
    console.log('Workspace files:', files.length);
    return files;
  }

  /**
   * Gets files and folders in a directory recursively
   * @param {string} directoryPath - The directory path
   * @param {string} relativePath - The relative path from the workspace root
   * @returns {Array} Array of file and folder objects
   */
  getFilesAndFoldersInDirectory(directoryPath, relativePath) {
    console.log('Reading directory:', directoryPath);
    const result = [];

    try {
      const items = fs.readdirSync(directoryPath, { withFileTypes: true });
      console.log('Found', items.length, 'items in directory');

      for (const item of items) {
        const itemPath = path.join(directoryPath, item.name);
        const itemRelativePath = path.join(relativePath, item.name);

        if (item.isDirectory()) {
          // Skip node_modules and .git directories
          if (item.name === 'node_modules' || item.name === '.git') {
            console.log('Skipping directory:', item.name);
            continue;
          }

          console.log('Processing directory:', item.name);
          try {
            const children = this.getFilesAndFoldersInDirectory(itemPath, itemRelativePath);
            result.push({
              name: item.name,
              path: itemRelativePath,
              type: 'folder',
              children: children
            });
          } catch (err) {
            console.error('Error processing directory', item.name, ':', err.message);
          }
        } else {
          console.log('Processing file:', item.name);
          result.push({
            name: item.name,
            path: itemRelativePath,
            type: 'file',
            extension: path.extname(item.name)
          });
        }
      }
    } catch (err) {
      console.error('Error reading directory', directoryPath, ':', err.message);
      // Return an empty array instead of throwing an error
      return [];
    }

    return result;
  }

  /**
   * Handles getting workspace files
   */
  handleGetWorkspaceFiles() {
    console.log('Handling getWorkspaceFiles command');
    const workspaceFiles = this.getWorkspaceFiles();
    console.log('Sending workspace files to webview:', workspaceFiles.length);
    this.panel.webview.postMessage({
      command: 'updateWorkspaceFiles',
      data: workspaceFiles
    });
  }
}

module.exports = monsterCanvasWebviewProvider;
