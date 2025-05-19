# Hyperliquid High-Frequency Trading Application

A desktop application for automated high-frequency trading on Hyperliquid exchange, with a focus on momentum strategies.

## Features

### Core Trading Features
- **Automated Trading**: Set up momentum trading strategies and execute them automatically
- **Real-time Market Data**: Live price and order book data for top 200 cryptocurrencies by volume
- **Risk Management**: Control maximum position size, drawdown limits, and automated stop-loss
- **Manual Order Entry**: Place trades manually when needed with the order entry form

### Advanced Features
- **Strategy Management**: Create, test, and deploy multiple trading strategies
- **Position Management**: View and manage your open positions with risk analytics
- **Performance Analysis**: Track your trading performance with detailed metrics and charts
- **Backtesting**: Test strategies against historical data before deploying them live

### Technical Highlights
- **Low Latency**: Built as a desktop application for optimal performance
- **Secure Credentials**: Local encryption of API keys for security
- **Resource Optimized**: Designed to run efficiently on modest hardware (8GB RAM Windows laptops)
- **Professional Charts**: Advanced technical charts powered by Lightweight Charts

## System Requirements

- Windows 10 or 11
- 8GB RAM (minimum)
- SSD storage recommended
- Internet connection
- Hyperliquid exchange account with API credentials

## Installation

### Option 1: Install from Prebuilt Package

1. Download the latest installer (.exe) from the [Releases](https://github.com/username/hyperliquid-trader/releases) page
2. Run the installer and follow the on-screen instructions
3. Launch the application from the Start menu or desktop shortcut

### Option 2: Build from Source

1. Clone the repository:
   ```
   git clone https://github.com/username/hyperliquid-trader.git
   cd hyperliquid-trader
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build and package the application:
   ```
   node package.js
   ```

4. Find the installer in the `dist` folder

## Getting Started

1. **API Setup**:
   - Log in to your Hyperliquid account
   - Navigate to API Management
   - Create a new API key with trading permissions
   - Copy the API key and secret

2. **Application Setup**:
   - Launch the Hyperliquid Trader application
   - Enter your API credentials when prompted
   - The dashboard will load after successful authentication

3. **Configure Trading Strategies**:
   - Navigate to the Strategies page
   - Select a strategy type (Momentum is default)
   - Adjust parameters like lookback period, momentum threshold, etc.
   - Enable the strategy when ready

4. **Monitor Your Portfolio**:
   - Use the Dashboard for a high-level overview
   - Check Positions for detailed information on open trades
   - View Performance for detailed analytics on your trading history

## Features Guide

### Dashboard
The Dashboard provides a quick overview of your portfolio, recent trades, and key metrics.

### Trading
The Trading page allows you to:
- Monitor real-time price charts
- View order book and recent trades
- Place manual orders when needed
- Select which symbols to trade

### Positions
The Positions page shows:
- All open positions with detailed information
- Risk metrics for each position
- Portfolio allocation and margin utilization
- Option to close or modify positions

### Strategies
The Strategies page lets you:
- Create and manage trading strategies
- Configure momentum and breakout strategies
- Control risk parameters
- Enable/disable strategies

### Backtesting
The Backtesting page allows you to:
- Test strategies against historical data
- View detailed performance metrics
- Analyze risk statistics
- Optimize strategy parameters

### Performance
The Performance page provides:
- Equity curve and drawdown charts
- Monthly returns analysis
- Trade statistics
- Instrument performance breakdown

### Settings
The Settings page allows you to:
- Update API credentials
- Configure application preferences
- Set notification options
- Manage data storage

## FAQ

**Q: Is this application officially affiliated with Hyperliquid?**  
A: No, this is an independent trading client for Hyperliquid's public API.

**Q: Can I run this on Mac or Linux?**  
A: While the application is optimized for Windows, you can build it for Mac or Linux from source with minor modifications.

**Q: How secure are my API keys?**  
A: API keys are stored locally with encryption. They are never transmitted or stored on any external servers.

**Q: Does this application work with other exchanges?**  
A: No, it's specifically designed for Hyperliquid. Supporting other exchanges would require significant modifications.

## Support and Issues

If you encounter any issues or have questions:
1. Check the [GitHub Issues](https://github.com/username/hyperliquid-trader/issues) page
2. Create a new issue with detailed information if needed
3. For urgent support, contact the developer directly

## License

This project is licensed under the MIT License - see the LICENSE file for details.
