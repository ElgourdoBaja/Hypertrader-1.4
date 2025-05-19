@echo off
echo Building Hyperliquid Trader Windows Installer...
cd /d %~dp0
call yarn install
call yarn build:windows
echo Done! Check the dist folder for the installer.
pause