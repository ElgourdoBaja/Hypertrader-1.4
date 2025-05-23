import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

const Trading = () => {
  const [selectedStrategy, setSelectedStrategy] = useState('momentum');
  const [isTrading, setIsTrading] = useState(false);
  const [riskLevel, setRiskLevel] = useState(2); // 1-5 scale
  const [selectedSymbol, setSelectedSymbol] = useState('BTC-PERP');
  const [timeframe, setTimeframe] = useState('5m');
  const [tradingSymbols, setTradingSymbols] = useState([]);
  const [strategyParams, setStrategyParams] = useState({
    lookbackPeriod: 20,
    momentumThreshold: 0.5,
    stopLossPercent: 1.5,
    takeProfitPercent: 4.5,
    maxPositionSize: 5, // in percentage of portfolio
    maxDrawdown: 10 // in percentage
  });
  
  // Order form state
  const [orderType, setOrderType] = useState('market'); // 'market', 'limit'
  const [orderSide, setOrderSide] = useState('buy'); // 'buy', 'sell'
  const [orderSize, setOrderSize] = useState(0.01);
  const [orderPrice, setOrderPrice] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  
  // Available symbols - initialize with defaults but will be replaced with API data
  const [availableSymbols, setAvailableSymbols] = useState([
    'BTC-PERP', 'ETH-PERP', 'SOL-PERP', 'AVAX-PERP', 'NEAR-PERP',
    'ATOM-PERP', 'DOT-PERP', 'MATIC-PERP', 'LINK-PERP', 'UNI-PERP'
  ]);
  
  // Fetch available trading symbols from the API when component mounts
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        // Import hyperliquidDataService dynamically to avoid circular dependencies
        const hyperliquidDataService = (await import('../../services/hyperliquidDataService')).default;
        
        // Get real market data if we're in live mode
        if (hyperliquidDataService.isLiveConnection()) {
          console.log('Fetching real market symbols from API...');
          const markets = await hyperliquidDataService.getMarkets();
          
          if (Array.isArray(markets) && markets.length > 0) {
            console.log(`Loaded ${markets.length} markets from API`);
            const symbols = markets.map(market => market.symbol);
            setAvailableSymbols(symbols);
            
            // If the currently selected symbol is not in the new list, select the first one
            if (!symbols.includes(selectedSymbol) && symbols.length > 0) {
              setSelectedSymbol(symbols[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching trading symbols:', error);
      }
    };
    
    fetchSymbols();
    
    // Set up a timer to periodically check if we should fetch real market data
    const symbolsTimer = setInterval(fetchSymbols, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(symbolsTimer);
    };
  }, []);
  
  // Available timeframes
  const availableTimeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];
  
  // Initialize chart when component mounts
  useEffect(() => {
    // Function to create and initialize the chart
    const initializeChart = () => {
      if (!chartContainerRef.current) {
        console.warn("Chart container not found");
        return;
      }

      try {
        // Clear any previous chart instance
        if (chartRef.current && chartRef.current.chart) {
          chartRef.current.chart.remove();
          chartRef.current = null;
        }

        // Ensure the container has dimensions before creating the chart
        if (chartContainerRef.current.clientWidth === 0) {
          console.warn("Chart container has zero width");
          // Wait for container to be properly sized
          setTimeout(initializeChart, 100);
          return;
        }

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
        
        // Fetch real candle data from API
        (async () => {
          try {
            const hyperliquidDataService = (await import('../../services/hyperliquidDataService')).default;
            
            // Fetch real candle data
            const realCandleData = await hyperliquidDataService.getCandles(
              selectedSymbol, 
              timeframe, 
              200 // Get last 200 candles
            );
            
            if (realCandleData && realCandleData.length > 0) {
              // Format data for the chart
              const formattedData = realCandleData.map(candle => ({
                time: candle.time,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
                volume: candle.volume
              }));
              
              // Set the real data
              candlestickSeries.setData(formattedData);
              
              // Set volume data
              const volumeData = formattedData.map(candle => ({
                time: candle.time,
                value: candle.volume || 0,
                color: candle.close >= candle.open ? '#26a69a88' : '#ef535088',
              }));
              
              volumeSeries.setData(volumeData);
            } else {
              console.warn('No candle data returned from API, chart may be empty');
            }
          } catch (error) {
            console.error('Error fetching real candle data:', error);
          }
        })();
        
        // Save chart instance to ref
        chartRef.current = {
          chart,
          candlestickSeries,
          volumeSeries
        };
        
        console.log("Chart successfully initialized");
      } catch (error) {
        console.error("Error initializing chart:", error);
        // Create a placeholder chart reference to avoid null pointer errors
        chartRef.current = {
          chart: null,
          candlestickSeries: { setData: () => {} },
          volumeSeries: { setData: () => {} }
        };
      }
    };

    // Initialize the chart
    initializeChart();

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartRef.current.chart && chartContainerRef.current) {
        try {
          chartRef.current.chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        } catch (error) {
          console.error("Error resizing chart:", error);
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current && chartRef.current.chart) {
        try {
          chartRef.current.chart.remove();
        } catch (error) {
          console.error("Error removing chart:", error);
        }
        chartRef.current = null;
      }
    };
  }, []);
  
  // Update chart when symbol or timeframe changes
  useEffect(() => {
    if (chartRef.current) {
      try {
        const { candlestickSeries, volumeSeries, chart } = chartRef.current;
        
        // Skip if series are null (due to error)
        if (!candlestickSeries || !volumeSeries || !chart) {
          console.warn("Cannot update chart: chart series not available");
          return;
        }
        
        console.log(`Updating chart for ${selectedSymbol} with timeframe ${timeframe}`);
        
        // Mock data update for demonstration
        const candleData = generateMockCandleData();
        
        // Make sure we have valid data
        if (!candleData || !Array.isArray(candleData) || candleData.length === 0) {
          console.warn("Invalid candle data generated");
          return;
        }
        
        // Update chart data
        try {
          candlestickSeries.setData(candleData);
          
          const volumeData = candleData.map(candle => ({
            time: candle.time,
            value: candle.volume || Math.random() * 10000,
            color: candle.close >= candle.open ? '#26a69a88' : '#ef535088',
          }));
          
          volumeSeries.setData(volumeData);
          
          // Fit the visible range to show all data
          chart.timeScale().fitContent();
          
          console.log("Chart data updated successfully");
        } catch (err) {
          console.error("Error updating chart data:", err);
        }
      } catch (error) {
        console.error("Error in chart update effect:", error);
      }
    } else {
      console.warn("Chart reference not available for update");
    }
  }, [selectedSymbol, timeframe]);
  
  // Generate mock candle data
  const generateMockCandleData = () => {
    const data = [];
    const basePrice = selectedSymbol === 'BTC-PERP' ? 58000 : 
                      selectedSymbol === 'ETH-PERP' ? 3200 : 
                      selectedSymbol === 'SOL-PERP' ? 145 : 100;
    
    const volatility = selectedSymbol === 'BTC-PERP' ? 0.01 : 
                       selectedSymbol === 'ETH-PERP' ? 0.015 : 0.02;
    
    const now = Math.floor(Date.now() / 1000);
    const secondsInCandle = timeframe === '1m' ? 60 :
                           timeframe === '3m' ? 180 :
                           timeframe === '5m' ? 300 :
                           timeframe === '15m' ? 900 :
                           timeframe === '30m' ? 1800 :
                           timeframe === '1h' ? 3600 :
                           timeframe === '4h' ? 14400 : 86400;
    
    for (let i = 0; i < 200; i++) {
      const time = now - (200 - i) * secondsInCandle;
      const randomChange = (Math.random() * 2 - 1) * volatility;
      const open = i === 0 ? basePrice : data[i - 1].close;
      const close = open * (1 + randomChange);
      const high = Math.max(open, close) * (1 + Math.random() * volatility / 2);
      const low = Math.min(open, close) * (1 - Math.random() * volatility / 2);
      
      data.push({
        time,
        open,
        high,
        low,
        close,
        volume: Math.random() * 10000
      });
    }
    
    return data;
  };
  
  // Toggle trading symbol
  const toggleTradingSymbol = (symbol) => {
    if (tradingSymbols.includes(symbol)) {
      setTradingSymbols(tradingSymbols.filter(s => s !== symbol));
    } else {
      setTradingSymbols([...tradingSymbols, symbol]);
    }
  };
  
  // Handle strategy parameter change
  const handleParamChange = (param, value) => {
    setStrategyParams({
      ...strategyParams,
      [param]: value
    });
  };
  
  // Toggle trading
  const toggleTrading = () => {
    setIsTrading(!isTrading);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Trading Configuration</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel - Chart */}
        <div className="lg:col-span-2">
          <div className="card mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <select 
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="input mr-2 bg-gray-700 text-white px-3 py-1.5 rounded"
                >
                  {availableSymbols.map(symbol => (
                    <option key={symbol} value={symbol}>{symbol}</option>
                  ))}
                </select>
                
                <select 
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="input bg-gray-700 text-white px-3 py-1.5 rounded"
                >
                  {availableTimeframes.map(tf => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <button 
                  className="btn btn-primary mr-2"
                  onClick={() => setShowOrderForm(true)}
                >
                  Place Order
                </button>
                
                <button className="btn btn-secondary mr-2">
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                    />
                  </svg>
                </button>
                
                <button className="btn btn-secondary">
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                </button>
              </div>
            </div>
            
            <div ref={chartContainerRef} className="chart-container"></div>
          </div>
          
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Trading Symbols</h2>
            <div className="flex flex-wrap gap-2">
              {availableSymbols.map(symbol => (
                <button
                  key={symbol}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    tradingSymbols.includes(symbol)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => toggleTradingSymbol(symbol)}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
          
          {/* Order Book & Trade History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Order Book */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Order Book</h3>
              <div className="grid grid-cols-3 gap-2 mb-2 text-sm text-gray-400">
                <div>Price (USD)</div>
                <div>Size</div>
                <div>Total</div>
              </div>
              
              {/* Sell Orders (Red) */}
              <div className="max-h-40 overflow-y-auto mb-2">
                {[...Array(8)].map((_, i) => {
                  // Generate mock sell orders, descending prices
                  const basePrice = selectedSymbol === 'BTC-PERP' ? 58000 : 
                                   selectedSymbol === 'ETH-PERP' ? 3200 : 
                                   selectedSymbol === 'SOL-PERP' ? 145 : 100;
                  const price = basePrice * (1 + 0.001 * (8 - i));
                  const size = 0.1 + Math.random() * 2;
                  return (
                    <div key={`sell-${i}`} className="grid grid-cols-3 gap-2 text-sm border-b border-gray-700 py-1">
                      <div className="text-red-500">${price.toFixed(2)}</div>
                      <div>{size.toFixed(3)}</div>
                      <div>${(price * size).toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
              
              {/* Current Price */}
              <div className="py-2 border-y border-gray-600 my-1 text-center font-bold">
                ${selectedSymbol === 'BTC-PERP' ? '58,000.00' : 
                  selectedSymbol === 'ETH-PERP' ? '3,200.00' : 
                  selectedSymbol === 'SOL-PERP' ? '145.00' : '100.00'}
              </div>
              
              {/* Buy Orders (Green) */}
              <div className="max-h-40 overflow-y-auto mt-2">
                {[...Array(8)].map((_, i) => {
                  // Generate mock buy orders, ascending prices
                  const basePrice = selectedSymbol === 'BTC-PERP' ? 58000 : 
                                   selectedSymbol === 'ETH-PERP' ? 3200 : 
                                   selectedSymbol === 'SOL-PERP' ? 145 : 100;
                  const price = basePrice * (1 - 0.001 * (i + 1));
                  const size = 0.1 + Math.random() * 2;
                  return (
                    <div key={`buy-${i}`} className="grid grid-cols-3 gap-2 text-sm border-b border-gray-700 py-1">
                      <div className="text-green-500">${price.toFixed(2)}</div>
                      <div>{size.toFixed(3)}</div>
                      <div>${(price * size).toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Trade History */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Recent Trades</h3>
              <div className="grid grid-cols-4 gap-2 mb-2 text-sm text-gray-400">
                <div>Time</div>
                <div>Price</div>
                <div>Size</div>
                <div>Side</div>
              </div>
              
              <div className="max-h-[340px] overflow-y-auto">
                {[...Array(15)].map((_, i) => {
                  // Generate mock trades
                  const basePrice = selectedSymbol === 'BTC-PERP' ? 58000 : 
                                   selectedSymbol === 'ETH-PERP' ? 3200 : 
                                   selectedSymbol === 'SOL-PERP' ? 145 : 100;
                  const variation = (Math.random() - 0.5) * 0.002; // +/- 0.1%
                  const price = basePrice * (1 + variation);
                  const size = 0.05 + Math.random() * 1;
                  const side = Math.random() > 0.5 ? 'buy' : 'sell';
                  const time = new Date(Date.now() - i * 30000); // 30 seconds between trades
                  
                  return (
                    <div key={`trade-${i}`} className="grid grid-cols-4 gap-2 text-sm border-b border-gray-700 py-1">
                      <div>{time.toLocaleTimeString()}</div>
                      <div className={side === 'buy' ? 'text-green-500' : 'text-red-500'}>
                        ${price.toFixed(2)}
                      </div>
                      <div>{size.toFixed(3)}</div>
                      <div className={side === 'buy' ? 'text-green-500' : 'text-red-500'}>
                        {side.toUpperCase()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right panel - Strategy Configuration */}
        <div>
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Strategy Configuration</h2>
            
            <div className="mb-4">
              <label className="label">Strategy</label>
              <select 
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="input"
              >
                <option value="momentum">Momentum</option>
                <option value="mean_reversion" disabled>Mean Reversion</option>
                <option value="breakout" disabled>Breakout</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="label">Risk Level</label>
              <div className="flex items-center">
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none"
                />
                <span className="ml-2 w-4 text-center">{riskLevel}</span>
              </div>
            </div>
            
            <h3 className="text-lg font-medium mb-2 mt-6">Momentum Parameters</h3>
            
            <div className="mb-4">
              <label className="label">Lookback Period</label>
              <input 
                type="number" 
                value={strategyParams.lookbackPeriod}
                onChange={(e) => handleParamChange('lookbackPeriod', parseInt(e.target.value))}
                className="input"
                min="1"
              />
            </div>
            
            <div className="mb-4">
              <label className="label">Momentum Threshold</label>
              <input 
                type="number" 
                value={strategyParams.momentumThreshold}
                onChange={(e) => handleParamChange('momentumThreshold', parseFloat(e.target.value))}
                className="input"
                step="0.1"
              />
            </div>
            
            <h3 className="text-lg font-medium mb-2 mt-6">Risk Management</h3>
            
            <div className="mb-4">
              <label className="label">Stop Loss (%)</label>
              <input 
                type="number" 
                value={strategyParams.stopLossPercent}
                onChange={(e) => handleParamChange('stopLossPercent', parseFloat(e.target.value))}
                className="input"
                step="0.1"
              />
            </div>
            
            <div className="mb-4">
              <label className="label">Take Profit (%)</label>
              <input 
                type="number" 
                value={strategyParams.takeProfitPercent}
                onChange={(e) => handleParamChange('takeProfitPercent', parseFloat(e.target.value))}
                className="input"
                step="0.1"
              />
            </div>
            
            <div className="mb-4">
              <label className="label">Max Position Size (% of Portfolio)</label>
              <input 
                type="number" 
                value={strategyParams.maxPositionSize}
                onChange={(e) => handleParamChange('maxPositionSize', parseFloat(e.target.value))}
                className="input"
                min="0.1"
                max="100"
                step="0.1"
              />
            </div>
            
            <div className="mb-4">
              <label className="label">Max Drawdown (%)</label>
              <input 
                type="number" 
                value={strategyParams.maxDrawdown}
                onChange={(e) => handleParamChange('maxDrawdown', parseFloat(e.target.value))}
                className="input"
                min="0.1"
                max="100"
                step="0.1"
              />
            </div>
            
            <button
              onClick={toggleTrading}
              className={`w-full mt-6 py-2 rounded-md font-medium focus:outline-none transition-colors ${
                isTrading 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isTrading ? 'Stop Trading' : 'Start Trading'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Order Form Modal */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Place Order</h2>
              <button 
                onClick={() => setShowOrderForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <label className="label">Symbol</label>
              <select 
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="input"
              >
                {availableSymbols.map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="label">Order Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`py-2 rounded-md text-center ${
                    orderType === 'market' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}
                  onClick={() => setOrderType('market')}
                >
                  Market
                </button>
                <button
                  className={`py-2 rounded-md text-center ${
                    orderType === 'limit' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}
                  onClick={() => setOrderType('limit')}
                >
                  Limit
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="label">Side</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`py-2 rounded-md text-center ${
                    orderSide === 'buy' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}
                  onClick={() => setOrderSide('buy')}
                >
                  Buy
                </button>
                <button
                  className={`py-2 rounded-md text-center ${
                    orderSide === 'sell' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}
                  onClick={() => setOrderSide('sell')}
                >
                  Sell
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="label">Size</label>
              <input 
                type="number" 
                value={orderSize}
                onChange={(e) => setOrderSize(parseFloat(e.target.value))}
                className="input"
                min="0.001"
                step="0.001"
              />
            </div>
            
            {orderType === 'limit' && (
              <div className="mb-4">
                <label className="label">Price</label>
                <input 
                  type="number" 
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                  className="input"
                  min="0"
                  step="0.01"
                />
              </div>
            )}
            
            {orderStatus && (
              <div className={`mb-4 p-3 rounded-lg ${
                orderStatus.includes('Error') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'
              }`}>
                {orderStatus}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowOrderForm(false)}
                className="btn bg-gray-700 text-white hover:bg-gray-600"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setOrderStatus(`${orderSide === 'buy' ? 'Buy' : 'Sell'} ${orderSize} ${selectedSymbol} ${orderType === 'limit' ? 'at ' + orderPrice : ''} order placed successfully!`);
                  
                  // Close the modal after a short delay
                  setTimeout(() => {
                    setShowOrderForm(false);
                    
                    // Clear the order status after the modal is closed
                    setTimeout(() => {
                      setOrderStatus('');
                    }, 500);
                  }, 1500);
                }}
                className={`btn ${orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
              >
                {orderSide === 'buy' ? 'Buy' : 'Sell'} {selectedSymbol}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trading;