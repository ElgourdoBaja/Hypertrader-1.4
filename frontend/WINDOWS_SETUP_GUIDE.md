# Hyperliquid Trader Windows Setup Guide

This guide provides different options for setting up and running the Hyperliquid Trader application on Windows.

## Prerequisites

- Node.js (version 14 or higher): [Download from nodejs.org](https://nodejs.org/)
- Yarn package manager: `npm install -g yarn`

## Option 1: Quick Start (Without Native Modules)

If you don't have Visual Studio Build Tools installed, you can use this simpler approach:

1. **Clone the repository**
   ```
   git clone https://github.com/ElgourdoBaja/Hypertrader-windows-installer.git
   cd Hypertrader-windows-installer\frontend
   ```

2. **Run the installation batch file**
   - Double-click on `install-windows-deps.bat`
   - This will install dependencies while skipping native module builds

3. **Run the application**
   - Double-click on `run-app.bat`
   - Or run: `yarn electron:dev`

## Option 2: Full Installation (With Native Modules)

If you need full functionality including SQLite support:

1. **Install Visual Studio Build Tools**
   - Download from: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - During installation, select "Desktop development with C++"

2. **Clone the repository**
   ```
   git clone https://github.com/ElgourdoBaja/Hypertrader-windows-installer.git
   cd Hypertrader-windows-installer\frontend
   ```

3. **Install dependencies**
   ```
   yarn install
   ```

4. **Run the application**
   ```
   yarn electron:dev
   ```

## Option 3: Building a Windows Installer

To create a Windows installer for distribution:

1. Follow the steps in Option 2 to set up your development environment
2. Run: `yarn build:windows`
3. The installer will be created in the `dist` folder

Alternatively, you can double-click on `build-windows-installer.bat`

## Troubleshooting

### Common Issues

1. **Error about node-gyp or Visual Studio**
   - This happens if you're missing Visual Studio Build Tools
   - Either install the tools as described in Option 2, or use Option 1 to skip native module builds

2. **Error about BROWSER variable**
   - This is fixed in the updated package.json

3. **Application doesn't start**
   - Check that you've installed all dependencies
   - Try running `yarn electron:start` as an alternative

### Need Help?

If you encounter issues not covered here:
1. Check the console output for specific error messages
2. Refer to the Electron documentation: https://www.electronjs.org/docs
3. Create an issue on the GitHub repository