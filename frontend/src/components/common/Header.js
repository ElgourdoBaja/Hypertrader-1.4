import React, { useState, useEffect } from 'react';
import NotificationCenter from './NotificationCenter';
import ConnectionStatus from './ConnectionStatus';

const Header = ({ toggleSidebar }) => {
  const [time, setTime] = useState(new Date());
  const [isTrading, setIsTrading] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // Listen for trading control events from Electron
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onTradingControl((command) => {
        if (command === 'start') {
          setIsTrading(true);
        } else if (command === 'stop') {
          setIsTrading(false);
        }
      });
    }
  }, []);

  const toggleTrading = () => {
    setIsTrading(!isTrading);
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 h-16 flex items-center justify-between px-4 sticky top-0 z-10 shadow-md">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar}
          className="text-gray-300 hover:text-white mr-4 focus:outline-none"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 6h16M4 12h16M4 18h16" 
            />
          </svg>
        </button>
        <h2 className="text-xl font-semibold text-white">
          Hyperliquid High-Frequency Trader
        </h2>
      </div>
      
      <div className="flex items-center space-x-4">
        <ConnectionStatus />
        
        <div className="text-gray-300">
          <span className="font-mono">{time.toLocaleTimeString()}</span>
        </div>
        
        {/* Notification Center */}
        <NotificationCenter />
        
        <button
          onClick={toggleTrading}
          className={`px-4 py-1.5 rounded-md font-medium focus:outline-none transition-colors ${
            isTrading 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isTrading ? 'Stop Trading' : 'Start Trading'}
        </button>
      </div>
    </header>
  );
};

export default Header;