@echo off
echo Starting Hyperliquid Trader in development mode...
echo.
echo This will launch the application with the React development server.
echo.

cd /d %~dp0
call yarn electron:dev

pause