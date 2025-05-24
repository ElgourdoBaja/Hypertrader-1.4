import React, { useState, useEffect } from 'react';
import hyperliquidDataService from '../../services/hyperliquidDataService';

const Settings = () => {
  const [generalSettings, setGeneralSettings] = useState({
    darkMode: true,
    notifications: true,
    autoStart: false,
    logLevel: 'info'
  });
  
  const [performanceSettings, setPerformanceSettings] = useState({
    maxConcurrentRequests: 5,
    orderUpdateInterval: 1000, // in ms
    priceUpdateInterval: 500 // in ms
  });
  
  const [tradeReportSettings, setTradeReportSettings] = useState({
    dailySummary: true,
    emailReports: false,
    emailAddress: '',
    saveTradeHistory: true,
    exportFormat: 'csv'
  });

  const [connectionStatus, setConnectionStatus] = useState({
    testing: false,
    result: null,
    isLive: hyperliquidDataService.isLiveConnection()
  });

  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [credentialForm, setCredentialForm] = useState({
    apiKey: '',
    apiSecret: '',
    walletAddress: ''
  });
  
  // Directly set to live mode and remove demo mode toggle
  useEffect(() => {
    try {
      // Always set to live mode
      hyperliquidDataService.enableLiveMode();
      
      // Set the UI to reflect live mode
      setConnectionStatus({
        isLive: true,
        result: {
          success: true,
          message: 'Forced LIVE mode with real API connection'
        }
      });
    } catch (error) {
      console.error('Error initializing API connection:', error);
    }
  }, []);

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      if (window.electronAPI) {
        try {
          const config = await window.electronAPI.getTradingConfig();
          if (config) {
            if (config.general) setGeneralSettings(config.general);
            if (config.performance) setPerformanceSettings(config.performance);
            if (config.tradeReport) setTradeReportSettings(config.tradeReport);
          }
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      }
    };
    
    loadSettings();
  }, []);
  
  // Save settings
  const saveSettings = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.saveTradingConfig({
          general: generalSettings,
          performance: performanceSettings,
          tradeReport: tradeReportSettings
        });
        alert('Settings saved successfully');
      } catch (error) {
        console.error('Failed to save settings:', error);
        alert('Failed to save settings');
      }
    }
  };
  
  // Handle general settings change
  const handleGeneralChange = (key, value) => {
    setGeneralSettings({
      ...generalSettings,
      [key]: value
    });
  };
  
  // Handle performance settings change
  const handlePerformanceChange = (key, value) => {
    setPerformanceSettings({
      ...performanceSettings,
      [key]: typeof value === 'string' && !isNaN(value) ? parseInt(value) : value
    });
  };
  
  // Handle trade report settings change
  const handleTradeReportChange = (key, value) => {
    setTradeReportSettings({
      ...tradeReportSettings,
      [key]: value
    });
  };

  const updateApiCredentials = () => {
    console.log('updateApiCredentials called, showCredentialModal:', showCredentialModal);
    alert('Function called! showCredentialModal: ' + showCredentialModal);
    if (window.electronAPI) {
      window.electronAPI.getApiCredentials()
        .then(creds => {
          alert(`Current API Key: ${creds.apiKey ? '******' + creds.apiKey.slice(-6) : 'Not set'}`);
        })
        .catch(err => {
          console.error('Failed to get credentials:', err);
        });
    } else {
      // Web mode - show credential input modal
      console.log('Setting showCredentialModal to true');
      setShowCredentialModal(true);
      alert('Modal should be showing now. showCredentialModal set to: true');
    }
  };

  const handleCredentialSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentialForm.apiKey || !credentialForm.apiSecret || !credentialForm.walletAddress) {
      alert('All fields are required');
      return;
    }
    
    // Basic validation for Ethereum address format
    if (!credentialForm.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Wallet Address must be a valid Ethereum address (0x followed by 40 hex characters)');
      return;
    }
    
    try {
      // Store in localStorage for web mode
      localStorage.setItem('hyperliquid_api_key', credentialForm.apiKey);
      localStorage.setItem('hyperliquid_api_secret', credentialForm.apiSecret);
      localStorage.setItem('hyperliquid_wallet_address', credentialForm.walletAddress);
      
      // Reinitialize the service with new credentials
      await hyperliquidDataService.initialize({
        apiKey: credentialForm.apiKey,
        apiSecret: credentialForm.apiSecret,
        walletAddress: credentialForm.walletAddress,
        onStatusChange: (status) => {
          console.log(`Hyperliquid connection status: ${status}`);
        }
      });
      
      setShowCredentialModal(false);
      setCredentialForm({ apiKey: '', apiSecret: '', walletAddress: '' });
      alert('Credentials updated successfully! Please refresh the page to see updated data.');
      
    } catch (error) {
      console.error('Failed to update credentials:', error);
      alert('Failed to update credentials');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      {/* TEST BUTTON */}
      <button 
        onClick={() => alert('TEST BUTTON WORKS!')}
        style={{backgroundColor: 'red', color: 'white', padding: '10px', marginBottom: '20px'}}
      >
        TEST BUTTON - CLICK ME
      </button>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* API Settings */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">API Settings</h2>
          <p className="text-gray-400 mb-4">Configure your Hyperliquid API credentials.</p>
          
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  console.log('BUTTON CLICKED!');
                  alert('BUTTON CLICKED!');
                  updateApiCredentials();
                }}
              >
                Update API Credentials
              </button>
              
              <button 
                className="btn btn-info ml-2"
                onClick={() => {
                  const debugInfo = hyperliquidDataService.getDebugInfo();
                  console.log('API Debug Info:', debugInfo);
                  alert('Debug info logged to console.\n\n' + 
                        'Connection Status: ' + debugInfo.connectionStatus + '\n' +
                        'Live Mode: ' + debugInfo.isLiveMode + '\n' +
                        'Has Credentials: ' + debugInfo.hasCredentials + '\n' +
                        'Has Wallet Address: ' + debugInfo.hasWalletAddress + '\n' +
                        'Wallet Address: ' + debugInfo.walletAddress + '\n' +
                        'API URL: ' + debugInfo.apiUrl);
                }}
              >
                Debug Info
              </button>
            </div>
            
            {connectionStatus.result && (
              <div className={`mt-3 p-3 rounded ${connectionStatus.result.success ? 'bg-green-800' : 'bg-red-800'}`}>
                <p className="text-sm">
                  {connectionStatus.result.message}
                </p>
                {connectionStatus.isLive && (
                  <p className="text-sm font-bold mt-1 text-green-400">
                    Running in LIVE mode with real API connection
                  </p>
                )}
              </div>
            )}
            
            {!connectionStatus.result && (
              <div className="mt-3 p-3 rounded bg-gray-700">
                <p className="text-sm">
                  {connectionStatus.isLive ? 
                    'Currently connected to live Hyperliquid API.' : 
                    'Currently running in demo mode with simulated data.'}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* General Settings */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">General Settings</h2>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="label">Dark Mode</label>
              <div className="relative inline-block w-12 align-middle select-none">
                <input 
                  type="checkbox" 
                  name="darkMode" 
                  id="darkMode" 
                  checked={generalSettings.darkMode}
                  onChange={(e) => handleGeneralChange('darkMode', e.target.checked)}
                  className="hidden" 
                />
                <label 
                  htmlFor="darkMode" 
                  className={`block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${
                    generalSettings.darkMode ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span 
                    className={`block h-6 w-6 rounded-full bg-white transform transition-transform ${
                      generalSettings.darkMode ? 'translate-x-6' : 'translate-x-0'
                    }`} 
                  />
                </label>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="label">Enable Notifications</label>
              <div className="relative inline-block w-12 align-middle select-none">
                <input 
                  type="checkbox" 
                  name="notifications" 
                  id="notifications" 
                  checked={generalSettings.notifications}
                  onChange={(e) => handleGeneralChange('notifications', e.target.checked)}
                  className="hidden" 
                />
                <label 
                  htmlFor="notifications" 
                  className={`block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${
                    generalSettings.notifications ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span 
                    className={`block h-6 w-6 rounded-full bg-white transform transition-transform ${
                      generalSettings.notifications ? 'translate-x-6' : 'translate-x-0'
                    }`} 
                  />
                </label>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="label">Auto-start on launch</label>
              <div className="relative inline-block w-12 align-middle select-none">
                <input 
                  type="checkbox" 
                  name="autoStart" 
                  id="autoStart" 
                  checked={generalSettings.autoStart}
                  onChange={(e) => handleGeneralChange('autoStart', e.target.checked)}
                  className="hidden" 
                />
                <label 
                  htmlFor="autoStart" 
                  className={`block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${
                    generalSettings.autoStart ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span 
                    className={`block h-6 w-6 rounded-full bg-white transform transition-transform ${
                      generalSettings.autoStart ? 'translate-x-6' : 'translate-x-0'
                    }`} 
                  />
                </label>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="label">Log Level</label>
            <select 
              value={generalSettings.logLevel}
              onChange={(e) => handleGeneralChange('logLevel', e.target.value)}
              className="input"
            >
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
        
        {/* Performance Settings */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Performance Settings</h2>
          
          <div className="mb-4">
            <label className="label">Max Concurrent Requests</label>
            <input 
              type="number" 
              value={performanceSettings.maxConcurrentRequests}
              onChange={(e) => handlePerformanceChange('maxConcurrentRequests', e.target.value)}
              className="input"
              min="1"
              max="20"
            />
          </div>
          
          <div className="mb-4">
            <label className="label">Order Update Interval (ms)</label>
            <input 
              type="number" 
              value={performanceSettings.orderUpdateInterval}
              onChange={(e) => handlePerformanceChange('orderUpdateInterval', e.target.value)}
              className="input"
              min="100"
              step="100"
            />
          </div>
          
          <div className="mb-4">
            <label className="label">Price Update Interval (ms)</label>
            <input 
              type="number" 
              value={performanceSettings.priceUpdateInterval}
              onChange={(e) => handlePerformanceChange('priceUpdateInterval', e.target.value)}
              className="input"
              min="100"
              step="100"
            />
          </div>
        </div>
        
        {/* Trade Reporting */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Trade Reporting</h2>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="label">Daily Summary</label>
              <div className="relative inline-block w-12 align-middle select-none">
                <input 
                  type="checkbox" 
                  name="dailySummary" 
                  id="dailySummary" 
                  checked={tradeReportSettings.dailySummary}
                  onChange={(e) => handleTradeReportChange('dailySummary', e.target.checked)}
                  className="hidden" 
                />
                <label 
                  htmlFor="dailySummary" 
                  className={`block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${
                    tradeReportSettings.dailySummary ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span 
                    className={`block h-6 w-6 rounded-full bg-white transform transition-transform ${
                      tradeReportSettings.dailySummary ? 'translate-x-6' : 'translate-x-0'
                    }`} 
                  />
                </label>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="label">Email Reports</label>
              <div className="relative inline-block w-12 align-middle select-none">
                <input 
                  type="checkbox" 
                  name="emailReports" 
                  id="emailReports" 
                  checked={tradeReportSettings.emailReports}
                  onChange={(e) => handleTradeReportChange('emailReports', e.target.checked)}
                  className="hidden" 
                />
                <label 
                  htmlFor="emailReports" 
                  className={`block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${
                    tradeReportSettings.emailReports ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span 
                    className={`block h-6 w-6 rounded-full bg-white transform transition-transform ${
                      tradeReportSettings.emailReports ? 'translate-x-6' : 'translate-x-0'
                    }`} 
                  />
                </label>
              </div>
            </div>
          </div>
          
          {tradeReportSettings.emailReports && (
            <div className="mb-4">
              <label className="label">Email Address</label>
              <input 
                type="email" 
                value={tradeReportSettings.emailAddress}
                onChange={(e) => handleTradeReportChange('emailAddress', e.target.value)}
                className="input"
                placeholder="youremail@example.com"
              />
            </div>
          )}
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="label">Save Trade History</label>
              <div className="relative inline-block w-12 align-middle select-none">
                <input 
                  type="checkbox" 
                  name="saveTradeHistory" 
                  id="saveTradeHistory" 
                  checked={tradeReportSettings.saveTradeHistory}
                  onChange={(e) => handleTradeReportChange('saveTradeHistory', e.target.checked)}
                  className="hidden" 
                />
                <label 
                  htmlFor="saveTradeHistory" 
                  className={`block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${
                    tradeReportSettings.saveTradeHistory ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span 
                    className={`block h-6 w-6 rounded-full bg-white transform transition-transform ${
                      tradeReportSettings.saveTradeHistory ? 'translate-x-6' : 'translate-x-0'
                    }`} 
                  />
                </label>
              </div>
            </div>
          </div>
          
          {tradeReportSettings.saveTradeHistory && (
            <div className="mb-4">
              <label className="label">Export Format</label>
              <select 
                value={tradeReportSettings.exportFormat}
                onChange={(e) => handleTradeReportChange('exportFormat', e.target.value)}
                className="input"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-end mt-6">
        <button 
          onClick={saveSettings}
          className="btn btn-primary"
        >
          Save Settings
        </button>
      </div>

      {/* Credential Modal for Web Mode */}
      {showCredentialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4 text-white">Update API Credentials</h3>
            <form onSubmit={handleCredentialSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  value={credentialForm.apiKey}
                  onChange={(e) => setCredentialForm({...credentialForm, apiKey: e.target.value})}
                  className="input"
                  placeholder="Enter your Hyperliquid API key"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  API Secret
                </label>
                <input
                  type="password"
                  value={credentialForm.apiSecret}
                  onChange={(e) => setCredentialForm({...credentialForm, apiSecret: e.target.value})}
                  className="input"
                  placeholder="Enter your Hyperliquid API secret"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={credentialForm.walletAddress}
                  onChange={(e) => setCredentialForm({...credentialForm, walletAddress: e.target.value})}
                  className="input"
                  placeholder="0x... (Your Ethereum wallet address)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is your Ethereum wallet address that holds your Hyperliquid funds
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCredentialModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Update Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;