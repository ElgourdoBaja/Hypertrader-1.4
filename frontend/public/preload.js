const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    saveApiCredentials: (credentials) => 
      ipcRenderer.invoke('save-api-credentials', credentials),
    
    getApiCredentials: () => 
      ipcRenderer.invoke('get-api-credentials'),
    
    saveTradingConfig: (config) => 
      ipcRenderer.invoke('save-trading-config', config),
    
    getTradingConfig: () => 
      ipcRenderer.invoke('get-trading-config'),
    
    onTradingControl: (callback) => 
      ipcRenderer.on('trading-control', (event, command) => callback(command)),
    
    onOpenSettings: (callback) => 
      ipcRenderer.on('open-settings', () => callback()),
    
    onShowAbout: (callback) => 
      ipcRenderer.on('show-about', () => callback())
  }
);