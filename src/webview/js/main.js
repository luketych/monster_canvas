/**
 * Main entry point for the webview JavaScript
 * 
 * This file contains all the functionality for the Monster Canvas webview.
 * It's organized into logical sections:
 * 1. Initialization and global variables
 * 2. Canvas drawing functions
 * 3. Event handlers
 * 4. UI functions
 * 5. File explorer functions
 * 6. Utility functions
 */

// ===== 1. INITIALIZATION AND GLOBAL VARIABLES =====

// Canvas and context
let canvas;
let ctx;

// State variables
let characters = [];
let shapes = [];
let shapeTypes = [];
let unicodeCharacters = {};
let defaultCharacterData = [];
let defaultShapesData = [];
let nextCharacterId = 1;
let nextShapeId = 1;
let workspaceFiles = [];

// UI state
let isPaletteVisible = true;
let isShapePaletteVisible = true;
let isFileExplorerVisible = false;
let selectedCharacter = null;
let selectedShapeType = null;
let selectedFile = null;
let currentMode = 'drag';

// Canvas interaction state
let draggedCharacter = null;
let draggedShape = null;
let resizingShape = null;
let offsetX = 0;
let offsetY = 0;
let isCarryingMode = false;

/**
 * Initializes the webview
 */
function init(initialCharacters, initialShapes, initialShapeTypes, initialUnicodeCharacters, initialDefaultCharacterData, initialDefaultShapesData, initialWorkspaceFiles) {
  // Set global variables
  characters = initialCharacters;
  shapes = initialShapes;
  shapeTypes = initialShapeTypes;
  unicodeCharacters = initialUnicodeCharacters;
  defaultCharacterData = initialDefaultCharacterData;
  defaultShapesData = initialDefaultShapesData;
  workspaceFiles = initialWorkspaceFiles || [];

  console.log('Initializing with workspace files:', initialWorkspaceFiles);
  console.log('Workspace files length:', workspaceFiles.length);

  // Set next IDs
  nextCharacterId = characters.length > 0 ? Math.max(...characters.map(c => c.id)) + 1 : 1;
  nextShapeId = shapes.length > 0 ? Math.max(...shapes.map(s => s.id)) + 1 : 1;

  // Initialize components
  initCanvas();
  initUI();
  initSidebar();
  populateFileExplorer();

  // Set up message listener for workspace file updates
  window.addEventListener('message', event => {
    const message = event.data;
    console.log('Received message:', message.command);
    if (message.command === 'updateWorkspaceFiles') {
      console.log('Received workspace files:', message.data ? message.data.length : 0);
      workspaceFiles = message.data;
      populateFileExplorer();
    }
  });

  // Add keyboard event listener for Escape key
  document.addEventListener('keydown', handleKeyDown);

  // Start drawing
  setInterval(drawCanvas, 100);
}

// ===== 2. CANVAS DRAWING FUNCTIONS =====

/**
 * Initializes the canvas
 */
function initCanvas() {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  // Set up event listeners
  canvas.addEventListener("mousedown", handleCanvasMouseDown);
  canvas.addEventListener("mousemove", handleCanvasMouseMove);
  canvas.addEventListener("mouseup", handleCanvasMouseUp);
  canvas.addEventListener("mouseleave", handleCanvasMouseLeave);
  canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("dragover", handleCanvasDragOver);
  canvas.addEventListener("drop", handleCanvasDrop);

  // Set canvas size
  resizeCanvas();

  // Set up resize listener
  window.addEventListener('load', resizeCanvas);
  window.addEventListener('resize', resizeCanvas);
}

/**
 * Resizes the canvas to fit its container
 */
function resizeCanvas() {
  const container = document.querySelector('.canvas-container');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  drawCanvas();
}

/**
 * Draws all elements on the canvas
 */
function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw shapes
  shapes.forEach(shape => {
    drawShape(shape);
    if (draggedShape === shape || resizingShape === shape) {
      drawResizeHandle(shape);
    }
  });

  // Draw characters
  characters.forEach(char => {
    drawCharacter(char);
  });
}

/**
 * Draws a character on the canvas
 */
function drawCharacter(char) {
  ctx.save();
  ctx.font = char.size + 'px Arial';
  ctx.fillStyle = char.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char.character, char.x, char.y);

  if (draggedCharacter === char) {
    const metrics = ctx.measureText(char.character);
    const height = char.size;
    const width = metrics.width;
    ctx.strokeStyle = '#007acc';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      char.x - width / 2 - 5,
      char.y - height / 2 - 5,
      width + 10,
      height + 10
    );
  }
  ctx.restore();
}

/**
 * Draws a shape on the canvas
 */
