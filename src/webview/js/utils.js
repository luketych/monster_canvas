/**
 * Utility functions for the Monster Canvas webview
 */

/**
 * Gets a random color
 * @returns {string} A random color in hex format
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

// Export the utility functions
window.utils = {
  getRandomColor,
  isPointInShape,
  isPointNearResizeHandle,
  getFileIcon
};
