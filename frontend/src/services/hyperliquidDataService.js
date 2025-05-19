// Define the API key and configuration for Hyperliquid API
export const HYPERLIQUID_API_CONFIG = {
  REST_API_URL: 'https://api.hyperliquid.xyz/api/v1',
  WS_API_URL: 'wss://api.hyperliquid.xyz/ws',
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json'
  }
};

/**
 * Hyperliquid Market Data Service 
 * 
 * This service provides access to real-time and historical market data 
 * from the Hyperliquid exchange via REST and WebSocket APIs.
 */
class HyperliquidDataService {
  constructor() {
    this.ws = null;
    this.subscriptions = new Map();
    this.connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'error'
    this.statusListeners = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 2000; // Start with 2s, will increase exponentially
    
    // Default error handler
    this.defaultErrorHandler = (error) => {
      console.error('Hyperliquid API Error:', error);
    };
  }
  
  /**
   * Initialize the service and connect to WebSocket
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - Hyperliquid API key
   * @param {string} options.apiSecret - Hyperliquid API secret
   * @param {Function} options.onStatusChange - Callback for status changes
   */
  async initialize(options = {}) {
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;
    
    if (options.onStatusChange) {
      this.statusListeners.push(options.onStatusChange);
    }
    
    // Connect to WebSocket if credentials are provided
    if (this.apiKey && this.apiSecret) {
      return this.connectWebSocket();
    }
    
    return true;
  }
  
  /**
   * Get connection status
   * @returns {string} Current connection status
   */
  getStatus() {
    return this.connectionStatus;
  }
  
  /**
   * Add a status change listener
   * @param {Function} listener - Callback function for status changes
   */
  addStatusListener(listener) {
    if (typeof listener === 'function' && !this.statusListeners.includes(listener)) {
      this.statusListeners.push(listener);
    }
  }
  
  /**
   * Remove a status change listener
   * @param {Function} listener - Callback function to remove
   */
  removeStatusListener(listener) {
    this.statusListeners = this.statusListeners.filter(l => l !== listener);
  }
  
  /**
   * Update connection status and notify listeners
   * @param {string} status - New connection status
   * @private
   */
  _updateStatus(status) {
    this.connectionStatus = status;
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }
  
  /**
   * Connect to the Hyperliquid WebSocket API
   * @returns {Promise<boolean>} Success status
   */
  async connectWebSocket() {
    // Already connected or connecting
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return true;
    }
    
