/**
 * Canvas-related functionality
 */

// Canvas and context
let canvasElement;
let canvasContext;

// State variables for canvas interaction
let draggedCharacter = null;
let draggedShape = null;
let resizingShape = null;

/**
 * Initializes the canvas
 */
function initCanvas() {
  canvasElement = document.getElementById("canvas");
  canvasContext = canvasElement.getContext("2d");

  // Set up event listeners
  canvasElement.addEventListener("mousedown", events.handleCanvasMouseDown);
  canvasElement.addEventListener("mousemove", events.handleCanvasMouseMove);
  canvasElement.addEventListener("mouseup", events.handleCanvasMouseUp);
  canvasElement.addEventListener("mouseleave", events.handleCanvasMouseLeave);

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
  canvasElement.width = container.clientWidth;
  canvasElement.height = container.clientHeight;
  drawCanvas();
}

/**
 * Draws all elements on the canvas
 */
function drawCanvas() {
  canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);

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
  canvasContext.save();
  canvasContext.font = char.size + 'px Arial';
  canvasContext.fillStyle = char.color;
  canvasContext.textAlign = 'center';
  canvasContext.textBaseline = 'middle';
  canvasContext.fillText(char.character, char.x, char.y);

  if (draggedCharacter === char) {
    const metrics = canvasContext.measureText(char.character);
    const height = char.size;
    const width = metrics.width;
    canvasContext.strokeStyle = '#007acc';
    canvasContext.lineWidth = 2;
    canvasContext.strokeRect(
      char.x - width / 2 - 5,
      char.y - height / 2 - 5,
      width + 10,
      height + 10
    );
  }
  canvasContext.restore();
}

/**
 * Draws a shape on the canvas
 * @param {Object} shape - The shape object to draw
 */
function drawShape(shape) {
  canvasContext.save();
  canvasContext.fillStyle = shape.color;

  switch (shape.type) {
    case 'circle':
      canvasContext.beginPath();
      const radius = Math.min(shape.width, shape.height) / 2;
      canvasContext.arc(shape.x + shape.width / 2, shape.y + shape.height / 2, radius, 0, Math.PI * 2);
      canvasContext.fill();
      break;
    case 'square':
      canvasContext.fillRect(shape.x, shape.y, shape.width, shape.height);
      break;
    case 'triangle':
      canvasContext.beginPath();
      canvasContext.moveTo(shape.x + shape.width / 2, shape.y);
      canvasContext.lineTo(shape.x + shape.width, shape.y + shape.height);
      canvasContext.lineTo(shape.x, shape.y + shape.height);
      canvasContext.closePath();
      canvasContext.fill();
      break;
  }

  if (draggedShape === shape || resizingShape === shape) {
    canvasContext.strokeStyle = '#007acc';
    canvasContext.lineWidth = 2;
    canvasContext.strokeRect(shape.x, shape.y, shape.width, shape.height);
  }

  canvasContext.restore();
}

/**
 * Draws a resize handle for a shape
 * @param {Object} shape - The shape to draw a resize handle for
 */
function drawResizeHandle(shape) {
  const handleX = shape.x + shape.width;
  const handleY = shape.y + shape.height;

  canvasContext.save();
  canvasContext.fillStyle = '#007acc';
  canvasContext.strokeStyle = 'white';
  canvasContext.lineWidth = 2;
  canvasContext.beginPath();
  canvasContext.arc(handleX, handleY, 5, 0, Math.PI * 2);
  canvasContext.fill();
  canvasContext.stroke();
  canvasContext.restore();
}

/**
 * Checks if a point is inside a shape
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {Object} shape - The shape to check
 * @returns {boolean} True if the point is in the shape
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
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {Object} shape - The shape to check
 * @returns {boolean} True if the point is near the resize handle
 */
function isPointNearResizeHandle(x, y, shape) {
  const handleX = shape.x + shape.width;
  const handleY = shape.y + shape.height;
  const distance = Math.sqrt(Math.pow(x - handleX, 2) + Math.pow(y - handleY, 2));
  return distance <= 10;
}

// Expose functions and variables as global objects
window.canvas = {
  initCanvas,
  drawCanvas,
  isPointInShape,
  isPointNearResizeHandle,
  get canvas() { return canvasElement; },
  get ctx() { return canvasContext; },
  draggedCharacter: null,
  draggedShape: null,
  resizingShape: null
};
