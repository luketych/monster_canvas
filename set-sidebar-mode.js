const vscode = require('vscode');

// This script sets the fileDrawer.depthViewLocation setting to 'sidebar'
function setSidebarMode() {
  // Get the configuration
  const config = vscode.workspace.getConfiguration('fileDrawer');

  // Update the depthViewLocation setting
  config.update('depthViewLocation', 'sidebar', vscode.ConfigurationTarget.Global)
    .then(() => {
      console.log('Set fileDrawer.depthViewLocation to "sidebar"');

      // Show the file drawer sidebar
      vscode.commands.executeCommand('workbench.view.extension.file-drawer');

      // Set the context variable directly
      vscode.commands.executeCommand('setContext', 'fileDrawer.depthViewLocation', 'sidebar');
    })
    .catch(err => {
      console.error('Error updating setting:', err);
    });
}

// Execute immediately
setSidebarMode();

module.exports = {
  setSidebarMode
};
