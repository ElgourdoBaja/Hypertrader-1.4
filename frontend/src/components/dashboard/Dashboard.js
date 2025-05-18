import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [dailyPnL, setDailyPnL] = useState(0);
  const [dailyPnLPercent, setDailyPnLPercent] = useState(0);
  const [activePositions, setActivePositions] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Mock data for demonstration
  useEffect(() => {
    // Simulate API call to get data
    const timer = setTimeout(() => {
      // Mock data
      setPortfolioValue(125000);
      setDailyPnL(3750);
      setDailyPnLPercent(3.1);
      
      setActivePositions([
        { id: 1, symbol: 'BTC-PERP', size: 0.5, entryPrice: 57800, currentPrice: 59200, pnl: 700, pnlPercent: 2.42 },
        { id: 2, symbol: 'ETH-PERP', size: 5, entryPrice: 3200, currentPrice: 3280, pnl: 400, pnlPercent: 2.5 },
        { id: 3, symbol: 'SOL-PERP', size: 40, entryPrice: 145, currentPrice: 142, pnl: -120, pnlPercent: -2.07 },
      ]);
      
      setRecentTrades([
        { id: 1, symbol: 'BTC-PERP', type: 'BUY', size: 0.5, price: 57800, timestamp: '2025-03-17T10:23:45Z' },
        { id: 2, symbol: 'ETH-PERP', type: 'BUY', size: 5, price: 3200, timestamp: '2025-03-17T10:15:22Z' },
        { id: 3, symbol: 'SOL-PERP', type: 'BUY', size: 40, price: 145, timestamp: '2025-03-17T09:58:31Z' },
        { id: 4, symbol: 'DOT-PERP', type: 'SELL', size: 100, price: 23.5, timestamp: '2025-03-17T09:45:12Z' },
      ]);
      
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Format percent
  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Trading Dashboard</h1>
      
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-300 mb-2">Portfolio Value</h3>
          <p className="text-2xl font-bold">{formatCurrency(portfolioValue)}</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-medium text-gray-300 mb-2">Daily P&L</h3>
          <p className={`text-2xl font-bold ${dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(dailyPnL)} ({formatPercent(dailyPnLPercent)})
          </p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-medium text-gray-300 mb-2">Active Positions</h3>
          <p className="text-2xl font-bold">{activePositions.length}</p>
        </div>
      </div>
      
      {/* Active Positions */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Active Positions</h2>
        {activePositions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="pb-3 pr-4">Symbol</th>
                  <th className="pb-3 pr-4">Size</th>
                  <th className="pb-3 pr-4">Entry Price</th>
                  <th className="pb-3 pr-4">Current Price</th>
                  <th className="pb-3 pr-4">P&L</th>
                  <th className="pb-3">P&L %</th>
                </tr>
              </thead>
              <tbody>
                {activePositions.map((position) => (
                  <tr key={position.id} className="border-b border-gray-700">
                    <td className="py-3 pr-4 font-medium">{position.symbol}</td>
                    <td className="py-3 pr-4">{position.size}</td>
                    <td className="py-3 pr-4">${position.entryPrice.toLocaleString()}</td>
                    <td className="py-3 pr-4">${position.currentPrice.toLocaleString()}</td>
                    <td className={`py-3 pr-4 ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(position.pnl)}
                    </td>
                    <td className={`py-3 ${position.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercent(position.pnlPercent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400">No active positions</p>
        )}
      </div>
      
      {/* Recent Trades */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
        {recentTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="pb-3 pr-4">Symbol</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Size</th>
                  <th className="pb-3 pr-4">Price</th>
                  <th className="pb-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade) => (
                  <tr key={trade.id} className="border-b border-gray-700">
                    <td className="py-3 pr-4 font-medium">{trade.symbol}</td>
                    <td className={`py-3 pr-4 ${trade.type === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.type}
                    </td>
                    <td className="py-3 pr-4">{trade.size}</td>
                    <td className="py-3 pr-4">${trade.price.toLocaleString()}</td>
                    <td className="py-3">{formatDate(trade.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400">No recent trades</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;