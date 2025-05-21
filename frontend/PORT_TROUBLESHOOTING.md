# Troubleshooting Port 3000 Issues

If you encounter the error message "Something is already running on port 3000" when starting the Hyperliquid Trader application, follow these steps to resolve the issue.

## Option 1: Use the Safe Startup Script (Recommended)

The application includes a special startup script that automatically cleans up any processes using port 3000 before starting:

1. Close all instances of the application
2. Run `run-app-safe.bat` instead of the normal `run-app.bat`

This script will:
- Check for any processes using port 3000
- Terminate those processes
- Start the application with a clean environment

## Option 2: Manual Process Termination

If you prefer to handle this manually:

### Windows:

1. Open Command Prompt as Administrator
2. Run: `netstat -ano | findstr :3000`
3. Note the PID (Process ID) in the last column
4. Run: `taskkill /F /PID <PID>` (replace `<PID>` with the number you found)
5. Try starting the application again

Alternatively, you can use Task Manager:
1. Press Ctrl+Shift+Esc to open Task Manager
2. Go to the "Details" tab
3. Look for `node.exe` processes
4. Right-click and select "End task" for each one
5. Try starting the application again

### macOS/Linux:

1. Open Terminal
2. Run: `lsof -i :3000`
3. Note the PID in the second column
4. Run: `kill -9 <PID>` (replace `<PID>` with the number you found)
5. Try starting the application again

## Option 3: Change the Development Server Port

If you continue to have issues, you can change the port the application uses:

1. Open `package.json` in a text editor
2. Find the `electron:dev` script
3. Change `set PORT=3000` to use a different port (e.g., `set PORT=3001`)
4. Also update `wait-on http://localhost:3000` to match the new port
5. Open `public/electron.js` and change `devServerPort` to match your new port

## Prevention

The application now includes:
1. A confirmation dialog when closing the app
2. Automatic cleanup of development server processes on exit
3. A safe startup option that cleans up before starting

These measures should prevent most port conflict issues from occurring.