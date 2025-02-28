/**
 * File explorer functionality
 */

// State variables for file explorer
let isFileExplorerVisible = false;
let selectedFile = null;
let workspaceFiles = [];
let usedFiles = new Set(); // Track files that have been added to the canvas

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
    const toggleFolder = (e) => {
      const childrenElement = itemElement.querySelector('.file-tree-children');
      if (childrenElement.classList.contains('hidden')) {
        childrenElement.classList.remove('hidden');
        toggleElement.textContent = '▼';
      } else {
        childrenElement.classList.add('hidden');
        toggleElement.textContent = '▶';
      }
    };

    contentElement.addEventListener('click', toggleFolder);

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

  // Check if this file is already on the canvas
  const isUsed = usedFiles.has(item.path);

  // Add greyed out style if the file/folder is already on the canvas
  if (isUsed) {
    contentElement.classList.add('used-file');

    // Add click handler to flash the location on the canvas, but only for files
    // For folders, we'll modify the existing click handler
    if (item.type !== 'folder') {
      contentElement.addEventListener('click', () => {
        // Find the character on the canvas with this file path
        const character = characters.find(char =>
          char.metadata && char.metadata.path === item.path
        );

        if (character) {
          flashCharacterOnCanvas(character);
        }
      });
    } else {
      // For folders, replace the click handler to both toggle and flash
      contentElement.removeEventListener('click', toggleFolder);
      contentElement.addEventListener('click', (e) => {
        // First toggle the folder
        const childrenElement = itemElement.querySelector('.file-tree-children');
        if (childrenElement.classList.contains('hidden')) {
          childrenElement.classList.remove('hidden');
          itemElement.querySelector('.file-tree-toggle').textContent = '▼';
        } else {
          childrenElement.classList.add('hidden');
          itemElement.querySelector('.file-tree-toggle').textContent = '▶';
        }

        // Then flash the folder on the canvas
        const character = characters.find(char =>
          char.metadata && char.metadata.path === item.path
        );

        if (character) {
          flashCharacterOnCanvas(character);
        }
      });
    }
  }

  // Make the content element draggable only if it's not already used
  contentElement.draggable = !isUsed;

  if (contentElement.draggable) {
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
  }

  return itemElement;
}
