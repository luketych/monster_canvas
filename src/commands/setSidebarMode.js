const vscode = require('vscode');

/**
 * Sets the Depth Viewer to sidebar mode
 */
async function setSidebarMode() {
  // Update the configuration
  await vscode.workspace.getConfiguration('fileDrawer').update('depthViewLocation', 'sidebar', true);

  // Set the context key directly
  await vscode.commands.executeCommand('setContext', 'fileDrawer.depthViewLocation', 'sidebar');

  // Show the file drawer sidebar
  await vscode.commands.executeCommand('workbench.view.extension.file-drawer');

  vscode.window.showInformationMessage('Depth Viewer location set to sidebar');
}

module.exports = {
  setSidebarMode
};
