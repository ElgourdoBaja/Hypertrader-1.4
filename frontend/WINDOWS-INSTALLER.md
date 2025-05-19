# Hyperliquid Trader Windows Installer

This project includes a build script to generate a Windows installer for the Hyperliquid Trader application.

## Prerequisites

Before building the Windows installer, ensure you have the following:

- Node.js (version 14 or later)
- Yarn package manager
- Windows OS (for building Windows installers)
  - You can also build on macOS or Linux using Wine

## Building the Windows Installer

1. Clone this repository
2. Navigate to the frontend directory
3. Install dependencies:
   ```
   yarn install
   ```
4. Run the build script:
   ```
   yarn build:windows
   ```

The installer will be generated in the `dist` directory with the name `Hyperliquid-Trader-Setup-{version}.exe`.

## Installation Instructions

1. Double-click the installer file (`Hyperliquid-Trader-Setup-{version}.exe`)
2. Follow the installation wizard
3. Choose your preferred installation location when prompted
4. Select whether to create desktop and start menu shortcuts
5. Complete the installation

## Troubleshooting

If you encounter any issues during installation:

1. Ensure you have administrator permissions on your Windows machine
2. Check that all dependencies were correctly installed
3. Verify that your antivirus software is not blocking the installation

## License

See the LICENSE.txt file included with the application.