/**
 * File explorer functionality
 */

// State variables for file explorer
let isFileExplorerVisible = false;
let selectedFile = null;
workspaceFiles = [];

/**
 * Handles toggle file explorer button click
 */
function handleToggleFileExplorerButtonClick() {
  const fileExplorer = document.getElementById('fileExplorer');
  isFileExplorerVisible = !isFileExplorerVisible;

  console.log('Toggle file explorer:', isFileExplorerVisible);

  if (isFileExplorerVisible) {
    fileExplorer.classList.remove('hidden');
    document.getElementById('toggleFileExplorerBtn').textContent = 'Hide Files';

    // Request updated workspace files
    console.log('Requesting workspace files');
    vscode.postMessage({
      command: 'getWorkspaceFiles'
    });
  } else {
    fileExplorer.classList.add('hidden');
    document.getElementById('toggleFileExplorerBtn').textContent = 'Show Files';
  }
}

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

/**
 * Gets an icon for a file based on its extension
 * @param {string} extension - The file extension
 * @returns {string} The icon character
 */
function getFileIcon(extension) {
  switch (extension.toLowerCase()) {
    case '.js':
    case '.ts':
      return '📄 JS';
    case '.html':
      return '📄 HTML';
    case '.css':
      return '📄 CSS';
    case '.json':
      return '📄 JSON';
    case '.md':
      return '📄 MD';
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.svg':
      return '🖼️';
    default:
      return '📄';
  }
}

/**
 * Handles drag over events on the canvas
 * @param {DragEvent} e - The drag event
 */
function handleCanvasDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

/**
 * Handles drop events on the canvas
 * @param {DragEvent} e - The drop event
 */
function handleCanvasDrop(e) {
  e.preventDefault();

  const rect = canvas.canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  try {
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));

    if (data && data.name) {
      // Create a new character with the file/folder name
      const newChar = {
        id: nextCharacterId++,
        character: data.type === 'folder' ? '📁' : '📄',
        x: mouseX,
        y: mouseY,
        size: 50,
        color: utils.getRandomColor(),
        metadata: {
          name: data.name,
          path: data.path,
          type: data.type
        }
      };

      characters.push(newChar);
      canvas.drawCanvas();

      vscode.postMessage({
        command: 'saveCoordinates',
        data: characters,
        autoSave: true
      });
    }
  } catch (err) {
    console.error('Error parsing dropped data:', err);
  }
}

// Expose functions and variables as global objects
window.explorer = {
  handleToggleFileExplorerButtonClick,
  populateFileExplorer,
  handleCanvasDragOver,
  handleCanvasDrop,
  isFileExplorerVisible,
  selectedFile,
  workspaceFiles
};
