/**
 * File explorer functionality
 */

// State variables for file explorer
let isFileExplorerVisible = false;
let selectedFile = null;
let workspaceFiles = [];

/**
 * Populates the file explorer with workspace files
 */
function populateFileExplorer() {
  const fileTree = document.getElementById('fileTree');
  fileTree.innerHTML = '';

  console.log('Populating file explorer with', workspaceFiles ? workspaceFiles.length : 0, 'files');

  if (workspaceFiles && workspaceFiles.length > 0) {
    console.log('Files found, creating tree items');
    const fragment = document.createDocumentFragment();
    workspaceFiles.forEach(file => {
      console.log('Creating file tree item for', file.name, file.type);
      const fileElement = createFileTreeItem(file);
      fragment.appendChild(fileElement);
    });
    fileTree.appendChild(fragment);
  } else {
    console.log('No files found, showing empty message');
    fileTree.innerHTML = '<div class="file-tree-item">No files found</div>';
  }
}

/**
 * Creates a file tree item element
 * @param {Object} item - The file or folder item
 * @returns {HTMLElement} The file tree item element
 */
function createFileTreeItem(item) {
  const itemElement = document.createElement('div');
  itemElement.className = 'file-tree-item';
  itemElement.dataset.path = item.path;
  itemElement.dataset.type = item.type;

  // Create a container for the item's content (toggle, icon, and name)
  const contentElement = document.createElement('span');
  contentElement.className = 'file-tree-content';

  if (item.type === 'folder') {
    const toggleElement = document.createElement('span');
    toggleElement.className = 'file-tree-toggle';
    toggleElement.textContent = '▶';
    contentElement.appendChild(toggleElement);

    // Make the entire content element clickable for toggling the folder
    contentElement.addEventListener('click', (e) => {
      const childrenElement = itemElement.querySelector('.file-tree-children');
      if (childrenElement.classList.contains('hidden')) {
        childrenElement.classList.remove('hidden');
        toggleElement.textContent = '▼';
      } else {
        childrenElement.classList.add('hidden');
        toggleElement.textContent = '▶';
      }
    });

    const iconElement = document.createElement('span');
    iconElement.className = 'file-tree-icon file-tree-folder';
    iconElement.textContent = '📁';
    contentElement.appendChild(iconElement);

    const nameElement = document.createElement('span');
    nameElement.className = 'file-tree-name';
    nameElement.textContent = item.name;
    contentElement.appendChild(nameElement);

    // Append the content element to the item element
    itemElement.appendChild(contentElement);

    // Create and append the children element
    const childrenElement = document.createElement('div');
    childrenElement.className = 'file-tree-children hidden';
    if (item.children && item.children.length > 0) {
      item.children.forEach(child => {
        const childElement = createFileTreeItem(child);
        childrenElement.appendChild(childElement);
      });
    }
    itemElement.appendChild(childrenElement);
  } else {
    const iconElement = document.createElement('span');
    iconElement.className = 'file-tree-icon file-tree-file';
    iconElement.textContent = getFileIcon(item.extension);
    contentElement.appendChild(iconElement);

    const nameElement = document.createElement('span');
    nameElement.className = 'file-tree-name';
    nameElement.textContent = item.name;
    contentElement.appendChild(nameElement);

    // Append the content element to the item element
    itemElement.appendChild(contentElement);
  }

  // Make the content element draggable
  contentElement.draggable = true;
  contentElement.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      path: item.path,
      name: item.name,
      type: item.type
    }));
    contentElement.classList.add('dragging');
    selectedFile = item;
  });

  contentElement.addEventListener('dragend', () => {
    contentElement.classList.remove('dragging');
  });

  return itemElement;
}
