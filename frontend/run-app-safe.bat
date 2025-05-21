@echo off
echo Checking for previous instances of the app...

:: Clean up any process using port 3000 (React dev server)
echo Checking for processes using port 3000...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') DO (
    echo Found process: %%P
    echo Killing process %%P...
    taskkill /F /PID %%P
    if errorlevel 1 (
        echo Failed to kill process %%P, you may need to run as administrator.
    ) else (
        echo Successfully killed process %%P
    )
)

:: Wait a moment to ensure the port is free
timeout /t 2

:: Start the app
echo Starting Hyperliquid Trader in development mode...
echo.
echo This will launch the application with the React development server.
echo.

cd /d %~dp0
call yarn electron:dev

pause