function drawShape(shape) {
  ctx.save();
  ctx.fillStyle = shape.color;

  switch (shape.type) {
    case 'circle':
      ctx.beginPath();
      const radius = Math.min(shape.width, shape.height) / 2;
      ctx.arc(shape.x + shape.width / 2, shape.y + shape.height / 2, radius, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'square':
      ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
      break;
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(shape.x + shape.width / 2, shape.y);
      ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
      ctx.lineTo(shape.x, shape.y + shape.height);
      ctx.closePath();
      ctx.fill();
      break;
  }

  if (draggedShape === shape || resizingShape === shape) {
    ctx.strokeStyle = '#007acc';
    ctx.lineWidth = 2;
    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
  }

  ctx.restore();
}

/**
 * Draws a resize handle for a shape
 */
function drawResizeHandle(shape) {
  const handleX = shape.x + shape.width;
  const handleY = shape.y + shape.height;

  ctx.save();
  ctx.fillStyle = '#007acc';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(handleX, handleY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ===== 3. EVENT HANDLERS =====

/**
 * Handles mouse down events on the canvas
 */
function handleCanvasMouseDown(e) {
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Check for resize handle
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointNearResizeHandle(mouseX, mouseY, shapes[i])) {
      resizingShape = shapes[i];
      canvas.style.cursor = 'nwse-resize';
      return;
    }
  }

  // Add new shape
  if (currentMode === 'drag' && selectedShapeType) {
    const newShape = {
      id: nextShapeId++,
      type: selectedShapeType,
      x: mouseX - 40,
      y: mouseY - 40,
      width: 80,
      height: 80,
      color: getRandomColor()
    };

    shapes.push(newShape);
    drawCanvas();

    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    return;
  }

  // Add new character
  if (currentMode === 'drag' && selectedCharacter) {
    const newChar = {
      id: nextCharacterId++,
      character: selectedCharacter,
      x: mouseX,
      y: mouseY,
      size: 50,
      color: getRandomColor()
    };

    characters.push(newChar);
    drawCanvas();

    vscode.postMessage({
      command: 'saveCoordinates',
      data: characters,
      autoSave: true
    });
    return;
  }

  // Check for dragging shape
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointInShape(mouseX, mouseY, shapes[i])) {
      draggedShape = shapes[i];
      offsetX = mouseX - draggedShape.x;
      offsetY = mouseY - draggedShape.y;

      shapes.splice(i, 1);
      shapes.push(draggedShape);

      drawCanvas();
      return;
    }
  }

  // Check for dragging character
  for (let i = characters.length - 1; i >= 0; i--) {
    const char = characters[i];

    ctx.font = char.size + 'px Arial';
    const metrics = ctx.measureText(char.character);
    const width = metrics.width;
    const height = char.size;

    if (mouseX >= char.x - width / 2 - 5 &&
      mouseX <= char.x + width / 2 + 5 &&
      mouseY >= char.y - height / 2 - 5 &&
      mouseY <= char.y + height / 2 + 5) {

      draggedCharacter = char;
      offsetX = mouseX - char.x;
      offsetY = mouseY - char.y;

      characters.splice(i, 1);
      characters.push(draggedCharacter);

      drawCanvas();
      return;
    }
  }
}

/**
 * Handles mouse move events on the canvas
 */
function handleCanvasMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // If in carrying mode, update the position of the carried element
  if (isCarryingMode) {
    if (draggedCharacter) {
      draggedCharacter.x = mouseX;
      draggedCharacter.y = mouseY;
      drawCanvas();
    } else if (draggedShape) {
      draggedShape.x = mouseX - draggedShape.width / 2;
      draggedShape.y = mouseY - draggedShape.height / 2;
      drawCanvas();
    }
    return;
  }

  // Handle resizing
  if (resizingShape) {
    resizingShape.width = Math.max(20, mouseX - resizingShape.x);
    resizingShape.height = Math.max(20, mouseY - resizingShape.y);
    drawCanvas();
    return;
  }

  // Handle dragging shape
  if (draggedShape) {
    draggedShape.x = mouseX - offsetX;
    draggedShape.y = mouseY - offsetY;

    draggedShape.x = Math.max(0, Math.min(canvas.width - draggedShape.width, draggedShape.x));
    draggedShape.y = Math.max(0, Math.min(canvas.height - draggedShape.height, draggedShape.y));

    drawCanvas();
    return;
  }

  // Handle dragging character
  if (draggedCharacter) {
    draggedCharacter.x = mouseX - offsetX;
    draggedCharacter.y = mouseY - offsetY;

    draggedCharacter.x = Math.max(draggedCharacter.size / 2, Math.min(canvas.width - draggedCharacter.size / 2, draggedCharacter.x));
    draggedCharacter.y = Math.max(draggedCharacter.size / 2, Math.min(canvas.height - draggedCharacter.size / 2, draggedCharacter.y));

    drawCanvas();
    return;
  }

  // Update cursor
  let cursorSet = false;

  // Check for resize handles
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointNearResizeHandle(mouseX, mouseY, shapes[i])) {
      canvas.style.cursor = 'nwse-resize';
      cursorSet = true;
      break;
    }
  }

  if (!cursorSet) {
    // Check for shapes
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (isPointInShape(mouseX, mouseY, shapes[i])) {
        canvas.style.cursor = 'pointer';
        cursorSet = true;
        break;
      }
    }
  }

  if (!cursorSet) {
    // Check for characters
    for (let i = characters.length - 1; i >= 0; i--) {
      const char = characters[i];
      ctx.font = char.size + 'px Arial';
      const metrics = ctx.measureText(char.character);
      const width = metrics.width;
      const height = char.size;

      if (mouseX >= char.x - width / 2 - 5 &&
        mouseX <= char.x + width / 2 + 5 &&
        mouseY >= char.y - height / 2 - 5 &&
        mouseY <= char.y + height / 2 + 5) {

        canvas.style.cursor = 'pointer';
        cursorSet = true;
        break;
      }
    }
  }

  if (!cursorSet) {
    canvas.style.cursor = selectedCharacter || selectedShapeType ? 'cell' : 'default';
  }
}

