const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * Provider for the file explorer tree view
 */
class FileExplorerProvider {
  constructor(context) {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.context = context;

    // Watch for file system changes
    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*');
    fileSystemWatcher.onDidCreate(() => this.refresh());
    fileSystemWatcher.onDidDelete(() => this.refresh());
    fileSystemWatcher.onDidChange(() => this.refresh());
    context.subscriptions.push(fileSystemWatcher);
  }

  /**
   * Refresh the tree view
   */
  refresh() {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get the children of a tree item
   * @param {vscode.TreeItem} element - The tree item
   * @returns {Promise<vscode.TreeItem[]>} - The children of the tree item
   */
  getChildren(element) {
    if (!vscode.workspace.workspaceFolders) {
      return Promise.resolve([]);
    }

    if (!element) {
      // Root level - return workspace folders
      return Promise.resolve(this._getWorkspaceFolders());
    } else {
      // Child level - return files and folders in the directory
      return Promise.resolve(this._getFilesInDirectory(element.resourceUri.fsPath));
    }
  }

  /**
   * Get the tree item for a given element
   * @param {vscode.TreeItem} element - The element
   * @returns {vscode.TreeItem} - The tree item
   */
  getTreeItem(element) {
    return element;
  }

  /**
   * Get the workspace folders as tree items
   * @returns {vscode.TreeItem[]} - The workspace folders
   */
  _getWorkspaceFolders() {
    if (!vscode.workspace.workspaceFolders) {
      return [];
    }

    return vscode.workspace.workspaceFolders.map(folder => {
      const treeItem = new vscode.TreeItem(
        folder.name,
        vscode.TreeItemCollapsibleState.Collapsed
      );
      treeItem.resourceUri = folder.uri;
      treeItem.iconPath = new vscode.ThemeIcon('folder');
      treeItem.contextValue = 'folder';
      treeItem.tooltip = folder.uri.fsPath;
      return treeItem;
    });
  }

  /**
   * Get the files and folders in a directory as tree items
   * @param {string} directoryPath - The directory path
   * @returns {vscode.TreeItem[]} - The files and folders
   */
  _getFilesInDirectory(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
      return [];
    }

    const files = fs.readdirSync(directoryPath);

    return files.map(file => {
      const filePath = path.join(directoryPath, file);
      const stats = fs.statSync(filePath);

      const treeItem = new vscode.TreeItem(
        file,
        stats.isDirectory()
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );

      treeItem.resourceUri = vscode.Uri.file(filePath);

      if (stats.isDirectory()) {
        treeItem.iconPath = new vscode.ThemeIcon('folder');
        treeItem.contextValue = 'folder';
      } else {
        treeItem.iconPath = new vscode.ThemeIcon('file');
        treeItem.contextValue = 'file';
        treeItem.command = {
          command: 'fileDrawer.openDrawingCanvas',
          title: 'Open Drawing Canvas',
          arguments: [treeItem.resourceUri]
        };
      }

      treeItem.tooltip = filePath;

      return treeItem;
    });
  }
}

module.exports = FileExplorerProvider;
