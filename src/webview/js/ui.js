/**
 * UI-related functionality
 */

// UI state
let isPaletteVisible = true;
let isShapePaletteVisible = true;
let isCanvasExplorerVisible = false;
let selectedCharacter = null;
let selectedShapeType = null;
let currentMode = 'drag'; // 'drag' or 'delete'

/**
 * Initializes UI elements and event handlers
 */
function initUI() {
  // Button handlers
  document.getElementById('saveBtn').addEventListener('click', handleSaveButtonClick);
  document.getElementById('resetBtn').addEventListener('click', handleResetButtonClick);
  document.getElementById('resetShapesBtn').addEventListener('click', handleResetShapesButtonClick);
  document.getElementById('dragModeBtn').addEventListener('click', handleDragModeButtonClick);
  document.getElementById('deleteModeBtn').addEventListener('click', handleDeleteModeButtonClick);
  document.getElementById('togglePaletteBtn').addEventListener('click', handleTogglePaletteButtonClick);
  document.getElementById('toggleShapePaletteBtn').addEventListener('click', handleToggleShapePaletteButtonClick);
  document.getElementById('toggleFileExplorerBtn').addEventListener('click', handleToggleFileExplorerButtonClick);
  document.getElementById('toggleCanvasExplorerBtn').addEventListener('click', handleToggleCanvasExplorerButtonClick);

  // Initialize palettes
  populateCharacterPalette();
  populateShapePalette();
}

/**
 * Initializes the sidebar
 */
function initSidebar() {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');

  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');

    // Update toggle button text
    sidebarToggle.textContent = sidebar.classList.contains('collapsed') ? '≫' : '≡';
  });
}

/**
 * Handles save button click
 */
function handleSaveButtonClick() {
  vscode.postMessage({
    command: 'saveCoordinates',
    data: characters
  });
}

/**
 * Handles reset button click
 */
function handleResetButtonClick() {
  characters = JSON.parse(JSON.stringify(defaultCharacterData));
  drawCanvas();

  vscode.postMessage({
    command: 'resetPositions'
  });
}

/**
 * Handles reset shapes button click
 */
function handleResetShapesButtonClick() {
  shapes = JSON.parse(JSON.stringify(defaultShapesData));
  drawCanvas();

  vscode.postMessage({
    command: 'resetShapes'
  });
}

/**
 * Handles drag mode button click
 */
function handleDragModeButtonClick() {
  currentMode = 'drag';
  document.getElementById('dragModeBtn').classList.add('active-mode');
  document.getElementById('deleteModeBtn').classList.remove('active-mode');
  canvas.style.cursor = 'default';
}

/**
 * Handles delete mode button click
 */
function handleDeleteModeButtonClick() {
  currentMode = 'delete';
  document.getElementById('deleteModeBtn').classList.add('active-mode');
  document.getElementById('dragModeBtn').classList.remove('active-mode');

  // Deselect any selected characters or shapes
  deselectAllPaletteCharacters();
  deselectAllShapeButtons();

  // Change cursor to indicate delete mode
  canvas.style.cursor = 'not-allowed';
}

/**
 * Handles toggle palette button click
 */
function handleTogglePaletteButtonClick() {
  const palette = document.getElementById('characterPalette');
  isPaletteVisible = !isPaletteVisible;

  if (isPaletteVisible) {
    palette.classList.remove('hidden');
    document.getElementById('togglePaletteBtn').textContent = 'Hide Characters';
  } else {
    palette.classList.add('hidden');
    document.getElementById('togglePaletteBtn').textContent = 'Show Characters';
  }
}

/**
 * Handles toggle shape palette button click
 */
function handleToggleShapePaletteButtonClick() {
  const palette = document.getElementById('shapePalette');
  isShapePaletteVisible = !isShapePaletteVisible;

  if (isShapePaletteVisible) {
    palette.classList.remove('hidden');
    document.getElementById('toggleShapePaletteBtn').textContent = 'Hide Shapes';
  } else {
    palette.classList.add('hidden');
    document.getElementById('toggleShapePaletteBtn').textContent = 'Show Shapes';
  }
}

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
 * Handles toggle canvas explorer button click
 */
function handleToggleCanvasExplorerButtonClick() {
  const canvasExplorer = document.getElementById('canvasExplorer');
  isCanvasExplorerVisible = !isCanvasExplorerVisible;

  console.log('Toggle canvas explorer:', isCanvasExplorerVisible);

  if (isCanvasExplorerVisible) {
    canvasExplorer.classList.remove('hidden');
    document.getElementById('toggleCanvasExplorerBtn').textContent = 'Hide Canvas Files';

    // Populate the canvas explorer with files/folders on the canvas
    populateCanvasExplorer();
  } else {
    canvasExplorer.classList.add('hidden');
    document.getElementById('toggleCanvasExplorerBtn').textContent = 'Show Canvas Files';
  }
}

/**
 * Populates the character palette with Unicode characters
 */
