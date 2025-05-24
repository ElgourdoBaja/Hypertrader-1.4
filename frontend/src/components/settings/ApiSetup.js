import React, { useState } from 'react';
import hyperliquidDataService from '../../services/hyperliquidDataService';

const ApiSetup = ({ onSetupComplete }) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!apiKey || !apiSecret || !walletAddress) {
      setError('API Key, API Secret, and Wallet Address are all required');
      return;
    }
    
    // Basic validation for Ethereum address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Wallet Address must be a valid Ethereum address (0x followed by 40 hex characters)');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // For Electron app
      if (window.electronAPI) {
        const result = await window.electronAPI.saveApiCredentials({ apiKey, apiSecret, walletAddress });
        if (result.success) {
          // Initialize Hyperliquid data service with new credentials
          try {
            await hyperliquidDataService.initialize({
              apiKey,
              apiSecret,
              walletAddress,
              onStatusChange: (status) => {
                console.log(`Hyperliquid connection status: ${status}`);
              }
            });
            
            // Connect to WebSocket
            await hyperliquidDataService.connectWebSocket();
            
            onSetupComplete();
          } catch (initError) {
            console.error('Failed to initialize Hyperliquid service:', initError);
            setError('Credentials saved but failed to connect to Hyperliquid. Please try again.');
          }
        } else {
          setError(result.error || 'Failed to save API credentials');
        }
      } else {
        // Fallback for web version if needed
        setError('API integration is only available in the desktop app');
      }
    } catch (error) {
      console.error('Error saving API credentials:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full p-8 bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Hyperliquid Trader</h1>
          <p className="text-gray-400 mt-2">High-Frequency Trading Platform</p>
        </div>
        
        <h2 className="text-xl font-semibold mb-6 text-white">API Setup</h2>
        <p className="text-gray-400 mb-6">
          To get started, please enter your Hyperliquid API credentials. 
          These will be securely stored on your device.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="apiKey">
              API Key
            </label>
            <input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input"
              placeholder="Enter your Hyperliquid API key"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="apiSecret">
              API Secret
            </label>
            <input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="input"
              placeholder="Enter your Hyperliquid API secret"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="walletAddress">
              Wallet Address
            </label>
            <input
              id="walletAddress"
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="input"
              placeholder="0x... (Your Ethereum wallet address)"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is your Ethereum wallet address that holds your Hyperliquid funds
            </p>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary py-2 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Setting up...
              </>
            ) : (
              'Connect to Hyperliquid'
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            Don't have an API key yet?{' '}
            <a 
              href="https://hyperliquid.xyz" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 hover:text-blue-300"
            >
              Sign up on Hyperliquid
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiSetup;