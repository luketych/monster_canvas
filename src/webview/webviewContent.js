/**
 * Generates the HTML content for the webview
 */
const { unicodeCharacters } = require('../utils/constants');

/**
 * Returns the HTML content for the webview
 * @param {Array} characterData - Array of character objects with coordinates
 * @param {Array} shapes - Array of shape objects
 * @param {string} defaultCharacterData - JSON string of default character data for reset functionality
 * @param {string} defaultShapesData - JSON string of default shapes data for reset functionality
 * @param {string} shapeTypesData - JSON string of available shape types
 * @returns {string} HTML content
 */
function getWebviewContent(characterData, shapes, defaultCharacterData, defaultShapesData, shapeTypesData) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monster CAnvas Canvas</title>
    <style>
        body { 
            margin: 0; 
            padding: 20px;
            background-color: #f3f3f3;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .container {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }
        .canvas-container {
            flex: 1;
            position: relative;
            min-height: 300px;
            max-height: 60vh;
            margin-bottom: 20px;
        }
        canvas { 
            border: 1px solid #ccc; 
            background-color: white;
            width: 100%;
            height: 100%;
        }
        .controls-section {
            position: sticky;
            bottom: 0;
            background-color: #f3f3f3;
            padding: 15px 0;
            border-top: 1px solid #ddd;
        }
        .controls, .mode-controls {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 15px;
        }
        .character-palette, .shape-palette {
            padding: 15px;
            background-color: white;
            border: 1px solid #ccc;
            border-radius: 6px;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            max-height: 250px;
            overflow-y: auto;
            margin-bottom: 20px;
        }
        .shape-buttons {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            justify-content: center;
            width: 100%;
        }
        .shape-button {
            padding: 10px 15px;
            background-color: #f0f0f0;
            border: 2px solid #ccc;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        }
        .character-palette.hidden, .shape-palette.hidden {
            display: none;
        }
        .palette-character {
            font-size: 32px;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border: 2px solid #eee;
            margin: 4px;
            border-radius: 6px;
        }
        .palette-character.selected, .shape-button.selected {
            background-color: #e0f0ff;
            border-color: #007acc;
        }
        .active-mode {
            background-color: #005999;
            border: 2px solid #ffffff;
        }
        button {
            padding: 12px 20px;
            background-color: #007acc;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            min-width: 150px;
        }
        .palette-section-title {
            width: 100%;
            text-align: center;
            margin: 10px 0;
            font-weight: bold;
            color: #555;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Monster Characters Canvas</h1>
            <p>Click and drag characters or shapes to move them around the canvas. Select a shape type to add new shapes.</p>
        </div>
        <div class="canvas-container">
            <canvas id="canvas"></canvas>
        </div>
        
        <div id="characterPalette" class="character-palette">
            <!-- Unicode characters will be populated here -->
        </div>
        
        <div id="shapePalette" class="shape-palette">
            <div class="palette-section-title">Shapes</div>
            <div class="shape-buttons">
                <!-- Shape buttons will be populated here -->
            </div>
        </div>
        
        <div class="controls-section">
            <div class="controls">
                <button id="saveBtn">Save Positions</button>
                <button id="resetBtn">Reset Positions</button>
                <button id="resetShapesBtn">Reset Shapes</button>
            </div>
            <div class="mode-controls">
                <button id="dragModeBtn" class="active-mode">Drag Mode</button>
                <button id="togglePaletteBtn">Hide Character Palette</button>
                <button id="toggleShapePaletteBtn">Hide Shape Palette</button>
            </div>
        </div>
    </div>

    <script>
        // Initialize the canvas
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
        
        // Initialize data
        let characters = ${JSON.stringify(characterData)};
        let shapes = ${JSON.stringify(shapes)};
        const shapeTypes = ${shapeTypesData};
        const unicodeCharacters = ${JSON.stringify(unicodeCharacters)};
        
        // State variables
        let draggedCharacter = null;
        let draggedShape = null;
        let resizingShape = null;
        let offsetX, offsetY;
        let currentMode = 'drag';
        let isPaletteVisible = true;
        let isShapePaletteVisible = true;
        let selectedCharacter = null;
        let selectedShapeType = null;
        let nextCharacterId = characters.length > 0 ? Math.max(...characters.map(c => c.id)) + 1 : 1;
        let nextShapeId = shapes.length > 0 ? Math.max(...shapes.map(s => s.id)) + 1 : 1;
        
        // Set canvas size
        function resizeCanvas() {
            const container = document.querySelector('.canvas-container');
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            drawCanvas();
        }
        
        window.addEventListener('load', resizeCanvas);
        window.addEventListener('resize', resizeCanvas);
        
        // Draw functions
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
                        char.x - width/2 - 5, 
                        char.y - height/2 - 5, 
                        width + 10, 
                        height + 10
                    );
                }
                ctx.restore();
            });
        }
        
        function drawShape(shape) {
            ctx.save();
            ctx.fillStyle = shape.color;
            
            switch(shape.type) {
                case 'circle':
                    ctx.beginPath();
                    const radius = Math.min(shape.width, shape.height) / 2;
                    ctx.arc(shape.x + shape.width/2, shape.y + shape.height/2, radius, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'square':
                    ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
                    break;
                case 'triangle':
                    ctx.beginPath();
                    ctx.moveTo(shape.x + shape.width/2, shape.y);
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
        
        // Helper functions
        function isPointInShape(x, y, shape) {
            switch(shape.type) {
                case 'circle':
                    const centerX = shape.x + shape.width/2;
                    const centerY = shape.y + shape.height/2;
                    const radius = Math.min(shape.width, shape.height) / 2;
                    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                    return distance <= radius;
                case 'square':
                    return x >= shape.x && x <= shape.x + shape.width &&
                           y >= shape.y && y <= shape.y + shape.height;
                case 'triangle':
                    const x1 = shape.x + shape.width/2;
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
        
        function isPointNearResizeHandle(x, y, shape) {
            const handleX = shape.x + shape.width;
            const handleY = shape.y + shape.height;
            const distance = Math.sqrt(Math.pow(x - handleX, 2) + Math.pow(y - handleY, 2));
            return distance <= 10;
        }
        
        function getRandomColor() {
            const colors = [
                '#FF5733', '#33FF57', '#3357FF', '#FF33E9', '#33FFF5',
                '#F08080', '#90EE90', '#87CEFA', '#FFD700', '#FF69B4'
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }
        
        function deselectAllPaletteCharacters() {
            document.querySelectorAll('.palette-character').forEach(el => el.classList.remove('selected'));
            selectedCharacter = null;
        }
        
        function deselectAllShapeButtons() {
            document.querySelectorAll('.shape-button').forEach(el => el.classList.remove('selected'));
            selectedShapeType = null;
        }
        
        // Event handlers
        canvas.addEventListener("mousedown", (e) => {
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
                
                const vscode = acquireVsCodeApi();
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
                
                const vscode = acquireVsCodeApi();
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
                
                if (mouseX >= char.x - width/2 - 5 && 
                    mouseX <= char.x + width/2 + 5 && 
                    mouseY >= char.y - height/2 - 5 && 
                    mouseY <= char.y + height/2 + 5) {
                    
                    draggedCharacter = char;
                    offsetX = mouseX - char.x;
                    offsetY = mouseY - char.y;
                    
                    characters.splice(i, 1);
                    characters.push(draggedCharacter);
                    
                    drawCanvas();
                    return;
                }
            }
        });
        
        canvas.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
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
                
                draggedCharacter.x = Math.max(draggedCharacter.size/2, Math.min(canvas.width - draggedCharacter.size/2, draggedCharacter.x));
                draggedCharacter.y = Math.max(draggedCharacter.size/2, Math.min(canvas.height - draggedCharacter.size/2, draggedCharacter.y));
                
                drawCanvas();
                return;
            }
            
            // Update cursor
            for (let i = shapes.length - 1; i >= 0; i--) {
                if (isPointNearResizeHandle(mouseX, mouseY, shapes[i])) {
                    canvas.style.cursor = 'nwse-resize';
                    return;
                }
                if (isPointInShape(mouseX, mouseY, shapes[i])) {
                    canvas.style.cursor = 'move';
                    return;
                }
            }
            
            for (let i = characters.length - 1; i >= 0; i--) {
                const char = characters[i];
                ctx.font = char.size + 'px Arial';
                const metrics = ctx.measureText(char.character);
                const width = metrics.width;
                const height = char.size;
                
                if (mouseX >= char.x - width/2 - 5 && 
                    mouseX <= char.x + width/2 + 5 && 
                    mouseY >= char.y - height/2 - 5 && 
                    mouseY <= char.y + height/2 + 5) {
                    
                    canvas.style.cursor = 'move';
                    return;
                }
            }
            
            canvas.style.cursor = selectedCharacter || selectedShapeType ? 'cell' : 'default';
        });
        
        canvas.addEventListener("mouseup", () => {
            if (resizingShape) {
                const vscode = acquireVsCodeApi();
                vscode.postMessage({
                    command: 'saveShapes',
                    data: shapes,
                    autoSave: true
                });
                resizingShape = null;
            }
            else if (draggedShape) {
                const vscode = acquireVsCodeApi();
                vscode.postMessage({
                    command: 'saveShapes',
                    data: shapes,
                    autoSave: true
                });
                draggedShape = null;
            }
            else if (draggedCharacter) {
                const vscode = acquireVsCodeApi();
                vscode.postMessage({
                    command: 'saveCoordinates',
                    data: characters,
                    autoSave: true
                });
                draggedCharacter = null;
            }
            drawCanvas();
        });
        
        canvas.addEventListener("mouseleave", () => {
            if (resizingShape || draggedShape) {
                const vscode = acquireVsCodeApi();
                vscode.postMessage({
                    command: 'saveShapes',
                    data: shapes,
                    autoSave: true
                });
                resizingShape = null;
                draggedShape = null;
            }
            else if (draggedCharacter) {
                const vscode = acquireVsCodeApi();
                vscode.postMessage({
                    command: 'saveCoordinates',
                    data: characters,
                    autoSave: true
                });
                draggedCharacter = null;
            }
            drawCanvas();
        });
        
        // Button handlers
        document.getElementById('saveBtn').addEventListener('click', () => {
            const vscode = acquireVsCodeApi();
            vscode.postMessage({
                command: 'saveCoordinates',
                data: characters
            });
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            characters = JSON.parse(JSON.stringify(${defaultCharacterData}));
            drawCanvas();
            
            const vscode = acquireVsCodeApi();
            vscode.postMessage({
                command: 'resetPositions'
            });
        });
        
        document.getElementById('resetShapesBtn').addEventListener('click', () => {
            shapes = JSON.parse(JSON.stringify(${defaultShapesData}));
            drawCanvas();
            
            const vscode = acquireVsCodeApi();
            vscode.postMessage({
                command: 'resetShapes'
            });
        });
        
        document.getElementById('dragModeBtn').addEventListener('click', () => {
            currentMode = 'drag';
            document.getElementById('dragModeBtn').classList.add('active-mode');
        });
        
        document.getElementById('togglePaletteBtn').addEventListener('click', () => {
            const palette = document.getElementById('characterPalette');
            isPaletteVisible = !isPaletteVisible;
            
            if (isPaletteVisible) {
                palette.classList.remove('hidden');
                document.getElementById('togglePaletteBtn').textContent = 'Hide Character Palette';
            } else {
                palette.classList.add('hidden');
                document.getElementById('togglePaletteBtn').textContent = 'Show Character Palette';
            }
        });
        
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
        
        // Initialize palettes
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
        
        // Initialize
        populateCharacterPalette();
        populateShapePalette();
        setInterval(drawCanvas, 100);
    </script>
</body>
</html>`;
}

module.exports = {
  getWebviewContent
};
