const builder = require('electron-builder');
const path = require('path');

// Define the configuration for the Windows build
const config = {
  appId: 'com.hyperliquid.trader',
  productName: 'Hyperliquid Trader',
  directories: {
    output: path.resolve(__dirname, 'dist'),
    buildResources: path.resolve(__dirname, 'assets')
  },
  files: [
    'build/**/*',
    'node_modules/**/*',
    'public/electron.js',
    'public/preload.js'
  ],
  win: {
    target: ['nsis'],
    icon: 'assets/icon.ico',
    artifactName: '${productName}-Setup-${version}.${ext}'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Hyperliquid Trader',
    uninstallDisplayName: 'Hyperliquid Trader',
    license: path.resolve(__dirname, 'LICENSE.txt'),
    installerIcon: 'assets/icon.ico',
    uninstallerIcon: 'assets/icon.ico',
    installerHeaderIcon: 'assets/icon.ico',
    installerSidebar: 'assets/installer-sidebar.bmp'
  }
};

// Create a license file if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(path.resolve(__dirname, 'LICENSE.txt'))) {
  fs.writeFileSync(
    path.resolve(__dirname, 'LICENSE.txt'),
    'Hyperliquid Trader - Cryptocurrency Trading Application\n\n' +
    'Copyright © 2023\n\n' +
    'All rights reserved.\n'
  );
}

// Build the installer
async function buildInstaller() {
  console.log('Building Windows installer...');
  
  try {
    // First build the React app
    console.log('Building React app...');
    require('child_process').execSync('yarn build', { stdio: 'inherit' });
    
    // Then build the electron app and create the installer
    console.log('Building Electron app and installer...');
    const result = await builder.build({
      targets: builder.Platform.WINDOWS.createTarget(),
      config: config
    });
    
    console.log('Build completed successfully!');
    console.log('Installer created at:', result);
  } catch (error) {
    console.error('Build failed with error:', error);
    process.exit(1);
  }
}

buildInstaller();