// Define the API key and configuration for Hyperliquid API
export const HYPERLIQUID_API_CONFIG = {
  REST_API_URL: 'https://api.hyperliquid.xyz',
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
    
    // Start in demo mode by default
    this.demoMode = true;
    this.demoIntervals = [];
    this._simulateWebSocketData();
    
    // Connect to WebSocket if credentials are provided
    if (this.apiKey && this.apiSecret) {
      try {
        const connected = await this.connectWebSocket();
        if (connected) {
          // Test the actual API connection
          try {
            const response = await fetch(`${HYPERLIQUID_API_CONFIG.REST_API_URL}/info/getMetaAndAssetCtxs`, {
              method: 'GET',
              headers: HYPERLIQUID_API_CONFIG.DEFAULT_HEADERS
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data && data.universe && data.universe.length > 0) {
                // If we can connect to the real API, disable demo mode
                this.disableDemoMode();
                this._updateStatus('connected');
                return true;
              }
            }
          } catch (error) {
            console.error('API connection test failed:', error);
          }
        }
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    }
    
    // If we couldn't connect to the real API, ensure demo mode is enabled
    if (!this.isDemoActive()) {
      this.enableDemoMode();
    }
    
    return true;
  }
  
  /**
   * Check if demo mode is currently active
   * @returns {boolean} True if demo mode is active and demo data is being generated
   */
  isDemoActive() {
    return this.demoMode && this.demoIntervals && this.demoIntervals.length > 0;
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
   * Sign a request with the API secret
   * @param {Object} data - Request data to sign
   * @returns {string} Signature
   * @private
   */
  _signRequest(data) {
    try {
      // In a production app, you'd use a proper HMAC-SHA256 implementation
      // This is a simplified version for demo purposes
      const message = JSON.stringify(data);
      
      // For Electron environments, use the native crypto module
      if (window.electronAPI && window.require) {
        const crypto = window.require('crypto');
        const hmac = crypto.createHmac('sha256', this.apiSecret);
        hmac.update(message);
        return hmac.digest('hex');
      } else {
        // For browser environments, we'd need a Web Crypto API implementation
        // or a JS crypto library
        console.warn('Proper request signing not available in this environment');
        return 'demo-signature';
      }
    } catch (error) {
      console.error('Error signing request:', error);
      return 'error-signature';
    }
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
      
      // Create actual WebSocket connection
      this.ws = new WebSocket(HYPERLIQUID_API_CONFIG.WS_API_URL);
      
      this.ws.onopen = () => {
        console.log('Connected to Hyperliquid WebSocket');
        this._updateStatus('connected');
        
        // Authenticate WebSocket connection if needed
        this._authenticateWebSocket();
        
        // Reset reconnect attempts on successful connection
        this.reconnectAttempts = 0;
        this.reconnectInterval = 2000;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this._updateStatus('error');
      };
      
      this.ws.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        this._updateStatus('disconnected');
        
        // Attempt to reconnect if the connection was not closed intentionally
        if (event.code !== 1000) {
          this._attemptReconnect();
        }
      };
      
      // Wait for connection to open
      return new Promise((resolve) => {
        const checkState = () => {
          if (this.ws.readyState === WebSocket.OPEN) {
            resolve(true);
          } else if (this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
            resolve(false);
          } else {
            setTimeout(checkState, 100);
          }
        };
        
        checkState();
      });
    } catch (error) {
      this._updateStatus('error');
      console.error('Error connecting to Hyperliquid WebSocket:', error);
      
      // Attempt to reconnect
      this._attemptReconnect();
      
      return false;
    }
  }
  
  /**
   * Authenticate the WebSocket connection
   * @private
   */
  _authenticateWebSocket() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    const authMessage = {
      op: 'auth',
      data: {
        timestamp: Date.now(),
        apiKey: this.apiKey
      }
    };
    
    // Add signature
    authMessage.data.signature = this._signRequest(authMessage.data);
    
    // Send authentication message
    this.ws.send(JSON.stringify(authMessage));
  }
  
  /**
   * Handle incoming WebSocket messages
   * @param {Object} data - Parsed message data
   * @private
   */
  _handleWebSocketMessage(data) {
    if (!data || !data.type) {
      return;
    }
    
    // Handle different message types
    switch (data.type) {
      case 'ticker':
        this._handleTickerUpdate(data);
        break;
      case 'orderbook':
        this._handleOrderBookUpdate(data);
        break;
      case 'trades':
        this._handleTradesUpdate(data);
        break;
      case 'auth':
        this._handleAuthResponse(data);
        break;
      default:
        console.log('Unhandled WebSocket message type:', data.type);
    }
  }
  
  /**
   * Handle ticker updates from WebSocket
   * @param {Object} data - Ticker data
   * @private
   */
  _handleTickerUpdate(data) {
    const subscriptionId = `ticker:${data.symbol}`;
    const callback = this.subscriptions.get(subscriptionId);
    
    if (callback) {
      callback(data);
    }
  }
  
  /**
   * Handle orderbook updates from WebSocket
   * @param {Object} data - Orderbook data
   * @private
   */
  _handleOrderBookUpdate(data) {
    const subscriptionId = `orderbook:${data.symbol}`;
    const callback = this.subscriptions.get(subscriptionId);
    
    if (callback) {
      callback(data);
    }
  }
  
  /**
   * Handle trades updates from WebSocket
   * @param {Object} data - Trades data
   * @private
   */
  _handleTradesUpdate(data) {
    const subscriptionId = `trades:${data.symbol}`;
    const callback = this.subscriptions.get(subscriptionId);
    
    if (callback) {
      callback(data);
    }
  }
  
  /**
   * Handle authentication response
   * @param {Object} data - Auth response data
   * @private
   */
  _handleAuthResponse(data) {
    if (data.success) {
      console.log('WebSocket authentication successful');
    } else {
      console.error('WebSocket authentication failed:', data.message);
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
      this.ws.close(1000, 'User initiated disconnect');
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
    
    // Send subscription message to WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        op: 'subscribe',
        channel: channel,
        markets: [symbol]
      };
      
      this.ws.send(JSON.stringify(subscribeMessage));
    }
    
    console.log(`Subscribed to ${subscriptionId}`);
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from market data
   * @param {string} subscriptionId - Subscription ID to cancel
   */
  unsubscribeFromMarketData(subscriptionId) {
    if (this.subscriptions.has(subscriptionId)) {
      const [channel, symbol] = subscriptionId.split(':');
      
      // Send unsubscribe message to WebSocket
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const unsubscribeMessage = {
          op: 'unsubscribe',
          channel: channel,
          markets: [symbol]
        };
        
        this.ws.send(JSON.stringify(unsubscribeMessage));
      }
      
      this.subscriptions.delete(subscriptionId);
      console.log(`Unsubscribed from ${subscriptionId}`);
    }
  }
  
  /**
   * Make an authenticated API request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @returns {Promise<Object>} Response data
   * @private
   */
  async _apiRequest(endpoint, data = {}, method = 'GET') {
    try {
      const url = `${HYPERLIQUID_API_CONFIG.REST_API_URL}/${endpoint}`;
      
      const headers = {
        ...HYPERLIQUID_API_CONFIG.DEFAULT_HEADERS,
      };
      
      // Add API key if available
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }
      
      // Add timestamp for authenticated requests
      const timestamp = Date.now();
      const requestData = {
        ...data,
        timestamp
      };
      
      // Add signature for authenticated requests if we have an API secret
      if (this.apiSecret) {
        const signature = this._signRequest(requestData);
        headers['X-API-Signature'] = signature;
      }
      
      const requestOptions = {
        method,
        headers,
        credentials: 'omit' // Don't send cookies
      };
      
      // For GET requests, append query parameters to URL
      if (method === 'GET' && Object.keys(requestData).length > 0) {
        const queryParams = new URLSearchParams();
        Object.entries(requestData).forEach(([key, value]) => {
          queryParams.append(key, value);
        });
        const queryString = queryParams.toString();
        const urlWithParams = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
        
        // Make the GET request
        const response = await fetch(urlWithParams, requestOptions);
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } else {
        // For non-GET requests, add the data to the request body
        if (method !== 'GET') {
          requestOptions.body = JSON.stringify(requestData);
        }
        
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      }
    } catch (error) {
      this.defaultErrorHandler(error);
      throw error;
    }
  }
  
  /**
   * Fetch the list of available trading pairs
   * @returns {Promise<Array>} List of trading pairs
   */
  async getMarkets() {
    try {
      // Use the getMetaAndAssetCtxs endpoint
      const response = await fetch(`${HYPERLIQUID_API_CONFIG.REST_API_URL}/info/getMetaAndAssetCtxs`, {
        method: 'GET',
        headers: HYPERLIQUID_API_CONFIG.DEFAULT_HEADERS
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && data.universe) {
        // Transform the response into a format the app expects
        return data.universe.map(market => ({
          symbol: market.name + '-PERP',
          baseAsset: market.name,
          quoteAsset: 'USD',
          status: 'TRADING',
          minOrderSize: market.minSize || 0.001,
          tickSize: market.tickSize || 0.01,
          minNotional: market.minNotional || 1
        }));
      }
      
      // If we can't get real data, enable demo mode
      if (!this.demoMode) {
        this.enableDemoMode();
      }
      
      return [];
    } catch (error) {
      this.defaultErrorHandler(error);
      
      // If we hit an error, enable demo mode
      if (!this.demoMode) {
        this.enableDemoMode();
      }
      
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
      const coin = symbol.split('-')[0]; // Extract coin name from symbol (e.g., BTC from BTC-PERP)
      
      const response = await this._apiRequest('info/candles', {
        coin,
        interval: timeframe,
        limit
      });
      
      if (Array.isArray(response)) {
        // Transform the response into a format the app expects
        return response.map(candle => ({
          time: candle.time || candle.timestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        }));
      }
      
      return [];
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
      const coin = symbol.split('-')[0]; // Extract coin name from symbol
      
      const response = await this._apiRequest('info/ticker', { coin });
      
      if (response) {
        return {
          symbol,
          lastPrice: response.lastPrice || response.last || 0,
          bidPrice: response.bidPrice || response.bid || 0,
          askPrice: response.askPrice || response.ask || 0,
          volume: response.volume || response.baseVolume || 0,
          timestamp: response.timestamp || Date.now()
        };
      }
      
      return null;
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
      const coin = symbol.split('-')[0]; // Extract coin name from symbol
      
      const response = await this._apiRequest('info/orderbook', {
        coin,
        limit: depth
      });
      
      if (response) {
        return {
          symbol,
          bids: response.bids || [],
          asks: response.asks || [],
          timestamp: response.timestamp || Date.now()
        };
      }
      
      return null;
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
      const coin = symbol.split('-')[0]; // Extract coin name from symbol
      
      const response = await this._apiRequest('info/trades', {
        coin,
        limit
      });
      
      if (Array.isArray(response)) {
        // Transform the response into a format the app expects
        return response.map(trade => ({
          id: trade.id || `trade_${Date.now()}_${Math.random()}`,
          symbol,
          price: trade.price,
          size: trade.size || trade.amount,
          side: trade.side || (trade.buy ? 'buy' : 'sell'),
          timestamp: trade.timestamp || trade.time || Date.now()
        }));
      }
      
      return [];
    } catch (error) {
      this.defaultErrorHandler(error);
      return [];
    }
  }
  
  /**
   * Test the connection to the Hyperliquid API
   * @returns {Promise<{success: boolean, message: string}>} Test result
   */
  async testConnection() {
    try {
      // Clear demo mode
      this.disableDemoMode();
      
      // Test WebSocket connection (optional)
      // const wsConnected = await this.connectWebSocket();
      
      // Test REST API with a simple endpoint
      try {
        // Use the getMetaAndAssetCtxs endpoint directly
        const response = await fetch(`${HYPERLIQUID_API_CONFIG.REST_API_URL}/info/getMetaAndAssetCtxs`, {
          method: 'GET',
          headers: HYPERLIQUID_API_CONFIG.DEFAULT_HEADERS
        });
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data && data.universe && data.universe.length > 0) {
          const marketCount = data.universe.length;
          this._updateStatus('connected');
          
          // Successfully connected to live API
          return {
            success: true,
            message: `Connected successfully to Hyperliquid API. Found ${marketCount} markets.`,
            isLiveConnection: true
          };
        } else {
          // Fall back to demo mode
          this.enableDemoMode();
          return {
            success: false,
            message: 'Connected to API but received invalid market data. Falling back to demo mode.'
          };
        }
      } catch (apiError) {
        // API request failed, enable demo mode
        this.enableDemoMode();
        return {
          success: false,
          message: `API request failed: ${apiError.message}. Falling back to demo mode.`
        };
      }
    } catch (error) {
      // General error, enable demo mode
      this.enableDemoMode();
      return {
        success: false,
        message: `Connection test failed: ${error.message}. Falling back to demo mode.`
      };
    }
  }

  /**
   * Check if this is a live connection or demo mode
   * @returns {boolean} True if connected to real API
   */
  isLiveConnection() {
    return this.connectionStatus === 'connected' && !this.demoMode;
  }
  
  /**
   * Force demo mode for testing without API
   */
  enableDemoMode() {
    // Clear any existing demo intervals
    if (this.demoIntervals) {
      this.demoIntervals.forEach(interval => clearInterval(interval));
    }
    
    this._updateStatus('disconnected');
    this.demoMode = true;
    console.log('Demo mode enabled');
    
    // Start demo data simulation
    this._simulateWebSocketData();
  }
  
  /**
   * Disable demo mode
   */
  disableDemoMode() {
    // Clear any existing demo intervals
    if (this.demoIntervals) {
      this.demoIntervals.forEach(interval => clearInterval(interval));
      this.demoIntervals = [];
    }
    
    this.demoMode = false;
    console.log('Demo mode disabled');
  }
  
  /**
   * Simulate WebSocket data for development
   * @private
   */
  _simulateWebSocketData() {
    if (!this.demoMode) return;
    
    // Simulate ticker updates
    this.demoIntervals = this.demoIntervals || [];
    
    // Clear any existing intervals
    this.demoIntervals.forEach(interval => clearInterval(interval));
    this.demoIntervals = [];
    
    // Simulate ticker updates
    this.demoIntervals.push(setInterval(() => {
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
    }, 1000));

    // Simulate orderbook updates
    this.demoIntervals.push(setInterval(() => {
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
    }, 2000));
    
    // Simulate trade updates
    this.demoIntervals.push(setInterval(() => {
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
    }, 3000));
  }
}

// Create a singleton instance
const hyperliquidDataService = new HyperliquidDataService();

// Initialize the service with demo mode by default
hyperliquidDataService.initialize();

export default hyperliquidDataService;
