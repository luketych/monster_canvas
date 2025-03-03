const vscode = require('vscode');
const FileExplorerProvider = require('./sidebar/fileExplorerProvider');
const DrawingViewProvider = require('./webview/drawingViewProvider');
const FileDetailsViewProvider = require('./webview/fileDetailsViewProvider');
const DepthViewProvider = require('./webview/depthViewProvider');
const path = require('path');
const fs = require('fs');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Monster Canvas extension is now active');

  // Create monster-cache directory if it doesn't exist
  const cacheDir = path.join(context.extensionPath, '..', 'monster-cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Register the file explorer tree view provider
  const fileExplorerProvider = new FileExplorerProvider(context);
  const treeView = vscode.window.createTreeView('fileDrawer.fileExplorer', {
    treeDataProvider: fileExplorerProvider,
    showCollapseAll: true
  });
  context.subscriptions.push(treeView);

  // Register the image viewer webview provider
  const imageViewProvider = new DrawingViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DrawingViewProvider.viewType,
      imageViewProvider
    )
  );

  // Create the file details view provider
  const fileDetailsViewProvider = new FileDetailsViewProvider(context);

  // Create the depth viewer provider
  const depthViewProvider = new DepthViewProvider(context);

  // Register the openDepthView command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'fileDrawer.openDepthView',
      (fileUri) => {
        depthViewProvider.openDepthView(fileUri);
      }
    )
  );

  // Function to update depth view location based on setting
  function updateDepthViewLocation() {
    const config = vscode.workspace.getConfiguration('fileDrawer');
    const location = config.get('depthViewLocation', 'editor');

    // Remove existing registrations
    if (depthViewProvider._panel) {
      depthViewProvider._panel.dispose();
      depthViewProvider._panel = null;
    }

    // Remove existing view registration if any
    const existingView = vscode.window.visibleTextEditors.find(editor =>
      editor.document.uri.scheme === 'fileDrawer.depthView'
    );
    if (existingView) {
      existingView.dispose();
    }

    if (location === 'sidebar') {
      // Register as a webview view in the sidebar
      const viewProvider = vscode.window.registerWebviewViewProvider(
        DepthViewProvider.viewType,
        depthViewProvider
      );
      context.subscriptions.push(viewProvider);

      // Show the view
      vscode.commands.executeCommand('workbench.view.extension.file-drawer');
    }
  }

  // Initial setup
  updateDepthViewLocation();

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('fileDrawer.depthViewLocation')) {
        updateDepthViewLocation();
      }
    })
  );

  // Register commands
  const openImageViewerCommand = vscode.commands.registerCommand(
    'fileDrawer.openDrawingCanvas',
    (fileUri) => {
      if (fileUri) {
        imageViewProvider.openDrawingCanvas(fileUri);
      }
    }
  );
  context.subscriptions.push(openImageViewerCommand);

  // Command to open the file details view
  const openFileDetailsCommand = vscode.commands.registerCommand(
    'fileDrawer.openFileDetails',
    (fileUri) => {
      fileDetailsViewProvider.openFileDetailsView(fileUri);
    }
  );
  context.subscriptions.push(openFileDetailsCommand);

  // Command to open the file explorer view
  const openFileExplorerCommand = vscode.commands.registerCommand(
    'fileDrawer.openFileExplorer',
    () => {
      vscode.commands.executeCommand('workbench.view.extension.file-drawer');
    }
  );
  context.subscriptions.push(openFileExplorerCommand);

  // Command to focus the image viewer
  const focusImageViewerCommand = vscode.commands.registerCommand(
    'fileDrawer.focusDrawingCanvas',
    () => {
      if (imageViewProvider._view) {
        imageViewProvider._view.show(true);
      } else {
        vscode.window.showInformationMessage('Image viewer is not yet available. Please open a file first.');
      }
    }
  );
  context.subscriptions.push(focusImageViewerCommand);

  // Handle tree view selection changes
  treeView.onDidChangeSelection(event => {
    if (event.selection.length > 0) {
      const selectedItem = event.selection[0];
      imageViewProvider.openDrawingCanvas(selectedItem.resourceUri);
      fileDetailsViewProvider.openFileDetailsView(selectedItem.resourceUri);
      depthViewProvider.openDepthView(selectedItem.resourceUri);
    }
  });
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
};
