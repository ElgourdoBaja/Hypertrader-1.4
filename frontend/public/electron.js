const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const log = require('electron-log');
const Store = require('electron-store');

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
    ? 'http://localhost:3000'
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
app.whenReady().then(() => {
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
    app.quit();
  }
});

// Handle API key storage
function setupIpcHandlers() {
  // Save Hyperliquid API credentials
  ipcMain.handle('save-api-credentials', (event, credentials) => {
    try {
      store.set('hyperliquid.apiKey', credentials.apiKey);
      store.set('hyperliquid.apiSecret', credentials.apiSecret);
      log.info('API credentials saved successfully');
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
      return { apiKey, apiSecret };
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