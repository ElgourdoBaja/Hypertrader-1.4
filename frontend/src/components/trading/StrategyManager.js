import React, { useState } from 'react';

// Import strategy components
import BreakoutStrategy from './BreakoutStrategy';

const StrategyManager = () => {
  const [activeStrategy, setActiveStrategy] = useState('momentum');
  const [strategies, setStrategies] = useState([
    { id: 'momentum', name: 'Momentum', type: 'momentum', isActive: true, description: 'Trades based on price momentum indicators' },
    { id: 'breakout', name: 'Breakout', type: 'breakout', isActive: false, description: 'Trades breakouts from price consolidations' },
    { id: 'meanreversion', name: 'Mean Reversion', type: 'meanreversion', isActive: false, description: 'Trades reversions to the mean price' },
    { id: 'custom', name: 'Custom Strategy', type: 'custom', isActive: false, description: 'Your own custom trading strategy' }
  ]);
  
  const [newStrategyName, setNewStrategyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Toggle strategy active state
  const toggleStrategy = (id) => {
    setStrategies(prevStrategies => 
      prevStrategies.map(strategy => 
        strategy.id === id 
          ? { ...strategy, isActive: !strategy.isActive } 
          : strategy
      )
    );
  };
  
  // Select strategy to edit
  const selectStrategy = (id) => {
    setActiveStrategy(id);
  };
  
  // Create new strategy
  const createStrategy = () => {
    if (!newStrategyName.trim()) return;
    
    const newId = `custom-${Date.now()}`;
    
    setStrategies(prev => [
      ...prev,
      {
        id: newId,
        name: newStrategyName,
        type: 'custom',
        isActive: false,
        description: 'Custom trading strategy'
      }
    ]);
    
    setNewStrategyName('');
    setIsCreating(false);
    setActiveStrategy(newId);
  };
  
  // Delete strategy
  const deleteStrategy = (id, e) => {
    e.stopPropagation();
    
    // Can't delete built-in strategies
    if (['momentum', 'breakout', 'meanreversion', 'custom'].includes(id)) {
      return;
    }
    
    setStrategies(prev => prev.filter(strategy => strategy.id !== id));
    
    // If deleted strategy was active, set active to momentum
    if (activeStrategy === id) {
      setActiveStrategy('momentum');
    }
  };
  
  // Render strategy configuration based on type
  const renderStrategyConfig = () => {
    const strategy = strategies.find(s => s.id === activeStrategy);
    
    if (!strategy) return null;
    
    switch (strategy.type) {
      case 'breakout':
        return <BreakoutStrategy />;
      case 'meanreversion':
        return (
          <div className="card p-6 text-center">
            <h2 className="text-xl mb-4">Mean Reversion Strategy</h2>
            <p className="text-gray-400">
              This strategy is coming soon. It will trade reversions to the mean price.
            </p>
          </div>
        );
      case 'custom':
        return (
          <div className="card p-6 text-center">
            <h2 className="text-xl mb-4">Custom Strategy</h2>
            <p className="text-gray-400">
              Custom strategy building interface coming soon. You'll be able to build your own strategy using a visual editor.
            </p>
          </div>
        );
      case 'momentum':
      default:
        return (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Momentum Strategy Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="label">Lookback Period</label>
                <input 
                  type="number" 
                  defaultValue={14}
                  className="input"
                  min="1"
                />
                <p className="text-xs text-gray-400 mt-1">Number of candles to look back for momentum calculation</p>
              </div>
              
              <div>
                <label className="label">Momentum Threshold (%)</label>
                <input 
                  type="number" 
                  defaultValue={0.5}
                  className="input"
                  step="0.1"
                />
                <p className="text-xs text-gray-400 mt-1">Minimum momentum required to enter a trade</p>
              </div>
              
              <div>
                <label className="label">Stop Loss (%)</label>
                <input 
                  type="number" 
                  defaultValue={2.0}
                  className="input"
                  step="0.1"
                />
              </div>
              
              <div>
                <label className="label">Take Profit (%)</label>
                <input 
                  type="number" 
                  defaultValue={6.0}
                  className="input"
                  step="0.1"
                />
              </div>
              
              <div>
                <label className="label">Max Position Size (% of Portfolio)</label>
                <input 
                  type="number" 
                  defaultValue={5.0}
                  className="input"
                  min="0.1"
                  max="100"
                  step="0.1"
                />
              </div>
              
              {/* Strategy Description */}
              <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                <h3 className="text-md font-medium mb-2">Strategy Description</h3>
                <p className="text-sm text-gray-300">
                  The Momentum strategy identifies market trends by measuring the rate of price change.
                  When momentum exceeds the threshold in either direction, a corresponding trade is triggered.
                  Positive momentum triggers long positions, while negative momentum triggers short positions.
                </p>
              </div>
              
              {/* Save Button */}
              <div className="mt-6">
                <button className="btn btn-primary w-full">
                  Save Strategy Configuration
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Trading Strategies</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Strategy List */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">My Strategies</h2>
            
            <ul className="space-y-2">
              {strategies.map(strategy => (
                <li 
                  key={strategy.id}
                  className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${
                    activeStrategy === strategy.id 
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => selectStrategy(strategy.id)}
                >
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium">{strategy.name}</span>
                      {!['momentum', 'breakout', 'meanreversion', 'custom'].includes(strategy.id) && (
                        <button 
                          className="ml-2 text-gray-400 hover:text-red-500"
                          onClick={(e) => deleteStrategy(strategy.id, e)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{strategy.description}</p>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="relative inline-block w-10 align-middle select-none">
                      <input 
                        type="checkbox" 
                        id={`toggle-${strategy.id}`} 
                        checked={strategy.isActive}
                        onChange={() => toggleStrategy(strategy.id)}
                        className="hidden" 
                      />
                      <label 
                        htmlFor={`toggle-${strategy.id}`} 
                        className={`block overflow-hidden h-5 rounded-full cursor-pointer ${
                          strategy.isActive ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                      >
                        <span 
                          className={`block h-5 w-5 rounded-full bg-white transform transition-transform ${
                            strategy.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`} 
                        />
                      </label>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            
            {isCreating ? (
              <div className="mt-4">
                <div className="flex items-center">
                  <input 
                    type="text"
                    value={newStrategyName}
                    onChange={(e) => setNewStrategyName(e.target.value)}
                    placeholder="Strategy name"
                    className="input flex-1 mr-2"
                  />
                  <button
                    onClick={createStrategy}
                    className="btn btn-primary py-2"
                  >
                    Add
                  </button>
                </div>
                <button
                  onClick={() => setIsCreating(false)}
                  className="mt-2 text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="mt-4 btn btn-secondary w-full flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Strategy
              </button>
            )}
          </div>
        </div>
        
        {/* Strategy Configuration */}
        <div className="lg:col-span-3">
          {renderStrategyConfig()}
        </div>
      </div>
    </div>
  );
};

export default StrategyManager;