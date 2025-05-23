# Fix for Demo Mode Not Switching to Live Mode

There's a bug in the application that prevents it from switching from demo mode to live mode. The issue is that the Settings.js file is trying to call a method that doesn't exist (`disableDemoMode()`), when it should be calling `enableLiveMode()`.

## How to Apply the Fix

### Option 1: Edit the file manually

1. Open the file `frontend/src/components/settings/Settings.js`
2. Find line 210 (approximately) that contains:
   ```javascript
   hyperliquidDataService.disableDemoMode();
   ```
3. Change it to:
   ```javascript
   hyperliquidDataService.enableLiveMode();
   ```
4. Save the file and restart the application

### Option 2: Apply the patch file

1. Save the `demo-mode-fix.patch` file to your computer
2. Open a Command Prompt in your project directory
3. Run: `git apply demo-mode-fix.patch`
4. Restart the application

## How to Use Live Mode

After applying the fix:

1. Go to the Settings page via the sidebar
2. In the API Settings card, click on the "Switch to Live Mode" button
3. The app will attempt to connect to the Hyperliquid API with your credentials
4. Once connected, you should see real data instead of demo data

## Verify It's Working

To verify that you're seeing real data:
1. Check the Settings page - it should say "Running in LIVE mode with real API connection"
2. The market data should reflect actual current cryptocurrency prices
3. The debug info should show "Live Mode: true" and "Demo Mode: false"