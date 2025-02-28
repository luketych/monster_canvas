/**
 * Monster Canvas Extension
 * 
 * A VS Code extension that displays a canvas where Unicode characters can be 
 * dragged around, drawn on, and selected from a palette.
 */
const vscode = require('vscode');
const monsterCanvasWebviewProvider = require('./webview/webviewProvider');

/**
 * Activates the extension
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Monster Canvas extension is now active');

  // Create the webview provider
  const webviewProvider = new monsterCanvasWebviewProvider(context);

  // Register the command to open the canvas
  let disposable = vscode.commands.registerCommand('monsterCanvas.openCanvas', () => {
    webviewProvider.openWebview();
  });

  context.subscriptions.push(disposable);
}

/**
 * Deactivates the extension
 */
function deactivate() { }

module.exports = {
  activate,
  deactivate
};
