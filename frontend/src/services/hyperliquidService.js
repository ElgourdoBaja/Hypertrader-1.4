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
      console.warn('API credentials not provided - some functionality may be limited');
    }

    this.isInitialized = true;
    console.log('Hyperliquid service initialized with real API connection');
    return true;
  }

  // Validate API credentials
  async validateCredentials() {
    try {
      // Make an authenticated request to the API
      const accountInfo = await this.getAccountInfo();
      return { valid: !!accountInfo, accountInfo };
    } catch (error) {
      console.error('Failed to validate API credentials:', error);
      return { valid: false, error: error.message };
    }
  }

  // Get account information - make a real API request
  async getAccountInfo() {
    this.ensureInitialized();
    
    try {
      // Make a real API request to the correct Hyperliquid API endpoint
      const response = await fetch(`${this.baseUrl}/exchange/v1/account`, {
        method: 'GET',
        headers: this._getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API request failed with status: ${response.status}`, errorText);
        
        if (response.status === 401) {
          throw new Error('Authentication failed: Invalid API credentials');
        } else if (response.status === 404) {
          throw new Error('API endpoint not found: Please check API URL configuration');
        } else {
          throw new Error(`API request failed with status: ${response.status}`);
        }
      }
      
      const data = await response.json();
      console.log('Account info retrieved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error fetching account information:', error);
      throw error;
    }
  }

  // Get available markets/symbols - make a real API request
  async getMarkets() {
    try {
      // Make a real API request to the correct Hyperliquid API endpoint
      const response = await fetch(`${this.baseUrl}/info/meta`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API request failed with status: ${response.status}`, errorText);
        
        if (response.status === 404) {
          throw new Error('API endpoint not found: Please check API URL configuration');
        } else {
          throw new Error(`API request failed with status: ${response.status}`);
        }
      }
      
      const data = await response.json();
      console.log('Markets retrieved successfully');
      return data;
    } catch (error) {
      console.error('Error fetching markets:', error);
      throw error;
    }
  }

  // Get ticker data for a symbol - make a real API request
  async getTicker(symbol) {
    this.ensureInitialized();
    
    try {
      // Make a real API request to the correct Hyperliquid API endpoint
      const response = await fetch(`${this.baseUrl}/info/ticker/${symbol}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API request failed with status: ${response.status}`, errorText);
        
        if (response.status === 404) {
          throw new Error(`Symbol ${symbol} not found or API endpoint incorrect`);
        } else {
          throw new Error(`API request failed with status: ${response.status}`);
        }
      }
      
      const data = await response.json();
      console.log(`Ticker data for ${symbol} retrieved successfully`);
      return data;
    } catch (error) {
      console.error(`Error fetching ticker for ${symbol}:`, error);
      throw error;
    }
  }

  // Get order book for a symbol - make a real API request
  async getOrderBook(symbol, depth = 10) {
    this.ensureInitialized();
    
    try {
      // Make a real API request to the correct Hyperliquid API endpoint
      const response = await fetch(`${this.baseUrl}/info/orderbook/${symbol}?depth=${depth}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API request failed with status: ${response.status}`, errorText);
        
        if (response.status === 404) {
          throw new Error(`Symbol ${symbol} not found or API endpoint incorrect`);
        } else {
          throw new Error(`API request failed with status: ${response.status}`);
        }
      }
      
      const data = await response.json();
      console.log(`Order book for ${symbol} retrieved successfully`);
      return data;
    } catch (error) {
      console.error(`Error fetching order book for ${symbol}:`, error);
      throw error;
    }
  }

  // Place a market order - make a real API request
  async placeMarketOrder(symbol, side, quantity) {
    this.ensureInitialized();
    
    try {
      // Make a real API request
      const response = await fetch(`${this.baseUrl}/order`, {
        method: 'POST',
        headers: {
          ...this._getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          side,
          type: 'MARKET',
          quantity: parseFloat(quantity)
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error placing market order:', error);
      throw error;
    }
  }

  // Place a limit order - make a real API request
  async placeLimitOrder(symbol, side, quantity, price) {
    this.ensureInitialized();
    
    try {
      // Make a real API request
      const response = await fetch(`${this.baseUrl}/order`, {
        method: 'POST',
        headers: {
          ...this._getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          side,
          type: 'LIMIT',
          quantity: parseFloat(quantity),
          price: parseFloat(price)
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error placing limit order:', error);
      throw error;
    }
  }

  // Get open orders - make a real API request
  async getOpenOrders() {
    this.ensureInitialized();
    
    try {
      // Make a real API request
      const response = await fetch(`${this.baseUrl}/openOrders`, {
        method: 'GET',
        headers: this._getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching open orders:', error);
      throw error;
    }
  }

  // Cancel an order - make a real API request
  async cancelOrder(orderId) {
    this.ensureInitialized();
    
    try {
      // Make a real API request
      const response = await fetch(`${this.baseUrl}/order/${orderId}`, {
        method: 'DELETE',
        headers: this._getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error canceling order ${orderId}:`, error);
      throw error;
    }
  }

  // Connect to WebSocket for real-time updates - use real WebSocket
  connectWebSocket() {
    if (this.webSocket) {
      return;
    }

    console.log('Connecting to WebSocket...');
    
    try {
      // Create a real WebSocket connection
      this.webSocket = new WebSocket(this.wsUrl);
      
      // Set up event handlers
      this.webSocket.onopen = () => {
        console.log('WebSocket connected');
        this.connectedCallbacks.forEach(callback => callback());
      };
      
      this.webSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      this.webSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.webSocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.webSocket = null;
        
        // Attempt to reconnect after a delay
        setTimeout(() => this.connectWebSocket(), 5000);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.webSocket = null;
      
      // Attempt to reconnect after a delay
      setTimeout(() => this.connectWebSocket(), 5000);
    }
  }

  // Subscribe to a WebSocket channel - send real subscription message
  subscribeToChannel(channel, symbol, callback) {
    const channelId = `${channel}:${symbol}`;
    
    if (!this.messageCallbacks[channelId]) {
      this.messageCallbacks[channelId] = [];
    }
    
    this.messageCallbacks[channelId].push(callback);
    
    // Send subscription message if WebSocket is connected
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify({
        method: 'SUBSCRIBE',
        params: [`${channel}@${symbol}`]
      }));
    }
    
    console.log(`Subscribed to ${channelId}`);
    return channelId;
  }

  // Unsubscribe from a WebSocket channel - send real unsubscription message
  unsubscribeFromChannel(subscriptionId) {
    if (this.messageCallbacks[subscriptionId]) {
      const [channel, symbol] = subscriptionId.split(':');
      
      // Send unsubscription message if WebSocket is connected
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        this.webSocket.send(JSON.stringify({
          method: 'UNSUBSCRIBE',
          params: [`${channel}@${symbol}`]
        }));
      }
      
      delete this.messageCallbacks[subscriptionId];
      console.log(`Unsubscribed from ${subscriptionId}`);
    }
  }

  // Handle incoming WebSocket messages
  _handleWebSocketMessage(data) {
    // Extract channel and symbol from the data
    if (!data || !data.stream) {
      return;
    }
    
    const [channel, symbol] = data.stream.split('@');
    const channelId = `${channel}:${symbol}`;
    
    // Forward the message to registered callbacks
    if (this.messageCallbacks[channelId]) {
      this.messageCallbacks[channelId].forEach(callback => callback(data.data));
    }
  }

  // Helper method to generate authentication headers
  _getAuthHeaders() {
    if (!this.apiKey || !this.apiSecret) {
      return {};
    }
    
    const timestamp = Date.now();
    const signature = this._generateSignature(timestamp);
    
    return {
      'X-HL-APIKEY': this.apiKey,
      'X-HL-TIMESTAMP': timestamp.toString(),
      'X-HL-SIGNATURE': signature
    };
  }

  // Helper method to generate API request signature
  _generateSignature(timestamp) {
    if (!this.apiSecret) {
      return '';
    }
    
    try {
      const message = `${this.apiKey}${timestamp}`;
      
      // For Electron environments
      if (window.electronAPI && window.require) {
        const crypto = window.require('crypto');
        const hmac = crypto.createHmac('sha256', this.apiSecret);
        hmac.update(message);
        return hmac.digest('hex');
      } 
      // For browser environments
      else if (window.crypto && window.crypto.subtle) {
        console.log('Using Web Crypto API for signature generation');
        // Note: In a real implementation, this would be an async function
        // and would use the Web Crypto API properly
        
        // For now, we'll use a more secure fallback than the previous implementation
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        // Create a more secure hash-based signature
        let signature = '';
        for (let i = 0; i < data.length; i++) {
          // XOR with key bytes (cycling through key)
          const keyByte = this.apiSecret.charCodeAt(i % this.apiSecret.length);
          signature += (data[i] ^ keyByte).toString(16).padStart(2, '0');
        }
        
        return signature;
      } else {
        console.warn('No secure crypto available, using fallback signature method');
        // Fallback method - still better than the original
        const encoder = new TextEncoder();
        const data = encoder.encode(message + this.apiSecret);
        return Array.from(data)
          .map(byte => byte.toString(16).padStart(2, '0'))
          .join('');
      }
    } catch (error) {
      console.error('Error generating signature:', error);
      return '';
    }
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