/**
 * Event handlers for canvas interactions
 */

// Note: canvas functions and variables are available as global objects

// State variables for event handling
let events_offsetX = 0;
let events_offsetY = 0;

/**
 * Handles mouse down events on the canvas
 * @param {MouseEvent} e - The mouse event
 */
function handleCanvasMouseDown(e) {
  const rect = canvas.canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Check for resize handle
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (canvas.isPointNearResizeHandle(mouseX, mouseY, shapes[i])) {
      canvas.resizingShape = shapes[i];
      canvas.canvas.style.cursor = 'nwse-resize';
      return;
    }
  }

  // Add new shape
  if (ui.currentMode === 'drag' && ui.selectedShapeType) {
    const newShape = {
      id: nextShapeId++,
      type: ui.selectedShapeType,
      x: mouseX - 40,
      y: mouseY - 40,
      width: 80,
      height: 80,
      color: utils.getRandomColor()
    };

    shapes.push(newShape);
    canvas.drawCanvas();

    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    return;
  }

  // Add new character
  if (ui.currentMode === 'drag' && ui.selectedCharacter) {
    const newChar = {
      id: nextCharacterId++,
      character: ui.selectedCharacter,
      x: mouseX,
      y: mouseY,
      size: 50,
      color: utils.getRandomColor()
    };

    characters.push(newChar);
    canvas.drawCanvas();

    vscode.postMessage({
      command: 'saveCoordinates',
      data: characters,
      autoSave: true
    });
    return;
  }

  // Check for dragging shape
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (canvas.isPointInShape(mouseX, mouseY, shapes[i])) {
      canvas.draggedShape = shapes[i];
      events_offsetX = mouseX - canvas.draggedShape.x;
      events_offsetY = mouseY - canvas.draggedShape.y;

      shapes.splice(i, 1);
      shapes.push(canvas.draggedShape);

      canvas.drawCanvas();
      return;
    }
  }

  // Check for dragging character
  for (let i = characters.length - 1; i >= 0; i--) {
    const char = characters[i];

    canvas.ctx.font = char.size + 'px Arial';
    const metrics = canvas.ctx.measureText(char.character);
    const width = metrics.width;
    const height = char.size;

    if (mouseX >= char.x - width / 2 - 5 &&
      mouseX <= char.x + width / 2 + 5 &&
      mouseY >= char.y - height / 2 - 5 &&
      mouseY <= char.y + height / 2 + 5) {

      canvas.draggedCharacter = char;
      events_offsetX = mouseX - char.x;
      events_offsetY = mouseY - char.y;

      characters.splice(i, 1);
      characters.push(canvas.draggedCharacter);

      canvas.drawCanvas();
      return;
    }
  }
}

/**
 * Handles mouse move events on the canvas
 * @param {MouseEvent} e - The mouse event
 */
function handleCanvasMouseMove(e) {
  const rect = canvas.canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Handle resizing
  if (canvas.resizingShape) {
    canvas.resizingShape.width = Math.max(20, mouseX - canvas.resizingShape.x);
    canvas.resizingShape.height = Math.max(20, mouseY - canvas.resizingShape.y);
    canvas.drawCanvas();
    return;
  }

  // Handle dragging shape
  if (canvas.draggedShape) {
    canvas.draggedShape.x = mouseX - events_offsetX;
    canvas.draggedShape.y = mouseY - events_offsetY;

    canvas.draggedShape.x = Math.max(0, Math.min(canvas.canvas.width - canvas.draggedShape.width, canvas.draggedShape.x));
    canvas.draggedShape.y = Math.max(0, Math.min(canvas.canvas.height - canvas.draggedShape.height, canvas.draggedShape.y));

    canvas.drawCanvas();
    return;
  }

  // Handle dragging character
  if (canvas.draggedCharacter) {
    canvas.draggedCharacter.x = mouseX - events_offsetX;
    canvas.draggedCharacter.y = mouseY - events_offsetY;

    canvas.draggedCharacter.x = Math.max(canvas.draggedCharacter.size / 2, Math.min(canvas.canvas.width - canvas.draggedCharacter.size / 2, canvas.draggedCharacter.x));
    canvas.draggedCharacter.y = Math.max(canvas.draggedCharacter.size / 2, Math.min(canvas.canvas.height - canvas.draggedCharacter.size / 2, canvas.draggedCharacter.y));

    canvas.drawCanvas();
    return;
  }

  // Update cursor
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (canvas.isPointNearResizeHandle(mouseX, mouseY, shapes[i])) {
      canvas.canvas.style.cursor = 'nwse-resize';
      return;
    }
    if (canvas.isPointInShape(mouseX, mouseY, shapes[i])) {
      canvas.canvas.style.cursor = 'move';
      return;
    }
  }

  for (let i = characters.length - 1; i >= 0; i--) {
    const char = characters[i];
    canvas.ctx.font = char.size + 'px Arial';
    const metrics = canvas.ctx.measureText(char.character);
    const width = metrics.width;
    const height = char.size;

    if (mouseX >= char.x - width / 2 - 5 &&
      mouseX <= char.x + width / 2 + 5 &&
      mouseY >= char.y - height / 2 - 5 &&
      mouseY <= char.y + height / 2 + 5) {

      canvas.canvas.style.cursor = 'move';
      return;
    }
  }

  canvas.canvas.style.cursor = ui.selectedCharacter || ui.selectedShapeType ? 'cell' : 'default';
}

/**
 * Handles mouse up events on the canvas
 */
function handleCanvasMouseUp() {
  if (canvas.resizingShape) {
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    canvas.resizingShape = null;
  }
  else if (canvas.draggedShape) {
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    canvas.draggedShape = null;
  }
  else if (canvas.draggedCharacter) {
    vscode.postMessage({
      command: 'saveCoordinates',
      data: characters,
      autoSave: true
    });
    canvas.draggedCharacter = null;
  }
  canvas.drawCanvas();
}

/**
 * Handles mouse leave events on the canvas
 */
function handleCanvasMouseLeave() {
  if (canvas.resizingShape || canvas.draggedShape) {
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    canvas.resizingShape = null;
    canvas.draggedShape = null;
  }
  else if (canvas.draggedCharacter) {
    vscode.postMessage({
      command: 'saveCoordinates',
      data: characters,
      autoSave: true
    });
    canvas.draggedCharacter = null;
  }
  canvas.drawCanvas();
}

// Expose functions as global objects
window.events = {
  handleCanvasMouseDown,
  handleCanvasMouseMove,
  handleCanvasMouseUp,
  handleCanvasMouseLeave,
  offsetX: events_offsetX,
  offsetY: events_offsetY
};
