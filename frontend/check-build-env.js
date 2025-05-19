const os = require('os');

// Check if the current environment is suitable for building Windows installers
function checkBuildEnvironment() {
  console.log('Checking build environment for Windows installer...');
  
  const platform = os.platform();
  
  if (platform === 'win32') {
    console.log('✅ Running on Windows - native build is supported');
    return true;
  } else {
    console.log('⚠️ Not running on Windows. You can still build using:');
    console.log('  1. Wine (on macOS/Linux)');
    console.log('  2. Docker with Windows container');
    console.log('  3. Virtual Machine with Windows');
    
    if (process.env.FORCE_BUILD) {
      console.log('FORCE_BUILD is set, continuing with build...');
      return true;
    }
    
    console.log('\nTo force the build anyway, run with:');
    console.log('  FORCE_BUILD=1 yarn build:windows');
    
    return false;
  }
}

// Export the check function for use in the build script
module.exports = { checkBuildEnvironment };

// If this script is run directly, perform the check
if (require.main === module) {
  const canBuild = checkBuildEnvironment();
  process.exit(canBuild ? 0 : 1);
}