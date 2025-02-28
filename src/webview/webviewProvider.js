/**
 * WebView Provider for Monster Canvas
 */
const vscode = require('vscode');
const path = require('path');
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

    // Set the webview's HTML content
    this.panel.webview.html = getWebviewContent(
      characterData,
      shapes,
      JSON.stringify(defaultCharacterData),
      JSON.stringify(defaultShapes),
      JSON.stringify(shapeTypes)
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
}

module.exports = monsterCanvasWebviewProvider;
