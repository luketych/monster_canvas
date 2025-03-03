// Simple script to set the fileDrawer.depthViewLocation to 'sidebar'
const fs = require('fs');
const path = require('path');
const homedir = require('os').homedir();

// Path to VS Code's user settings.json
const vscodePath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'settings.json');

try {
  let settings = {};
  if (fs.existsSync(vscodePath)) {
    const settingsContent = fs.readFileSync(vscodePath, 'utf8');
    settings = JSON.parse(settingsContent);
  }

  // Set the fileDrawer.depthViewLocation to 'sidebar'
  settings['fileDrawer.depthViewLocation'] = 'sidebar';

  // Write the updated settings back to the file
  fs.writeFileSync(vscodePath, JSON.stringify(settings, null, 4), 'utf8');

  console.log('Successfully set fileDrawer.depthViewLocation to "sidebar"');
  console.log('Please restart VS Code for the changes to take effect');
} catch (error) {
  console.error('Error updating settings:', error);
}
