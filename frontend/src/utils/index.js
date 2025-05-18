// utils.js
// Utility functions for the application

// Format currency values
export const formatCurrency = (value, minimumFractionDigits = 2, maximumFractionDigits = 2) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
};

// Format percent values
export const formatPercent = (value, includeSign = true, minimumFractionDigits = 2, maximumFractionDigits = 2) => {
  const sign = includeSign && value > 0 ? '+' : '';
  
  return `${sign}${value.toFixed(minimumFractionDigits)}%`;
};

// Format date
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return date.toLocaleDateString('en-US', mergedOptions);
};

// Format time
export const formatTime = (date, options = {}) => {
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return date.toLocaleTimeString('en-US', mergedOptions);
};

// Format date and time
export const formatDateTime = (date, options = {}) => {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return `${formatDate(date)} ${formatTime(date)}`;
};

// Calculate moving average
export const calculateMA = (prices, period) => {
  const result = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      result.push(sum / period);
    }
  }
  
  return result;
};

// Calculate price change
export const calculatePriceChange = (currentPrice, previousPrice) => {
  if (!previousPrice) return 0;
  
  return ((currentPrice - previousPrice) / previousPrice) * 100;
};

// Calculate Relative Strength Index (RSI)
export const calculateRSI = (prices, period = 14) => {
  const result = [];
  const changes = [];
  
  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  // Populate initial null values
  for (let i = 0; i < period; i++) {
    result.push(null);
  }
  
  // Calculate RSI values
  for (let i = period; i < changes.length; i++) {
    let gains = 0;
    let losses = 0;
    
    for (let j = i - period; j < i; j++) {
      if (changes[j] >= 0) {
        gains += changes[j];
      } else {
        losses -= changes[j];
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
  }
  
  return result;
};

// Calculate momentum
export const calculateMomentum = (prices, period = 10) => {
  const result = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      result.push(prices[i] / prices[i - period] * 100 - 100);
    }
  }
  
  return result;
};

// Calculate trading signal based on momentum
export const getMomentumSignal = (momentum, threshold = 1) => {
  if (!momentum) return 'neutral';
  
  if (momentum > threshold) {
    return 'buy';
  } else if (momentum < -threshold) {
    return 'sell';
  } else {
    return 'neutral';
  }
};

// Convert hex color to RGBA
export const hexToRgba = (hex, alpha = 1) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Format crypto amounts with appropriate precision
export const formatCryptoAmount = (amount, symbol) => {
  let precision = 8; // Default precision for most cryptocurrencies
  
  // Adjust precision based on the symbol
  if (symbol.includes('BTC')) {
    precision = 8;
  } else if (symbol.includes('ETH')) {
    precision = 6;
  } else if (symbol.includes('SOL')) {
    precision = 4;
  } else if (symbol.includes('DOGE') || symbol.includes('SHIB')) {
    precision = 2;
  }
  
  return amount.toFixed(precision);
};

// Truncate text if it's too long
export const truncateText = (text, maxLength = 30) => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return `${text.slice(0, maxLength)}...`;
};

// Sleep function for async operations
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Generate a random ID
export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Debounce function
export const debounce = (fn, delay) => {
  let timeoutId;
  
  return function(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

// Throttle function
export const throttle = (fn, delay) => {
  let lastCall = 0;
  
  return function(...args) {
    const now = new Date().getTime();
    
    if (now - lastCall < delay) {
      return;
    }
    
    lastCall = now;
    return fn.apply(this, args);
  };
};