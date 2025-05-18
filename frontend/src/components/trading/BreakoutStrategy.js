import React, { useState, useEffect } from 'react';

const BreakoutStrategy = () => {
  const [strategyParams, setStrategyParams] = useState({
    // Basic parameters
    period: 14,
    multiplier: 2.0,
    takeProfit: 3.0, // Percentage 
    stopLoss: 1.5, // Percentage
    trailingStop: false,
    trailingStopDistance: 1.0, // Percentage
    
    // Advanced parameters
    volumeFilter: true,
    volumeThreshold: 2.0, // Volume multiplier relative to average
    timeFilter: true,
    activeHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
    confirmationCandles: 1,
    
    // Position sizing
    positionSizeType: 'percentage', // 'fixed', 'percentage', 'risk'
    positionSizeValue: 5, // Percentage of account
    maxPositionsPerSymbol: 1,
    maxTotalPositions: 5
  });
  
  // State for managing parameter tabs
  const [activeTab, setActiveTab] = useState('basic');
  
  // Handle parameter change
  const handleParamChange = (param, value) => {
    // Handle numerical conversions
    if (typeof strategyParams[param] === 'number') {
      value = parseFloat(value);
      
      // Ensure value is a valid number
      if (isNaN(value)) return;
    }
    
    // Handle checkboxes
    if (typeof strategyParams[param] === 'boolean') {
      value = value === true || value === 'true';
    }
    
    setStrategyParams({
      ...strategyParams,
      [param]: value
    });
  };
  
  // Handle hour toggle for time filter
  const toggleHour = (hour) => {
    const updatedHours = [...strategyParams.activeHours];
    
    if (updatedHours.includes(hour)) {
      // Remove hour
      const index = updatedHours.indexOf(hour);
      updatedHours.splice(index, 1);
    } else {
      // Add hour
      updatedHours.push(hour);
      updatedHours.sort((a, b) => a - b);
    }
    
    setStrategyParams({
      ...strategyParams,
      activeHours: updatedHours
    });
  };
  
  // Generate time selector
  const renderTimeSelector = () => {
    const hours = [];
    
    for (let i = 0; i < 24; i++) {
      const hourLabel = i.toString().padStart(2, '0') + ':00';
      const isActive = strategyParams.activeHours.includes(i);
      
      hours.push(
        <button
          key={i}
          className={`p-1 text-xs rounded ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          onClick={() => toggleHour(i)}
        >
          {hourLabel}
        </button>
      );
    }
    
    return (
      <div className="grid grid-cols-6 gap-1">
        {hours}
      </div>
    );
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Breakout Strategy Configuration</h2>
      
      {/* Parameter Tabs */}
      <div className="flex border-b border-gray-700 mb-4">
        <button 
          className={`px-4 py-2 ${activeTab === 'basic' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('basic')}
        >
          Basic Parameters
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'advanced' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'position' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('position')}
        >
          Position Sizing
        </button>
      </div>
      
      {/* Basic Parameters */}
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="label">Lookback Period (Candles)</label>
            <input 
              type="number" 
              value={strategyParams.period}
              onChange={(e) => handleParamChange('period', e.target.value)}
              className="input"
              min="1"
            />
            <p className="text-xs text-gray-400 mt-1">Number of candles to look back for calculating range</p>
          </div>
          
          <div>
            <label className="label">Breakout Multiplier</label>
            <input 
              type="number" 
              value={strategyParams.multiplier}
              onChange={(e) => handleParamChange('multiplier', e.target.value)}
              className="input"
              min="0.1"
              step="0.1"
            />
            <p className="text-xs text-gray-400 mt-1">Multiple of average range to trigger a breakout</p>
          </div>
          
          <div>
            <label className="label">Take Profit (%)</label>
            <input 
              type="number" 
              value={strategyParams.takeProfit}
              onChange={(e) => handleParamChange('takeProfit', e.target.value)}
              className="input"
              min="0.1"
              step="0.1"
            />
          </div>
          
          <div>
            <label className="label">Stop Loss (%)</label>
            <input 
              type="number" 
              value={strategyParams.stopLoss}
              onChange={(e) => handleParamChange('stopLoss', e.target.value)}
              className="input"
              min="0.1"
              step="0.1"
            />
          </div>
          
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="trailingStop"
              checked={strategyParams.trailingStop}
              onChange={(e) => handleParamChange('trailingStop', e.target.checked)}
              className="mr-2 h-4 w-4 rounded bg-gray-700 border-gray-600"
            />
            <label htmlFor="trailingStop" className="label mb-0">Use Trailing Stop</label>
          </div>
          
          {strategyParams.trailingStop && (
            <div>
              <label className="label">Trailing Stop Distance (%)</label>
              <input 
                type="number" 
                value={strategyParams.trailingStopDistance}
                onChange={(e) => handleParamChange('trailingStopDistance', e.target.value)}
                className="input"
                min="0.1"
                step="0.1"
              />
            </div>
          )}
        </div>
      )}
      
      {/* Advanced Parameters */}
      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="volumeFilter"
              checked={strategyParams.volumeFilter}
              onChange={(e) => handleParamChange('volumeFilter', e.target.checked)}
              className="mr-2 h-4 w-4 rounded bg-gray-700 border-gray-600"
            />
            <label htmlFor="volumeFilter" className="label mb-0">Enable Volume Filter</label>
          </div>
          
          {strategyParams.volumeFilter && (
            <div>
              <label className="label">Volume Threshold (x Average)</label>
              <input 
                type="number" 
                value={strategyParams.volumeThreshold}
                onChange={(e) => handleParamChange('volumeThreshold', e.target.value)}
                className="input"
                min="0.1"
                step="0.1"
              />
              <p className="text-xs text-gray-400 mt-1">Volume must be this multiple of average to confirm breakout</p>
            </div>
          )}
          
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="timeFilter"
              checked={strategyParams.timeFilter}
              onChange={(e) => handleParamChange('timeFilter', e.target.checked)}
              className="mr-2 h-4 w-4 rounded bg-gray-700 border-gray-600"
            />
            <label htmlFor="timeFilter" className="label mb-0">Filter by Time of Day (UTC)</label>
          </div>
          
          {strategyParams.timeFilter && (
            <div>
              <label className="label">Active Hours (UTC)</label>
              {renderTimeSelector()}
              <p className="text-xs text-gray-400 mt-1">Strategy will only trade during selected hours</p>
            </div>
          )}
          
          <div>
            <label className="label">Confirmation Candles</label>
            <input 
              type="number" 
              value={strategyParams.confirmationCandles}
              onChange={(e) => handleParamChange('confirmationCandles', e.target.value)}
              className="input"
              min="0"
              max="5"
            />
            <p className="text-xs text-gray-400 mt-1">Number of candles to wait for confirmation (0 for immediate entry)</p>
          </div>
        </div>
      )}
      
      {/* Position Sizing */}
      {activeTab === 'position' && (
        <div className="space-y-4">
          <div>
            <label className="label">Position Size Type</label>
            <select 
              value={strategyParams.positionSizeType}
              onChange={(e) => handleParamChange('positionSizeType', e.target.value)}
              className="input"
            >
              <option value="percentage">Percentage of Account</option>
              <option value="fixed">Fixed Size</option>
              <option value="risk">Risk-Based</option>
            </select>
          </div>
          
          <div>
            <label className="label">
              {strategyParams.positionSizeType === 'percentage' ? 'Account Percentage (%)' : 
               strategyParams.positionSizeType === 'fixed' ? 'Fixed Position Size ($)' : 
               'Risk Per Trade (%)'}
            </label>
            <input 
              type="number" 
              value={strategyParams.positionSizeValue}
              onChange={(e) => handleParamChange('positionSizeValue', e.target.value)}
              className="input"
              min="0.1"
              step="0.1"
            />
            
            {strategyParams.positionSizeType === 'risk' && (
              <p className="text-xs text-gray-400 mt-1">Position size will be calculated to risk this percentage of account on each trade</p>
            )}
          </div>
          
          <div>
            <label className="label">Max Positions Per Symbol</label>
            <input 
              type="number" 
              value={strategyParams.maxPositionsPerSymbol}
              onChange={(e) => handleParamChange('maxPositionsPerSymbol', e.target.value)}
              className="input"
              min="1"
              max="10"
            />
          </div>
          
          <div>
            <label className="label">Max Total Positions</label>
            <input 
              type="number" 
              value={strategyParams.maxTotalPositions}
              onChange={(e) => handleParamChange('maxTotalPositions', e.target.value)}
              className="input"
              min="1"
              max="50"
            />
          </div>
        </div>
      )}
      
      {/* Strategy Description */}
      <div className="mt-6 p-4 bg-gray-700 rounded-lg">
        <h3 className="text-md font-medium mb-2">Strategy Description</h3>
        <p className="text-sm text-gray-300">
          The Breakout strategy identifies potential price breakouts by monitoring price movements beyond historical ranges.
          When price moves more than the specified multiplier of the average range over the lookback period, a trade is triggered.
          Upward breakouts trigger long positions, while downward breakouts trigger short positions.
        </p>
        
        <h4 className="text-sm font-medium mt-3 mb-1">Current Configuration Summary:</h4>
        <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
          <li>Looking for breakouts beyond {strategyParams.multiplier}x the average range over {strategyParams.period} candles</li>
          <li>Taking profit at {strategyParams.takeProfit}% and stopping loss at {strategyParams.stopLoss}%</li>
          {strategyParams.trailingStop && <li>Using trailing stop at {strategyParams.trailingStopDistance}% distance</li>}
          {strategyParams.volumeFilter && <li>Requiring volume to be {strategyParams.volumeThreshold}x average</li>}
          {strategyParams.timeFilter && <li>Trading only during {strategyParams.activeHours.length} selected hours</li>}
          <li>Using {strategyParams.positionSizeType === 'percentage' ? `${strategyParams.positionSizeValue}% of account` : 
                     strategyParams.positionSizeType === 'fixed' ? `fixed size of $${strategyParams.positionSizeValue}` : 
                     `${strategyParams.positionSizeValue}% risk`} per position</li>
        </ul>
      </div>
      
      {/* Save Button */}
      <div className="mt-6">
        <button className="btn btn-primary w-full">
          Save Strategy Configuration
        </button>
      </div>
    </div>
  );
};

export default BreakoutStrategy;