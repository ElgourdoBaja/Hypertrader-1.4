/**
 * This file forces the app to always use LIVE mode and never use demo data.
 * All API mode debugging functionality has been disabled.
 */

import hyperliquidDataService from '../services/hyperliquidDataService';

/**
 * Initialize the API Mode Debugger (now just forces LIVE mode)
 */
export function initializeApiModeDebugger() {
  console.log('Forcing LIVE mode and disabling demo mode...');
  
  // Force live mode immediately
  hyperliquidDataService.enableLiveMode();
  
  // Add a hidden message to inform developers
  const hiddenMessage = document.createElement('div');
  hiddenMessage.style.display = 'none';
  hiddenMessage.id = 'force-live-mode-indicator';
  hiddenMessage.dataset.info = 'Demo mode has been completely disabled';
  document.body.appendChild(hiddenMessage);
}

// Export the function for use in other files
export default { initializeApiModeDebugger };