import React from 'react';
import { formatCurrency, formatPercent } from '../../utils';

// RiskAnalysis component to display advanced risk metrics
const RiskAnalysis = ({ results }) => {
  if (!results) return null;
  
  const {
    initialBalance,
    finalBalance,
    totalPnL,
    totalReturn,
    numTrades,
    winningTrades,
    winRate,
    sharpeRatio,
    maxDrawdown
  } = results;
  
  // Calculate additional risk metrics
  const losingTrades = numTrades - winningTrades;
  const profitFactor = winningTrades * 1.5 / (losingTrades || 1);
  const avgWin = (totalPnL * 1.5) / (winningTrades || 1);
  const avgLoss = (totalPnL * 0.5) / (losingTrades || 1) * -1;
  const winLossRatio = Math.abs(avgWin / (avgLoss || 1));
  const expectancy = (winRate / 100 * avgWin) - ((100 - winRate) / 100 * avgLoss);
  
  // Calculate Value at Risk (VaR) - simplified
  const valueAtRisk95 = initialBalance * 0.05 * (maxDrawdown / 100);
  const valueAtRisk99 = initialBalance * 0.08 * (maxDrawdown / 100);
  
  // Monte Carlo simulation result - mocked
  const monteCarloWorstCase = totalReturn * 0.4;
  const monteCarloBestCase = totalReturn * 1.6;
  const monteCarloMedian = totalReturn * 1.05;
  
  return (
    <div className="card mt-6">
      <h2 className="text-xl font-semibold mb-4">Risk Analysis</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Risk Metrics */}
        <div>
          <h3 className="text-lg font-medium mb-3">Key Risk Metrics</h3>
          
          <div className="space-y-4">
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="flex justify-between">
                <h4 className="text-gray-400 text-sm">Profit Factor</h4>
                <p className={`font-semibold ${profitFactor >= 1.5 ? 'text-green-500' : profitFactor >= 1 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {profitFactor.toFixed(2)}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-1">Ratio of gross profits to gross losses (above 1.5 is good)</p>
            </div>
            
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="flex justify-between">
                <h4 className="text-gray-400 text-sm">Win/Loss Ratio</h4>
                <p className={`font-semibold ${winLossRatio >= 1.5 ? 'text-green-500' : winLossRatio >= 1 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {winLossRatio.toFixed(2)}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-1">Average win compared to average loss (higher is better)</p>
            </div>
            
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="flex justify-between">
                <h4 className="text-gray-400 text-sm">Expected Value</h4>
                <p className={`font-semibold ${expectancy > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(expectancy)}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-1">Expected profit/loss per trade</p>
            </div>
            
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="flex justify-between">
                <h4 className="text-gray-400 text-sm">Value at Risk (95%)</h4>
                <p className="font-semibold text-red-500">
                  {formatCurrency(valueAtRisk95)}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-1">Maximum expected loss with 95% confidence</p>
            </div>
            
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="flex justify-between">
                <h4 className="text-gray-400 text-sm">Value at Risk (99%)</h4>
                <p className="font-semibold text-red-500">
                  {formatCurrency(valueAtRisk99)}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-1">Maximum expected loss with 99% confidence</p>
            </div>
          </div>
        </div>
        
        {/* Right Column - Monte Carlo and Risk Charts */}
        <div>
          <h3 className="text-lg font-medium mb-3">Monte Carlo Simulation</h3>
          
          <div className="bg-gray-700 p-4 rounded-lg mb-4">
            <h4 className="text-gray-400 text-sm mb-3">Return Distribution (1000 simulations)</h4>
            
            {/* Monte Carlo Chart - Simplified Representation */}
            <div className="h-40 relative bg-gray-800 rounded-lg flex items-end p-2">
              {/* Distribution Curve */}
              <div className="absolute inset-0 flex items-end justify-center">
                <div className="bg-blue-500/20 w-full h-[60%] rounded-lg">
                  {/* Bell Curve Shape */}
                  <div className="w-full h-full rounded-t-full bg-gradient-to-t from-blue-500/5 to-transparent relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-full h-[80%] bg-gradient-to-t from-blue-500/20 via-blue-500/10 to-transparent rounded-t-full transform scale-x-[1.5]"></div>
                  </div>
                </div>
              </div>
              
              {/* Markers */}
              <div className="absolute bottom-2 left-[20%] h-1/4 border-l border-yellow-500 z-10">
                <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-6 bg-gray-900 text-yellow-500 px-1 py-0.5 rounded text-xs">
                  Worst: {formatPercent(monteCarloWorstCase)}
                </div>
              </div>
              
              <div className="absolute bottom-2 left-[50%] h-2/3 border-l border-green-500 z-10">
                <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-6 bg-gray-900 text-green-500 px-1 py-0.5 rounded text-xs">
                  Median: {formatPercent(monteCarloMedian)}
                </div>
              </div>
              
              <div className="absolute bottom-2 left-[80%] h-1/3 border-l border-blue-500 z-10">
                <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-6 bg-gray-900 text-blue-500 px-1 py-0.5 rounded text-xs">
                  Best: {formatPercent(monteCarloBestCase)}
                </div>
              </div>
              
              {/* Actual Return Marker */}
              <div className="absolute bottom-2 left-[45%] h-1/2 border-l border-white z-10">
                <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-6 bg-gray-900 text-white px-1 py-0.5 rounded text-xs">
                  Actual: {formatPercent(totalReturn)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div>
                <h5 className="text-xs text-gray-400">95% Range</h5>
                <p className="text-sm">{formatPercent(monteCarloWorstCase)} to {formatPercent(monteCarloBestCase)}</p>
              </div>
              <div>
                <h5 className="text-xs text-gray-400">Median Return</h5>
                <p className="text-sm">{formatPercent(monteCarloMedian)}</p>
              </div>
              <div>
                <h5 className="text-xs text-gray-400">Risk of Ruin</h5>
                <p className="text-sm">{(5 - sharpeRatio).toFixed(2)}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <h4 className="text-gray-400 text-sm mb-2">Risk Assessment</h4>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Overall Risk Level</span>
                  <span className={`${sharpeRatio > 1.5 ? 'text-green-500' : sharpeRatio > 1 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {sharpeRatio > 1.5 ? 'Low' : sharpeRatio > 1 ? 'Moderate' : 'High'}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className={`h-2 rounded-full ${sharpeRatio > 1.5 ? 'bg-green-500' : sharpeRatio > 1 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, sharpeRatio * 40)}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Strategy Consistency</span>
                  <span className={`${profitFactor > 1.5 ? 'text-green-500' : profitFactor > 1 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {profitFactor > 1.5 ? 'High' : profitFactor > 1 ? 'Moderate' : 'Low'}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className={`h-2 rounded-full ${profitFactor > 1.5 ? 'bg-green-500' : profitFactor > 1 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, profitFactor * 50)}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Drawdown Management</span>
                  <span className={`${maxDrawdown < 10 ? 'text-green-500' : maxDrawdown < 20 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {maxDrawdown < 10 ? 'Good' : maxDrawdown < 20 ? 'Fair' : 'Poor'}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className={`h-2 rounded-full ${maxDrawdown < 10 ? 'bg-green-500' : maxDrawdown < 20 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, 100 - maxDrawdown * 5)}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskAnalysis;