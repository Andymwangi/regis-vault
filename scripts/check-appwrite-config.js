const fs = require('fs');
const path = require('path');
const { Client, Databases, Storage } = require('node-appwrite');

// Read and parse the .env.local file
function readEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?([^"'\s]+)["']?\s*$/);
      if (match) {
        envVars[match[1]] = match[2];
      }
    });
    
    return envVars;
  } catch (err) {
    console.error('Error reading .env.local file:', err.message);
    return {};
  }
}

// Check if values are defined
function checkRequiredValues(env) {
  const requiredVars = [
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT',
    'NEXT_PUBLIC_APPWRITE_DATABASE',
    'NEXT_PUBLIC_APPWRITE_FILES_COLLECTION',
    'NEXT_PUBLIC_APPWRITE_STORAGE_ID',
    'APPWRITE_API_KEY'
  ];
  
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!env[varName]) {
      missingVars.push(varName);
    }
  });
  
  return missingVars;
}

// Test connection to Appwrite
async function testAppwriteConnection(env) {
  console.log('Testing Appwrite connection...');
  
  const client = new Client()
    .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT)
    .setKey(env.APPWRITE_API_KEY);
  
  const databases = new Databases(client);
  const storage = new Storage(client);
  
  try {
    // Test database access
    console.log('Checking database access...');
    const collectionsResponse = await databases.listCollections(env.NEXT_PUBLIC_APPWRITE_DATABASE);
    console.log(`✅ Successfully connected to database. Found ${collectionsResponse.total} collections.`);
    
    // Test storage access
    console.log('Checking storage access...');
    const bucketsResponse = await storage.listBuckets();
    console.log(`✅ Successfully connected to storage. Found ${bucketsResponse.total} buckets.`);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    
    if (error.type === 'project_not_found') {
      console.log('\n⚠️ The project ID is invalid or the API key does not have access to this project.');
      console.log('Please verify your project ID and API key in the Appwrite console.');
    } else if (error.code === 401) {
      console.log('\n⚠️ Authentication failed. Your API key might be invalid or expired.');
    }
    
    return { 
      success: false, 
      error: error.message,
      type: error.type,
      code: error.code
    };
  }
}

async function main() {
  console.log('===== Appwrite Configuration Check =====');
  
  // Read environment variables
  const envVars = readEnvFile();
  
  console.log('\nAppwrite Configuration:');
  console.log('- Endpoint:', envVars.NEXT_PUBLIC_APPWRITE_ENDPOINT || '(not set)');
  console.log('- Project ID:', envVars.NEXT_PUBLIC_APPWRITE_PROJECT || '(not set)');
  console.log('- Database ID:', envVars.NEXT_PUBLIC_APPWRITE_DATABASE || '(not set)');
  console.log('- Files Collection ID:', envVars.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION || '(not set)');
  console.log('- Storage ID:', envVars.NEXT_PUBLIC_APPWRITE_STORAGE_ID || '(not set)');
  console.log('- API Key:', envVars.APPWRITE_API_KEY ? '(provided)' : '(not set)');
  
  // Check for missing variables
  const missingVars = checkRequiredValues(envVars);
  
  if (missingVars.length > 0) {
    console.log('\n❌ Missing required configuration:');
    missingVars.forEach(varName => {
      console.log(`  - ${varName}`);
    });
  } else {
    console.log('\n✅ All required configuration variables are present.');
    
    // Test connection if all variables are set
    const result = await testAppwriteConnection(envVars);
    
    if (result.success) {
      console.log('\n✅ Successfully connected to Appwrite!');
    } else {
      console.log('\n❌ Failed to connect to Appwrite.');
      
      if (result.type === 'project_not_found') {
        console.log('\nTroubleshooting steps:');
        console.log('1. Log in to your Appwrite console');
        console.log('2. Go to your project settings');
        console.log('3. Verify the Project ID matches what you have in .env.local');
        console.log('4. Regenerate your API key with the appropriate permissions');
        console.log('5. Update your .env.local file with the new values');
      }
    }
  }
  
  console.log('\n===== Configuration Check Complete =====');
}

main().catch(err => {
  console.error('Error running configuration check:', err);
}); 