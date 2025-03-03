(function () {
    const vscode = acquireVsCodeApi();

    // Elements
    const imageElement = document.getElementById('imageElement');
    const message = document.getElementById('message');
    const imageInfo = document.getElementById('imageInfo');
    const fileNameElement = document.querySelector('.file-name');
    const uploadBtn = document.getElementById('uploadBtn');
    const openInFinderBtn = document.getElementById('openInFinderBtn');
    const copyPathBtn = document.getElementById('copyPathBtn');
    const imageInput = document.getElementById('imageInput');

    // State
    let currentFileUri = null;
    let currentFileName = 'Select a file to view image';
    let currentImagePath = null;
    let viewMode = 'exact'; // 'exact' or 'fit'

    // Upload button click handler
    uploadBtn.addEventListener('click', () => {
        if (!currentFileUri) {
            vscode.postMessage({ command: 'showError', message: 'Please select a file first' });
            return;
        }
        imageInput.click();
    });

    // Open in Finder button click handler
    openInFinderBtn.addEventListener('click', () => {
        if (currentImagePath) {
            vscode.postMessage({
                command: 'openInFinder',
                imagePath: currentImagePath
            });
        }
    });

    // Copy Path button click handler
    copyPathBtn.addEventListener('click', () => {
        if (currentImagePath) {
            vscode.postMessage({
                command: 'copyFilePath',
                imagePath: currentImagePath
            });
        }
    });

    // Image input change handler
    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            uploadImage(file);
        }
    });

    // Function to upload an image
    function uploadImage(file) {
        const reader = new FileReader();

        reader.onload = (event) => {
            vscode.postMessage({
                command: 'uploadImage',
                fileUri: currentFileUri,
                fileName: file.name,
                imageData: event.target.result
            });
        };

        reader.readAsDataURL(file);
    }

    // Set up view mode radio buttons
    document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            viewMode = e.target.value;
            updateImageDisplay();
        });
    });

    // Function to update the image display based on the current view mode
    function updateImageDisplay() {
        if (!imageElement.src) return;

        imageElement.classList.remove('exact-size', 'fit-width');
        imageElement.classList.add(viewMode === 'exact' ? 'exact-size' : 'fit-width');
    }

    // Function to display an image
    function displayImage(imagePath, fileName) {
        // Update state
        currentImagePath = imagePath;

        // Show the image
        imageElement.src = imagePath;
        imageElement.style.display = 'block';
        message.style.display = 'none';

        // Apply the current view mode
        updateImageDisplay();

        // Enable buttons
        openInFinderBtn.disabled = false;
        copyPathBtn.disabled = false;

        // Get image dimensions and display info
        imageElement.onload = function () {
            var width = imageElement.naturalWidth;
            var height = imageElement.naturalHeight;
            imageInfo.textContent = fileName + ' (' + width + 'x' + height + ')';
            imageInfo.style.display = 'block';
        };
    }

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;

        switch (message.command) {
            case 'openFile':
                currentFileUri = message.fileUri;
                currentFileName = message.fileName;
                fileNameElement.textContent = currentFileName;
                document.getElementById('message').style.display = 'block';
                imageElement.style.display = 'none';
                imageInfo.style.display = 'none';
                openInFinderBtn.disabled = true;
                copyPathBtn.disabled = true;
                break;

            case 'loadImage':
                displayImage(message.imagePath, message.fileName);
                break;

            case 'imageUploaded':
                displayImage(message.imagePath, message.fileName);
                break;

            case 'noImage':
                imageElement.style.display = 'none';
                imageInfo.style.display = 'none';
                const messageElement = document.getElementById('message');
                if (messageElement) {
                    messageElement.style.display = 'block';
                    messageElement.textContent = 'No image available. Click "Upload Image" to add one.';
                }
                openInFinderBtn.disabled = true;
                copyPathBtn.disabled = true;
                break;
        }
    });

    // Request image data if we have a file URI
    if (currentFileUri) {
        vscode.postMessage({
            command: 'getImage',
            fileUri: currentFileUri
        });
    }
})(); 