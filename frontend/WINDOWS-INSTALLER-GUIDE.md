# Building Windows Installer for Hyperliquid Trader

This guide explains how to build a Windows installer for the Hyperliquid Trader application. The installer will package the Electron desktop application into a user-friendly Windows installer that users can download and run.

## Prerequisites

Before you start building the Windows installer, make sure you have the following:

### Required Software

1. **Windows OS** (recommended for native builds)
   - You can also build on macOS or Linux using Wine, but this may have limitations
   
2. **Node.js** (version 14 or later)
   - Download from: https://nodejs.org/

3. **Yarn Package Manager**
   - Install with: `npm install -g yarn`

4. **Git** (for cloning the repository)
   - Download from: https://git-scm.com/downloads

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install Dependencies**
   ```bash
   cd frontend
   yarn install
   ```

3. **Create or Update Assets**
   
   The Windows installer requires icon files and other assets. We've already created:
   
   - `assets/icon.ico` - The application icon
   - `assets/installer-sidebar.bmp` - The sidebar image for the installer
   
   If you want to customize these, replace the files in the assets directory.

## Building the Windows Installer

### Method 1: Using the Build Script (Windows Only)

The easiest way to build the Windows installer is to use the provided batch script:

1. Double-click `build-windows-installer.bat` in the frontend directory
2. Wait for the build process to complete
3. The installer will be available in the `dist` folder

### Method 2: Using Yarn Command

You can also build the installer using the Yarn command:

1. Open a command prompt or terminal
2. Navigate to the frontend directory
3. Run the build command:
   ```bash
   yarn build:windows
   ```
4. The installer will be available in the `dist` folder

### Method 3: Building on Non-Windows Platforms

If you're on macOS or Linux, you can still build the Windows installer using Wine:

1. Install Wine on your system
   - macOS: `brew install wine`
   - Ubuntu/Debian: `sudo apt install wine64`
   
2. Run the build with the FORCE_BUILD environment variable:
   ```bash
   FORCE_BUILD=1 yarn build:windows
   ```

## Installer Configuration

The installer is configured in the `build-windows-installer.js` file. Here are some key configuration options you can modify:

- **Product Name**: Change the application name that appears in the installer
- **Application Icon**: Specify a different icon file
- **Installer Options**: Modify NSIS options like one-click install or installation directory selection

## Troubleshooting

### Common Issues

1. **Missing dependencies**
   - Make sure to run `yarn install` before building

2. **Build fails with "node-gyp" errors**
   - On Windows, install the Build Tools: `npm install --global windows-build-tools`
   - On macOS, install XCode Command Line Tools: `xcode-select --install`

3. **Permissions issues**
   - Make sure you have write access to the output directory

4. **Icon errors**
   - Ensure icon.ico is a valid Windows icon file with multiple resolutions

### Getting Help

If you encounter issues that aren't addressed here, please:

1. Check the error logs in the console
2. Refer to the electron-builder documentation: https://www.electron.build/
3. Contact the development team for assistance

## Distribution

After building the installer, you can distribute it to users through:

1. Direct download from your website
2. Software distribution platforms
3. Enterprise deployment systems

Users can install the application by running the installer and following the on-screen instructions.

## License

This application is licensed under the terms specified in the LICENSE.txt file included with the installer.