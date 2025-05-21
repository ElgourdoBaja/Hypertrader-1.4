# How to Enable Real API Mode

This guide will help you switch the application from demo mode (which uses simulated data) to real mode (which connects to the actual Hyperliquid API).

## Option 1: Apply the Patch File

1. Save the `real-api-mode.patch` file to your computer
2. Open a Command Prompt in your project directory
3. Run: 
   ```
   cd frontend
   git apply real-api-mode.patch
   ```
4. Restart the application:
   ```
   yarn electron:dev
   ```

## Option 2: Manual Changes

If applying the patch doesn't work, you can make the changes manually:

1. **Update the hyperliquidDataService.js file**:
   - Replace the simulated WebSocket connection with a real WebSocket implementation
   - Add request signing capabilities
   - Add real API endpoint implementations for markets, ticker, etc.

2. **Add connection testing functionality**:
   - Add a `testConnection()` method that tries to connect to the real API
   - Add an `isLiveConnection()` method that returns the current connection state

3. **Update the Settings.js file**:
   - Add a "Test Connection" button
   - Show connection status and mode indicator

4. **Update the Header.js file**:
   - Add a mode indicator that shows whether you're in LIVE or DEMO mode

## After Making Changes

1. Restart the application
2. Go to the Settings page
3. Click "Test Connection" to verify your API connection
4. A green "LIVE MODE" indicator should appear in the header if the connection is successful

## Troubleshooting

- If you encounter WebSocket errors, check your API credentials
- If you get CORS errors, check that your API keys have the proper permissions
- Make sure your system clock is accurately synchronized (for API request signatures)