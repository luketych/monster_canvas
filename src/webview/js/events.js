/**
 * Event handlers for canvas interactions
 */

// State variables for event handling
let offsetX = 0;
let offsetY = 0;
let isCarryingMode = false;

/**
 * Handles mouse down events on the canvas
 * @param {MouseEvent} e - The mouse event
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
 * @param {MouseEvent} e - The mouse event
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
 * @param {MouseEvent} e - The mouse event
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
 * @param {KeyboardEvent} e - The keyboard event
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

/**
 * Handles drag over events on the canvas
 * @param {DragEvent} e - The drag event
 */
function handleCanvasDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

/**
 * Handles drop events on the canvas
 * @param {DragEvent} e - The drop event
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
