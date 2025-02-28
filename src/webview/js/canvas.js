/**
 * Canvas-related functionality
 */

// Canvas and context
let canvas;
let ctx;

// State variables for canvas interaction
let draggedCharacter = null;
let draggedShape = null;
let resizingShape = null;

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
 * @param {Object} char - The character object to draw
 */
function drawCharacter(char) {
  ctx.save();
  ctx.font = char.size + 'px Arial';
  ctx.fillStyle = char.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char.character, char.x, char.y);

  // Draw the file/folder name underneath if it exists
  if (char.metadata && char.metadata.name) {
    ctx.font = (char.size / 3) + 'px Arial';
    ctx.fillStyle = '#333333';
    ctx.fillText(char.metadata.name, char.x, char.y + char.size / 2 + 15);
  }

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
 * @param {Object} shape - The shape object to draw
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
 * @param {Object} shape - The shape to draw a resize handle for
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

/**
 * Flashes a character on the canvas to highlight its location
 * @param {Object} character - The character to flash
 */
function flashCharacterOnCanvas(character) {
  // Store the original color
  const originalColor = character.color;

  // Flash sequence: highlight -> original -> highlight -> original
  const flashSequence = [
    { color: '#FF5733', duration: 200 },  // Bright orange-red
    { color: originalColor, duration: 200 },
    { color: '#FF5733', duration: 200 },
    { color: originalColor, duration: 200 }
  ];

  // Execute the flash sequence
  let timeElapsed = 0;
  flashSequence.forEach((flash, index) => {
    setTimeout(() => {
      character.color = flash.color;
      drawCanvas();
    }, timeElapsed);
    timeElapsed += flash.duration;
  });

  // Scroll to the character's position
  const canvasContainer = document.querySelector('.canvas-container');
  if (canvasContainer) {
    // Calculate the position to scroll to (center the character in the viewport)
    const scrollX = Math.max(0, character.x - canvasContainer.clientWidth / 2);
    const scrollY = Math.max(0, character.y - canvasContainer.clientHeight / 2);

    // Smooth scroll to the character
    canvasContainer.scrollTo({
      left: scrollX,
      top: scrollY,
      behavior: 'smooth'
    });
  }
}

// Expose functions and variables as global objects
window.canvas = {
  initCanvas,
  drawCanvas,
  isPointInShape,
  isPointNearResizeHandle,
  flashCharacterOnCanvas,
  get canvas() { return canvas; },
  get ctx() { return ctx; },
  draggedCharacter: null,
  draggedShape: null,
  resizingShape: null,
  updateCursor: function (mouseX, mouseY) {
    // This function will be called from handleCanvasMouseMove
    // to update the cursor based on the current mode and what's under the cursor

    // If in delete mode, show delete cursor when over an item
    if (currentMode === 'delete') {
      // Check for shapes
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (isPointInShape(mouseX, mouseY, shapes[i])) {
          canvas.style.cursor = 'not-allowed';
          return true;
        }
      }

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
          canvas.style.cursor = 'not-allowed';
          return true;
        }
      }

      // Not over any item, but still in delete mode
      canvas.style.cursor = 'default';
      return true;
    }

    return false; // Not in delete mode, let the regular cursor logic handle it
  }
};
