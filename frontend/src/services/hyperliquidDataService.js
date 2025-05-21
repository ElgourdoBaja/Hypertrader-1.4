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
        'X-API-Key': this.apiKey
      };
      
      // Add timestamp and signature for authenticated requests
      const timestamp = Date.now();
      data.timestamp = timestamp;
      
      const signature = this._signRequest(data);
      headers['X-API-Signature'] = signature;
      
      const requestOptions = {
        method,
        headers,
        credentials: 'omit' // Don't send cookies
      };
      
      // Add request body for non-GET requests
      if (method !== 'GET') {
        requestOptions.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
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
      const response = await this._apiRequest('markets');
      return response.markets || [];
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
      const response = await this._apiRequest('klines', {
        symbol,
        interval: timeframe,
        limit
      });
      
      return response.candles || [];
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
      const response = await this._apiRequest('ticker', { symbol });
      return response;
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
      const response = await this._apiRequest('depth', {
        symbol,
        limit: depth
      });
      
      return {
        symbol,
        bids: response.bids || [],
        asks: response.asks || [],
        timestamp: response.timestamp
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
      const response = await this._apiRequest('trades', {
        symbol,
        limit
      });
      
      return response.trades || [];
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
      if (!this.apiKey || !this.apiSecret) {
        return { 
          success: false, 
          message: 'API credentials not configured'
        };
      }
      
      // Test WebSocket connection
      const wsConnected = await this.connectWebSocket();
      if (!wsConnected) {
        return {
          success: false,
          message: 'Failed to connect to WebSocket API'
        };
      }
      
      // Test REST API with a simple endpoint
      try {
        const markets = await this.getMarkets();
        if (Array.isArray(markets) && markets.length > 0) {
          return {
            success: true,
            message: `Connected successfully to Hyperliquid API. Found ${markets.length} markets.`,
            isLiveConnection: true
          };
        } else {
          return {
            success: false,
            message: 'Connected to API but received invalid market data'
          };
        }
      } catch (apiError) {
        return {
          success: false,
          message: `API request failed: ${apiError.message}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }

  /**
   * Check if this is a live connection or demo mode
   * @returns {boolean} True if connected to real API
   */
  isLiveConnection() {
    return this.connectionStatus === 'connected' && this.apiKey && this.apiSecret;
  }
}

// Create a singleton instance
const hyperliquidDataService = new HyperliquidDataService();

export default hyperliquidDataService;// Test comment
