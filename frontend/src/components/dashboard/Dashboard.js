import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [dailyPnL, setDailyPnL] = useState(0);
  const [dailyPnLPercent, setDailyPnLPercent] = useState(0);
  const [activePositions, setActivePositions] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      
      try {
        // Import hyperliquidDataService dynamically to avoid circular dependencies
        const hyperliquidDataService = (await import('../../services/hyperliquidDataService')).default;
        
        console.log('Fetching real dashboard data from API...');
        try {
          // Get real account information
          const accountInfo = await hyperliquidDataService.getAccountInfo();
          
          if (accountInfo) {
            // Use real data
            setPortfolioValue(accountInfo.totalValue || 0);
            setDailyPnL(accountInfo.dailyPnL || 0);
            setDailyPnLPercent(accountInfo.dailyPnLPercent || 0);
            
            // Use real positions if available
            if (Array.isArray(accountInfo.positions)) {
              setActivePositions(accountInfo.positions);
            } else {
              setActivePositions([]);
            }
            
            // Use real trades if available
            if (Array.isArray(accountInfo.recentTrades)) {
              setRecentTrades(accountInfo.recentTrades);
            } else {
              setRecentTrades([]);
            }
          } else {
            // No data received, set empty state
            setPortfolioValue(0);
            setDailyPnL(0);
            setDailyPnLPercent(0);
            setActivePositions([]);
            setRecentTrades([]);
          }
        } catch (error) {
          console.error('Error fetching real dashboard data:', error);
          // On error, set empty state
          setPortfolioValue(0);
          setDailyPnL(0);
          setDailyPnLPercent(0);
          setActivePositions([]);
          setRecentTrades([]);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDashboardData();
    
    // Refresh every 30 seconds
    const refreshInterval = setInterval(loadDashboardData, 30000);
    
    return () => clearInterval(refreshInterval);
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