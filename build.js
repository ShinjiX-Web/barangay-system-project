// Build script to inject environment variables into firebase-config.js
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env file not found!');
    console.error('Please copy .env.example to .env and fill in your Firebase credentials.');
    process.exit(1);
  }

  const envFile = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envFile.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  return env;
}

// Replace placeholders in firebase-config.js
function buildFirebaseConfig() {
  const env = loadEnv();
  const configPath = path.join(__dirname, 'assets', 'js', 'firebase-config.js');
  
  if (!fs.existsSync(configPath)) {
    console.error(`Error: ${configPath} not found!`);
    process.exit(1);
  }

  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Replace placeholders
  const replacements = {
    '__FIREBASE_API_KEY__': env.FIREBASE_API_KEY,
    '__FIREBASE_AUTH_DOMAIN__': env.FIREBASE_AUTH_DOMAIN,
    '__FIREBASE_PROJECT_ID__': env.FIREBASE_PROJECT_ID,
    '__FIREBASE_STORAGE_BUCKET__': env.FIREBASE_STORAGE_BUCKET,
    '__FIREBASE_MESSAGING_SENDER_ID__': env.FIREBASE_MESSAGING_SENDER_ID,
    '__FIREBASE_APP_ID__': env.FIREBASE_APP_ID
  };

  Object.keys(replacements).forEach(placeholder => {
    if (!replacements[placeholder]) {
      console.error(`Error: ${placeholder} is not defined in .env file!`);
      process.exit(1);
    }
    configContent = configContent.replace(new RegExp(placeholder, 'g'), replacements[placeholder]);
  });

  // Write to a build output directory or overwrite the original
  const outputPath = path.join(__dirname, 'public', 'assets', 'js', 'firebase-config.js');
  const outputDir = path.dirname(outputPath);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, configContent);
  console.log('✓ Firebase config built successfully!');
  console.log(`  Output: ${outputPath}`);
}

buildFirebaseConfig();