/**
 * Handles mouse up events on the canvas
 */
function handleCanvasMouseUp() {
  if (resizingShape) {
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    resizingShape = null;
  }
  else if (draggedShape) {
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    draggedShape = null;
  }
  else if (draggedCharacter) {
    vscode.postMessage({
      command: 'saveCoordinates',
      data: characters,
      autoSave: true
    });
    draggedCharacter = null;
  }
  drawCanvas();
}

/**
 * Handles mouse leave events on the canvas
 */
function handleCanvasMouseLeave() {
  if (resizingShape || draggedShape) {
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    resizingShape = null;
    draggedShape = null;
  }
  else if (draggedCharacter) {
    vscode.postMessage({
      command: 'saveCoordinates',
      data: characters,
      autoSave: true
    });
    draggedCharacter = null;
  }
  drawCanvas();
}

/**
 * Handles click events on the canvas
 */
function handleCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  console.log('Canvas click at', mouseX, mouseY, 'Carrying mode:', isCarryingMode);

  // If we're already carrying something, drop it at the current location
  if (isCarryingMode) {
    if (draggedCharacter) {
      draggedCharacter.x = mouseX;
      draggedCharacter.y = mouseY;

      vscode.postMessage({
        command: 'saveCoordinates',
        data: characters,
        autoSave: true
      });

      draggedCharacter = null;
    } else if (draggedShape) {
      draggedShape.x = mouseX - draggedShape.width / 2;
      draggedShape.y = mouseY - draggedShape.height / 2;

      vscode.postMessage({
        command: 'saveShapes',
        data: shapes,
        autoSave: true
      });

      draggedShape = null;
    }

    isCarryingMode = false;
    canvas.style.cursor = 'default';
    drawCanvas();
    return;
  }

  // Check for resize handle
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointNearResizeHandle(mouseX, mouseY, shapes[i])) {
      // For resize, we'll still use the traditional drag approach
      resizingShape = shapes[i];
      canvas.style.cursor = 'nwse-resize';
      return;
    }
  }

  // Add new shape
  if (currentMode === 'drag' && selectedShapeType) {
    const newShape = {
      id: nextShapeId++,
      type: selectedShapeType,
      x: mouseX - 40,
      y: mouseY - 40,
      width: 80,
      height: 80,
      color: getRandomColor()
    };

    shapes.push(newShape);
    drawCanvas();

    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    return;
  }

  // Add new character
  if (currentMode === 'drag' && selectedCharacter) {
    const newChar = {
      id: nextCharacterId++,
      character: selectedCharacter,
      x: mouseX,
      y: mouseY,
      size: 50,
      color: getRandomColor()
    };

    characters.push(newChar);
    drawCanvas();

    vscode.postMessage({
      command: 'saveCoordinates',
      data: characters,
      autoSave: true
    });
    return;
  }

  // Check for picking up a shape
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointInShape(mouseX, mouseY, shapes[i])) {
      draggedShape = shapes[i];
      isCarryingMode = true;
      canvas.style.cursor = 'move';

      // Move to top of rendering order
      shapes.splice(i, 1);
      shapes.push(draggedShape);

      drawCanvas();
      return;
    }
  }

  // Check for picking up a character
  for (let i = characters.length - 1; i >= 0; i--) {
    const char = characters[i];

    ctx.font = char.size + 'px Arial';
    const metrics = ctx.measureText(char.character);
    const width = metrics.width;
    const height = char.size;

    if (mouseX >= char.x - width / 2 - 5 &&
      mouseX <= char.x + width / 2 + 5 &&
      mouseY >= char.y - height / 2 - 5 &&
      mouseY <= char.y + height / 2 + 5) {

      draggedCharacter = char;
      isCarryingMode = true;
      canvas.style.cursor = 'move';

      // Move to top of rendering order
      characters.splice(i, 1);
      characters.push(draggedCharacter);

      drawCanvas();
      return;
    }
  }
}

