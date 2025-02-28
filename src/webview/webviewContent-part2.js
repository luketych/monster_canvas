document.getElementById('togglePaletteBtn').textContent = 'Show Character Palette';
            }
        });

// Toggle shape palette
document.getElementById('toggleShapePaletteBtn').addEventListener('click', () => {
  const palette = document.getElementById('shapePalette');
  isShapePaletteVisible = !isShapePaletteVisible;

  if (isShapePaletteVisible) {
    palette.classList.remove('hidden');
    document.getElementById('toggleShapePaletteBtn').textContent = 'Hide Shape Palette';
  } else {
    palette.classList.add('hidden');
    document.getElementById('toggleShapePaletteBtn').textContent = 'Show Shape Palette';
  }
});

// Populate the character palette with Unicode characters
function populateCharacterPalette() {
  const palette = document.getElementById('characterPalette');

  // Clear any existing content
  palette.innerHTML = '';

  // Add each category of characters
  for (const [category, chars] of Object.entries(unicodeCharacters)) {
    // Add a section title
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'palette-section-title';
    sectionTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    palette.appendChild(sectionTitle);

    // Add characters for this category
    chars.forEach(char => {
      const charElement = document.createElement('div');
      charElement.className = 'palette-character';
      charElement.textContent = char;
      charElement.title = char;

      charElement.addEventListener('click', () => {
        // Deselect all characters first
        deselectAllPaletteCharacters();

        // Select this character
        charElement.classList.add('selected');
        selectedCharacter = char;
        selectedShapeType = null; // Deselect any shape
        deselectAllShapeButtons();

        // Switch to drag mode automatically
        currentMode = 'drag';
        document.getElementById('dragModeBtn').classList.add('active-mode');
        canvas.style.cursor = 'cell';
      });

      palette.appendChild(charElement);
    });
  }
}

// Populate the shape palette with shape buttons
function populateShapePalette() {
  const shapeButtons = document.querySelector('.shape-buttons');

  // Clear any existing content
  shapeButtons.innerHTML = '';

  // Add each shape type
  shapeTypes.forEach(shapeType => {
    const button = document.createElement('div');
    button.className = 'shape-button';
    button.textContent = shapeType.name;
    button.dataset.type = shapeType.type;

    button.addEventListener('click', () => {
      // Deselect all shape buttons first
      deselectAllShapeButtons();

      // Select this shape
      button.classList.add('selected');
      selectedShapeType = shapeType.type;
      selectedCharacter = null; // Deselect any character
      deselectAllPaletteCharacters();

      // Switch to drag mode automatically
      currentMode = 'drag';
      document.getElementById('dragModeBtn').classList.add('active-mode');
      canvas.style.cursor = 'cell';
    });

    shapeButtons.appendChild(button);
  });
}

// Deselect all palette characters
function deselectAllPaletteCharacters() {
  const paletteChars = document.querySelectorAll('.palette-character');
  paletteChars.forEach(el => el.classList.remove('selected'));
  selectedCharacter = null;
}

// Deselect all shape buttons
function deselectAllShapeButtons() {
  const shapeButtons = document.querySelectorAll('.shape-button');
  shapeButtons.forEach(el => el.classList.remove('selected'));
  selectedShapeType = null;
}

// Generate a random color for new characters and shapes
function getRandomColor() {
  const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#FF33E9', '#33FFF5',
    '#F08080', '#90EE90', '#87CEFA', '#FFD700', '#FF69B4',
    '#8A2BE2', '#00CED1', '#FF7F50', '#6A5ACD', '#7FFF00'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Initialize the palettes on load
populateCharacterPalette();
populateShapePalette();

// Start drawing
setInterval(drawCanvas, 100);
`;
}

module.exports = {
  getWebviewContent
};
