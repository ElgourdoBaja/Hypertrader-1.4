// hyperliquidService.js
// Service for interacting with the Hyperliquid API

class HyperliquidService {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.isInitialized = false;
    this.baseUrl = 'https://api.hyperliquid.xyz'; // Replace with actual API URL
    this.wsUrl = 'wss://api.hyperliquid.xyz/ws'; // Replace with actual WebSocket URL
    this.webSocket = null;
    this.connectedCallbacks = [];
    this.messageCallbacks = {};
  }

  // Initialize the service with credentials
  async initialize(apiKey, apiSecret) {
    if (apiKey && apiSecret) {
      this.apiKey = apiKey;
      this.apiSecret = apiSecret;
    }

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials not provided');
    }

    this.isInitialized = true;
    console.log('Hyperliquid service initialized');
    return true;
  }

  // Validate API credentials
  async validateCredentials() {
    try {
      // In a real implementation, this would make an authenticated request to the API
      // For demo purposes, just simulating a successful validation
      return { valid: true };
    } catch (error) {
      console.error('Failed to validate API credentials:', error);
      return { valid: false, error: error.message };
    }
  }

  // Get account information
  async getAccountInfo() {
    this.ensureInitialized();
    
    // Mock data for demonstration
    return {
      accountId: 'hyperliquid_account_123',
      balance: 125000,
      margin: 25000,
      available: 100000,
      positions: [
        { symbol: 'BTC-PERP', size: 0.5, entryPrice: 57800, currentPrice: 59200, pnl: 700, pnlPercent: 2.42 },
        { symbol: 'ETH-PERP', size: 5, entryPrice: 3200, currentPrice: 3280, pnl: 400, pnlPercent: 2.5 },
        { symbol: 'SOL-PERP', size: 40, entryPrice: 145, currentPrice: 142, pnl: -120, pnlPercent: -2.07 },
      ]
    };
  }

  // Get available markets/symbols
  async getMarkets() {
    // Mock data for demonstration
    return [
      { symbol: 'BTC-PERP', baseAsset: 'BTC', quoteAsset: 'USD', status: 'TRADING', minOrderSize: 0.001, tickSize: 0.5, minNotional: 10 },
      { symbol: 'ETH-PERP', baseAsset: 'ETH', quoteAsset: 'USD', status: 'TRADING', minOrderSize: 0.01, tickSize: 0.05, minNotional: 10 },
      { symbol: 'SOL-PERP', baseAsset: 'SOL', quoteAsset: 'USD', status: 'TRADING', minOrderSize: 0.1, tickSize: 0.01, minNotional: 10 },
      // ... more symbols
    ];
  }

  // Get ticker data for a symbol
  async getTicker(symbol) {
    this.ensureInitialized();
    
    // Mock data for demonstration
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
  }

  // Get order book for a symbol
  async getOrderBook(symbol, depth = 10) {
    this.ensureInitialized();
    
    // Mock data for demonstration
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
  }

  // Place a market order
  async placeMarketOrder(symbol, side, quantity) {
    this.ensureInitialized();
    
    // Mock data for demonstration
    const price = side === 'BUY' ? 
                 (symbol === 'BTC-PERP' ? 58010 : 
                  symbol === 'ETH-PERP' ? 3202 : 
                  symbol === 'SOL-PERP' ? 145.2 : 100) :
                 (symbol === 'BTC-PERP' ? 57990 : 
                  symbol === 'ETH-PERP' ? 3198 : 
                  symbol === 'SOL-PERP' ? 144.8 : 99);
    
    return {
      orderId: `order_${Date.now()}`,
      symbol,
      side,
      type: 'MARKET',
      quantity,
      price,
      status: 'FILLED',
      timestamp: Date.now()
    };
  }

  // Place a limit order
  async placeLimitOrder(symbol, side, quantity, price) {
    this.ensureInitialized();
    
    // Mock data for demonstration
    return {
      orderId: `order_${Date.now()}`,
      symbol,
      side,
      type: 'LIMIT',
      quantity,
      price,
      status: 'NEW',
      timestamp: Date.now()
    };
  }

  // Get open orders
  async getOpenOrders() {
    this.ensureInitialized();
    
    // Mock data for demonstration
    return [
      { orderId: 'order_1', symbol: 'BTC-PERP', side: 'BUY', type: 'LIMIT', quantity: 0.1, price: 57500, status: 'NEW', timestamp: Date.now() - 60000 },
      { orderId: 'order_2', symbol: 'ETH-PERP', side: 'SELL', type: 'LIMIT', quantity: 2, price: 3300, status: 'NEW', timestamp: Date.now() - 120000 },
    ];
  }

  // Cancel an order
  async cancelOrder(orderId) {
    this.ensureInitialized();
    
    // Mock data for demonstration
    return {
      orderId,
      status: 'CANCELED',
      timestamp: Date.now()
    };
  }

  // Connect to WebSocket for real-time updates
  connectWebSocket() {
    if (this.webSocket) {
      return;
    }

    // In a real implementation, this would connect to the actual WebSocket API
    // For demo purposes, we're simulating the connection
    console.log('Connecting to WebSocket...');
    
    setTimeout(() => {
      console.log('WebSocket connected');
      this.connectedCallbacks.forEach(callback => callback());
      
      // Simulate receiving WebSocket messages
      this.simulateWebSocketMessages();
    }, 1000);
  }

  // Subscribe to a WebSocket channel
  subscribeToChannel(channel, symbol, callback) {
    const channelId = `${channel}:${symbol}`;
    
    if (!this.messageCallbacks[channelId]) {
      this.messageCallbacks[channelId] = [];
    }
    
    this.messageCallbacks[channelId].push(callback);
    
    console.log(`Subscribed to ${channelId}`);
    return channelId;
  }

  // Unsubscribe from a WebSocket channel
  unsubscribeFromChannel(subscriptionId) {
    if (this.messageCallbacks[subscriptionId]) {
      delete this.messageCallbacks[subscriptionId];
      console.log(`Unsubscribed from ${subscriptionId}`);
    }
  }

  // Simulate WebSocket messages for demonstration
  simulateWebSocketMessages() {
    // Simulate ticker updates
    setInterval(() => {
      Object.keys(this.messageCallbacks).forEach(channelId => {
        if (channelId.startsWith('ticker:')) {
          const symbol = channelId.split(':')[1];
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
          
          this.messageCallbacks[channelId].forEach(callback => callback(tickerData));
        }
      });
    }, 1000);

    // Simulate order book updates
    setInterval(() => {
      Object.keys(this.messageCallbacks).forEach(channelId => {
        if (channelId.startsWith('orderbook:')) {
          const symbol = channelId.split(':')[1];
          const basePrice = symbol === 'BTC-PERP' ? 58000 : 
                           symbol === 'ETH-PERP' ? 3200 : 
                           symbol === 'SOL-PERP' ? 145 : 100;
          
          const randomChange = (Math.random() * 2 - 1) * 0.0002; // +/- 0.02%
          const midPrice = basePrice * (1 + randomChange);
          
          const bids = [];
          const asks = [];
          
          for (let i = 0; i < 5; i++) {
            const bidPrice = midPrice * (1 - 0.0001 * (i + 1));
            const askPrice = midPrice * (1 + 0.0001 * (i + 1));
            
            bids.push([bidPrice, Math.random() * 5]);
            asks.push([askPrice, Math.random() * 5]);
          }
          
          const orderBookData = {
            symbol,
            bids,
            asks,
            timestamp: Date.now()
          };
          
          this.messageCallbacks[channelId].forEach(callback => callback(orderBookData));
        }
      });
    }, 2000);
  }

  // Helper method to ensure the service is initialized
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('Hyperliquid service not initialized. Call initialize() first.');
    }
  }
}

// Create a singleton instance
const hyperliquidService = new HyperliquidService();

export default hyperliquidService;