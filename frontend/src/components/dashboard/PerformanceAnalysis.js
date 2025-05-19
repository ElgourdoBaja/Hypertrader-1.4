import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { formatCurrency, formatPercent } from '../../utils';

const PerformanceAnalysis = () => {
  const [timeframe, setTimeframe] = useState('1M'); // 1D, 1W, 1M, 3M, 6M, 1Y, ALL
  const [isLoading, setIsLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [tradeBreakdown, setTradeBreakdown] = useState(null);
  
  const equityCurveChartRef = useRef(null);
  const monthlyReturnsChartRef = useRef(null);
  const drawdownChartRef = useRef(null);
  
  // Load performance data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // In a real app, we would fetch data from the API
      // For this demo, we'll generate mock data
      setTimeout(() => {
        const mockData = generateMockPerformanceData(timeframe);
        setPerformanceData(mockData);
        
        // Calculate statistics
        const stats = calculateStatistics(mockData);
        setStatistics(stats);
        
        // Get trade breakdown
        const breakdown = generateTradeBreakdown();
        setTradeBreakdown(breakdown);
        
        setIsLoading(false);
      }, 1000);
    };
    
    fetchData();
  }, [timeframe]);
  
  // Generate mock performance data
  const generateMockPerformanceData = (timeframe) => {
    const now = new Date();
    let startDate, dataPoints;
    
    switch (timeframe) {
      case '1D':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        dataPoints = 24;
        break;
      case '1W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dataPoints = 7;
        break;
      case '1M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dataPoints = 30;
        break;
      case '3M':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dataPoints = 90;
        break;
      case '6M':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        dataPoints = 180;
        break;
      case '1Y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dataPoints = 365;
        break;
      case 'ALL':
      default:
        startDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
        dataPoints = 730;
        break;
    }
    
    // Generate equity curve data
    const equityData = [];
    let equity = 100000; // Starting equity
    
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      
      // Add some randomness with a slight upward trend
      const dailyChange = (Math.random() - 0.45) * 0.02; // -0.45% to +0.55%
      equity = equity * (1 + dailyChange);
      
      equityData.push({
        time: Math.floor(date.getTime() / 1000),
        value: equity
      });
    }
    
    // Generate drawdown data
    const drawdownData = [];
    let peak = equityData[0].value;
    
    for (let i = 0; i < equityData.length; i++) {
      peak = Math.max(peak, equityData[i].value);
      const drawdown = (equityData[i].value / peak - 1) * 100;
      
      drawdownData.push({
        time: equityData[i].time,
        value: drawdown
      });
    }
    
    // Generate monthly returns
    const monthlyReturns = [];
    let currentMonth = new Date(startDate).getMonth();
    let monthStart = startDate;
    let monthStartEquity = equity;
    
    for (let i = 0; i < equityData.length; i++) {
      const date = new Date(equityData[i].time * 1000);
      
      if (date.getMonth() !== currentMonth || i === equityData.length - 1) {
        const monthEnd = new Date(date);
        monthEnd.setDate(0); // Last day of previous month
        
        const monthReturn = (equityData[i-1].value / monthStartEquity - 1) * 100;
        
        monthlyReturns.push({
          month: new Date(date.getFullYear(), currentMonth, 1),
          return: monthReturn
        });
        
        currentMonth = date.getMonth();
        monthStart = date;
        monthStartEquity = equityData[i].value;
      }
    }
    
    // Add current month
    const currentMonthReturn = (equityData[equityData.length - 1].value / monthStartEquity - 1) * 100;
    monthlyReturns.push({
      month: new Date(now.getFullYear(), now.getMonth(), 1),
      return: currentMonthReturn
    });
    
    return {
      equityData,
      drawdownData,
      monthlyReturns
    };
  };
  
  // Calculate performance statistics
  const calculateStatistics = (data) => {
    if (!data || !data.equityData || data.equityData.length === 0) {
      return null;
    }
    
    const startEquity = data.equityData[0].value;
    const endEquity = data.equityData[data.equityData.length - 1].value;
    const totalReturn = (endEquity / startEquity - 1) * 100;
    
    // Calculate CAGR
    const startDate = new Date(data.equityData[0].time * 1000);
    const endDate = new Date(data.equityData[data.equityData.length - 1].time * 1000);
    const years = (endDate - startDate) / (365 * 24 * 60 * 60 * 1000);
    const cagr = (Math.pow(endEquity / startEquity, 1 / years) - 1) * 100;
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    for (const dd of data.drawdownData) {
      maxDrawdown = Math.min(maxDrawdown, dd.value);
    }
    
    // Calculate Sharpe ratio (simplified)
    const returns = [];
    let prevEquity = data.equityData[0].value;
    
    for (let i = 1; i < data.equityData.length; i++) {
      const dailyReturn = data.equityData[i].value / prevEquity - 1;
      returns.push(dailyReturn);
      prevEquity = data.equityData[i].value;
    }
    
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sq, n) => sq + Math.pow(n - meanReturn, 2), 0) / returns.length);
    const sharpeRatio = (meanReturn / stdDev) * Math.sqrt(252); // Annualized
    
    // Calculate winning months
    const winningMonths = data.monthlyReturns.filter(m => m.return > 0).length;
    const totalMonths = data.monthlyReturns.length;
    
    return {
      totalReturn,
      cagr,
      maxDrawdown,
      sharpeRatio,
      winningMonths,
      totalMonths,
      winRate: winningMonths / totalMonths * 100,
      startBalance: startEquity,
      endBalance: endEquity,
      profitLoss: endEquity - startEquity
    };
  };
  
  // Generate trade breakdown data
  const generateTradeBreakdown = () => {
    return {
      totalTrades: 234,
      winningTrades: 152,
      losingTrades: 82,
      winRate: 65.0,
      averageWin: 320,
      averageLoss: -180,
      largestWin: 2850,
      largestLoss: -1200,
      profitFactor: 2.8,
      averageTradeDuration: '4.2 hours',
      bestPair: 'BTC-PERP',
      worstPair: 'LINK-PERP'
    };
  };
  
  // Initialize and update charts when data changes
  useEffect(() => {
    if (!performanceData || isLoading) {
      return;
    }
    
    // Equity curve chart
    if (equityCurveChartRef.current) {
      const container = document.getElementById('equity-curve-chart');
      if (!container) return;
      
      container.innerHTML = '';
      
      const chart = createChart(container, {
        width: container.clientWidth,
        height: 300,
        layout: {
          background: { color: '#1e1e1e' },
          textColor: '#d9d9d9',
        },
        grid: {
          vertLines: { color: '#2e2e2e' },
          horzLines: { color: '#2e2e2e' },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          autoScale: true,
        }
      });
      
      const areaSeries = chart.addAreaSeries({
        topColor: 'rgba(38, 166, 154, 0.56)',
        bottomColor: 'rgba(38, 166, 154, 0.04)',
        lineColor: 'rgba(38, 166, 154, 1)',
        lineWidth: 2,
      });
      
      areaSeries.setData(performanceData.equityData);
      
      const handleResize = () => {
        if (chart && container) {
          chart.applyOptions({ width: container.clientWidth });
        }
      };
      
      window.addEventListener('resize', handleResize);
      equityCurveChartRef.current = { chart, cleanup: () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      }};
    }
    
    // Drawdown chart
    if (drawdownChartRef.current) {
      const container = document.getElementById('drawdown-chart');
      if (!container) return;
      
      container.innerHTML = '';
      
      const chart = createChart(container, {
        width: container.clientWidth,
        height: 200,
        layout: {
          background: { color: '#1e1e1e' },
          textColor: '#d9d9d9',
        },
        grid: {
          vertLines: { color: '#2e2e2e' },
          horzLines: { color: '#2e2e2e' },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          autoScale: true,
        }
      });
      
      const series = chart.addHistogramSeries({
        color: '#ef5350',
      });
      
      series.setData(performanceData.drawdownData);
      
      const handleResize = () => {
        if (chart && container) {
          chart.applyOptions({ width: container.clientWidth });
        }
      };
      
      window.addEventListener('resize', handleResize);
      drawdownChartRef.current = { chart, cleanup: () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      }};
    }
    
    // Monthly returns chart
    if (monthlyReturnsChartRef.current) {
      const container = document.getElementById('monthly-returns-chart');
      if (!container) return;
      
      container.innerHTML = '';
      
      const chart = createChart(container, {
        width: container.clientWidth,
        height: 200,
        layout: {
          background: { color: '#1e1e1e' },
          textColor: '#d9d9d9',
        },
        grid: {
          vertLines: { color: '#2e2e2e' },
          horzLines: { color: '#2e2e2e' },
        },
        timeScale: {
          timeVisible: false,
        },
        rightPriceScale: {
          autoScale: true,
        }
      });
      
      const series = chart.addHistogramSeries({
        color: '#26a69a',
        negativePriceColor: '#ef5350',
      });
      
      // Format monthly returns data for the chart
      const formattedData = performanceData.monthlyReturns.map(item => ({
        time: Math.floor(item.month.getTime() / 1000),
        value: item.return,
        color: item.return >= 0 ? '#26a69a' : '#ef5350'
      }));
      
      series.setData(formattedData);
      
      const handleResize = () => {
        if (chart && container) {
          chart.applyOptions({ width: container.clientWidth });
        }
      };
      
      window.addEventListener('resize', handleResize);
      monthlyReturnsChartRef.current = { chart, cleanup: () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      }};
    }
    
    // Cleanup function
    return () => {
      if (equityCurveChartRef.current && equityCurveChartRef.current.cleanup) {
        equityCurveChartRef.current.cleanup();
      }
      
      if (drawdownChartRef.current && drawdownChartRef.current.cleanup) {
        drawdownChartRef.current.cleanup();
      }
      
      if (monthlyReturnsChartRef.current && monthlyReturnsChartRef.current.cleanup) {
        monthlyReturnsChartRef.current.cleanup();
      }
    };
  }, [performanceData, isLoading]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Performance Analysis</h1>
      
      {/* Timeframe selector */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          {['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'].map(tf => (
            <button
              key={tf}
              className={`px-4 py-2 rounded-md ${
                timeframe === tf 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
        
        <button className="btn btn-secondary">
          Export Report
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Key Statistics */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="card">
                <h3 className="text-gray-400 text-sm">Total Return</h3>
                <p className={`text-2xl font-semibold ${statistics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPercent(statistics.totalReturn)}
                </p>
                <p className="text-sm text-gray-400">
                  {formatCurrency(statistics.profitLoss)}
                </p>
              </div>
              
              <div className="card">
                <h3 className="text-gray-400 text-sm">CAGR</h3>
                <p className={`text-2xl font-semibold ${statistics.cagr >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPercent(statistics.cagr)}
                </p>
                <p className="text-sm text-gray-400">
                  Compound Annual Growth Rate
                </p>
              </div>
              
              <div className="card">
                <h3 className="text-gray-400 text-sm">Max Drawdown</h3>
                <p className="text-2xl font-semibold text-red-500">
                  {formatPercent(statistics.maxDrawdown)}
                </p>
                <p className="text-sm text-gray-400">
                  Largest portfolio decline
                </p>
              </div>
              
              <div className="card">
                <h3 className="text-gray-400 text-sm">Sharpe Ratio</h3>
                <p className={`text-2xl font-semibold ${statistics.sharpeRatio >= 1 ? 'text-green-500' : 'text-yellow-500'}`}>
                  {statistics.sharpeRatio.toFixed(2)}
                </p>
                <p className="text-sm text-gray-400">
                  Risk-adjusted return measure
                </p>
              </div>
            </div>
          )}
          
          {/* Equity Curve Chart */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Equity Curve</h2>
            <div id="equity-curve-chart" ref={equityCurveChartRef} className="w-full h-[300px]"></div>
          </div>
          
          {/* Drawdown Chart */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Drawdown</h2>
            <div id="drawdown-chart" ref={drawdownChartRef} className="w-full h-[200px]"></div>
          </div>
          
          {/* Monthly Returns Chart */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Monthly Returns</h2>
            <div id="monthly-returns-chart" ref={monthlyReturnsChartRef} className="w-full h-[200px]"></div>
            
            {statistics && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Winning Months</p>
                  <p className="text-lg font-semibold">
                    {statistics.winningMonths} of {statistics.totalMonths} ({formatPercent(statistics.winRate)})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Average Monthly Return</p>
                  <p className="text-lg font-semibold">
                    {formatPercent(statistics.totalReturn / statistics.totalMonths)}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Trade Statistics */}
          {tradeBreakdown && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Trade Statistics</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Total Trades</p>
                    <p className="text-lg font-semibold">{tradeBreakdown.totalTrades}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Win Rate</p>
                    <p className="text-lg font-semibold text-green-500">
                      {tradeBreakdown.winRate.toFixed(1)}%
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Average Win</p>
                    <p className="text-lg font-semibold text-green-500">
                      {formatCurrency(tradeBreakdown.averageWin)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Average Loss</p>
                    <p className="text-lg font-semibold text-red-500">
                      {formatCurrency(tradeBreakdown.averageLoss)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Largest Win</p>
                    <p className="text-lg font-semibold text-green-500">
                      {formatCurrency(tradeBreakdown.largestWin)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Largest Loss</p>
                    <p className="text-lg font-semibold text-red-500">
                      {formatCurrency(tradeBreakdown.largestLoss)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Profit Factor</p>
                    <p className="text-lg font-semibold">
                      {tradeBreakdown.profitFactor.toFixed(2)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Avg. Trade Duration</p>
                    <p className="text-lg font-semibold">
                      {tradeBreakdown.averageTradeDuration}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Performance by Instrument</h2>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>BTC-PERP</span>
                      <span className="text-green-500">+8.2%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>ETH-PERP</span>
                      <span className="text-green-500">+5.8%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>SOL-PERP</span>
                      <span className="text-green-500">+4.3%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: '55%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>AVAX-PERP</span>
                      <span className="text-green-500">+3.1%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>LINK-PERP</span>
                      <span className="text-red-500">-1.8%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full bg-red-500" style={{ width: '20%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PerformanceAnalysis;