// tradingEngine.js
// Service for managing trading strategies and execution

import hyperliquidService from './hyperliquidService';

class TradingEngine {
  constructor() {
    this.isRunning = false;
    this.strategies = new Map();
    this.positions = new Map();
    this.watchlist = new Set();
    this.tickerData = new Map();
    this.orderBookData = new Map();
    this.tickerSubscriptions = new Map();
    this.orderBookSubscriptions = new Map();
    this.riskSettings = {
      maxPositionSize: 5, // % of portfolio
      maxDrawdown: 10, // % of portfolio
      defaultStopLoss: 2, // %
      defaultTakeProfit: 6 // %
    };
  }

  // Initialize the trading engine
  async initialize() {
    console.log('Initializing trading engine...');
    
    // Fetch initial market data
    try {
      const markets = await hyperliquidService.getMarkets();
      
      // Add top markets to watchlist
      markets.slice(0, 10).forEach(market => {
        this.addToWatchlist(market.symbol);
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize trading engine:', error);
      return false;
    }
  }

  // Start the trading engine
  async start() {
    if (this.isRunning) {
      console.log('Trading engine is already running');
      return;
    }
    
    console.log('Starting trading engine...');
    
    // Connect to WebSocket for real-time data
    hyperliquidService.connectWebSocket();
    
    // Subscribe to ticker and order book updates for watchlist symbols
    this.watchlist.forEach(symbol => {
      this.subscribeToMarketData(symbol);
    });
    
    // Start active strategies
    this.strategies.forEach((strategy, id) => {
      if (strategy.isActive) {
        this.runStrategy(id);
      }
    });
    
    this.isRunning = true;
    console.log('Trading engine started');
  }

  // Stop the trading engine
  stop() {
    if (!this.isRunning) {
      console.log('Trading engine is already stopped');
      return;
    }
    
    console.log('Stopping trading engine...');
    
    // Unsubscribe from all WebSocket channels
    this.tickerSubscriptions.forEach((subscriptionId, symbol) => {
      hyperliquidService.unsubscribeFromChannel(subscriptionId);
    });
    
    this.orderBookSubscriptions.forEach((subscriptionId, symbol) => {
      hyperliquidService.unsubscribeFromChannel(subscriptionId);
    });
    
    this.tickerSubscriptions.clear();
    this.orderBookSubscriptions.clear();
    
    this.isRunning = false;
    console.log('Trading engine stopped');
  }

  // Add a trading strategy
  addStrategy(strategy) {
    if (!strategy.id) {
      strategy.id = `strategy_${Date.now()}`;
    }
    
    this.strategies.set(strategy.id, {
      ...strategy,
      lastRun: null,
      performance: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalProfit: 0,
        averageProfit: 0
      }
    });
    
    console.log(`Strategy added: ${strategy.name} (${strategy.id})`);
    return strategy.id;
  }

  // Remove a trading strategy
  removeStrategy(strategyId) {
    if (!this.strategies.has(strategyId)) {
      console.warn(`Strategy ${strategyId} not found`);
      return false;
    }
    
    this.strategies.delete(strategyId);
    console.log(`Strategy removed: ${strategyId}`);
    return true;
  }

  // Start a specific strategy
  activateStrategy(strategyId) {
    const strategy = this.strategies.get(strategyId);
    
    if (!strategy) {
      console.warn(`Strategy ${strategyId} not found`);
      return false;
    }
    
    strategy.isActive = true;
    
    if (this.isRunning) {
      this.runStrategy(strategyId);
    }
    
    console.log(`Strategy activated: ${strategy.name} (${strategyId})`);
    return true;
  }

  // Stop a specific strategy
  deactivateStrategy(strategyId) {
    const strategy = this.strategies.get(strategyId);
    
    if (!strategy) {
      console.warn(`Strategy ${strategyId} not found`);
      return false;
    }
    
    strategy.isActive = false;
    console.log(`Strategy deactivated: ${strategy.name} (${strategyId})`);
    return true;
  }

  // Run a strategy
  async runStrategy(strategyId) {
    const strategy = this.strategies.get(strategyId);
    
    if (!strategy || !strategy.isActive) {
      return;
    }
    
    console.log(`Running strategy: ${strategy.name} (${strategyId})`);
    
    // Update strategy last run timestamp
    strategy.lastRun = Date.now();
    
    // For demonstration, we'll implement a simple momentum strategy
    if (strategy.type === 'momentum') {
      this.runMomentumStrategy(strategy);
    }
  }

  // Implement a momentum strategy
  async runMomentumStrategy(strategy) {
    // Get parameters
    const { symbols, lookbackPeriod, momentumThreshold, positionSize } = strategy.parameters;
    
    // For each symbol in the strategy
    for (const symbol of symbols) {
      // Ensure we're watching this symbol
      this.addToWatchlist(symbol);
      
      // Get current ticker data
      const ticker = this.tickerData.get(symbol);
      
      if (!ticker) {
        continue; // Skip if no ticker data available
      }
      
      // In a real implementation, we would calculate momentum based on historical data
      // For demo purposes, let's simulate a momentum signal
      const momentumSignal = Math.random() > 0.5 ? 1 : -1;
      const momentumStrength = Math.random() * 2; // 0-2
      
      // Check if momentum is strong enough to trade
      if (momentumStrength > momentumThreshold) {
        if (momentumSignal > 0) {
          // Bullish momentum - consider long position
          await this.openLongPosition(symbol, positionSize, strategy.id);
        } else {
          // Bearish momentum - consider short position
          await this.openShortPosition(symbol, positionSize, strategy.id);
        }
      }
      
      // Check existing positions for this strategy and symbol
      for (const position of this.positions.values()) {
        if (position.strategyId === strategy.id && position.symbol === symbol) {
          // Check if we should close the position based on momentum reversal
          if ((position.side === 'long' && momentumSignal < 0) || 
              (position.side === 'short' && momentumSignal > 0)) {
            await this.closePosition(position.id);
          }
        }
      }
    }
  }

  // Open a long position
  async openLongPosition(symbol, size, strategyId) {
    console.log(`Opening long position: ${symbol}, size: ${size}, strategy: ${strategyId}`);
    
    try {
      // Check if we already have a position for this symbol and strategy
      for (const position of this.positions.values()) {
        if (position.strategyId === strategyId && position.symbol === symbol) {
          console.log(`Position already exists for ${symbol} in strategy ${strategyId}`);
          return null;
        }
      }
      
      // Place a market order
      const order = await hyperliquidService.placeMarketOrder(symbol, 'BUY', size);
      
      // Create a position
      const ticker = this.tickerData.get(symbol);
      const entryPrice = order.price || ticker.lastPrice;
      
      const position = {
        id: `position_${Date.now()}`,
        symbol,
        strategyId,
        side: 'long',
        size,
        entryPrice,
        currentPrice: entryPrice,
        pnl: 0,
        pnlPercent: 0,
        stopLoss: entryPrice * (1 - this.riskSettings.defaultStopLoss / 100),
        takeProfit: entryPrice * (1 + this.riskSettings.defaultTakeProfit / 100),
        openedAt: new Date(),
        updatedAt: new Date(),
        status: 'open'
      };
      
      this.positions.set(position.id, position);
      console.log(`Long position opened: ${position.id}`);
      
      return position;
    } catch (error) {
      console.error(`Failed to open long position for ${symbol}:`, error);
      return null;
    }
  }

  // Open a short position
  async openShortPosition(symbol, size, strategyId) {
    console.log(`Opening short position: ${symbol}, size: ${size}, strategy: ${strategyId}`);
    
    try {
      // Check if we already have a position for this symbol and strategy
      for (const position of this.positions.values()) {
        if (position.strategyId === strategyId && position.symbol === symbol) {
          console.log(`Position already exists for ${symbol} in strategy ${strategyId}`);
          return null;
        }
      }
      
      // Place a market order
      const order = await hyperliquidService.placeMarketOrder(symbol, 'SELL', size);
      
      // Create a position
      const ticker = this.tickerData.get(symbol);
      const entryPrice = order.price || ticker.lastPrice;
      
      const position = {
        id: `position_${Date.now()}`,
        symbol,
        strategyId,
        side: 'short',
        size,
        entryPrice,
        currentPrice: entryPrice,
        pnl: 0,
        pnlPercent: 0,
        stopLoss: entryPrice * (1 + this.riskSettings.defaultStopLoss / 100),
        takeProfit: entryPrice * (1 - this.riskSettings.defaultTakeProfit / 100),
        openedAt: new Date(),
        updatedAt: new Date(),
        status: 'open'
      };
      
      this.positions.set(position.id, position);
      console.log(`Short position opened: ${position.id}`);
      
      return position;
    } catch (error) {
      console.error(`Failed to open short position for ${symbol}:`, error);
      return null;
    }
  }

  // Close a position
  async closePosition(positionId) {
    console.log(`Closing position: ${positionId}`);
    
    const position = this.positions.get(positionId);
    
    if (!position) {
      console.warn(`Position ${positionId} not found`);
      return false;
    }
    
    try {
      // Place a market order to close the position
      const order = await hyperliquidService.placeMarketOrder(
        position.symbol,
        position.side === 'long' ? 'SELL' : 'BUY',
        position.size
      );
      
      // Update position
      position.status = 'closed';
      position.closedAt = new Date();
      position.updatedAt = new Date();
      
      // Calculate final P&L
      const exitPrice = order.price || this.tickerData.get(position.symbol).lastPrice;
      const pnl = position.side === 'long' 
        ? (exitPrice - position.entryPrice) * position.size
        : (position.entryPrice - exitPrice) * position.size;
      
      const pnlPercent = position.side === 'long'
        ? ((exitPrice / position.entryPrice) - 1) * 100
        : ((position.entryPrice / exitPrice) - 1) * 100;
      
      position.pnl = pnl;
      position.pnlPercent = pnlPercent;
      
      console.log(`Position closed: ${positionId}, P&L: ${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
      
      // Update strategy performance
      const strategy = this.strategies.get(position.strategyId);
      
      if (strategy) {
        strategy.performance.totalTrades++;
        
        if (pnl > 0) {
          strategy.performance.winningTrades++;
        } else {
          strategy.performance.losingTrades++;
        }
        
        strategy.performance.totalProfit += pnl;
        strategy.performance.averageProfit = strategy.performance.totalProfit / strategy.performance.totalTrades;
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to close position ${positionId}:`, error);
      return false;
    }
  }

  // Add a symbol to the watchlist
  addToWatchlist(symbol) {
    if (this.watchlist.has(symbol)) {
      return;
    }
    
    this.watchlist.add(symbol);
    
    if (this.isRunning) {
      this.subscribeToMarketData(symbol);
    }
    
    console.log(`Added ${symbol} to watchlist`);
  }

  // Remove a symbol from the watchlist
  removeFromWatchlist(symbol) {
    if (!this.watchlist.has(symbol)) {
      return;
    }
    
    // Unsubscribe from WebSocket channels
    if (this.tickerSubscriptions.has(symbol)) {
      hyperliquidService.unsubscribeFromChannel(this.tickerSubscriptions.get(symbol));
      this.tickerSubscriptions.delete(symbol);
    }
    
    if (this.orderBookSubscriptions.has(symbol)) {
      hyperliquidService.unsubscribeFromChannel(this.orderBookSubscriptions.get(symbol));
      this.orderBookSubscriptions.delete(symbol);
    }
    
    this.watchlist.delete(symbol);
    console.log(`Removed ${symbol} from watchlist`);
  }

  // Subscribe to market data for a symbol
  subscribeToMarketData(symbol) {
    // Subscribe to ticker updates
    const tickerSubscriptionId = hyperliquidService.subscribeToChannel(
      'ticker',
      symbol,
      (data) => this.onTickerUpdate(symbol, data)
    );
    
    this.tickerSubscriptions.set(symbol, tickerSubscriptionId);
    
    // Subscribe to order book updates
    const orderBookSubscriptionId = hyperliquidService.subscribeToChannel(
      'orderbook',
      symbol,
      (data) => this.onOrderBookUpdate(symbol, data)
    );
    
    this.orderBookSubscriptions.set(symbol, orderBookSubscriptionId);
  }

  // Handle ticker updates
  onTickerUpdate(symbol, data) {
    this.tickerData.set(symbol, data);
    
    // Update positions with the latest price
    this.positions.forEach(position => {
      if (position.symbol === symbol && position.status === 'open') {
        position.currentPrice = data.lastPrice;
        position.updatedAt = new Date();
        
        // Calculate P&L
        const pnl = position.side === 'long' 
          ? (position.currentPrice - position.entryPrice) * position.size
          : (position.entryPrice - position.currentPrice) * position.size;
        
        const pnlPercent = position.side === 'long'
          ? ((position.currentPrice / position.entryPrice) - 1) * 100
          : ((position.entryPrice / position.currentPrice) - 1) * 100;
        
        position.pnl = pnl;
        position.pnlPercent = pnlPercent;
        
        // Check stop loss and take profit
        if (position.stopLoss !== null) {
          if (position.side === 'long' && position.currentPrice <= position.stopLoss) {
            console.log(`Stop loss triggered for position ${position.id}`);
            this.closePosition(position.id);
          } else if (position.side === 'short' && position.currentPrice >= position.stopLoss) {
            console.log(`Stop loss triggered for position ${position.id}`);
            this.closePosition(position.id);
          }
        }
        
        if (position.takeProfit !== null) {
          if (position.side === 'long' && position.currentPrice >= position.takeProfit) {
            console.log(`Take profit triggered for position ${position.id}`);
            this.closePosition(position.id);
          } else if (position.side === 'short' && position.currentPrice <= position.takeProfit) {
            console.log(`Take profit triggered for position ${position.id}`);
            this.closePosition(position.id);
          }
        }
      }
    });
  }

  // Handle order book updates
  onOrderBookUpdate(symbol, data) {
    this.orderBookData.set(symbol, data);
  }

  // Get all strategies
  getStrategies() {
    return Array.from(this.strategies.values());
  }

  // Get a specific strategy
  getStrategy(strategyId) {
    return this.strategies.get(strategyId);
  }

  // Get all positions
  getPositions(status = null) {
    let positions = Array.from(this.positions.values());
    
    if (status) {
      positions = positions.filter(position => position.status === status);
    }
    
    return positions;
  }

  // Get the watchlist
  getWatchlist() {
    return Array.from(this.watchlist);
  }

  // Get ticker data for a symbol
  getTicker(symbol) {
    return this.tickerData.get(symbol);
  }

  // Get order book data for a symbol
  getOrderBook(symbol) {
    return this.orderBookData.get(symbol);
  }

  // Get risk settings
  getRiskSettings() {
    return { ...this.riskSettings };
  }

  // Update risk settings
  updateRiskSettings(settings) {
    this.riskSettings = {
      ...this.riskSettings,
      ...settings
    };
    
    console.log('Risk settings updated:', this.riskSettings);
    return this.riskSettings;
  }
}

// Create a singleton instance
const tradingEngine = new TradingEngine();

export default tradingEngine;