# Fix for Live/Demo Mode in Hyperliquid Trader

This guide explains how to fix the issue where the app shows a green "LIVE MODE" indicator but continues to use demo data.

## Changes Made

### 1. Updated Hyperliquid API Configuration

The API endpoints have been corrected to match the actual Hyperliquid API structure:

- Updated base URL from `https://api.hyperliquid.xyz/api/v1` to `https://api.hyperliquid.xyz`
- Updated endpoint paths to match Hyperliquid's API:
  - `markets` → `info/meta`
  - `klines` → `info/candles`
  - `ticker` → `info/ticker`
  - `depth` → `info/orderbook`
  - `trades` → `info/trades`

### 2. Improved API Request Handling

- Added proper query parameter handling for GET requests
- Made API key and signature headers optional
- Added better error handling and response processing

### 3. Added Proper Demo Mode Support

- Implemented `enableDemoMode()` and `disableDemoMode()` functions
- Created proper data simulation for demo mode
- Ensured app starts in demo mode by default
- Added clear distinction between live and demo modes

### 4. Added Mode Switching in Settings

- Added a "Switch to Demo Mode" / "Switch to Live Mode" button in Settings
- Improved connection status display
- Added proper handling for mode switching

## How to Use

1. **Demo Mode**: The app starts in demo mode by default
2. **Test Live Connection**: Go to Settings → Click "Test Connection"
3. **Switch Modes**: Use the "Switch to Live/Demo Mode" button in Settings

## Troubleshooting

If you still see "Connected to API but received invalid market data":
- Check that your API keys have proper permissions
- Ensure your network allows connections to the Hyperliquid API
- Verify that the API endpoints used match the current Hyperliquid API documentation

## Technical Details

The key improvement is correctly mapping our API calls to Hyperliquid's actual API structure:

1. We now use the correct base URL
2. We handle query parameters properly for GET requests
3. We transform API responses to match the format our app expects
4. We properly extract the coin name from symbols (e.g., "BTC" from "BTC-PERP")

These changes ensure that when in live mode, the app is actually using data from the Hyperliquid API instead of simulated data.