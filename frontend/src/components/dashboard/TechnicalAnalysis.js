import React, { useState, useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import hyperliquidService from '../../services/hyperliquidService';
import { formatCurrency, formatPercent } from '../../utils';

// Calculate Relative Strength Index (RSI)
const calculateRSI = (prices, period = 14) => {
  if (!prices || prices.length < period + 1) {
    return [];
  }
  
  const rsi = [];
  let avgGain = 0;
  let avgLoss = 0;
  
  // Calculate first average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  // Calculate first RSI
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - (100 / (1 + rs)));
  
  // Calculate rest of RSI values
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    let gain = 0;
    let loss = 0;
    
    if (change >= 0) {
      gain = change;
    } else {
      loss = Math.abs(change);
    }
    
    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }
  
  // Pad the beginning with nulls to match the input array length
  const padding = Array(period).fill(null);
  return [...padding, ...rsi];
};

// Calculate Moving Average
const calculateMA = (prices, period) => {
  if (!prices || prices.length < period) {
    return [];
  }
  
  const result = [];
  
  // Fill with nulls for the first (period-1) elements
  for (let i = 0; i < period - 1; i++) {
    result.push(null);
  }
  
  // Calculate MA for the rest of the array
  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += prices[i - j];
    }
    result.push(sum / period);
  }
  
  return result;
};

