const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const log = require('electron-log');
const Store = require('electron-store');
const { exec } = require('child_process');
const os = require('os');

// Set up logging
log.transports.file.level = 'info';
log.info('Application starting...');

// Initialize config store
const store = new Store({
  name: 'hyperliquid-trader-config',
  encryptionKey: 'hyperliquid-trader-secure-key' // Basic encryption for sensitive data
});

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;
let isAppQuitting = false;
let devServerPort = 3000; // Default React dev server port

// Function to find and kill processes using a specific port (for Windows)
function killProcessOnPort(port) {
  return new Promise((resolve, reject) => {
    if (os.platform() === 'win32') {
      // Windows - find process using netstat and kill it
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (error) {
          log.warn(`No process found using port ${port}`);
          resolve();
          return;
        }
        
        const lines = stdout.trim().split('\n');
        const pidPattern = /(\d+)$/;
        
        for (const line of lines) {
          const match = line.match(pidPattern);
          if (match && match[1]) {
            const pid = match[1];
            log.info(`Killing process ${pid} using port ${port}`);
            
            exec(`taskkill /F /PID ${pid}`, (killError) => {
              if (killError) {
                log.error(`Failed to kill process ${pid}: ${killError}`);
              } else {
                log.info(`Successfully killed process ${pid}`);
              }
            });
          }
        }
        
        // Give some time for the processes to terminate
        setTimeout(resolve, 500);
      });
    } else {
      // Unix-like systems
      exec(`lsof -i:${port} -t | xargs -r kill -9`, (error) => {
        if (error) {
          log.warn(`Error killing processes on port ${port}: ${error}`);
        }
        resolve();
      });
    }
  });
}

function createWindow() {
  log.info('Creating main window...');
  
  // Create the browser window with optimized settings for trading app
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false, // Don't show until loaded
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  // Load the app - use local server in dev, file in production
  const startUrl = isDev
    ? `http://localhost:${devServerPort}`
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);
  
  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Show window when ready to avoid flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('Main window displayed');
  });

  // Handle window close event - add confirmation dialog
  mainWindow.on('close', (e) => {
    if (!isAppQuitting) {
      e.preventDefault();
      
      dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Confirm Exit',
        message: 'Are you sure you want to exit Hyperliquid Trader?',
        detail: 'Any unsaved changes will be lost.'
      }).then(result => {
        if (result.response === 0) { // 'Yes' clicked
          isAppQuitting = true;
          mainWindow.close();
        }
      });
      return;
    }
    
    // If we're actually quitting, clean up the dev server if needed
    if (isDev) {
      log.info(`Cleaning up development server on port ${devServerPort}`);
      killProcessOnPort(devServerPort)
        .then(() => {
          log.info('Development server cleanup complete');
        })
        .catch(error => {
          log.error(`Error during development server cleanup: ${error}`);
        });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    log.info('Main window closed');
  });

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Trading',
      submenu: [
        {
          label: 'Start Trading',
          click: () => {
            mainWindow.webContents.send('trading-control', 'start');
          }
        },
        {
          label: 'Stop Trading',
          click: () => {
            mainWindow.webContents.send('trading-control', 'stop');
          }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          click: () => {
            mainWindow.webContents.send('open-settings');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            mainWindow.webContents.send('show-about');
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create main window when Electron is ready
app.whenReady().then(async () => {
  // If in development mode, check if the port is already in use and clean it up
  if (isDev) {
    log.info(`Checking if port ${devServerPort} is already in use`);
    await killProcessOnPort(devServerPort);
  }
  
  createWindow();

  // On macOS it's common to re-create a window when clicked on dock icon
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  
  // Set up IPC handlers for communication between main and renderer processes
  setupIpcHandlers();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isAppQuitting = true;
    app.quit();
  }
});

// Handle final cleanup before app exits
app.on('before-quit', async (event) => {
  if (isDev) {
    // Prevent the app from quitting immediately
    event.preventDefault();
    
    // Set the flag to avoid loops
    if (!isAppQuitting) {
      isAppQuitting = true;
      
      // Clean up development server processes
      log.info('Performing final cleanup before app quit...');
      try {
        await killProcessOnPort(devServerPort);
        log.info('Cleanup completed, quitting application');
        // Now actually quit
        app.quit();
      } catch (error) {
        log.error(`Error during final cleanup: ${error}`);
        app.exit(1); // Force exit in case of errors
      }
    }
  }
});

// Handle API key storage
function setupIpcHandlers() {
  // Save Hyperliquid API credentials
  ipcMain.handle('save-api-credentials', (event, credentials) => {
    try {
      store.set('hyperliquid.apiKey', credentials.apiKey);
      store.set('hyperliquid.apiSecret', credentials.apiSecret);
      store.set('hyperliquid.publicAddress', credentials.publicAddress);
      log.info('API credentials and public address saved successfully');
      return { success: true };
    } catch (error) {
      log.error('Failed to save API credentials:', error);
      return { success: false, error: error.message };
    }
  });

  // Get Hyperliquid API credentials
  ipcMain.handle('get-api-credentials', () => {
    try {
      const apiKey = store.get('hyperliquid.apiKey');
      const apiSecret = store.get('hyperliquid.apiSecret');
      const publicAddress = store.get('hyperliquid.publicAddress');
      return { apiKey, apiSecret, publicAddress };
    } catch (error) {
      log.error('Failed to retrieve API credentials:', error);
      return { error: error.message };
    }
  });

  // Save trading configuration
  ipcMain.handle('save-trading-config', (event, config) => {
    try {
      store.set('trading.config', config);
      log.info('Trading configuration saved successfully');
      return { success: true };
    } catch (error) {
      log.error('Failed to save trading configuration:', error);
      return { success: false, error: error.message };
    }
  });

  // Get trading configuration
  ipcMain.handle('get-trading-config', () => {
    try {
      return store.get('trading.config') || {};
    } catch (error) {
      log.error('Failed to retrieve trading configuration:', error);
      return { error: error.message };
    }
  });
}