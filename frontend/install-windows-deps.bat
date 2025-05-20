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
echo yarn electron:dev
echo.
pause