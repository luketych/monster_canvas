/**
 * UI-related functionality
 */

// Note: utils functions are available as global objects

// State variables for UI
let isPaletteVisible = true;
let isShapePaletteVisible = true;
let selectedCharacter = null;
let selectedShapeType = null;
let currentMode = 'drag';

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
  document.getElementById('toggleFileExplorerBtn').addEventListener('click', explorer.handleToggleFileExplorerButtonClick);

  // Initialize palettes
  populateCharacterPalette();
  populateShapePalette();
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
  canvas.drawCanvas();

  vscode.postMessage({
    command: 'resetPositions'
  });
}

/**
 * Handles reset shapes button click
 */
function handleResetShapesButtonClick() {
  shapes = JSON.parse(JSON.stringify(defaultShapesData));
  canvas.drawCanvas();

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

// Expose functions and variables as global objects
window.ui = {
  initUI,
  currentMode,
  selectedCharacter,
  selectedShapeType,
  deselectAllPaletteCharacters,
  deselectAllShapeButtons
};
