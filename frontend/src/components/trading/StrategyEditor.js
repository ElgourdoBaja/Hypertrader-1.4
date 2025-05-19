import React, { useState, useRef, useEffect } from 'react';
import { formatCurrency, formatPercent } from '../../utils';

// StrategyEditor component for visual strategy building
const StrategyEditor = () => {
  // Blocks represent strategy components that can be connected
  const [blocks, setBlocks] = useState([
    { id: 'entry-1', type: 'entry', x: 100, y: 100, outputs: ['logic-1'], name: 'Price Breakout', 
      params: { period: 14, multiplier: 2.0, direction: 'both' } },
    { id: 'logic-1', type: 'logic', x: 300, y: 100, inputs: ['entry-1'], outputs: ['filter-1'], name: 'AND', 
      params: { } },
    { id: 'filter-1', type: 'filter', x: 500, y: 100, inputs: ['logic-1'], outputs: ['exit-1'], name: 'Volume Filter', 
      params: { threshold: 2.0, period: 14 } },
    { id: 'exit-1', type: 'exit', x: 700, y: 100, inputs: ['filter-1'], outputs: [], name: 'Take Profit / Stop Loss', 
      params: { takeProfit: 3.0, stopLoss: 1.5, trailingStop: false, trailingDistance: 1.0 } }
  ]);
  
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [dragBlock, setDragBlock] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showBlockList, setShowBlockList] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [strategyName, setStrategyName] = useState('My Custom Strategy');
  const [strategyDescription, setStrategyDescription] = useState('A custom trading strategy built with the visual editor');
  
  // Mock backtest results for strategy preview
  const [previewResults, setPreviewResults] = useState({
    winRate: 62.5,
    totalTrades: 48,
    profitFactor: 1.75,
    averageProfit: 1.2
  });
  
  const editorRef = useRef(null);
  
  // Available blocks for adding to the strategy
  const availableBlocks = [
    // Entry conditions
    { type: 'entry', name: 'Price Breakout', description: 'Enter when price breaks out of a range', 
      params: { period: 14, multiplier: 2.0, direction: 'both' } },
    { type: 'entry', name: 'Moving Average Cross', description: 'Enter when moving averages cross', 
      params: { fastPeriod: 9, slowPeriod: 21, direction: 'both' } },
    { type: 'entry', name: 'RSI Signal', description: 'Enter based on RSI readings', 
      params: { period: 14, overbought: 70, oversold: 30, direction: 'both' } },
    
    // Logic operators
    { type: 'logic', name: 'AND', description: 'Require all conditions to be true',
      params: { } },
    { type: 'logic', name: 'OR', description: 'Require any condition to be true',
      params: { } },
    { type: 'logic', name: 'NOT', description: 'Invert the condition',
      params: { } },
    
    // Filters
    { type: 'filter', name: 'Volume Filter', description: 'Ensure sufficient volume for the trade',
      params: { threshold: 2.0, period: 14 } },
    { type: 'filter', name: 'Time Filter', description: 'Only trade during specific hours',
      params: { activeHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] } },
    { type: 'filter', name: 'Trend Filter', description: 'Only trade with the overall trend',
      params: { period: 50, indicator: 'ema' } },
    
    // Exit conditions
    { type: 'exit', name: 'Take Profit / Stop Loss', description: 'Basic profit taking and stop loss',
      params: { takeProfit: 3.0, stopLoss: 1.5, trailingStop: false, trailingDistance: 1.0 } },
    { type: 'exit', name: 'Indicator Exit', description: 'Exit based on indicator signal',
      params: { indicator: 'rsi', period: 14, threshold: 50 } },
    { type: 'exit', name: 'Time-Based Exit', description: 'Exit after a certain time',
      params: { bars: 10, hours: 0 } }
  ];
  
  // Handle block selection
  const handleBlockClick = (blockId) => {
    const block = blocks.find(b => b.id === blockId);
    setSelectedBlock(block);
  };
  
  // Start dragging a block
  const handleBlockDragStart = (e, blockId) => {
    e.stopPropagation();
    const block = blocks.find(b => b.id === blockId);
    const rect = e.currentTarget.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();
    
    setDragOffset({ 
      x: e.clientX - rect.left + editorRect.left, 
      y: e.clientY - rect.top + editorRect.top 
    });
    
    setDragBlock(block);
    setSelectedBlock(block);
  };
  
  // Drag a block
  const handleEditorMouseMove = (e) => {
    if (!dragBlock) return;
    
    const editorRect = editorRef.current.getBoundingClientRect();
    const x = e.clientX - editorRect.left - dragOffset.x;
    const y = e.clientY - editorRect.top - dragOffset.y;
    
    setBlocks(prev => prev.map(block => 
      block.id === dragBlock.id ? { ...block, x, y } : block
    ));
  };
  
  // Stop dragging a block
  const handleEditorMouseUp = () => {
    setDragBlock(null);
  };
  
  // Add a new block to the editor
  const addBlock = (blockType) => {
    const templateBlock = availableBlocks.find(b => b.name === blockType);
    if (!templateBlock) return;
    
    const newId = `${templateBlock.type}-${Date.now()}`;
    const newBlock = {
      id: newId,
      type: templateBlock.type,
      x: 200,
      y: 200,
      inputs: [],
      outputs: [],
      name: templateBlock.name,
      params: { ...templateBlock.params }
    };
    
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlock(newBlock);
    setShowBlockList(false);
  };
  
  // Delete the selected block
  const deleteSelectedBlock = () => {
    if (!selectedBlock) return;
    
    // Remove any connections involving this block
    setBlocks(prev => {
      const updatedBlocks = prev.filter(block => block.id !== selectedBlock.id);
      
      return updatedBlocks.map(block => ({
        ...block,
        inputs: block.inputs ? block.inputs.filter(id => id !== selectedBlock.id) : [],
        outputs: block.outputs ? block.outputs.filter(id => id !== selectedBlock.id) : []
      }));
    });
    
    setSelectedBlock(null);
  };
  
  // Connect two blocks
  const connectBlocks = (sourceId, targetId) => {
    if (sourceId === targetId) return;
    
    setBlocks(prev => {
      return prev.map(block => {
        if (block.id === sourceId) {
          return {
            ...block,
            outputs: [...(block.outputs || []), targetId]
          };
        }
        if (block.id === targetId) {
          return {
            ...block,
            inputs: [...(block.inputs || []), sourceId]
          };
        }
        return block;
      });
    });
  };
  
  // Update parameter value for selected block
  const updateBlockParam = (paramName, value) => {
    if (!selectedBlock) return;
    
    setBlocks(prev => prev.map(block => 
      block.id === selectedBlock.id 
        ? { 
            ...block, 
            params: { 
              ...block.params, 
              [paramName]: value 
            }
          } 
        : block
    ));
    
    // Also update the local selected block
    setSelectedBlock(prev => ({
      ...prev,
      params: {
        ...prev.params,
        [paramName]: value
      }
    }));
  };
  
  // Get parameter controls based on the parameter type
  const getParamControl = (paramName, value) => {
    if (paramName === 'direction') {
      return (
        <select
          className="input"
          value={value}
          onChange={(e) => updateBlockParam(paramName, e.target.value)}
        >
          <option value="both">Both Directions</option>
          <option value="up">Upward Only</option>
          <option value="down">Downward Only</option>
        </select>
      );
    } else if (paramName === 'indicator') {
      return (
        <select
          className="input"
          value={value}
          onChange={(e) => updateBlockParam(paramName, e.target.value)}
        >
          <option value="ema">EMA</option>
          <option value="sma">SMA</option>
          <option value="rsi">RSI</option>
          <option value="macd">MACD</option>
          <option value="bollinger">Bollinger Bands</option>
        </select>
      );
    } else if (paramName === 'activeHours') {
      // Time filter hours selector
      return (
        <div className="grid grid-cols-6 gap-1 mt-2">
          {Array.from({ length: 24 }, (_, i) => (
            <button
              key={i}
              className={`p-1 text-xs rounded ${value.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              onClick={() => {
                const updatedHours = value.includes(i)
                  ? value.filter(h => h !== i)
                  : [...value, i].sort((a, b) => a - b);
                updateBlockParam(paramName, updatedHours);
              }}
            >
              {i.toString().padStart(2, '0')}:00
            </button>
          ))}
        </div>
      );
    } else if (typeof value === 'boolean') {
      return (
        <div className="flex items-center">
          <input
            type="checkbox"
            id={`param-${paramName}`}
            checked={value}
            onChange={(e) => updateBlockParam(paramName, e.target.checked)}
            className="mr-2 h-4 w-4 rounded bg-gray-700 border-gray-600"
          />
          <label htmlFor={`param-${paramName}`} className="text-sm">
            {paramName === 'trailingStop' ? 'Use Trailing Stop' : paramName}
          </label>
        </div>
      );
    } else {
      // Default number input
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => updateBlockParam(paramName, parseFloat(e.target.value))}
          className="input"
          step={paramName.toLowerCase().includes('period') ? 1 : 0.1}
          min={0}
        />
      );
    }
  };
  
  // Generate the strategy code
  const generateStrategyCode = () => {
    // Simplified code generation
    const entryBlocks = blocks.filter(block => block.type === 'entry');
    const exitBlocks = blocks.filter(block => block.type === 'exit');
    
    let code = `
// ${strategyName}
// ${strategyDescription}

// Strategy parameters
const params = {
${blocks.map(block => `  // ${block.name} parameters`).join('\n')}
${blocks.map(block => Object.entries(block.params).map(([key, value]) => 
  `  ${block.id.replace('-', '_')}_${key}: ${JSON.stringify(value)},`).join('\n')
).join('\n')}
};

// Entry conditions
function checkEntryConditions(candles, position) {
  // No position is open, check entry conditions
  if (!position) {
${entryBlocks.map(block => {
  if (block.name === 'Price Breakout') {
    return `    // ${block.name}
    const lookback = candles.slice(-params.${block.id.replace('-', '_')}_period);
    const avgRange = lookback.reduce((sum, candle) => sum + (candle.high - candle.low), 0) / params.${block.id.replace('-', '_')}_period;
    const breakoutThreshold = avgRange * params.${block.id.replace('-', '_')}_multiplier;
    const latestCandle = candles[candles.length - 1];
    const prevClose = candles[candles.length - 2].close;
    
    if (params.${block.id.replace('-', '_')}_direction === 'both' || params.${block.id.replace('-', '_')}_direction === 'up') {
      if (latestCandle.close > prevClose + breakoutThreshold) {
        return { direction: 'long', entryPrice: latestCandle.close };
      }
    }
    
    if (params.${block.id.replace('-', '_')}_direction === 'both' || params.${block.id.replace('-', '_')}_direction === 'down') {
      if (latestCandle.close < prevClose - breakoutThreshold) {
        return { direction: 'short', entryPrice: latestCandle.close };
      }
    }`;
  } else if (block.name === 'Moving Average Cross') {
    return `    // ${block.name}
    const fastMA = calculateEMA(candles, params.${block.id.replace('-', '_')}_fastPeriod);
    const slowMA = calculateEMA(candles, params.${block.id.replace('-', '_')}_slowPeriod);
    const prevFastMA = calculateEMA(candles.slice(0, -1), params.${block.id.replace('-', '_')}_fastPeriod);
    const prevSlowMA = calculateEMA(candles.slice(0, -1), params.${block.id.replace('-', '_')}_slowPeriod);
    
    if (params.${block.id.replace('-', '_')}_direction === 'both' || params.${block.id.replace('-', '_')}_direction === 'up') {
      if (prevFastMA <= prevSlowMA && fastMA > slowMA) {
        return { direction: 'long', entryPrice: candles[candles.length - 1].close };
      }
    }
    
    if (params.${block.id.replace('-', '_')}_direction === 'both' || params.${block.id.replace('-', '_')}_direction === 'down') {
      if (prevFastMA >= prevSlowMA && fastMA < slowMA) {
        return { direction: 'short', entryPrice: candles[candles.length - 1].close };
      }
    }`;
  } else if (block.name === 'RSI Signal') {
    return `    // ${block.name}
    const rsi = calculateRSI(candles, params.${block.id.replace('-', '_')}_period);
    const prevRSI = calculateRSI(candles.slice(0, -1), params.${block.id.replace('-', '_')}_period);
    
    if (params.${block.id.replace('-', '_')}_direction === 'both' || params.${block.id.replace('-', '_')}_direction === 'up') {
      if (prevRSI <= params.${block.id.replace('-', '_')}_oversold && rsi > params.${block.id.replace('-', '_')}_oversold) {
        return { direction: 'long', entryPrice: candles[candles.length - 1].close };
      }
    }
    
    if (params.${block.id.replace('-', '_')}_direction === 'both' || params.${block.id.replace('-', '_')}_direction === 'down') {
      if (prevRSI >= params.${block.id.replace('-', '_')}_overbought && rsi < params.${block.id.replace('-', '_')}_overbought) {
        return { direction: 'short', entryPrice: candles[candles.length - 1].close };
      }
    }`;
  }
  return `    // ${block.name} (placeholder)`;
}).join('\n\n')}
  }
  
  return null;
}

// Exit conditions
function checkExitConditions(candles, position) {
  if (!position) return false;
  
  const latestCandle = candles[candles.length - 1];
  const entryPrice = position.entryPrice;
  
${exitBlocks.map(block => {
  if (block.name === 'Take Profit / Stop Loss') {
    return `  // ${block.name}
  const priceDiff = position.direction === 'long' 
    ? (latestCandle.close - entryPrice) / entryPrice * 100
    : (entryPrice - latestCandle.close) / entryPrice * 100;
    
  // Check stop loss
  if (priceDiff <= -params.${block.id.replace('-', '_')}_stopLoss) {
    return { reason: 'Stop Loss', exitPrice: latestCandle.close };
  }
  
  // Check take profit
  if (priceDiff >= params.${block.id.replace('-', '_')}_takeProfit) {
    return { reason: 'Take Profit', exitPrice: latestCandle.close };
  }`;
  } else if (block.name === 'Indicator Exit') {
    return `  // ${block.name}
  const indicator = calculate${block.params.indicator.toUpperCase()}(candles, params.${block.id.replace('-', '_')}_period);
  
  if (position.direction === 'long' && indicator < params.${block.id.replace('-', '_')}_threshold) {
    return { reason: 'Indicator Exit', exitPrice: latestCandle.close };
  }
  
  if (position.direction === 'short' && indicator > params.${block.id.replace('-', '_')}_threshold) {
    return { reason: 'Indicator Exit', exitPrice: latestCandle.close };
  }`;
  } else if (block.name === 'Time-Based Exit') {
    return `  // ${block.name}
  if (position.bars >= params.${block.id.replace('-', '_')}_bars) {
    return { reason: 'Time Exit', exitPrice: latestCandle.close };
  }`;
  }
  return `  // ${block.name} (placeholder)`;
}).join('\n\n')}
  
  return false;
}`;
    
    return code;
  };
  
  // Run the strategy backtest
  const runStrategyTest = () => {
    setActiveTab('preview');
    
    // In a real app, this would send the strategy to the backend for backtesting
    // For this demo, we'll just update the preview results with random data
    
    setPreviewResults({
      winRate: 55 + Math.random() * 20,
      totalTrades: Math.floor(30 + Math.random() * 40),
      profitFactor: 1.2 + Math.random() * 1.2,
      averageProfit: 0.8 + Math.random() * 1.5
    });
  };
  
  // Save the strategy
  const saveStrategy = () => {
    // In a real app, this would save the strategy to the backend
    alert('Strategy saved successfully!');
  };
  
  // Render connections between blocks
  const renderConnections = () => {
    const connections = [];
    
    blocks.forEach(block => {
      if (block.outputs && block.outputs.length > 0) {
        block.outputs.forEach(outputId => {
          const targetBlock = blocks.find(b => b.id === outputId);
          if (targetBlock) {
            // Simple straight line connection
            const sourceX = block.x + 120; // Right side of block
            const sourceY = block.y + 30; // Middle of block
            const targetX = targetBlock.x; // Left side of target block
            const targetY = targetBlock.y + 30; // Middle of target block
            
            connections.push(
              <g key={`${block.id}-${outputId}`}>
                <line
                  x1={sourceX}
                  y1={sourceY}
                  x2={targetX}
                  y2={targetY}
                  stroke="#4f6bff"
                  strokeWidth={2}
                />
                <polygon
                  points={`${targetX},${targetY} ${targetX-10},${targetY-5} ${targetX-10},${targetY+5}`}
                  fill="#4f6bff"
                />
              </g>
            );
          }
        });
      }
    });
    
    return connections;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Visual Strategy Editor</h1>
      <p className="text-gray-400 mb-6">Create custom trading strategies with a visual drag-and-drop editor</p>
      
      {/* Strategy Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Strategy Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="label">Strategy Name</label>
              <input
                type="text"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="input"
              />
            </div>
            
            <div>
              <label className="label">Description</label>
              <textarea
                value={strategyDescription}
                onChange={(e) => setStrategyDescription(e.target.value)}
                className="input h-24"
              />
            </div>
          </div>
        </div>
        
        <div className="card flex flex-col justify-between">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              className="btn btn-primary py-3"
              onClick={() => setShowBlockList(true)}
            >
              Add Block
            </button>
            
            <button
              className="btn bg-red-600 hover:bg-red-700 text-white py-3"
              onClick={deleteSelectedBlock}
              disabled={!selectedBlock}
            >
              Delete Block
            </button>
            
            <button
              className="btn bg-yellow-600 hover:bg-yellow-700 text-white py-3"
              onClick={runStrategyTest}
            >
              Test Strategy
            </button>
            
            <button
              className="btn bg-green-600 hover:bg-green-700 text-white py-3"
              onClick={saveStrategy}
            >
              Save Strategy
            </button>
          </div>
          
          <div className="bg-gray-700 p-3 rounded-lg">
            <p className="text-sm text-gray-300">
              Drag blocks to position them. Connect blocks by selecting outputs and inputs. Configure parameters in the panel below.
            </p>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-4">
        <button 
          className={`px-4 py-2 ${activeTab === 'editor' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('editor')}
        >
          Visual Editor
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'code' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('code')}
        >
          Generated Code
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'preview' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('preview')}
        >
          Strategy Preview
        </button>
      </div>
      
      {/* Visual Editor */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <div 
              ref={editorRef}
              className="relative w-full h-[400px] bg-gray-800 rounded-lg overflow-auto"
              onMouseMove={handleEditorMouseMove}
              onMouseUp={handleEditorMouseUp}
              onMouseLeave={handleEditorMouseUp}
            >
              {/* Render SVG connections */}
              <svg className="absolute inset-0 pointer-events-none">
                {renderConnections()}
              </svg>
              
              {/* Render blocks */}
              {blocks.map(block => (
                <div
                  key={block.id}
                  className={`absolute w-32 rounded-lg p-2 cursor-move flex flex-col items-center shadow-md transition-shadow ${
                    selectedBlock && selectedBlock.id === block.id
                      ? 'ring-2 ring-blue-500'
                      : ''
                  } ${
                    block.type === 'entry'
                      ? 'bg-green-800'
                      : block.type === 'logic'
                      ? 'bg-blue-800'
                      : block.type === 'filter'
                      ? 'bg-yellow-800'
                      : 'bg-red-800'
                  }`}
                  style={{ left: `${block.x}px`, top: `${block.y}px` }}
                  onClick={() => handleBlockClick(block.id)}
                  onMouseDown={(e) => handleBlockDragStart(e, block.id)}
                >
                  <div className="text-center font-medium text-sm truncate w-full">
                    {block.name}
                  </div>
                  <div className="text-xs text-center opacity-70 truncate w-full">
                    {block.type === 'entry'
                      ? 'Entry Condition'
                      : block.type === 'logic'
                      ? 'Logic Operator'
                      : block.type === 'filter'
                      ? 'Filter'
                      : 'Exit Condition'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Block Parameters</h2>
            
            {selectedBlock ? (
              <div>
                <div className="mb-4">
                  <h3 className="label">{selectedBlock.name}</h3>
                  <p className="text-sm text-gray-400">
                    {selectedBlock.type === 'entry'
                      ? 'Defines when to enter a trade'
                      : selectedBlock.type === 'logic'
                      ? 'Combines multiple conditions'
                      : selectedBlock.type === 'filter'
                      ? 'Filters trade signals'
                      : 'Defines when to exit a trade'}
                  </p>
                </div>
                
                <div className="space-y-4">
                  {selectedBlock.params && Object.entries(selectedBlock.params).map(([key, value]) => (
                    <div key={key}>
                      <label className="label capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                      {getParamControl(key, value)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <p>Select a block to edit parameters</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Generated Code */}
      {activeTab === 'code' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Generated Strategy Code</h2>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <pre className="text-xs text-gray-300 overflow-auto max-h-[500px]">
              {generateStrategyCode()}
            </pre>
          </div>
          
          <div className="mt-4 text-sm text-gray-400">
            <p>This code represents your visual strategy. You can copy and use it in the Hyperliquid trading engine.</p>
          </div>
        </div>
      )}
      
      {/* Strategy Preview */}
      {activeTab === 'preview' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Strategy Performance Preview</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Win Rate</h3>
              <p className="text-2xl font-semibold">
                {previewResults.winRate.toFixed(1)}%
              </p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Total Trades</h3>
              <p className="text-2xl font-semibold">
                {previewResults.totalTrades}
              </p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Profit Factor</h3>
              <p className={`text-2xl font-semibold ${previewResults.profitFactor >= 1.5 ? 'text-green-500' : previewResults.profitFactor >= 1 ? 'text-yellow-500' : 'text-red-500'}`}>
                {previewResults.profitFactor.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Avg. Profit/Trade</h3>
              <p className={`text-2xl font-semibold ${previewResults.averageProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercent(previewResults.averageProfit)}
              </p>
            </div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium mb-3">Strategy Performance</h3>
            
            <div className="relative h-48 bg-gray-800 rounded-lg p-4">
              {/* Mock equity curve - in a real app, this would be a chart */}
              <div className="absolute inset-0 p-4">
                <div className="h-full w-full flex items-end">
                  <div className="relative w-full h-[80%]">
                    <div className="absolute bottom-0 left-0 right-0 h-full">
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                        <path 
                          d="M0,100 L5,95 L10,90 L15,92 L20,85 L25,88 L30,82 L35,78 L40,74 L45,79 L50,73 L55,68 L60,72 L65,65 L70,68 L75,62 L80,55 L85,58 L90,50 L95,45 L100,40" 
                          stroke="#4f6bff" 
                          strokeWidth="2" 
                          fill="none"
                        />
                        <path 
                          d="M0,100 L5,95 L10,90 L15,92 L20,85 L25,88 L30,82 L35,78 L40,74 L45,79 L50,73 L55,68 L60,72 L65,65 L70,68 L75,62 L80,55 L85,58 L90,50 L95,45 L100,40 V100 H0" 
                          fill="url(#gradient)" 
                          opacity="0.3"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#4f6bff" />
                            <stop offset="100%" stopColor="#4f6bff" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Chart labels */}
              <div className="absolute top-2 left-2 text-xs text-gray-400">
                Equity Curve
              </div>
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                +{(previewResults.averageProfit * previewResults.totalTrades).toFixed(2)}%
              </div>
            </div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Strategy Assessment</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Overall Performance</span>
                  <span className={`${previewResults.profitFactor >= 1.5 ? 'text-green-500' : previewResults.profitFactor >= 1 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {previewResults.profitFactor >= 1.5 ? 'Good' : previewResults.profitFactor >= 1 ? 'Moderate' : 'Poor'}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${previewResults.profitFactor >= 1.5 ? 'bg-green-500' : previewResults.profitFactor >= 1 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                    style={{ width: `${Math.min(100, previewResults.profitFactor * 30)}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Risk/Reward Ratio</span>
                  <span className={`${previewResults.winRate >= 60 ? 'text-green-500' : previewResults.winRate >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {previewResults.winRate >= 60 ? 'Good' : previewResults.winRate >= 50 ? 'Moderate' : 'Poor'}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${previewResults.winRate >= 60 ? 'bg-green-500' : previewResults.winRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                    style={{ width: `${Math.min(100, previewResults.winRate)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-300">
              <p>
                This strategy {previewResults.profitFactor >= 1.5 ? 'performs well' : previewResults.profitFactor >= 1 ? 'shows moderate performance' : 'needs improvement'} in backtest with a profit factor of {previewResults.profitFactor.toFixed(2)} and a win rate of {previewResults.winRate.toFixed(1)}%. 
                {previewResults.profitFactor < 1.3 && 'Consider adjusting parameters to improve performance.'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Block List Modal */}
      {showBlockList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Strategy Block</h2>
              <button 
                onClick={() => setShowBlockList(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-green-400">Entry Conditions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableBlocks.filter(block => block.type === 'entry').map(block => (
                  <button
                    key={block.name}
                    className="bg-green-800 hover:bg-green-700 p-3 rounded-lg text-left"
                    onClick={() => addBlock(block.name)}
                  >
                    <h4 className="font-medium">{block.name}</h4>
                    <p className="text-sm text-gray-300">{block.description}</p>
                  </button>
                ))}
              </div>
              
              <h3 className="text-lg font-medium text-blue-400 pt-2">Logic Operators</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {availableBlocks.filter(block => block.type === 'logic').map(block => (
                  <button
                    key={block.name}
                    className="bg-blue-800 hover:bg-blue-700 p-3 rounded-lg text-left"
                    onClick={() => addBlock(block.name)}
                  >
                    <h4 className="font-medium">{block.name}</h4>
                    <p className="text-sm text-gray-300">{block.description}</p>
                  </button>
                ))}
              </div>
              
              <h3 className="text-lg font-medium text-yellow-400 pt-2">Filters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableBlocks.filter(block => block.type === 'filter').map(block => (
                  <button
                    key={block.name}
                    className="bg-yellow-800 hover:bg-yellow-700 p-3 rounded-lg text-left"
                    onClick={() => addBlock(block.name)}
                  >
                    <h4 className="font-medium">{block.name}</h4>
                    <p className="text-sm text-gray-300">{block.description}</p>
                  </button>
                ))}
              </div>
              
              <h3 className="text-lg font-medium text-red-400 pt-2">Exit Conditions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableBlocks.filter(block => block.type === 'exit').map(block => (
                  <button
                    key={block.name}
                    className="bg-red-800 hover:bg-red-700 p-3 rounded-lg text-left"
                    onClick={() => addBlock(block.name)}
                  >
                    <h4 className="font-medium">{block.name}</h4>
                    <p className="text-sm text-gray-300">{block.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyEditor;