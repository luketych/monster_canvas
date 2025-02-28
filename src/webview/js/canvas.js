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
let offsetX, offsetY;

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

// Export functions
module.exports = {
  initCanvas,
  drawCanvas,
  isPointInShape,
  isPointNearResizeHandle,
  canvas,
  ctx
};
