/**
 * API Mode Debugger
 * 
 * This file helps diagnose and fix issues with the API mode (demo vs. live).
 * It adds special buttons to the UI that allow forcing mode changes and seeing
 * the current status of the API connection.
 */

import hyperliquidDataService, { API_MODES } from '../services/hyperliquidDataService';

/**
 * Initialize the API Mode Debugger
 */
export function initializeApiModeDebugger() {
  console.log('Initializing API Mode Debugger...');
  
  // Create the debugger container
  const debuggerContainer = document.createElement('div');
  debuggerContainer.id = 'api-mode-debugger';
  debuggerContainer.style.position = 'fixed';
  debuggerContainer.style.bottom = '10px';
  debuggerContainer.style.right = '10px';
  debuggerContainer.style.zIndex = '9999';
  debuggerContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  debuggerContainer.style.borderRadius = '5px';
  debuggerContainer.style.padding = '10px';
  debuggerContainer.style.color = 'white';
  debuggerContainer.style.fontFamily = 'monospace';
  debuggerContainer.style.fontSize = '12px';
  debuggerContainer.style.width = '320px';
  debuggerContainer.style.maxHeight = '600px';
  debuggerContainer.style.overflow = 'auto';
  debuggerContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
  
  // Create the header
  const header = document.createElement('div');
  header.style.borderBottom = '1px solid #444';
  header.style.paddingBottom = '5px';
  header.style.marginBottom = '10px';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  
  const title = document.createElement('h3');
  title.textContent = 'API Mode Debugger';
  title.style.margin = '0';
  title.style.padding = '0';
  title.style.fontSize = '14px';
  title.style.fontWeight = 'bold';
  
  const closeButton = document.createElement('button');
  closeButton.textContent = 'X';
  closeButton.style.backgroundColor = '#ff4444';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '3px';
  closeButton.style.padding = '2px 6px';
  closeButton.style.cursor = 'pointer';
  closeButton.onclick = () => {
    document.body.removeChild(debuggerContainer);
  };
  
  header.appendChild(title);
  header.appendChild(closeButton);
  debuggerContainer.appendChild(header);
  
  // Create the status display
  const statusDisplay = document.createElement('div');
  statusDisplay.id = 'api-debugger-status';
  statusDisplay.style.marginBottom = '10px';
  statusDisplay.style.padding = '5px';
  statusDisplay.style.backgroundColor = '#222';
  statusDisplay.style.borderRadius = '3px';
  statusDisplay.style.fontFamily = 'monospace';
  debuggerContainer.appendChild(statusDisplay);
  
  // Create control buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.gap = '5px';
  buttonsContainer.style.marginBottom = '10px';
  
  const forceDemoButton = createDebugButton('Force Demo Mode', '#ffcc00', () => {
    hyperliquidDataService.enableDemoMode();
    updateStatus();
  });
  
  const forceLiveButton = createDebugButton('Force Live Mode', '#44ff44', () => {
    hyperliquidDataService.enableLiveMode();
    updateStatus();
  });
  
  const refreshButton = createDebugButton('Refresh Status', '#4499ff', () => {
    updateStatus();
  });
  
  buttonsContainer.appendChild(forceDemoButton);
  buttonsContainer.appendChild(forceLiveButton);
  buttonsContainer.appendChild(refreshButton);
  debuggerContainer.appendChild(buttonsContainer);
  
  // Create more detailed control buttons
  const advancedButtonsContainer = document.createElement('div');
  advancedButtonsContainer.style.display = 'flex';
  advancedButtonsContainer.style.gap = '5px';
  advancedButtonsContainer.style.marginBottom = '10px';
  
  const testApiButton = createDebugButton('Test API', '#44aaff', async () => {
    statusDisplay.innerHTML += `<div>Testing API connection...</div>`;
    try {
      const result = await hyperliquidDataService.testConnection();
      statusDisplay.innerHTML += `<div>API Test Result: ${result.success ? '✅' : '❌'} ${result.message}</div>`;
    } catch (error) {
      statusDisplay.innerHTML += `<div>API Test Error: ${error.message}</div>`;
    }
    updateStatus();
  });
  
  const resetButton = createDebugButton('Reset Service', '#ff9900', () => {
    // Force re-initialization of the service
    hyperliquidDataService.initialize({
      apiKey: hyperliquidDataService.apiKey,
      apiSecret: hyperliquidDataService.apiSecret
    }).then(() => {
      statusDisplay.innerHTML += `<div>Service reset complete</div>`;
      updateStatus();
    });
  });
  
  const clearButton = createDebugButton('Clear Log', '#ff6666', () => {
    statusDisplay.innerHTML = '';
  });
  
  advancedButtonsContainer.appendChild(testApiButton);
  advancedButtonsContainer.appendChild(resetButton);
  advancedButtonsContainer.appendChild(clearButton);
  debuggerContainer.appendChild(advancedButtonsContainer);
  
  // Create log output
  const logOutput = document.createElement('div');
  logOutput.id = 'api-debugger-log';
  logOutput.style.marginTop = '10px';
  logOutput.style.padding = '5px';
  logOutput.style.backgroundColor = '#222';
  logOutput.style.borderRadius = '3px';
  logOutput.style.fontFamily = 'monospace';
  logOutput.style.fontSize = '11px';
  logOutput.style.height = '100px';
  logOutput.style.overflowY = 'auto';
  debuggerContainer.appendChild(logOutput);
  
  // Hijack console.log to capture API-related logs
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    originalConsoleLog(...args);
    
    // Only capture API-related logs
    const logMessage = args.join(' ');
    if (logMessage.includes('API') || 
        logMessage.includes('mode') || 
        logMessage.includes('Mode') || 
        logMessage.includes('DEMO') || 
        logMessage.includes('LIVE') || 
        logMessage.includes('Hyperliquid')) {
      
      const logEntry = document.createElement('div');
      logEntry.textContent = `${new Date().toLocaleTimeString()}: ${logMessage}`;
      logEntry.style.borderBottom = '1px solid #333';
      logEntry.style.paddingBottom = '2px';
      logEntry.style.marginBottom = '2px';
      
      if (logOutput.children.length > 100) {
        logOutput.removeChild(logOutput.firstChild);
      }
      
      logOutput.appendChild(logEntry);
      logOutput.scrollTop = logOutput.scrollHeight;
    }
  };
  
  // Function to update the status display
  function updateStatus() {
    const debugInfo = hyperliquidDataService.getDebugInfo();
    
    statusDisplay.innerHTML = `
      <div><strong>Mode:</strong> ${debugInfo.mode}</div>
      <div><strong>Connection:</strong> ${debugInfo.connectionStatus}</div>
      <div><strong>Credentials:</strong> ${debugInfo.hasCredentials ? 'Present ✅' : 'Missing ❌'}</div>
      <div><strong>Demo Simulations:</strong> ${debugInfo.demoSimulationsActive}</div>
      <div><strong>Subscriptions:</strong> ${debugInfo.subscriptionsCount}</div>
      <div><strong>WebSocket:</strong> ${debugInfo.wsStatus}</div>
      <div><strong>Updated:</strong> ${new Date().toLocaleTimeString()}</div>
    `;
  }
  
  // Helper function to create debug buttons
  function createDebugButton(text, color, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.backgroundColor = color;
    button.style.color = 'black';
    button.style.border = 'none';
    button.style.borderRadius = '3px';
    button.style.padding = '5px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';
    button.onclick = onClick;
    return button;
  }
  
  // Add to document body
  document.body.appendChild(debuggerContainer);
  
  // Initial status update
  updateStatus();
  
  // Listen for mode changes to update status
  window.addEventListener('hyperliquid-mode-change', () => {
    updateStatus();
  });
  
  // Update status periodically
  setInterval(updateStatus, 5000);
}

// Export the function for use in other files
export default { initializeApiModeDebugger };