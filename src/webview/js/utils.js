/**
 * Utility functions for the webview
 */

/**
 * Generates a random color for new characters and shapes
 * @returns {string} A random color in hex format
 */
function getRandomColor() {
  const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#FF33E9', '#33FFF5',
    '#F08080', '#90EE90', '#87CEFA', '#FFD700', '#FF69B4',
    '#8A2BE2', '#00CED1', '#FF7F50', '#6A5ACD', '#7FFF00'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Export functions
module.exports = {
  getRandomColor
};
