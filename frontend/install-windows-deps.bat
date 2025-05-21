@echo off
echo Installing Hyperliquid Trader dependencies for Windows...
echo.
echo This script will install the dependencies without building native modules,
echo which is useful if you don't have Visual Studio Build Tools installed.
echo.

cd /d %~dp0
call yarn install --ignore-scripts

echo.
echo Dependencies installed! You can now run the application with:
echo.
echo 1. Standard mode: run-app.bat
echo 2. Safe mode (cleans up previous instances): run-app-safe.bat
echo.
echo TIP: If you encounter "port 3000 already in use" errors, use run-app-safe.bat
echo     or manually end the node.exe processes in Task Manager.
echo.
pause