    try {
      this._updateStatus('connecting');
      
      // In a real implementation, this would use the actual WebSocket connection
      // For this prototype, we'll simulate WebSocket behavior
      console.log('Connecting to Hyperliquid WebSocket...');
      
      // Simulate successful connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;
      this.reconnectInterval = 2000;
      
      this._updateStatus('connected');
      console.log('Connected to Hyperliquid WebSocket');
      
      // Simulate receiving data
      this._simulateWebSocketData();
      
      return true;
    } catch (error) {
      this._updateStatus('error');
      console.error('Error connecting to Hyperliquid WebSocket:', error);
      
      // Attempt to reconnect
      this._attemptReconnect();
      
      return false;
    }
  }
  
  /**
   * Attempt to reconnect to WebSocket with exponential backoff
   * @private
   */
  _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Maximum WebSocket reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }
  
  /**
   * Disconnect from the WebSocket API
   */
  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this._updateStatus('disconnected');
    console.log('Disconnected from Hyperliquid WebSocket');
  }
  
  /**
   * Subscribe to market data for a specific symbol
   * @param {string} symbol - Market symbol (e.g., 'BTC-PERP')
   * @param {string} channel - Data channel ('ticker', 'trades', 'orderbook')
   * @param {Function} callback - Callback for data updates
   * @returns {string} Subscription ID
   */
  subscribeToMarketData(symbol, channel, callback) {
    const subscriptionId = `${channel}:${symbol}`;
    
    // Store subscription
    this.subscriptions.set(subscriptionId, callback);
    
    console.log(`Subscribed to ${subscriptionId}`);
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from market data
   * @param {string} subscriptionId - Subscription ID to cancel
   */
  unsubscribeFromMarketData(subscriptionId) {
    if (this.subscriptions.has(subscriptionId)) {
      this.subscriptions.delete(subscriptionId);
      console.log(`Unsubscribed from ${subscriptionId}`);
    }
  }
  
  /**
   * Simulate WebSocket data for development
   * @private
   */
  _simulateWebSocketData() {
    // Simulate ticker updates
    setInterval(() => {
      this.subscriptions.forEach((callback, subscriptionId) => {
        if (subscriptionId.startsWith('ticker:')) {
          const symbol = subscriptionId.split(':')[1];
          const basePrice = symbol === 'BTC-PERP' ? 58000 : 
                          symbol === 'ETH-PERP' ? 3200 : 
                          symbol === 'SOL-PERP' ? 145 : 100;
          
          const randomChange = (Math.random() * 2 - 1) * 0.001; // +/- 0.1%
          const price = basePrice * (1 + randomChange);
          
          const tickerData = {
            symbol,
            lastPrice: price,
            bidPrice: price * 0.9995,
            askPrice: price * 1.0005,
            volume: Math.random() * 10000,
            timestamp: Date.now()
          };
          
          callback(tickerData);
        }
      });
    }, 1000);

    // Simulate orderbook updates
    setInterval(() => {
      this.subscriptions.forEach((callback, subscriptionId) => {
        if (subscriptionId.startsWith('orderbook:')) {
          const symbol = subscriptionId.split(':')[1];
          const basePrice = symbol === 'BTC-PERP' ? 58000 : 
                          symbol === 'ETH-PERP' ? 3200 : 
                          symbol === 'SOL-PERP' ? 145 : 100;
          
          const bids = [];
          const asks = [];
          
          for (let i = 0; i < 10; i++) {
            const bidPrice = basePrice * (1 - 0.0001 * (i + 1));
            const askPrice = basePrice * (1 + 0.0001 * (i + 1));
            
            bids.push([bidPrice, Math.random() * 5]);
            asks.push([askPrice, Math.random() * 5]);
          }
          
          const orderBookData = {
            symbol,
            bids,
            asks,
            timestamp: Date.now()
          };
          
          callback(orderBookData);
        }
      });
    }, 2000);
    
    // Simulate trade updates
    setInterval(() => {
      this.subscriptions.forEach((callback, subscriptionId) => {
        if (subscriptionId.startsWith('trades:')) {
          const symbol = subscriptionId.split(':')[1];
          const basePrice = symbol === 'BTC-PERP' ? 58000 : 
                          symbol === 'ETH-PERP' ? 3200 : 
                          symbol === 'SOL-PERP' ? 145 : 100;
          
          const tradeCount = Math.floor(Math.random() * 5) + 1;
          const trades = [];
          
          for (let i = 0; i < tradeCount; i++) {
            const price = basePrice * (1 + (Math.random() * 0.002 - 0.001));
            const size = Math.random() * 2;
            const side = Math.random() > 0.5 ? 'buy' : 'sell';
            
            trades.push({
              id: `trade_${Date.now()}_${i}`,
              symbol,
              price,
              size,
              side,
              timestamp: Date.now() - i * 100
            });
          }
          
          callback(trades);
        }
      });
    }, 3000);
  }
  
  /**
   * Fetch the list of available trading pairs
   * @returns {Promise<Array>} List of trading pairs
   */
  async getMarkets() {
    try {
      // In a real implementation, this would make an API call
      // For this prototype, we'll return mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return [
        { symbol: 'BTC-PERP', baseAsset: 'BTC', quoteAsset: 'USD', status: 'TRADING', minOrderSize: 0.001, tickSize: 0.5, minNotional: 10 },
        { symbol: 'ETH-PERP', baseAsset: 'ETH', quoteAsset: 'USD', status: 'TRADING', minOrderSize: 0.01, tickSize: 0.05, minNotional: 10 },
        { symbol: 'SOL-PERP', baseAsset: 'SOL', quoteAsset: 'USD', status: 'TRADING', minOrderSize: 0.1, tickSize: 0.01, minNotional: 10 },
        { symbol: 'AVAX-PERP', baseAsset: 'AVAX', quoteAsset: 'USD', status: 'TRADING', minOrderSize: 0.1, tickSize: 0.01, minNotional: 10 },
        { symbol: 'NEAR-PERP', baseAsset: 'NEAR', quoteAsset: 'USD', status: 'TRADING', minOrderSize: 1, tickSize: 0.001, minNotional: 10 },
        { symbol: 'ATOM-PERP', baseAsset: 'ATOM', quoteAsset: 'USD', status: 'TRADING', minOrderSize: 0.1, tickSize: 0.01, minNotional: 10 },
        { symbol: 'DOT-PERP', baseAsset: 'DOT', quoteAsset: 'USD', status: 'TRADING', minOrderSize: 0.1, tickSize: 0.01, minNotional: 10 },
        { symbol: 'MATIC-PERP', baseAsset: 'MATIC', quoteAsset: 'USD', status: 'TRADING', minOrderSize: 1, tickSize: 0.0001, minNotional: 10 },
        { symbol: 'LINK-PERP', baseAsset: 'LINK', quoteAsset: 'USD', status: 'TRADING', minOrderSize: 0.1, tickSize: 0.01, minNotional: 10 },
        { symbol: 'UNI-PERP', baseAsset: 'UNI', quoteAsset: 'USD', status: 'TRADING', minOrderSize: 0.1, tickSize: 0.01, minNotional: 10 },
      ];
    } catch (error) {
      this.defaultErrorHandler(error);
      return [];
    }
  }
  
  /**
   * Fetch historical candlestick data
   * @param {string} symbol - Market symbol
   * @param {string} timeframe - Candlestick timeframe (e.g., '1h', '4h', '1d')
   * @param {number} limit - Number of candles to fetch
   * @returns {Promise<Array>} Candlestick data
   */
  async getHistoricalCandles(symbol, timeframe, limit = 200) {
    try {
      // In a real implementation, this would make an API call
      // For this prototype, we'll return mock data
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const candles = [];
      const basePrice = symbol === 'BTC-PERP' ? 58000 : 
                       symbol === 'ETH-PERP' ? 3200 : 
                       symbol === 'SOL-PERP' ? 145 : 100;
      
      const volatility = symbol === 'BTC-PERP' ? 0.01 : 
                        symbol === 'ETH-PERP' ? 0.015 : 0.02;
      
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
      for (let i = 0; i < limit; i++) {
        const time = now - (limit - i) * secondsInCandle;
        
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
      
      return candles;
    } catch (error) {
      this.defaultErrorHandler(error);
      return [];
    }
  }
  
  /**
   * Fetch ticker data for a symbol
   * @param {string} symbol - Market symbol
   * @returns {Promise<Object>} Ticker data
   */
  async getTicker(symbol) {
    try {
      // In a real implementation, this would make an API call
      // For this prototype, we'll return mock data
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const basePrice = symbol === 'BTC-PERP' ? 58000 : 
                       symbol === 'ETH-PERP' ? 3200 : 
                       symbol === 'SOL-PERP' ? 145 : 100;
      
      const randomChange = (Math.random() * 2 - 1) * 0.01; // +/- 1%
      const price = basePrice * (1 + randomChange);
      
      return {
        symbol,
        lastPrice: price,
        bidPrice: price * 0.9995,
        askPrice: price * 1.0005,
        volume: Math.random() * 10000,
        timestamp: Date.now()
      };
    } catch (error) {
      this.defaultErrorHandler(error);
      return null;
    }
  }
  
  /**
   * Fetch order book for a symbol
   * @param {string} symbol - Market symbol
   * @param {number} depth - Order book depth
   * @returns {Promise<Object>} Order book data
   */
  async getOrderBook(symbol, depth = 10) {
    try {
      // In a real implementation, this would make an API call
      // For this prototype, we'll return mock data
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const basePrice = symbol === 'BTC-PERP' ? 58000 : 
                       symbol === 'ETH-PERP' ? 3200 : 
                       symbol === 'SOL-PERP' ? 145 : 100;
      
      const bids = [];
      const asks = [];
      
      for (let i = 0; i < depth; i++) {
        const bidPrice = basePrice * (1 - 0.0001 * (i + 1));
        const askPrice = basePrice * (1 + 0.0001 * (i + 1));
        
        bids.push([bidPrice, Math.random() * 5]);
        asks.push([askPrice, Math.random() * 5]);
      }
      
      return {
        symbol,
        bids,
        asks,
        timestamp: Date.now()
      };
    } catch (error) {
      this.defaultErrorHandler(error);
      return null;
    }
  }
  
  /**
   * Fetch recent trades for a symbol
   * @param {string} symbol - Market symbol
   * @param {number} limit - Number of trades to fetch
   * @returns {Promise<Array>} Recent trades
   */
  async getRecentTrades(symbol, limit = 50) {
    try {
      // In a real implementation, this would make an API call
      // For this prototype, we'll return mock data
      await new Promise(resolve => setTimeout(resolve, 350));
      
      const basePrice = symbol === 'BTC-PERP' ? 58000 : 
                       symbol === 'ETH-PERP' ? 3200 : 
                       symbol === 'SOL-PERP' ? 145 : 100;
      
      const trades = [];
      
      for (let i = 0; i < limit; i++) {
        const price = basePrice * (1 + (Math.random() * 0.002 - 0.001));
        const size = Math.random() * 2;
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        
        trades.push({
          id: `trade_${Date.now() - i * 1000}`,
          symbol,
          price,
          size,
          side,
          timestamp: Date.now() - i * 1000
        });
      }
      
      return trades;
    } catch (error) {
      this.defaultErrorHandler(error);
      return [];
    }
  }
}

// Create a singleton instance
const hyperliquidDataService = new HyperliquidDataService();

export default hyperliquidDataService;