const TechnicalAnalysis = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC-PERP');
  const [timeframe, setTimeframe] = useState('1h');
  const [activeTab, setActiveTab] = useState('price');
  const [selectedIndicators, setSelectedIndicators] = useState(['rsi', 'macd', 'bb']);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [indicatorParams, setIndicatorParams] = useState({
    rsi: { period: 14, overbought: 70, oversold: 30 },
    macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    bb: { period: 20, stdDev: 2 },
    ema: { fastPeriod: 9, slowPeriod: 21 },
    volume: { period: 20 },
    atr: { period: 14 },
  });
  const [alerts, setAlerts] = useState([]);
  const [marketData, setMarketData] = useState(null);
  const [timeframes, setTimeframes] = useState([
    { value: '5m', active: false },
    { value: '15m', active: false },
    { value: '1h', active: true },
    { value: '4h', active: false },
    { value: '1d', active: false },
  ]);

  // References for chart containers
  const mainChartRef = useRef(null);
  const rsiChartRef = useRef(null);
  const macdChartRef = useRef(null);
  const volumeChartRef = useRef(null);
  
  // References for chart instances
  const chartRefs = useRef({
    mainChart: null,
    rsiChart: null,
    macdChart: null,
    volumeChart: null,
  });
  
  // Available cryptocurrency symbols
  const availableSymbols = [
    'BTC-PERP', 'ETH-PERP', 'SOL-PERP', 'AVAX-PERP', 'NEAR-PERP',
    'ATOM-PERP', 'DOT-PERP', 'MATIC-PERP', 'LINK-PERP', 'UNI-PERP'
  ];
  
  // Available timeframes
  const availableTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
  
  // Available indicators
  const availableIndicators = [
    { id: 'rsi', name: 'Relative Strength Index (RSI)', type: 'oscillator' },
    { id: 'macd', name: 'MACD', type: 'oscillator' },
    { id: 'bb', name: 'Bollinger Bands', type: 'overlay' },
    { id: 'ema', name: 'EMA Cross', type: 'overlay' },
    { id: 'volume', name: 'Volume Profile', type: 'separate' },
    { id: 'atr', name: 'Average True Range', type: 'separate' },
  ];
  
  // Initialize charts when component mounts
  useEffect(() => {
    if (mainChartRef.current && !chartRefs.current.mainChart) {
      try {
        initializeCharts();
      } catch (error) {
        console.error('Error initializing charts:', error);
      }
    }
    
    return () => {
      // Cleanup charts on unmount
      Object.values(chartRefs.current).forEach(chart => {
        if (chart && typeof chart.remove === 'function') {
          try {
            chart.remove();
          } catch (error) {
            console.error('Error removing chart:', error);
          }
        }
      });
      
      // Reset chart refs
      chartRefs.current = {
        mainChart: null,
        rsiChart: null,
        macdChart: null,
        volumeChart: null
      };
    };
  }, []);
  
  // Update charts when symbol or timeframe changes
  useEffect(() => {
    if (!chartRefs.current.mainChart) return;
    
    fetchMarketData();
  }, [selectedSymbol, timeframe]);
  
  // Initialize all charts
  const initializeCharts = () => {
    // Create main price chart
    const mainChart = createChart(mainChartRef.current, {
      width: mainChartRef.current.clientWidth,
      height: 400,
      layout: {
        backgroundColor: '#1e1e1e',
        textColor: '#d9d9d9',
      },
      grid: {
        vertLines: { color: '#2e2e2e' },
        horzLines: { color: '#2e2e2e' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: '#3c3c3c',
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        locale: 'en-US',
        dateFormat: 'yyyy/MM/dd',
      },
    });
    
    // Create RSI chart
    const rsiChart = createChart(rsiChartRef.current, {
      width: rsiChartRef.current.clientWidth,
      height: 150,
      layout: {
        backgroundColor: '#1e1e1e',
        textColor: '#d9d9d9',
      },
      grid: {
        vertLines: { color: '#2e2e2e' },
        horzLines: { color: '#2e2e2e' },
      },
      timeScale: {
        borderColor: '#3c3c3c',
        visible: false,
      },
    });
    
    // Create MACD chart
    const macdChart = createChart(macdChartRef.current, {
      width: macdChartRef.current.clientWidth,
      height: 150,
      layout: {
        backgroundColor: '#1e1e1e',
        textColor: '#d9d9d9',
      },
      grid: {
        vertLines: { color: '#2e2e2e' },
        horzLines: { color: '#2e2e2e' },
      },
      timeScale: {
        borderColor: '#3c3c3c',
        visible: false,
      },
    });
    
    // Create Volume chart
    const volumeChart = createChart(volumeChartRef.current, {
      width: volumeChartRef.current.clientWidth,
      height: 150,
      layout: {
        backgroundColor: '#1e1e1e',
        textColor: '#d9d9d9',
      },
      grid: {
        vertLines: { color: '#2e2e2e' },
        horzLines: { color: '#2e2e2e' },
      },
      timeScale: {
        borderColor: '#3c3c3c',
        visible: false,
      },
    });
    
    // Store chart instances
    chartRefs.current = {
      mainChart,
      rsiChart,
      macdChart,
      volumeChart,
    };
    
    // Add series to charts
    chartRefs.current.candleSeries = mainChart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    
    // Add a line for RSI
    chartRefs.current.rsiSeries = rsiChart.addLineSeries({
      color: '#2196F3',
      lineWidth: 2,
    });
    
    // Add lines and histogram for MACD
    chartRefs.current.macdLineSeries = macdChart.addLineSeries({
      color: '#2196F3',
      lineWidth: 2,
    });
    
    chartRefs.current.macdSignalSeries = macdChart.addLineSeries({
      color: '#FF5722',
      lineWidth: 2,
    });
    
    chartRefs.current.macdHistogramSeries = macdChart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
    });
    
    // Add volume histogram
    chartRefs.current.volumeSeries = volumeChart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
    });
    
    // Add reference lines for RSI
    chartRefs.current.rsiOverboughtSeries = rsiChart.addLineSeries({
      color: '#ef5350',
      lineWidth: 1,
      lineStyle: 2,
    });
    
    chartRefs.current.rsiOversoldSeries = rsiChart.addLineSeries({
      color: '#26a69a',
      lineWidth: 1,
      lineStyle: 2,
    });
    
    // Set up RSI reference lines
    const rsiTimeRange = { from: Date.now() / 1000 - 365 * 24 * 60 * 60, to: Date.now() / 1000 + 24 * 60 * 60 };
    
    // Add overbought line
    chartRefs.current.rsiOverboughtSeries.setData([
      { time: rsiTimeRange.from, value: indicatorParams.rsi.overbought },
      { time: rsiTimeRange.to, value: indicatorParams.rsi.overbought },
    ]);
    
    // Add oversold line
    chartRefs.current.rsiOversoldSeries.setData([
      { time: rsiTimeRange.from, value: indicatorParams.rsi.oversold },
      { time: rsiTimeRange.to, value: indicatorParams.rsi.oversold },
    ]);
    
    // Handle resize
    const handleResize = () => {
      if (chartRefs.current.mainChart && mainChartRef.current) {
        chartRefs.current.mainChart.applyOptions({
          width: mainChartRef.current.clientWidth,
        });
      }
      
      if (chartRefs.current.rsiChart && rsiChartRef.current) {
        chartRefs.current.rsiChart.applyOptions({
          width: rsiChartRef.current.clientWidth,
        });
      }
      
      if (chartRefs.current.macdChart && macdChartRef.current) {
        chartRefs.current.macdChart.applyOptions({
          width: macdChartRef.current.clientWidth,
        });
      }
      
      if (chartRefs.current.volumeChart && volumeChartRef.current) {
        chartRefs.current.volumeChart.applyOptions({
          width: volumeChartRef.current.clientWidth,
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Fetch initial data
    fetchMarketData();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  };
  
  // Fetch market data and update charts
  const fetchMarketData = async () => {
    try {
      // In a real app, this would fetch from an API
      // For this demo, we'll generate mock data
      
      const data = generateMockMarketData();
      setMarketData(data);
      
      // Update main chart
      chartRefs.current.candleSeries.setData(data.candles);
      
      // Calculate and update RSI
      const prices = data.candles.map(candle => candle.close);
      const rsiData = calculateRSI(prices, indicatorParams.rsi.period);
      
      // Filter out any null or undefined values
      const rsiChartData = data.candles.slice(indicatorParams.rsi.period).map((candle, i) => {
        if (rsiData[i] === null || rsiData[i] === undefined) return null;
        return {
          time: candle.time,
          value: rsiData[i]
        };
      }).filter(item => item !== null);
      
      chartRefs.current.rsiSeries.setData(rsiChartData);
      
      // Calculate and update MACD
      const fastEMA = calculateMA(prices, indicatorParams.macd.fastPeriod);
      const slowEMA = calculateMA(prices, indicatorParams.macd.slowPeriod);
      
      // MACD Line = Fast EMA - Slow EMA
      const macdLine = [];
      for (let i = 0; i < fastEMA.length; i++) {
        if (i < indicatorParams.macd.slowPeriod - 1 || fastEMA[i] === null || slowEMA[i] === null) {
          macdLine.push(null);
        } else {
          macdLine.push(fastEMA[i] - slowEMA[i]);
        }
      }
      
      // Filter out null values
      const validMacdLine = macdLine.filter(val => val !== null);
      
      // Calculate Signal Line (EMA of MACD Line)
      const signalLine = calculateMA(validMacdLine, indicatorParams.macd.signalPeriod);
      
      // Calculate Histogram (MACD Line - Signal Line)
      const histogram = [];
      const signalOffset = indicatorParams.macd.signalPeriod - 1;
      
      for (let i = 0; i < validMacdLine.length; i++) {
        if (i < signalOffset || validMacdLine[i] === null || signalLine[i - signalOffset] === null) {
          histogram.push(null);
        } else {
          histogram.push(validMacdLine[i] - signalLine[i - signalOffset]);
        }
      }
      
      // Filter out null values
      const validHistogram = histogram.filter(val => val !== null);
      
      // Prepare data for chart
      const macdLineData = [];
      const signalLineData = [];
      const histogramData = [];
      
      const startIndex = indicatorParams.macd.slowPeriod - 1;
      const signalStartIndex = startIndex + indicatorParams.macd.signalPeriod - 1;
      
      // Ensure we only use valid data points for MACD line
      for (let i = 0; i < macdLine.length; i++) {
        if (macdLine[i] === null) continue;
        
        const candle = data.candles[i + startIndex];
        if (!candle) continue;
        
        macdLineData.push({
          time: candle.time,
          value: macdLine[i]
        });
      }
      
      // Ensure we only use valid data points for signal line
      for (let i = 0; i < signalLine.length; i++) {
        if (signalLine[i] === null) continue;
        
        const candle = data.candles[i + signalStartIndex];
        if (!candle) continue;
        
        signalLineData.push({
          time: candle.time,
          value: signalLine[i]
        });
      }
      
      // Ensure we only use valid data points for histogram
      for (let i = 0; i < validHistogram.length; i++) {
        const candle = data.candles[i + signalStartIndex];
        if (!candle) continue;
        
        histogramData.push({
          time: candle.time,
          value: validHistogram[i],
          color: validHistogram[i] >= 0 ? '#26a69a' : '#ef5350'
        });
      }
      
      if (chartRefs.current.macdLineSeries) {
        chartRefs.current.macdLineSeries.setData(macdLineData);
      }
      
      if (chartRefs.current.macdSignalSeries) {
        chartRefs.current.macdSignalSeries.setData(signalLineData);
      }
      
      if (chartRefs.current.macdHistogramSeries) {
        chartRefs.current.macdHistogramSeries.setData(histogramData);
      }
      
      // Update volume chart
      const volumeData = data.candles.map(candle => ({
        time: candle.time,
        value: candle.volume,
        color: candle.close >= candle.open ? '#26a69a88' : '#ef535088',
      }));
      
      chartRefs.current.volumeSeries.setData(volumeData);
      
      // Generate alerts based on indicator values
      generateAlerts(rsiChartData, macdLineData, signalLineData, histogramData);
      
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };
  
  // Generate mock market data
  const generateMockMarketData = () => {
    const candles = [];
    const basePrice = selectedSymbol === 'BTC-PERP' ? 58000 : 
                     selectedSymbol === 'ETH-PERP' ? 3200 : 
                     selectedSymbol === 'SOL-PERP' ? 145 : 100;
    
    const volatility = selectedSymbol === 'BTC-PERP' ? 0.01 : 
                       selectedSymbol === 'ETH-PERP' ? 0.015 : 0.02;
    
    const now = Math.floor(Date.now() / 1000);
    const secondsInCandle = timeframe === '1m' ? 60 :
                           timeframe === '5m' ? 300 :
                           timeframe === '15m' ? 900 :
                           timeframe === '30m' ? 1800 :
                           timeframe === '1h' ? 3600 :
                           timeframe === '4h' ? 14400 : 86400;
    
    let currentPrice = basePrice;
    let trend = 0; // -1 for downtrend, 0 for neutral, 1 for uptrend
    
    // Generate candles with realistic price movement
    for (let i = 0; i < 200; i++) {
      const time = now - (200 - i) * secondsInCandle;
      
      // Change trend occasionally to mimic real market behavior
      if (i % 50 === 0 || (Math.random() < 0.05 && i > 20)) {
        trend = Math.floor(Math.random() * 3) - 1; // Random value: -1, 0, or 1
      }
      
      // Calculate price change with trend bias
      const trendBias = trend * volatility * 0.3;
      const randomChange = (Math.random() * 2 - 1) * volatility + trendBias;
      
      // Update price with change
      currentPrice = currentPrice * (1 + randomChange);
      
      // Calculate OHLC values
      const open = currentPrice;
      const high = open * (1 + Math.random() * volatility);
      const low = open * (1 - Math.random() * volatility);
      const close = Math.max(low, Math.min(high, open * (1 + (Math.random() * 2 - 1) * volatility)));
      
      // Generate volume with random spikes
      const baseVolume = Math.random() * 100 + 50;
      const volumeSpike = Math.random() < 0.1 ? Math.random() * 5 + 1 : 1;
      const volume = baseVolume * volumeSpike;
      
      candles.push({
        time,
        open,
        high,
        low,
        close,
        volume
      });
      
      // Use the close price as the next candle's basis
      currentPrice = close;
    }
    
    return { candles };
  };
  
  // Generate alerts based on technical indicators
  const generateAlerts = (rsiData, macdLineData, signalLineData, histogramData) => {
    const newAlerts = [];
    
    // Check for RSI alerts
    if (rsiData.length > 0) {
      const latestRSI = rsiData[rsiData.length - 1];
      const previousRSI = rsiData[rsiData.length - 2];
      
      if (previousRSI && latestRSI) {
        if (previousRSI.value < indicatorParams.rsi.oversold && latestRSI.value > indicatorParams.rsi.oversold) {
          newAlerts.push({
            id: `rsi-oversold-${Date.now()}`,
            type: 'bullish',
            symbol: selectedSymbol,
            indicator: 'RSI',
            message: `${selectedSymbol} RSI crossed above oversold level (${indicatorParams.rsi.oversold})`,
            value: latestRSI.value.toFixed(2),
            time: new Date().toLocaleTimeString(),
          });
        } else if (previousRSI.value > indicatorParams.rsi.overbought && latestRSI.value < indicatorParams.rsi.overbought) {
          newAlerts.push({
            id: `rsi-overbought-${Date.now()}`,
            type: 'bearish',
            symbol: selectedSymbol,
            indicator: 'RSI',
            message: `${selectedSymbol} RSI crossed below overbought level (${indicatorParams.rsi.overbought})`,
            value: latestRSI.value.toFixed(2),
            time: new Date().toLocaleTimeString(),
          });
        }
      }
    }
    
    // Check for MACD alerts
    if (macdLineData.length > 0 && signalLineData.length > 0) {
      const latestMACD = macdLineData[macdLineData.length - 1];
      const previousMACD = macdLineData[macdLineData.length - 2];
      const latestSignal = signalLineData[signalLineData.length - 1];
      const previousSignal = signalLineData[signalLineData.length - 2];
      
      if (previousMACD && latestMACD && previousSignal && latestSignal) {
        if (previousMACD.value < previousSignal.value && latestMACD.value > latestSignal.value) {
          newAlerts.push({
            id: `macd-cross-${Date.now()}`,
            type: 'bullish',
            symbol: selectedSymbol,
            indicator: 'MACD',
            message: `${selectedSymbol} MACD line crossed above signal line`,
            value: `${latestMACD.value.toFixed(2)} > ${latestSignal.value.toFixed(2)}`,
            time: new Date().toLocaleTimeString(),
          });
        } else if (previousMACD.value > previousSignal.value && latestMACD.value < latestSignal.value) {
          newAlerts.push({
            id: `macd-cross-${Date.now()}`,
            type: 'bearish',
            symbol: selectedSymbol,
            indicator: 'MACD',
            message: `${selectedSymbol} MACD line crossed below signal line`,
            value: `${latestMACD.value.toFixed(2)} < ${latestSignal.value.toFixed(2)}`,
            time: new Date().toLocaleTimeString(),
          });
        }
      }
    }
    
    // Update alerts state, keeping only the latest 10
    setAlerts(prev => [...newAlerts, ...prev].slice(0, 10));
  };
  
  // Toggle timeframe in multi-timeframe view
  const toggleTimeframe = (tfValue) => {
    setTimeframes(prev => prev.map(tf => ({
      ...tf,
      active: tf.value === tfValue ? !tf.active : tf.active
    })));
  };
  
  // Handle indicator parameter change
  const updateIndicatorParam = (indicatorId, paramName, value) => {
    setIndicatorParams(prev => ({
      ...prev,
      [indicatorId]: {
        ...prev[indicatorId],
        [paramName]: parseFloat(value)
      }
    }));
  };
  
  // Dismiss alert
  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Technical Analysis</h1>
      <p className="text-gray-400 mb-6">Analyze market indicators across multiple timeframes</p>
      
      {/* Control Panel */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex flex-wrap gap-3">
            <select 
              value={selectedSymbol}
              onChange={e => setSelectedSymbol(e.target.value)}
              className="input bg-gray-700 text-white px-3 py-1.5 rounded"
            >
              {availableSymbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
            
            <select 
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              className="input bg-gray-700 text-white px-3 py-1.5 rounded"
            >
              {availableTimeframes.map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
            
            <button 
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded"
              onClick={() => fetchMarketData()}
            >
              Refresh
            </button>
          </div>
          
          <div className="flex gap-3">
            <button 
              className={`px-3 py-1.5 rounded ${
                activeTab === 'price' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setActiveTab('price')}
            >
              Price Chart
            </button>
            
            <button 
              className={`px-3 py-1.5 rounded ${
                activeTab === 'multi' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setActiveTab('multi')}
            >
              Multi-Timeframe
            </button>
            
            <button 
              className="px-3 py-1.5 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded"
              onClick={() => setIsCustomizing(!isCustomizing)}
            >
              {isCustomizing ? 'Done' : 'Customize'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Indicator Customization */}
      {isCustomizing && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Indicator Settings</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* RSI Settings */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="font-medium mb-3">RSI Settings</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Period</label>
                  <input 
                    type="number" 
                    value={indicatorParams.rsi.period}
                    onChange={e => updateIndicatorParam('rsi', 'period', e.target.value)}
                    className="input w-full"
                    min="2"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Overbought Level</label>
                  <input 
                    type="number" 
                    value={indicatorParams.rsi.overbought}
                    onChange={e => updateIndicatorParam('rsi', 'overbought', e.target.value)}
                    className="input w-full"
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Oversold Level</label>
                  <input 
                    type="number" 
                    value={indicatorParams.rsi.oversold}
                    onChange={e => updateIndicatorParam('rsi', 'oversold', e.target.value)}
                    className="input w-full"
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>
              </div>
            </div>
            
            {/* MACD Settings */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="font-medium mb-3">MACD Settings</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Fast Period</label>
                  <input 
                    type="number" 
                    value={indicatorParams.macd.fastPeriod}
                    onChange={e => updateIndicatorParam('macd', 'fastPeriod', e.target.value)}
                    className="input w-full"
                    min="2"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Slow Period</label>
                  <input 
                    type="number" 
                    value={indicatorParams.macd.slowPeriod}
                    onChange={e => updateIndicatorParam('macd', 'slowPeriod', e.target.value)}
                    className="input w-full"
                    min="2"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Signal Period</label>
                  <input 
                    type="number" 
                    value={indicatorParams.macd.signalPeriod}
                    onChange={e => updateIndicatorParam('macd', 'signalPeriod', e.target.value)}
                    className="input w-full"
                    min="2"
                  />
                </div>
              </div>
            </div>
            
            {/* Bollinger Bands Settings */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Bollinger Bands Settings</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Period</label>
                  <input 
                    type="number" 
                    value={indicatorParams.bb.period}
                    onChange={e => updateIndicatorParam('bb', 'period', e.target.value)}
                    className="input w-full"
                    min="2"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Standard Deviation</label>
                  <input 
                    type="number" 
                    value={indicatorParams.bb.stdDev}
                    onChange={e => updateIndicatorParam('bb', 'stdDev', e.target.value)}
                    className="input w-full"
                    min="0.1"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button 
              className="btn btn-primary"
              onClick={() => {
                setIsCustomizing(false);
                fetchMarketData();
              }}
            >
              Apply Changes
            </button>
          </div>
        </div>
      )}
      
      {/* Price Chart View */}
      {activeTab === 'price' && (
        <div className="card mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              {selectedSymbol} {timeframe} Chart
            </h2>
          </div>
          
          <div className="space-y-6">
            {/* Main Chart */}
            <div 
              ref={mainChartRef} 
              className="w-full h-[400px] bg-gray-800 rounded-lg"
            ></div>
            
            {/* RSI Chart */}
            <div 
              ref={rsiChartRef} 
              className="w-full h-[150px] bg-gray-800 rounded-lg"
            ></div>
            
            {/* MACD Chart */}
            <div 
              ref={macdChartRef} 
              className="w-full h-[150px] bg-gray-800 rounded-lg"
            ></div>
            
            {/* Volume Chart */}
            <div 
              ref={volumeChartRef} 
              className="w-full h-[150px] bg-gray-800 rounded-lg"
            ></div>
          </div>
        </div>
      )}
      
      {/* Multi-Timeframe View */}
      {activeTab === 'multi' && (
        <div>
          {/* Timeframe Selection */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Multi-Timeframe Analysis</h2>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {timeframes.map(tf => (
                <button
                  key={tf.value}
                  className={`px-3 py-1.5 rounded ${
                    tf.active
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => toggleTimeframe(tf.value)}
                >
                  {tf.value}
                </button>
              ))}
            </div>
            
            <p className="text-sm text-gray-400">
              Select multiple timeframes to compare indicators across different time periods. This helps identify stronger trends and filter out market noise.
            </p>
          </div>
          
          {/* Multi-timeframe Indicators */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Indicator Comparison</h2>
            
            <div className="space-y-6">
              {/* RSI Comparison */}
              <div>
                <h3 className="font-medium mb-3">RSI Across Timeframes</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {timeframes.filter(tf => tf.active).map(tf => (
                    <div key={tf.value} className="bg-gray-700 p-3 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-300">{tf.value} RSI</span>
                        <span className="font-medium">{generateRandomRSI()}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                        <div className={getRandomRSIColorAndWidth()}></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Oversold</span>
                        <span>Neutral</span>
                        <span>Overbought</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* MACD Comparison */}
              <div>
                <h3 className="font-medium mb-3">MACD Across Timeframes</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {timeframes.filter(tf => tf.active).map(tf => (
                    <div key={tf.value} className="bg-gray-700 p-3 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-300">{tf.value} MACD</span>
                        <span className={getRandomMACDColor()}>{getRandomMACD()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Signal: {getRandomMACDSignal()}</span>
                        <span>Histogram: {getRandomMACDHistogram()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Trend Strength */}
              <div>
                <h3 className="font-medium mb-3">Trend Strength Analysis</h3>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm text-gray-300 mb-2">Trend Direction</h4>
                      <div className="flex items-center">
                        <div className={getTrendBadgeClass()}>
                          {getTrendDirection()}
                        </div>
                        <span className="ml-2 text-sm">{getTrendDescription()}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm text-gray-300 mb-2">Trend Strength</h4>
                      <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                        <div className={getTrendStrengthBar()}></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Weak</span>
                        <span>Moderate</span>
                        <span>Strong</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-300 mt-2">
                    {getTrendRecommendation()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Alert Panel */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Indicator Alerts</h2>
          <button 
            className="text-sm text-gray-400 hover:text-white"
            onClick={() => setAlerts([])}
          >
            Clear All
          </button>
        </div>
        
        {alerts.length === 0 ? (
          <p className="text-gray-400 text-center py-6">No alerts at this time</p>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => (
              <div 
                key={alert.id} 
                className={`p-3 rounded-lg flex justify-between items-start ${
                  alert.type === 'bullish' ? 'bg-green-900/30' : 'bg-red-900/30'
                }`}
              >
                <div>
                  <div className="flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      alert.type === 'bullish' ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <h4 className="font-medium">{alert.indicator} Alert</h4>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{alert.message}</p>
                  <div className="flex text-xs text-gray-400 mt-1">
                    <span className="mr-4">Value: {alert.value}</span>
                    <span>{alert.time}</span>
                  </div>
                </div>
                <button 
                  className="text-gray-400 hover:text-white"
                  onClick={() => dismissAlert(alert.id)}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
  // Helper functions for the multi-timeframe view
  function generateRandomRSI() {
    return (Math.random() * 100).toFixed(2);
  }
  
  function getRandomRSIColorAndWidth() {
    const rsi = Math.random() * 100;
    const width = `${rsi}%`;
    
    if (rsi < 30) {
      return `h-2 rounded-full bg-green-500 w-[${width}]`;
    } else if (rsi > 70) {
      return `h-2 rounded-full bg-red-500 w-[${width}]`;
    } else {
      return `h-2 rounded-full bg-blue-500 w-[${width}]`;
    }
  }
  
  function getRandomMACD() {
    return (Math.random() * 2 - 1).toFixed(4);
  }
  
  function getRandomMACDSignal() {
    return (Math.random() * 2 - 1).toFixed(4);
  }
  
  function getRandomMACDHistogram() {
    return (Math.random() * 1 - 0.5).toFixed(4);
  }
  
  function getRandomMACDColor() {
    return Math.random() > 0.5 ? 'text-green-500' : 'text-red-500';
  }
  
  function getTrendDirection() {
    const random = Math.random();
    
    if (random < 0.4) {
      return 'Bullish';
    } else if (random < 0.8) {
      return 'Bearish';
    } else {
      return 'Neutral';
    }
  }
  
  function getTrendBadgeClass() {
    const trend = getTrendDirection();
    
    if (trend === 'Bullish') {
      return 'px-2 py-1 bg-green-500/30 text-green-300 rounded text-xs font-medium';
    } else if (trend === 'Bearish') {
      return 'px-2 py-1 bg-red-500/30 text-red-300 rounded text-xs font-medium';
    } else {
      return 'px-2 py-1 bg-gray-500/30 text-gray-300 rounded text-xs font-medium';
    }
  }
  
  function getTrendStrengthBar() {
    const strength = Math.random() * 100;
    
    if (strength < 33) {
      return `h-2 rounded-full bg-gray-600 w-[${strength}%]`;
    } else if (strength < 66) {
      return `h-2 rounded-full bg-blue-600 w-[${strength}%]`;
    } else {
      const trend = getTrendDirection();
      const color = trend === 'Bullish' ? 'green' : trend === 'Bearish' ? 'red' : 'yellow';
      return `h-2 rounded-full bg-${color}-600 w-[${strength}%]`;
    }
  }
  
  function getTrendDescription() {
    const trend = getTrendDirection();
    
    if (trend === 'Bullish') {
      return 'Strong buy signals across multiple timeframes';
    } else if (trend === 'Bearish') {
      return 'Strong sell signals across multiple timeframes';
    } else {
      return 'Mixed signals, no clear trend direction';
    }
  }
  
  function getTrendRecommendation() {
    const trend = getTrendDirection();
    
    if (trend === 'Bullish') {
      return 'Current market conditions favor long positions. Consider looking for entry points on shorter timeframes while maintaining the trend direction of higher timeframes.';
    } else if (trend === 'Bearish') {
      return 'Current market conditions favor short positions. Consider looking for entry points on shorter timeframes while maintaining the trend direction of higher timeframes.';
    } else {
      return 'The market is currently ranging with no clear direction. Consider waiting for a clearer signal or trading range-bound strategies.';
    }
  }
};

export default TechnicalAnalysis;