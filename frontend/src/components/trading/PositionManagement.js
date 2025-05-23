import React, { useState, useEffect } from 'react';
import { formatCurrency, formatPercent } from '../../utils';

const PositionManagement = () => {
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [isClosingPosition, setIsClosingPosition] = useState(false);
  const [closeSize, setCloseSize] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [availableMargin, setAvailableMargin] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [closePositionStatus, setClosePositionStatus] = useState('');
  
  // Load positions
  useEffect(() => {
    const loadPositions = async () => {
      setIsLoading(true);
      
      try {
        // Import hyperliquidDataService dynamically to avoid circular dependencies
        const hyperliquidDataService = (await import('../../services/hyperliquidDataService')).default;
        
        // Always fetch real positions from API
        console.log('Fetching real positions from API...');
        
        try {
          const accountInfo = await hyperliquidDataService.getAccountInfo();
          
          if (accountInfo && accountInfo.positions) {
            // Use real position data from API
            setPositions(accountInfo.positions);
            
            // Calculate portfolio value and PnL from real data
            const portfolioVal = accountInfo.positions.reduce((sum, pos) => sum + pos.margin, 0);
            setPortfolioValue(portfolioVal);
            
            const pnl = accountInfo.positions.reduce((sum, pos) => sum + pos.pnl, 0);
            setTotalPnL(pnl);
            
            setAvailableMargin(accountInfo.availableMargin || 0);
          } else {
            console.warn('No position data returned from API');
            // Use empty arrays if no positions
            setPositions([]);
            setPortfolioValue(0);
            setTotalPnL(0);
            setAvailableMargin(0);
          }
        } catch (error) {
          console.error('Error fetching real positions:', error);
          // On error, don't use mock data, just show empty state
          setPositions([]);
          setPortfolioValue(0);
          setTotalPnL(0);
          setAvailableMargin(0);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading positions:', error);
        setIsLoading(false);
      }
    };
    
    loadPositions();
    
    // Set up refresh interval
    const refreshInterval = setInterval(loadPositions, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  // Select position for closing
  const selectPositionForClosing = (position) => {
    setSelectedPosition(position);
    setCloseSize(position.size);
    setIsClosingPosition(true);
  };
  
  // Close position
  const closePosition = () => {
    setClosePositionStatus('Closing position...');
    
    // In a real app, we would send a request to the API
    setTimeout(() => {
      // If closing partial position
      if (closeSize < selectedPosition.size) {
        const updatedPositions = positions.map(pos => {
          if (pos.id === selectedPosition.id) {
            return {
              ...pos,
              size: pos.size - closeSize,
              margin: pos.margin * (pos.size - closeSize) / pos.size,
              pnl: pos.pnl * (pos.size - closeSize) / pos.size
            };
          }
          return pos;
        });
        
        setPositions(updatedPositions);
        setClosePositionStatus(`Partially closed ${closeSize} ${selectedPosition.symbol} position`);
      } else {
        // If closing entire position
        const updatedPositions = positions.filter(pos => pos.id !== selectedPosition.id);
        setPositions(updatedPositions);
        setClosePositionStatus(`Closed ${selectedPosition.symbol} position`);
      }
      
      setTimeout(() => {
        setIsClosingPosition(false);
        setSelectedPosition(null);
        setClosePositionStatus('');
      }, 1500);
    }, 1000);
  };
  
  // Calculate position risk level
  const getPositionRiskLevel = (position) => {
    const distanceToLiquidation = Math.abs(position.currentPrice - position.liquidationPrice) / position.currentPrice * 100;
    
    if (distanceToLiquidation < 15) {
      return 'high';
    } else if (distanceToLiquidation < 30) {
      return 'medium';
    } else {
      return 'low';
    }
  };
  
  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Position Management</h1>
      
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <h3 className="text-gray-400 text-sm">Portfolio Value</h3>
          <p className="text-2xl font-semibold">{formatCurrency(portfolioValue)}</p>
        </div>
        
        <div className="card">
          <h3 className="text-gray-400 text-sm">Available Margin</h3>
          <p className="text-2xl font-semibold">{formatCurrency(availableMargin)}</p>
        </div>
        
        <div className="card">
          <h3 className="text-gray-400 text-sm">Active Positions</h3>
          <p className="text-2xl font-semibold">{positions.length}</p>
        </div>
        
        <div className="card">
          <h3 className="text-gray-400 text-sm">Total P&L</h3>
          <p className={`text-2xl font-semibold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(totalPnL)}
          </p>
        </div>
      </div>
      
      {/* Positions Table */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Active Positions</h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : positions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="pb-3 pr-4">Symbol</th>
                  <th className="pb-3 pr-4">Side</th>
                  <th className="pb-3 pr-4">Size</th>
                  <th className="pb-3 pr-4">Entry Price</th>
                  <th className="pb-3 pr-4">Current Price</th>
                  <th className="pb-3 pr-4">Liquidation</th>
                  <th className="pb-3 pr-4">P&L</th>
                  <th className="pb-3 pr-4">Margin</th>
                  <th className="pb-3 pr-4">Leverage</th>
                  <th className="pb-3 pr-4">Open Time</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => {
                  const riskLevel = getPositionRiskLevel(position);
                  return (
                    <tr key={position.id} className="border-b border-gray-700">
                      <td className="py-3 pr-4 font-medium">{position.symbol}</td>
                      <td className={`py-3 pr-4 ${position.side === 'long' ? 'text-green-500' : 'text-red-500'}`}>
                        {position.side.toUpperCase()}
                      </td>
                      <td className="py-3 pr-4">{position.size}</td>
                      <td className="py-3 pr-4">${position.entryPrice.toLocaleString()}</td>
                      <td className="py-3 pr-4">${position.currentPrice.toLocaleString()}</td>
                      <td className={`py-3 pr-4 ${
                        riskLevel === 'high' ? 'text-red-500' : 
                        riskLevel === 'medium' ? 'text-yellow-500' : 'text-gray-400'
                      }`}>
                        ${position.liquidationPrice.toLocaleString()}
                      </td>
                      <td className={`py-3 pr-4 ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(position.pnl)} ({formatPercent(position.pnlPercent)})
                      </td>
                      <td className="py-3 pr-4">{formatCurrency(position.margin)}</td>
                      <td className="py-3 pr-4">{position.leverage}x</td>
                      <td className="py-3 pr-4">{formatTime(position.openTime)}</td>
                      <td className="py-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => selectPositionForClosing(position)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                          >
                            Close
                          </button>
                          <button
                            className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No active positions</p>
        )}
      </div>
      
      {/* Risk Analysis */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Position Risk Analysis</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Margin Utilization */}
          <div>
            <h3 className="text-lg font-medium mb-2">Margin Utilization</h3>
            <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
              <div 
                className={`h-4 rounded-full ${
                  (portfolioValue - availableMargin) / portfolioValue > 0.7 ? 'bg-red-500' :
                  (portfolioValue - availableMargin) / portfolioValue > 0.5 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${((portfolioValue - availableMargin) / portfolioValue) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <span>{Math.round(((portfolioValue - availableMargin) / portfolioValue) * 100)}% Used</span>
              <span>{Math.round((availableMargin / portfolioValue) * 100)}% Available</span>
            </div>
          </div>
          
          {/* Position Concentration */}
          <div>
            <h3 className="text-lg font-medium mb-2">Position Concentration</h3>
            <div className="space-y-2">
              {positions.map(position => (
                <div key={position.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{position.symbol}</span>
                    <span>{Math.round((position.margin / (portfolioValue - availableMargin)) * 100)}% of Portfolio</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        position.side === 'long' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(position.margin / (portfolioValue - availableMargin)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Liquidation Risk */}
          <div>
            <h3 className="text-lg font-medium mb-2">Liquidation Risk</h3>
            <div className="space-y-4">
              {positions.map(position => {
                const distanceToLiquidation = Math.abs(position.currentPrice - position.liquidationPrice) / position.currentPrice * 100;
                const riskLevel = getPositionRiskLevel(position);
                
                return (
                  <div key={position.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{position.symbol} ({position.side.toUpperCase()})</span>
                      <span className={
                        riskLevel === 'high' ? 'text-red-500' : 
                        riskLevel === 'medium' ? 'text-yellow-500' : 'text-green-500'
                      }>
                        {distanceToLiquidation.toFixed(1)}% to Liquidation
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          riskLevel === 'high' ? 'bg-red-500' : 
                          riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, 100 - distanceToLiquidation)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Close Position Modal */}
      {isClosingPosition && selectedPosition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Close Position</h2>
              <button 
                onClick={() => setIsClosingPosition(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-300 mb-1">Position: {selectedPosition.symbol} {selectedPosition.side.toUpperCase()}</p>
              <p className="text-gray-300 mb-1">Size: {selectedPosition.size}</p>
              <p className="text-gray-300 mb-1">Entry Price: ${selectedPosition.entryPrice.toLocaleString()}</p>
              <p className="text-gray-300 mb-4">Current Price: ${selectedPosition.currentPrice.toLocaleString()}</p>
              
              <p className={`font-medium ${selectedPosition.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                Unrealized P&L: {formatCurrency(selectedPosition.pnl)} ({formatPercent(selectedPosition.pnlPercent)})
              </p>
            </div>
            
            <div className="mb-6">
              <label className="label">Close Size</label>
              <input 
                type="range" 
                min="0" 
                max={selectedPosition.size}
                step={selectedPosition.size / 100}
                value={closeSize}
                onChange={(e) => setCloseSize(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none"
              />
              <div className="flex justify-between mt-2">
                <input
                  type="number"
                  value={closeSize}
                  onChange={(e) => setCloseSize(Math.min(selectedPosition.size, Math.max(0, parseFloat(e.target.value))))}
                  className="input w-24"
                  min="0"
                  max={selectedPosition.size}
                  step={selectedPosition.size / 100}
                />
                <span className="text-gray-300">Max: {selectedPosition.size}</span>
              </div>
            </div>
            
            {closePositionStatus && (
              <div className="mb-4 p-3 bg-blue-900/50 text-blue-200 rounded-lg">
                {closePositionStatus}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setIsClosingPosition(false)}
                className="btn bg-gray-700 text-white hover:bg-gray-600"
              >
                Cancel
              </button>
              <button 
                onClick={closePosition}
                className="btn bg-red-600 hover:bg-red-700 text-white"
              >
                Close Position
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionManagement;