import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { formatCurrency, formatPercent } from '../../utils';
import RiskAnalysis from './RiskAnalysis';

const Backtesting = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC-PERP');
  const [timeframe, setTimeframe] = useState('1h');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0], // today
  });
  const [strategyParams, setStrategyParams] = useState({
    lookbackPeriod: 14,
    momentumThreshold: 0.5,
    stopLossPercent: 2,
    takeProfitPercent: 6,
    maxPositionSize: 5 // in percentage of portfolio
  });
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  
  const availableSymbols = [
    'BTC-PERP', 'ETH-PERP', 'SOL-PERP', 'AVAX-PERP', 'NEAR-PERP',
    'ATOM-PERP', 'DOT-PERP', 'MATIC-PERP', 'LINK-PERP', 'UNI-PERP'
  ];
  
  const availableTimeframes = ['5m', '15m', '30m', '1h', '4h', '1d'];
  
  // Initialize chart when component mounts
  useEffect(() => {
    if (chartContainerRef.current && !chartRef.current) {
      try {
        // Create chart with locale settings
        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { color: '#1e1e1e' },
            textColor: '#d9d9d9',
          },
          grid: {
            vertLines: { color: '#2e2e2e' },
            horzLines: { color: '#2e2e2e' },
          },
          width: chartContainerRef.current.clientWidth,
          height: 400,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            // Fix locale issue by providing a custom formatter
            tickMarkFormatter: (time) => {
              const date = new Date(time * 1000);
              return date.getUTCHours().toString().padStart(2, '0') + ':' +
                     date.getUTCMinutes().toString().padStart(2, '0');
            },
          },
          localization: {
            locale: 'en-US',
            dateFormat: 'yyyy/MM/dd',
          },
        });
        
        // Add candlestick series
        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
        
        // Add volume series
        const volumeSeries = chart.addHistogramSeries({
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        });
        
        // Add marker series for trades
        const longMarkerSeries = chart.addSeries({
          priceScaleId: 'right',
          priceFormat: {
            type: 'price',
          },
          lastValueVisible: false,
          title: 'Buy/Long',
          lineVisible: false,
          color: '#4CAF50',
        });
        
        const shortMarkerSeries = chart.addSeries({
          priceScaleId: 'right',
          priceFormat: {
            type: 'price',
          },
          lastValueVisible: false,
          title: 'Sell/Short',
          lineVisible: false,
          color: '#F44336',
        });
        
        // Save chart instance to ref
        chartRef.current = {
          chart,
          candlestickSeries,
          volumeSeries,
          longMarkerSeries,
          shortMarkerSeries
        };
        
        // Mock data for initial display
        const { candleData, volumeData } = generateMockBacktestData();
        
        candlestickSeries.setData(candleData);
        volumeSeries.setData(volumeData);
        
        // Handle resize
        const handleResize = () => {
          if (chartRef.current && chartContainerRef.current) {
            chartRef.current.chart.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          }
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          if (chartRef.current) {
            chartRef.current.chart.remove();
            chartRef.current = null;
          }
        };
      } catch (error) {
        console.error('Error initializing chart:', error);
        // Set chartRef to an empty object to prevent further errors
        chartRef.current = {
          chart: null,
          candlestickSeries: { setData: () => {} },
          volumeSeries: { setData: () => {} },
          longMarkerSeries: { setData: () => {} },
          shortMarkerSeries: { setData: () => {} }
        };
      }
    }
  }, []);
  
  // Generate mock backtest data
  const generateMockBacktestData = () => {
    const candleData = [];
    const volumeData = [];
    
    const basePrice = selectedSymbol === 'BTC-PERP' ? 58000 : 
                     selectedSymbol === 'ETH-PERP' ? 3200 : 
                     selectedSymbol === 'SOL-PERP' ? 145 : 100;
    
    const volatility = selectedSymbol === 'BTC-PERP' ? 0.01 : 
                       selectedSymbol === 'ETH-PERP' ? 0.015 : 0.02;
    
    const startTime = new Date(dateRange.start).getTime() / 1000;
    const endTime = new Date(dateRange.end).getTime() / 1000;
    const secondsInCandle = timeframe === '5m' ? 300 :
                           timeframe === '15m' ? 900 :
                           timeframe === '30m' ? 1800 :
                           timeframe === '1h' ? 3600 :
                           timeframe === '4h' ? 14400 : 86400;
    
    const numCandles = Math.floor((endTime - startTime) / secondsInCandle);
    
    // Create candles at regular intervals
    for (let i = 0; i < numCandles; i++) {
      const time = startTime + i * secondsInCandle;
      
      // Use a sine wave pattern with some randomness for more realistic price movement
      const trendFactor = Math.sin(i / 50) * 0.5;
      const randomChange = (Math.random() - 0.5 + trendFactor) * volatility;
      
      const open = i === 0 ? basePrice : candleData[i - 1].close;
      const close = open * (1 + randomChange);
      const high = Math.max(open, close) * (1 + Math.random() * volatility / 2);
      const low = Math.min(open, close) * (1 - Math.random() * volatility / 2);
      const volume = Math.random() * 100 + 50; // Random volume between 50-150
      
      candleData.push({
        time,
        open,
        high,
        low,
        close
      });
      
      volumeData.push({
        time,
        value: volume,
        color: close >= open ? '#26a69a88' : '#ef535088'
      });
    }
    
    return { candleData, volumeData };
  };
  
  // Run backtest
  const runBacktest = () => {
    setIsLoading(true);
    setIsRunning(true);
    
    // In a real app, this would call the backend to run the backtest
    // For this demo, we'll simulate a backtest with mock data
    
    setTimeout(() => {
      try {
        const { candleData, volumeData } = generateMockBacktestData();
        
        // Update chart with backtest data
        if (chartRef.current) {
          chartRef.current.candlestickSeries.setData(candleData);
          chartRef.current.volumeSeries.setData(volumeData);
          
          // Generate trade markers
          const longMarkers = [];
          const shortMarkers = [];
          
          // Add markers for strategy entry/exit points
          for (let i = strategyParams.lookbackPeriod; i < candleData.length - 1; i++) {
            // Simple momentum calculation based on price change over lookback period
            const currentPrice = candleData[i].close;
            const lookbackPrice = candleData[i - strategyParams.lookbackPeriod].close;
            const momentum = (currentPrice / lookbackPrice - 1) * 100;
            
            if (Math.abs(momentum) > strategyParams.momentumThreshold) {
              if (momentum > 0 && Math.random() > 0.7) { // 30% chance to avoid too many markers
                longMarkers.push({
                  time: candleData[i].time,
                  position: 'belowBar',
                  color: '#4CAF50',
                  shape: 'arrowUp',
                  text: 'BUY'
                });
              } else if (momentum < 0 && Math.random() > 0.7) {
                shortMarkers.push({
                  time: candleData[i].time,
                  position: 'aboveBar',
                  color: '#F44336',
                  shape: 'arrowDown',
                  text: 'SELL'
                });
              }
            }
          }
          
          // Set markers on chart
          if (chartRef.current.longMarkerSeries && chartRef.current.shortMarkerSeries) {
            chartRef.current.longMarkerSeries.setMarkers(longMarkers);
            chartRef.current.shortMarkerSeries.setMarkers(shortMarkers);
          }
          
          // Calculate backtest results
          const initialBalance = 100000;
          let balance = initialBalance;
          let numTrades = longMarkers.length + shortMarkers.length;
          let winningTrades = Math.floor(numTrades * 0.65); // 65% win rate for demo
          let totalPnL = 0;
          
          // Simulate PnL for long trades (buys)
          longMarkers.forEach((marker, index) => {
            const entryCandle = candleData.find(c => c.time === marker.time);
            if (!entryCandle) return;
            
            const entryPrice = entryCandle.close;
            // Find an exit 5-15 candles later
            const exitIndex = Math.min(
              candleData.findIndex(c => c.time === marker.time) + 5 + Math.floor(Math.random() * 10),
              candleData.length - 1
            );
            const exitPrice = candleData[exitIndex].close;
            
            // Calculate PnL
            const positionSize = balance * (strategyParams.maxPositionSize / 100);
            const pnl = positionSize * (exitPrice / entryPrice - 1);
            totalPnL += pnl;
            balance += pnl;
          });
          
          // Simulate PnL for short trades (sells)
          shortMarkers.forEach((marker, index) => {
            const entryCandle = candleData.find(c => c.time === marker.time);
            if (!entryCandle) return;
            
            const entryPrice = entryCandle.close;
            // Find an exit 5-15 candles later
            const exitIndex = Math.min(
              candleData.findIndex(c => c.time === marker.time) + 5 + Math.floor(Math.random() * 10),
              candleData.length - 1
            );
            const exitPrice = candleData[exitIndex].close;
            
            // Calculate PnL
            const positionSize = balance * (strategyParams.maxPositionSize / 100);
            const pnl = positionSize * (1 - exitPrice / entryPrice);
            totalPnL += pnl;
            balance += pnl;
          });
          
          // Calculate stats
          const totalReturn = ((balance / initialBalance) - 1) * 100;
          const sharpeRatio = totalReturn > 0 ? 1.5 + Math.random() : 0.5 + Math.random(); // Mock Sharpe ratio
          const maxDrawdown = 5 + Math.random() * 10; // Mock drawdown between 5-15%
          
          // Set results
          setTimeout(() => {
            const resultsData = {
              initialBalance,
              finalBalance: balance,
              totalPnL,
              totalReturn,
              numTrades,
              winningTrades,
              winRate: (winningTrades / numTrades) * 100,
              sharpeRatio,
              maxDrawdown
            };
            
            console.log('Setting backtest results:', resultsData);
            setResults(resultsData);
            
            // Force re-render
            setIsLoading(false);
            setIsRunning(false);
            
            // Scroll to results section
            const resultsSection = document.getElementById('backtest-results');
            if (resultsSection) {
              resultsSection.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100); // Small delay to ensure state updates properly
        } else {
          setIsLoading(false);
          setIsRunning(false);
        }
      } catch (error) {
        console.error('Error running backtest:', error);
        setIsLoading(false);
        setIsRunning(false);
      }
    }, 1000); // Reduced to 1 second for better user experience
  };
  
  // Handle parameter change
  const handleParamChange = (param, value) => {
    setStrategyParams({
      ...strategyParams,
      [param]: param === 'lookbackPeriod' ? parseInt(value) : parseFloat(value)
    });
  };
  
  // Handle date range change
  const handleDateChange = (field, value) => {
    setDateRange({
      ...dateRange,
      [field]: value
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Strategy Backtesting</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2">
          <div className="card mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <select 
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="input mr-2 bg-gray-700 text-white px-3 py-1.5 rounded"
                  disabled={isRunning}
                >
                  {availableSymbols.map(symbol => (
                    <option key={symbol} value={symbol}>{symbol}</option>
                  ))}
                </select>
                
                <select 
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="input bg-gray-700 text-white px-3 py-1.5 rounded"
                  disabled={isRunning}
                >
                  {availableTimeframes.map(tf => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={runBacktest}
                disabled={isRunning}
                className={`btn ${isRunning ? 'bg-gray-600 cursor-not-allowed' : 'btn-primary'}`}
              >
                {isRunning ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Running...
                  </span>
                ) : 'Run Backtest'}
              </button>
            </div>
            
            <div ref={chartContainerRef} className="chart-container"></div>
          </div>
          
          {/* Backtest Results */}
          {results && (
            <div id="backtest-results" className="card">
              <h2 className="text-xl font-semibold mb-4">Backtest Results</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <h3 className="text-gray-400 text-sm">Initial Balance</h3>
                  <p className="text-xl font-semibold">{formatCurrency(results.initialBalance)}</p>
                </div>
                
                <div>
                  <h3 className="text-gray-400 text-sm">Final Balance</h3>
                  <p className="text-xl font-semibold">{formatCurrency(results.finalBalance)}</p>
                </div>
                
                <div>
                  <h3 className="text-gray-400 text-sm">Total P&L</h3>
                  <p className={`text-xl font-semibold ${results.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(results.totalPnL)} ({formatPercent(results.totalReturn)})
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <h3 className="text-gray-400 text-sm">Number of Trades</h3>
                  <p className="text-lg font-semibold">{results.numTrades}</p>
                </div>
                
                <div>
                  <h3 className="text-gray-400 text-sm">Win Rate</h3>
                  <p className="text-lg font-semibold">{results.winRate.toFixed(2)}%</p>
                </div>
                
                <div>
                  <h3 className="text-gray-400 text-sm">Sharpe Ratio</h3>
                  <p className="text-lg font-semibold">{results.sharpeRatio.toFixed(2)}</p>
                </div>
                
                <div>
                  <h3 className="text-gray-400 text-sm">Max Drawdown</h3>
                  <p className="text-lg font-semibold text-red-500">-{results.maxDrawdown.toFixed(2)}%</p>
                </div>
              </div>
              
              {/* Advanced Performance Metrics */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-lg font-medium mb-4">Advanced Performance Analytics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h4 className="text-gray-400 text-xs uppercase tracking-wider">Annualized Return</h4>
                    <p className={`text-lg font-semibold ${results.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(results.totalReturn * (365 / 30)).toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h4 className="text-gray-400 text-xs uppercase tracking-wider">Profit Factor</h4>
                    <p className="text-lg font-semibold">
                      {(results.winningTrades * 1.5 / (results.numTrades - results.winningTrades || 1)).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h4 className="text-gray-400 text-xs uppercase tracking-wider">Average Trade</h4>
                    <p className={`text-lg font-semibold ${results.totalPnL / results.numTrades >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(results.totalPnL / results.numTrades)}
                    </p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h4 className="text-gray-400 text-xs uppercase tracking-wider">Recovery Factor</h4>
                    <p className="text-lg font-semibold">
                      {(Math.abs(results.totalReturn) / results.maxDrawdown).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h4 className="text-gray-400 text-xs uppercase tracking-wider">Performance Breakdown</h4>
                    <div className="mt-2 h-8 bg-gray-800 rounded-full overflow-hidden">
                      <div className="flex h-full">
                        <div 
                          className="bg-green-500" 
                          style={{ width: `${results.winRate}%` }}
                          title={`Winning Trades: ${results.winRate.toFixed(1)}%`}
                        ></div>
                        <div 
                          className="bg-red-500" 
                          style={{ width: `${100 - results.winRate}%` }}
                          title={`Losing Trades: ${(100 - results.winRate).toFixed(1)}%`}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span>Winning: {results.winRate.toFixed(1)}%</span>
                      <span>Losing: {(100 - results.winRate).toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h4 className="text-gray-400 text-xs uppercase tracking-wider">Drawdown Profile</h4>
                    <div className="mt-2 h-8 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500" 
                        style={{ width: `${(results.maxDrawdown / 20) * 100}%` }}
                        title={`Max Drawdown: ${results.maxDrawdown.toFixed(2)}%`}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span>Current: {results.maxDrawdown.toFixed(2)}%</span>
                      <span>Max Allowed: 20.00%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Add Risk Analysis Component */}
            <RiskAnalysis results={results} />,
          )}
        </div>
        
        {/* Backtest Parameters */}
        <div>
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Backtest Parameters</h2>
            
            <div className="mb-4">
              <label className="label">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Start</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="input"
                    disabled={isRunning}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">End</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="input"
                    disabled={isRunning}
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="label">Initial Capital</label>
              <input
                type="number"
                value="100000"
                className="input"
                disabled
              />
              <p className="text-xs text-gray-400 mt-1">Fixed for demo</p>
            </div>
            
            <h3 className="text-lg font-medium mb-2 mt-6">Momentum Strategy</h3>
            
            <div className="mb-4">
              <label className="label">Lookback Period (Candles)</label>
              <input 
                type="number" 
                value={strategyParams.lookbackPeriod}
                onChange={(e) => handleParamChange('lookbackPeriod', e.target.value)}
                className="input"
                min="1"
                disabled={isRunning}
              />
            </div>
            
            <div className="mb-4">
              <label className="label">Momentum Threshold (%)</label>
              <input 
                type="number" 
                value={strategyParams.momentumThreshold}
                onChange={(e) => handleParamChange('momentumThreshold', e.target.value)}
                className="input"
                step="0.1"
                disabled={isRunning}
              />
            </div>
            
            <h3 className="text-lg font-medium mb-2 mt-6">Risk Management</h3>
            
            <div className="mb-4">
              <label className="label">Stop Loss (%)</label>
              <input 
                type="number" 
                value={strategyParams.stopLossPercent}
                onChange={(e) => handleParamChange('stopLossPercent', e.target.value)}
                className="input"
                step="0.1"
                disabled={isRunning}
              />
            </div>
            
            <div className="mb-4">
              <label className="label">Take Profit (%)</label>
              <input 
                type="number" 
                value={strategyParams.takeProfitPercent}
                onChange={(e) => handleParamChange('takeProfitPercent', e.target.value)}
                className="input"
                step="0.1"
                disabled={isRunning}
              />
            </div>
            
            <div className="mb-4">
              <label className="label">Max Position Size (% of Portfolio)</label>
              <input 
                type="number" 
                value={strategyParams.maxPositionSize}
                onChange={(e) => handleParamChange('maxPositionSize', e.target.value)}
                className="input"
                min="0.1"
                max="100"
                step="0.1"
                disabled={isRunning}
              />
            </div>
            
            <button
              onClick={runBacktest}
              disabled={isRunning}
              className={`w-full mt-6 py-2 rounded-md font-medium focus:outline-none transition-colors ${
                isRunning 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isRunning ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running Backtest...
                </span>
              ) : 'Run Backtest'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Backtesting;