function populateCharacterPalette() {
  const palette = document.getElementById('characterPalette');
  palette.innerHTML = '';

  for (const [category, chars] of Object.entries(unicodeCharacters)) {
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'palette-section-title';
    sectionTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    palette.appendChild(sectionTitle);

    chars.forEach(char => {
      const charElement = document.createElement('div');
      charElement.className = 'palette-character';
      charElement.textContent = char;
      charElement.title = char;

      charElement.addEventListener('click', () => {
        deselectAllPaletteCharacters();
        charElement.classList.add('selected');
        selectedCharacter = char;
        selectedShapeType = null;
        deselectAllShapeButtons();
        currentMode = 'drag';
        document.getElementById('dragModeBtn').classList.add('active-mode');
      });

      palette.appendChild(charElement);
    });
  }
}

/**
 * Populates the shape palette with shape buttons
 */
function populateShapePalette() {
  const shapeButtons = document.querySelector('.shape-buttons');
  shapeButtons.innerHTML = '';

  shapeTypes.forEach(shapeType => {
    const button = document.createElement('div');
    button.className = 'shape-button';
    button.textContent = shapeType.name;
    button.dataset.type = shapeType.type;

    button.addEventListener('click', () => {
      deselectAllShapeButtons();
      button.classList.add('selected');
      selectedShapeType = shapeType.type;
      selectedCharacter = null;
      deselectAllPaletteCharacters();
      currentMode = 'drag';
      document.getElementById('dragModeBtn').classList.add('active-mode');
    });

    shapeButtons.appendChild(button);
  });
}

/**
 * Deselects all palette characters
 */
function deselectAllPaletteCharacters() {
  document.querySelectorAll('.palette-character').forEach(el => el.classList.remove('selected'));
  selectedCharacter = null;
}

/**
 * Deselects all shape buttons
 */
function deselectAllShapeButtons() {
  document.querySelectorAll('.shape-button').forEach(el => el.classList.remove('selected'));
  selectedShapeType = null;
}

/**
 * Populates the canvas explorer with files and folders currently on the canvas
 */
function populateCanvasExplorer() {
  const canvasFileTree = document.getElementById('canvasFileTree');
  canvasFileTree.innerHTML = '';

  console.log('Populating canvas explorer');

  // Get all characters with file/folder metadata
  const fileCharacters = characters.filter(char => char.metadata && char.metadata.path);

  if (fileCharacters.length > 0) {
    console.log('Files/folders on canvas:', fileCharacters.length);

    // Group files by type (file or folder)
    const files = fileCharacters.filter(char => char.metadata.type === 'file');
    const folders = fileCharacters.filter(char => char.metadata.type === 'folder');

    // Create a document fragment to improve performance
    const fragment = document.createDocumentFragment();

    // Add folders first
    if (folders.length > 0) {
      const foldersSectionTitle = document.createElement('div');
      foldersSectionTitle.className = 'palette-section-title';
      foldersSectionTitle.textContent = 'Folders';
      fragment.appendChild(foldersSectionTitle);

      folders.forEach(folder => {
        const folderElement = createCanvasFileItem(folder);
        fragment.appendChild(folderElement);
      });
    }

    // Add files
    if (files.length > 0) {
      const filesSectionTitle = document.createElement('div');
      filesSectionTitle.className = 'palette-section-title';
      filesSectionTitle.textContent = 'Files';
      fragment.appendChild(filesSectionTitle);

      files.forEach(file => {
        const fileElement = createCanvasFileItem(file);
        fragment.appendChild(fileElement);
      });
    }

    canvasFileTree.appendChild(fragment);
  } else {
    console.log('No files/folders on canvas');
    canvasFileTree.innerHTML = '<div class="file-tree-item">No files on canvas</div>';
  }
}

/**
 * Creates a file tree item element for the canvas explorer
 * @param {Object} character - The character object with file/folder metadata
 * @returns {HTMLElement} The file tree item element
 */
function createCanvasFileItem(character) {
  const itemElement = document.createElement('div');
  itemElement.className = 'file-tree-item';
  itemElement.dataset.path = character.metadata.path;
  itemElement.dataset.type = character.metadata.type;

  // Create a container for the item's content (icon and name)
  const contentElement = document.createElement('span');
  contentElement.className = 'file-tree-content';

  // Add icon
  const iconElement = document.createElement('span');
  iconElement.className = 'file-tree-icon';
  if (character.metadata.type === 'folder') {
    iconElement.className += ' file-tree-folder';
    iconElement.textContent = '📁';
  } else {
    iconElement.className += ' file-tree-file';
    // Get file extension
    const extension = character.metadata.path.substring(character.metadata.path.lastIndexOf('.'));
    iconElement.textContent = getFileIcon(extension);
  }
  contentElement.appendChild(iconElement);

  // Add name
  const nameElement = document.createElement('span');
  nameElement.className = 'file-tree-name';
  nameElement.textContent = character.metadata.name;
  contentElement.appendChild(nameElement);

  // Add click handler to flash the location on the canvas
  contentElement.addEventListener('click', () => {
    flashCharacterOnCanvas(character);
  });

  // Append the content element to the item element
  itemElement.appendChild(contentElement);

  return itemElement;
}

// Export the UI functions
window.ui = {
  initUI,
  initSidebar,
  populateCharacterPalette,
  populateShapePalette,
  populateCanvasExplorer,
  createCanvasFileItem
};
