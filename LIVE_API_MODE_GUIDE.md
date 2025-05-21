# Using Live API Mode in Hyperliquid Trader

Hyperliquid Trader now supports connecting to the real Hyperliquid API instead of using simulated data.

## How to Use Live API Mode

1. **Check Mode Indicator in Header**
   - A colored badge in the header shows whether you're in "LIVE MODE" or "DEMO MODE"
   - Green badge = Live mode (real API connection)
   - Yellow badge = Demo mode (simulated data)

2. **Test Your API Connection**
   - Go to Settings
   - Click the "Test Connection" button
   - If successful, you'll see a success message and the mode will change to LIVE MODE
   - If there's an error, check your API keys or network connection

3. **Update API Credentials**
   - If you need to update your API keys, click "Update API Credentials" in Settings
   - The app will prompt you to enter new credentials
   - Your credentials are stored securely and encrypted locally

## Features of Live Mode

When running in Live Mode:

1. **Real-time Market Data**
   - Actual market prices, not simulated prices
   - Real order book data with current ask/bid prices
   - Live trade history

2. **Real Trading**
   - Actual orders will be placed on the Hyperliquid exchange
   - Your real balance will be affected
   - Orders will be managed on the real exchange

3. **Account Status**
   - Real account balances and positions
   - Actual profit/loss calculations
   - True trading history

## Troubleshooting

- **Can't Connect to Real API**
  - Check that your API keys are valid and have the correct permissions
  - Ensure your network can connect to the Hyperliquid API
  - Confirm your system's time is properly synchronized (important for API request signing)

- **Seeing "DEMO MODE" When You Should Be in Live Mode**
  - Go to Settings and click "Test Connection"
  - Check the error message for specific issues
  - Try updating your API credentials

- **Network Errors During Trading**
  - Consider adjusting the performance settings to lower values
  - Check your network stability and latency to the Hyperliquid servers

## Important Note

When in Live Mode, you will be making real trades with real assets. Always start with small amounts while testing and be cautious when implementing automated trading strategies.

Remember that trading cryptocurrencies carries significant risk, and you should never trade with funds you cannot afford to lose.