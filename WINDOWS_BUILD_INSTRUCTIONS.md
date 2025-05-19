# Windows Installer Build Instructions

To build the Windows installer from a native Windows environment (not WSL), follow these steps:

## Prerequisites
1. Make sure you have Node.js installed on Windows
   - Download from: https://nodejs.org/en/download/
   - Recommended version: 14.x or later

2. Make sure you have Git installed on Windows
   - Download from: https://git-scm.com/download/win

3. Make sure you have Yarn installed
   - Run in Command Prompt or PowerShell: `npm install -g yarn`

## Steps to Build the Windows Installer

1. Open Command Prompt or PowerShell as Administrator

2. Clone the repository:
   ```
   git clone https://github.com/ElgourdoBaja/Hypertrader-windows-installer.git
   cd Hypertrader-windows-installer
   ```

3. Navigate to the frontend directory:
   ```
   cd frontend
   ```

4. Install dependencies:
   ```
   yarn install
   ```

5. Build the Windows installer:
   ```
   yarn build:windows
   ```

6. The installer will be created in the `dist` folder with a name like `Hyperliquid-Trader-Setup-{version}.exe`

## Troubleshooting

If you encounter any issues:

1. Make sure you're running in a true Windows environment (not WSL)
2. Make sure you have the required build tools:
   ```
   npm install --global --production windows-build-tools
   ```
3. If you get errors about node-gyp, try:
   ```
   npm install --global node-gyp
   ```

## Alternative Method

If you prefer a simpler approach, you can use the included batch file:

1. Navigate to the frontend directory in Windows Explorer
2. Double-click on `build-windows-installer.bat`
3. Follow any prompts that appear
4. The installer will be created in the `dist` folder