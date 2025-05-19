# Step-by-Step Guide to Build Hyperliquid Trader Windows Installer

This guide will walk you through the exact steps needed to build the Windows installer for Hyperliquid Trader on your Windows machine.

## Step 1: Open a Windows Command Prompt or PowerShell

Do NOT use WSL or any Linux shell. You need a native Windows command prompt or PowerShell.

## Step 2: Clone the Repository

```
git clone https://github.com/ElgourdoBaja/Hypertrader-windows-installer.git
cd Hypertrader-windows-installer
```

## Step 3: Install Required Tools 

If you don't already have them, install:

1. Node.js (from https://nodejs.org/)
2. Yarn:
   ```
   npm install -g yarn
   ```
3. Windows Build Tools (may be needed for native modules):
   ```
   npm install --global --production windows-build-tools
   ```

## Step 4: Build the Installer

There are two ways to do this:

### Option A: Using the Command Line

```
cd frontend
yarn install
yarn build:windows
```

### Option B: Using the Batch File

1. Navigate to the `frontend` folder in Windows Explorer
2. Double-click on `build-windows-installer.bat`

## Step 5: Find the Installer

After the build process completes successfully, you'll find the installer in:
```
frontend/dist/Hyperliquid-Trader-Setup-[version].exe
```

## Common Issues and Solutions

### Error: "node-gyp does not support cross-compiling native modules"
- This happens when you're not in a true Windows environment
- Make sure you're using Command Prompt or PowerShell, not WSL

### Error: "Windows Build Tools not installed"
- Run: `npm install --global --production windows-build-tools`

### Error: "electron-builder command not found"
- Run: `yarn add --dev electron-builder`

### Error: "ENOENT: no such file or directory"
- Make sure you're in the correct directory and all paths in the scripts are correct

## Need Help?

If you encounter any issues not covered here, please:
1. Check the console output for specific error messages
2. Refer to the electron-builder docs: https://www.electron.build/
3. Create an issue on the GitHub repository