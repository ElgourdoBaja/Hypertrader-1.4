// package.js
// Script to package the electron app

const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Create assets folder if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

// Create a basic icon.ico file placeholder if it doesn't exist
const iconPath = path.join(assetsDir, 'icon.ico');
if (!fs.existsSync(iconPath)) {
  console.log('Creating placeholder icon file...');
  // Copy a placeholder icon or create a simple one
  // For actual app, you would replace this with a proper icon
}

console.log('Building React app...');
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error building React app: ${error}`);
    return;
  }
  
  console.log('React build completed successfully.');
  console.log(stdout);
  
  console.log('Packaging Electron app for Windows...');
  const platform = os.platform();
  
  let packagingCommand;
  if (platform === 'win32') {
    packagingCommand = 'npx electron-builder --win --x64';
  } else {
    packagingCommand = 'npx electron-builder --win --x64 --dir'; // Build for Windows from other platforms
  }
  
  exec(packagingCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error packaging Electron app: ${error}`);
      return;
    }
    
    console.log('Electron app packaged successfully!');
    console.log(stdout);
    
    console.log('Packaging completed. Installer can be found in the dist folder.');
  });
});