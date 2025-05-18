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
  
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  
  // Available symbols
  const availableSymbols = [
    'BTC-PERP', 'ETH-PERP', 'SOL-PERP', 'AVAX-PERP', 'NEAR-PERP',
    'ATOM-PERP', 'DOT-PERP', 'MATIC-PERP', 'LINK-PERP', 'UNI-PERP'
  ];
  
  // Available timeframes
  const availableTimeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];
  
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
        
        // Mock data for demonstration
        const candleData = generateMockCandleData();
        candlestickSeries.setData(candleData);
        
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
        
        const volumeData = candleData.map(candle => ({
          time: candle.time,
          value: candle.volume || Math.random() * 10000,
          color: candle.close >= candle.open ? '#26a69a88' : '#ef535088',
        }));
        
        volumeSeries.setData(volumeData);
        
        // Save chart instance to ref
        chartRef.current = {
          chart,
          candlestickSeries,
          volumeSeries
        };
        
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
          volumeSeries: { setData: () => {} }
        };
      }
    }
  }, []);
  
  // Update chart when symbol or timeframe changes
  useEffect(() => {
    if (chartRef.current) {
      const { candlestickSeries, volumeSeries } = chartRef.current;
      
      // Mock data update for demonstration
      const candleData = generateMockCandleData();
      candlestickSeries.setData(candleData);
      
      const volumeData = candleData.map(candle => ({
        time: candle.time,
        value: candle.volume || Math.random() * 10000,
        color: candle.close >= candle.open ? '#26a69a88' : '#ef535088',
      }));
      
      volumeSeries.setData(volumeData);
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
    </div>
  );
};

export default Trading;