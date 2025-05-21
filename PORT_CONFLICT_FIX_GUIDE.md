# Port 3000 Conflict Fix Guide

This guide explains how to fix the "port 3000 is already in use" error that occurs when restarting the Hyperliquid Trader application.

## Solution Overview

We've created a solution that:
1. Adds proper cleanup of the React development server on app exit
2. Implements a confirmation dialog before closing the app
3. Provides utility scripts to handle stuck processes
4. Checks for and cleans up any existing processes on startup

## Files to Update

### 1. Update electron.js

Replace or modify `/app/frontend/public/electron.js` with these changes:

- Add imports at the top:
```javascript
const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const log = require('electron-log');
const Store = require('electron-store');
const { exec } = require('child_process');
const os = require('os');
```

- Add new variables after initializing the store:
```javascript
// Keep a global reference of the window object to avoid garbage collection
let mainWindow;
let isAppQuitting = false;
let devServerPort = 3000; // Default React dev server port
```

- Add the port killing utility function:
```javascript
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
```

- Modify the createWindow function to add a close handler:
```javascript
// Inside createWindow function, add this after the 'ready-to-show' handler
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
```

- Modify the app.whenReady, window-all-closed, and add before-quit handlers:
```javascript
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
```

### 2. Create a Safe Startup Script

Create a new file named `/app/frontend/run-app-safe.bat` with this content:

```batch
@echo off
echo Checking for previous instances of the app...

:: Clean up any process using port 3000 (React dev server)
echo Checking for processes using port 3000...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') DO (
    echo Found process: %%P
    echo Killing process %%P...
    taskkill /F /PID %%P
    if errorlevel 1 (
        echo Failed to kill process %%P, you may need to run as administrator.
    ) else (
        echo Successfully killed process %%P
    )
)

:: Wait a moment to ensure the port is free
timeout /t 2

:: Start the app
echo Starting Hyperliquid Trader in development mode...
echo.
echo This will launch the application with the React development server.
echo.

cd /d %~dp0
call yarn electron:dev

pause
```

### 3. Update the Installation Script

Update `/app/frontend/install-windows-deps.bat` to include information about the safe startup option:

```batch
@echo off
echo Installing Hyperliquid Trader dependencies for Windows...
echo.
echo This script will install the dependencies without building native modules,
echo which is useful if you don't have Visual Studio Build Tools installed.
echo.

cd /d %~dp0
call yarn install --ignore-scripts

echo.
echo Dependencies installed! You can now run the application with:
echo.
echo 1. Standard mode: run-app.bat
echo 2. Safe mode (cleans up previous instances): run-app-safe.bat
echo.
echo TIP: If you encounter "port 3000 already in use" errors, use run-app-safe.bat
echo     or manually end the node.exe processes in Task Manager.
echo.
pause
```

### 4. Create a Troubleshooting Guide

Create a new file named `/app/frontend/PORT_TROUBLESHOOTING.md` with comprehensive troubleshooting steps.

## Testing the Solution

1. Install the dependencies: `yarn install`
2. Try running the application: `yarn electron:dev`
3. Close the app using the X button - you should see a confirmation dialog
4. Try running the app again - it should start without port conflicts

If you still experience issues, use the `run-app-safe.bat` script which will forcibly terminate any processes using port 3000 before starting the app.