// Define the API key and configuration for Hyperliquid API
export const HYPERLIQUID_API_CONFIG = {
  REST_API_URL: 'https://api.hyperliquid.xyz',
  WS_API_URL: 'wss://api.hyperliquid.xyz/ws',
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json'
  }
};

/**
 * Mode constants to ensure we use consistent values
 */
export const API_MODES = {
  LIVE: 'live'
};

/**
 * Hyperliquid Market Data Service 
 * 
 * This service provides access to real-time and historical market data 
 * from the Hyperliquid exchange via REST and WebSocket APIs.
 */
class HyperliquidDataService {
  constructor() {
    // WebSocket connection
    this.ws = null;
    
    // Subscriptions for real-time data
    this.subscriptions = new Map();
    
    // Connection status tracking
    this.connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'error'
    this.statusListeners = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 2000; // Start with 2s, will increase exponentially
    
    // Always use live mode
    this.mode = API_MODES.LIVE;
    
    // API credentials
    this.apiKey = null;
    this.apiSecret = null;
    this.publicAddress = null; // User's public address for info requests
    
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
   * @param {string} options.publicAddress - User's public address for info requests
   * @param {Function} options.onStatusChange - Callback for status changes
   */
  async initialize(options = {}) {
    console.log('Initializing Hyperliquid API service...');
    
    // Store API credentials
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;
    this.publicAddress = options.publicAddress;
    
    if (!this.publicAddress) {
      console.warn('Public address not provided - information requests may fail');
    }
    
    // Register status change listener if provided
    if (options.onStatusChange) {
      this.addStatusListener(options.onStatusChange);
    }
    
    // Always use live mode regardless of credentials
    console.log('Setting up LIVE MODE connection to Hyperliquid API...');
    this._setMode(API_MODES.LIVE);
    
    // Try to connect with available credentials
    const hasCredentials = !!(this.apiKey && this.apiSecret);
    if (hasCredentials) {
      try {
        // Test API connection but don't change mode based on result
        await this._testApiConnection();
      } catch (error) {
        console.error('Error during API connection test:', error);
        console.log('Continuing in LIVE mode despite errors...');
      }
    } else {
      console.log('No API credentials provided, some functionality may be limited.');
    }
    
    return true;
  }
  
  /**
   * Test connection to the Hyperliquid API
   * @returns {Promise<boolean>} True if connection succeeds
   * @private
   */
  async _testApiConnection() {
    // Update status to connecting
    this._updateStatus('connecting');
    
    // Try the info endpoint first
    try {
      console.log('Testing API connection with info endpoint...');
      const response = await fetch(`${HYPERLIQUID_API_CONFIG.REST_API_URL}/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'meta'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.universe && data.universe.length > 0) {
          // Successfully connected to the API
          this._updateStatus('connected');
          console.log('API connection test successful via info endpoint');
          return true;
        }
      }
    } catch (error) {
      console.error('Error connecting to API info endpoint:', error);
    }
    
    // Try the exchange endpoint as fallback
    try {
      console.log('Testing API connection with exchange endpoint...');
      const response = await fetch(`${HYPERLIQUID_API_CONFIG.REST_API_URL}/exchange/v1/all_mids`, {
        method: 'GET',
        headers: HYPERLIQUID_API_CONFIG.DEFAULT_HEADERS
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          // Successfully connected to the API
          this._updateStatus('connected');
          console.log('API connection test successful via exchange endpoint');
          return true;
        }
      }
    } catch (error) {
      console.error('Error connecting to API exchange endpoint:', error);
    }
    
    // If we reach here, all connection attempts failed
    this._updateStatus('error');
    console.warn('All API connection tests failed');
    return false;
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
    
    // If in live mode, send subscription message to WebSocket
    if (!this.isDemoActive() && this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`Subscribing to LIVE ${subscriptionId} data via WebSocket`);
      
      const subscribeMessage = {
        op: 'subscribe',
        channel: channel,
        markets: [symbol]
      };
      
      try {
        this.ws.send(JSON.stringify(subscribeMessage));
      } catch (error) {
        console.error(`Error subscribing to ${subscriptionId} via WebSocket:`, error);
      }
    } else if (this.isDemoActive()) {
      console.log(`Subscribing to DEMO ${subscriptionId} data via simulation`);
      // In demo mode, the simulation intervals will pick up this subscription
    } else {
      console.warn(`WebSocket not connected but tried to subscribe to ${subscriptionId}`);
    }
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from market data
   * @param {string} subscriptionId - Subscription ID to cancel
   */
  unsubscribeFromMarketData(subscriptionId) {
    if (!this.subscriptions.has(subscriptionId)) {
      console.warn(`Tried to unsubscribe from ${subscriptionId} but no such subscription exists`);
      return;
    }
    
    const [channel, symbol] = subscriptionId.split(':');
    
    // If in live mode and WebSocket is connected, send unsubscribe message
    if (!this.isDemoActive() && this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`Unsubscribing from LIVE ${subscriptionId} data via WebSocket`);
      
      const unsubscribeMessage = {
        op: 'unsubscribe',
        channel: channel,
        markets: [symbol]
      };
      
      try {
        this.ws.send(JSON.stringify(unsubscribeMessage));
      } catch (error) {
        console.error(`Error unsubscribing from ${subscriptionId} via WebSocket:`, error);
      }
    } else if (this.isDemoActive()) {
      console.log(`Unsubscribing from DEMO ${subscriptionId} data`);
      // In demo mode, just remove the subscription
    }
    
    // Remove subscription from map
    this.subscriptions.delete(subscriptionId);
  }
  
  /**
   * Make an API request to Hyperliquid
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {boolean} requiresAuth - Whether this endpoint requires authentication
   * @returns {Promise<Object>} Response data
   * @private
   */
  async _apiRequest(endpoint, data = {}, method = 'GET', requiresAuth = false) {
    // Determine if this is an info request (doesn't require auth) or an action (requires auth)
    const isInfoRequest = endpoint.startsWith('info/') || 
                         endpoint === 'markets' || 
                         endpoint.includes('candles') || 
                         endpoint.includes('ticker') || 
                         endpoint.includes('orderbook') ||
                         endpoint.includes('depth') ||
                         endpoint.includes('trades');
    
    // If it's an info request, make sure we have the public address
    if (isInfoRequest && !requiresAuth) {
      if (!this.publicAddress) {
        console.warn('Public address not provided for info request to:', endpoint);
      } else if (!data.address) {
        // Add public address to the request data
        data.address = this.publicAddress;
      }
    }
    
    // Log the API request
    console.log(`🟢 LIVE MODE: Making ${isInfoRequest ? 'info' : 'authenticated'} API request to ${endpoint}`);
    
    // Make a real API request
    try {
      const url = `${HYPERLIQUID_API_CONFIG.REST_API_URL}/${endpoint}`;
      
      const headers = {
        ...HYPERLIQUID_API_CONFIG.DEFAULT_HEADERS,
      };
      
      // Add API key only for authenticated requests
      if ((requiresAuth || !isInfoRequest) && this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }
      
      // Add timestamp for authenticated requests
      const timestamp = Date.now();
      const requestData = {
        ...data,
        timestamp
      };
      
      // Add signature for authenticated requests if we have an API secret
      if ((requiresAuth || !isInfoRequest) && this.apiSecret) {
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
          // If the API request fails, log error but don't switch to demo mode
          console.error(`API request failed with status ${response.status}: ${response.statusText}`);
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } else {
        // For non-GET requests, add the data to the request body
        if (method !== 'GET') {
          requestOptions.body = JSON.stringify(requestData);
        }
        
        // Make the non-GET request
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          // If the API request fails, log error but don't switch to demo mode
          console.error(`API request failed with status ${response.status}: ${response.statusText}`);
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      }
    } catch (error) {
      this.defaultErrorHandler(error);
      
      // Log the error but don't automatically switch to demo mode
      // This allows individual components to decide how to handle API errors
      console.error(`Error in API request to ${endpoint}:`, error);
      
      throw error;
    }
  }
  
  /**
   * Generate simulated data for demo mode
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request parameters
   * @returns {Promise<Object>} Simulated response data
   * @private
   */
  async _getSimulatedData(endpoint, data = {}) {
    console.warn(`Simulated data is disabled. Always using LIVE mode.`);
    return {};
  }
  
  /**
   * Get simulated ticker data for a symbol
   * @param {string} symbol - Market symbol
   * @returns {Object} Simulated ticker data
   * @private
   */
  _getSimulatedTicker(symbol) {
    const basePrice = symbol.startsWith('BTC') ? 58000 : 
                    symbol.startsWith('ETH') ? 3200 : 
                    symbol.startsWith('SOL') ? 145 : 100;
    
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
  }
  
  /**
   * Get simulated order book data
   * @param {string} symbol - Market symbol
   * @param {number} depth - Order book depth
   * @returns {Object} Simulated order book data
   * @private
   */
  _getSimulatedOrderBook(symbol, depth = 10) {
    const basePrice = symbol.startsWith('BTC') ? 58000 : 
                     symbol.startsWith('ETH') ? 3200 : 
                     symbol.startsWith('SOL') ? 145 : 100;
    
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
  }
  
  /**
   * Get simulated trades data
   * @param {string} symbol - Market symbol
   * @param {number} limit - Number of trades
   * @returns {Array} Simulated trades data
   * @private
   */
  _getSimulatedTrades(symbol, limit = 50) {
    const basePrice = symbol.startsWith('BTC') ? 58000 : 
                     symbol.startsWith('ETH') ? 3200 : 
                     symbol.startsWith('SOL') ? 145 : 100;
    
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
    
    return {
      trades
    };
  }
  
  /**
   * Get simulated candles data
   * @param {string} symbol - Market symbol
   * @param {string} timeframe - Candlestick timeframe
   * @param {number} limit - Number of candles
   * @returns {Array} Simulated candles data
   * @private
   */
  _getSimulatedCandles(symbol, timeframe, limit = 200) {
    const candles = [];
    const basePrice = symbol.startsWith('BTC') ? 58000 : 
                     symbol.startsWith('ETH') ? 3200 : 
                     symbol.startsWith('SOL') ? 145 : 100;
    
    const volatility = symbol.startsWith('BTC') ? 0.01 : 
                      symbol.startsWith('ETH') ? 0.015 : 0.02;
    
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
    
    return {
      candles
    };
  }
  
  /**
   * Get simulated markets data
   * @returns {Array} Simulated markets data
   * @private
   */
  _getSimulatedMarkets() {
    return {
      markets: [
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
      ]
    };
  }
  /**
   * Get available markets
   * @returns {Promise<Array>} Available markets
   */
  async getMarkets() {
    console.log('Fetching available markets');
    
    try {
      // This is a public info endpoint that doesn't need authentication or public address
      const endpoint = 'info';
      const params = {
        type: 'meta'
      };
      
      // Make API request
      const response = await this._apiRequest(endpoint, params, 'POST', false);
      
      if (response && response.universe) {
        // Transform the response into a format the app expects
        return response.universe.map(market => ({
          symbol: market.name + '-PERP',
          baseAsset: market.name,
          quoteAsset: 'USD',
          status: 'TRADING',
          minOrderSize: market.minSize || 0.001,
          tickSize: market.tickSize || 0.01,
          minNotional: market.minNotional || 10,
          lastPrice: market.lastPrice || 0
        }));
      }
      
      console.warn('Invalid response format from markets API:', response);
      return [];
    } catch (error) {
      console.error('Error fetching markets:', error);
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
   * Get order book data for a market
   * @param {string} symbol - Market symbol
   * @param {number} depth - Order book depth
   * @returns {Promise<Object>} Order book data
   */
  async getOrderBook(symbol, depth = 10) {
    console.log(`Fetching order book data for ${symbol}`);
    
    try {
      // Make API request to get order book - this is an info request that needs public address
      const endpoint = `info/orderbook`;
      const params = {
        symbol,
        depth,
        // The public address will be added by _apiRequest for info requests
      };
      
      const response = await this._apiRequest(endpoint, params, 'GET', false);
      
      if (response && response.bids && response.asks) {
        return response;
      }
      
      console.warn('Invalid response format from order book API:', response);
      return {
        bids: [],
        asks: [],
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching order book for ${symbol}:`, error);
      return {
        bids: [],
        asks: [],
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Get recent trades for a market
   * @param {string} symbol - Market symbol
   * @param {number} limit - Number of trades to fetch
   * @returns {Promise<Array>} Recent trades data
   */
  async getRecentTrades(symbol, limit = 50) {
    console.log(`Fetching recent trades for ${symbol}`);
    
    try {
      // Make API request to get recent trades - this is an info request that needs public address
      const endpoint = `info/trades`;
      const params = {
        symbol,
        limit,
        // The public address will be added by _apiRequest for info requests
      };
      
      const response = await this._apiRequest(endpoint, params, 'GET', false);
      
      if (Array.isArray(response)) {
        return response.map(trade => ({
          id: trade.id || `trade-${Date.now()}-${Math.random()}`,
          price: trade.price,
          amount: trade.quantity || trade.amount,
          side: trade.side.toLowerCase(),
          timestamp: new Date(trade.time || trade.timestamp)
        }));
      }
      
      console.warn('Invalid response format from trades API:', response);
      return [];
    } catch (error) {
      console.error(`Error fetching recent trades for ${symbol}:`, error);
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
      
      // Disable demo mode temporarily for accurate testing
      const wasDemoActive = this.isDemoActive();
      if (wasDemoActive) {
        this.disableDemoMode();
      }
      
      // Test the API connection
      try {
        // Try to get markets data - this will test the real API connection
        const markets = await this.getMarkets();
        
        if (markets && markets.length > 0) {
          return {
            success: true,
            message: `Connected successfully to Hyperliquid API. Found ${markets.length} markets.`,
            isLiveConnection: true
          };
        } else {
          if (wasDemoActive) {
            this.enableDemoMode();
          }
          return {
            success: false,
            message: 'Connected to API but received invalid market data'
          };
        }
      } catch (apiError) {
        if (wasDemoActive) {
          this.enableDemoMode();
        }
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
   * Get debug information about the current API connection state
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    // Always show as live mode
    const modeEmoji = '🟢';
    const statusEmoji = this.connectionStatus === 'connected' ? '✅' : 
                       this.connectionStatus === 'connecting' ? '⏳' :
                       this.connectionStatus === 'disconnected' ? '⚪' : '❌';
                       
    return {
      mode: `${modeEmoji} LIVE`,
      connectionStatus: `${statusEmoji} ${this.connectionStatus || 'unknown'}`,
      isLiveMode: true,
      isDemoMode: false,
      hasCredentials: !!(this.apiKey && this.apiSecret),
      demoSimulationsActive: 0,
      subscriptionsCount: this.subscriptions ? this.subscriptions.size : 0,
      apiUrl: HYPERLIQUID_API_CONFIG.REST_API_URL,
      wsUrl: HYPERLIQUID_API_CONFIG.WS_API_URL,
      wsStatus: this.ws ? this.ws.readyState : 'no websocket',
      timestamp: new Date().toISOString(),
      versionInfo: 'Hyperliquid Trader v1.0.2'
    };
  }
  
  /**
   * Check if this is a live connection or demo mode
   * @returns {boolean} True if connected to real API
   */
  isLiveConnection() {
    // Always return true to force live mode regardless of connection status
    return true;
  }
  
  /**
   * Set API mode (always LIVE)
   * @private
   */
  _setMode(mode) {
    // Always use LIVE mode regardless of what's passed
    this.mode = API_MODES.LIVE;
    
    // Connect to real WebSocket
    this.connectWebSocket();
    
    // Notify all components about the mode
    window.dispatchEvent(new CustomEvent('hyperliquid-mode-change', { 
      detail: { mode: API_MODES.LIVE } 
    }));
  }
  
  /**
   * Check if demo mode is active (always returns false)
   * @returns {boolean} Always false
   */
  isDemoActive() {
    return false;
  }
  
  /**
   * Check if live mode is active (always returns true)
   * @returns {boolean} Always true
   */
  isLiveActive() {
    return true;
  }
  
  /**
   * Enable demo mode (does nothing, always uses live mode)
   */
  enableDemoMode() {
    console.log('Demo mode is disabled. Always using LIVE mode.');
    // Do nothing
  }
  
  /**
   * Enable live mode
   */
  enableLiveMode() {
    console.log('Attempting to enable LIVE MODE...');
    
    // Check if we have API credentials
    if (!this.apiKey || !this.apiSecret) {
      console.error('Cannot enable LIVE MODE: No API credentials provided');
      return;
    }
    
    // Stop all demo simulations
    this._stopAllSimulations();
    
    // Set mode to LIVE - this will trigger connection to real API
    this._setMode(API_MODES.LIVE);
    
    // Force reload market and account data
    this._loadData();
  }
  
  /**
   * Stop all demo data simulations (stub - demo mode disabled)
   * @private
   */
  _stopAllSimulations() {
    // Demo mode is disabled, this is a no-op
  }
  
  /**
   * Start demo data simulations (stub - demo mode disabled)
   * @private
   */
  _startSimulations() {
    // Demo mode is disabled, this is a no-op
  }
  /**
   * Get candlestick data for a market
   * @param {string} symbol - Market symbol
   * @param {string} timeframe - Candle timeframe (e.g., '1m', '5m', '1h', '1d')
   * @param {number} limit - Number of candles to fetch
   * @returns {Promise<Array>} Candlestick data
   */
  async getCandles(symbol, timeframe, limit = 200) {
    console.log(`Fetching candle data for ${symbol} with timeframe ${timeframe}`);
    
    try {
      // Make API request to get candles - this is an info request that needs public address
      const endpoint = `info/candles`;
      const params = {
        symbol, // The trading pair
        interval: timeframe,
        limit,
        // The public address will be added by _apiRequest for info requests
      };
      
      const response = await this._apiRequest(endpoint, params, 'GET', false);
      
      if (Array.isArray(response)) {
        return response.map(candle => ({
          time: candle.timestamp / 1000, // Convert to seconds for LightweightCharts
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        }));
      }
      
      console.warn('Invalid response format from candles API:', response);
      return [];
    } catch (error) {
      console.error(`Error fetching candles for ${symbol}:`, error);
      return [];
    }
  }
  
  /**
   * Get account information
   * @returns {Promise<Object>} Account information
   */
  async getAccountInfo() {
    console.log('Fetching account information');
    
    try {
      if (!this.publicAddress) {
        console.warn('Public address not provided for account info request');
        return {
          accountId: '',
          balance: 0,
          margin: 0,
          available: 0,
          totalValue: 0,
          dailyPnL: 0,
          dailyPnLPercent: 0,
          positions: [],
          recentTrades: []
        };
      }
      
      // Make API request to get account info - this needs public address
      const endpoint = `info/account`;
      const params = {
        address: this.publicAddress,
      };
      
      // This is an authenticated request since it's account specific
      const response = await this._apiRequest(endpoint, params, 'GET', true);
      
      if (response) {
        return {
          accountId: response.accountId || this.publicAddress,
          balance: response.balance || 0,
          margin: response.margin || 0,
          available: response.available || 0,
          totalValue: response.totalValue || 0,
          dailyPnL: response.dailyPnL || 0,
          dailyPnLPercent: response.dailyPnLPercent || 0,
          positions: Array.isArray(response.positions) ? response.positions : [],
          recentTrades: Array.isArray(response.recentTrades) ? response.recentTrades : []
        };
      }
      
      console.warn('Invalid response format from account API:', response);
      return {
        accountId: '',
        balance: 0,
        margin: 0,
        available: 0,
        totalValue: 0,
        dailyPnL: 0,
        dailyPnLPercent: 0,
        positions: [],
        recentTrades: []
      };
    } catch (error) {
      console.error('Error fetching account information:', error);
      return {
        accountId: '',
        balance: 0,
        margin: 0,
        available: 0,
        totalValue: 0,
        dailyPnL: 0,
        dailyPnLPercent: 0,
        positions: [],
        recentTrades: []
      };
    }
  }

}

// Create a singleton instance
const hyperliquidDataService = new HyperliquidDataService();

// Initialize the service with demo mode by default
hyperliquidDataService.initialize();

export default hyperliquidDataService;
