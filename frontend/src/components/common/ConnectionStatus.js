import React, { useState, useEffect } from 'react';
import hyperliquidDataService from '../../services/hyperliquidDataService';

const ConnectionStatus = () => {
  const [status, setStatus] = useState('disconnected');
  
  useEffect(() => {
    // Initial status check
    setStatus(hyperliquidDataService.getStatus());
    
    // Add listener for status changes
    const handleStatusChange = (newStatus) => {
      setStatus(newStatus);
    };
    
    hyperliquidDataService.addStatusListener(handleStatusChange);
    
    // Cleanup on unmount
    return () => {
      hyperliquidDataService.removeStatusListener(handleStatusChange);
    };
  }, []);
  
  // Get appropriate styles based on connection status
  const getStatusStyles = () => {
    switch (status) {
      case 'connected':
        return {
          bg: 'bg-green-500',
          text: 'text-green-500',
          label: 'Connected'
        };
      case 'connecting':
        return {
          bg: 'bg-yellow-500',
          text: 'text-yellow-500',
          label: 'Connecting...'
        };
      case 'error':
        return {
          bg: 'bg-red-500',
          text: 'text-red-500',
          label: 'Connection Error'
        };
      case 'disconnected':
      default:
        return {
          bg: 'bg-gray-500',
          text: 'text-gray-500',
          label: 'Disconnected'
        };
    }
  };
  
  const statusStyles = getStatusStyles();
  
  return (
    <div className="flex items-center">
      <div className={`h-2 w-2 rounded-full ${statusStyles.bg} mr-2`}></div>
      <span className={`text-xs ${statusStyles.text}`}>{statusStyles.label}</span>
    </div>
  );
};

export default ConnectionStatus;