/**
 * Handles keyboard events
 */
function handleKeyDown(e) {
  // If Escape key is pressed and we have a dragged element, release it
  if (e.key === 'Escape' && (draggedCharacter || draggedShape || resizingShape || isCarryingMode)) {
    console.log('Escape key pressed, releasing dragged elements');
    releaseAllDraggedElements();
  }
}

/**
 * Releases all dragged elements
 */
function releaseAllDraggedElements() {
  if (resizingShape) {
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    resizingShape = null;
  }

  if (draggedShape) {
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    draggedShape = null;
  }

  if (draggedCharacter) {
    vscode.postMessage({
      command: 'saveCoordinates',
      data: characters,
      autoSave: true
    });
    draggedCharacter = null;
  }

  // Reset carrying mode
  isCarryingMode = false;

  // Reset cursor
  canvas.style.cursor = 'default';

  drawCanvas();
}

// ===== 4. UI FUNCTIONS =====

/**
 * Initializes UI elements and event handlers
 */
function initUI() {
  // Button handlers
  document.getElementById('saveBtn').addEventListener('click', handleSaveButtonClick);
  document.getElementById('resetBtn').addEventListener('click', handleResetButtonClick);
  document.getElementById('resetShapesBtn').addEventListener('click', handleResetShapesButtonClick);
  document.getElementById('dragModeBtn').addEventListener('click', handleDragModeButtonClick);
  document.getElementById('togglePaletteBtn').addEventListener('click', handleTogglePaletteButtonClick);
  document.getElementById('toggleShapePaletteBtn').addEventListener('click', handleToggleShapePaletteButtonClick);
  document.getElementById('toggleFileExplorerBtn').addEventListener('click', handleToggleFileExplorerButtonClick);

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

// ===== 5. FILE EXPLORER FUNCTIONS =====

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
 */
function handleCanvasDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

/**
 * Handles drop events on the canvas
 */
function handleCanvasDrop(e) {
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
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
        color: getRandomColor(),
        metadata: {
          name: data.name,
          path: data.path,
          type: data.type
        }
      };

      characters.push(newChar);
      drawCanvas();

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

// ===== 6. UTILITY FUNCTIONS =====

/**
 * Checks if a point is inside a shape
 */
function isPointInShape(x, y, shape) {
  switch (shape.type) {
    case 'circle':
      const centerX = shape.x + shape.width / 2;
      const centerY = shape.y + shape.height / 2;
      const radius = Math.min(shape.width, shape.height) / 2;
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      return distance <= radius;
    case 'square':
      return x >= shape.x && x <= shape.x + shape.width &&
        y >= shape.y && y <= shape.y + shape.height;
    case 'triangle':
      const x1 = shape.x + shape.width / 2;
      const y1 = shape.y;
      const x2 = shape.x + shape.width;
      const y2 = shape.y + shape.height;
      const x3 = shape.x;
      const y3 = shape.y + shape.height;

      const denominator = ((y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3));
      const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / denominator;
      const b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / denominator;
      const c = 1 - a - b;

      return a >= 0 && a <= 1 && b >= 0 && b <= 1 && c >= 0 && c <= 1;
  }
  return false;
}

/**
 * Checks if a point is near a shape's resize handle
 */
function isPointNearResizeHandle(x, y, shape) {
  const handleX = shape.x + shape.width;
  const handleY = shape.y + shape.height;
  const distance = Math.sqrt(Math.pow(x - handleX, 2) + Math.pow(y - handleY, 2));
  return distance <= 10;
}

/**
 * Gets a random color
 */
function getRandomColor() {
  const colors = [
    '#FF5733', // Red-Orange
    '#33FF57', // Green
    '#3357FF', // Blue
    '#FF33F5', // Pink
    '#F5FF33', // Yellow
    '#33FFF5', // Cyan
    '#FF5733', // Orange
    '#C133FF', // Purple
    '#FF3333', // Red
    '#33FF33', // Lime
    '#3333FF'  // Deep Blue
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Export the init function for use in webviewContent.js
window.init = init;
console.log('Main module loaded, init function exported');
