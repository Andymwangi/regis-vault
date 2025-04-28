// Test Appwrite API connection and permissions
require('dotenv').config();
const { Client, Account, Databases, ID, Query } = require('node-appwrite');

console.log('Testing Appwrite API connection...');

// Initialize the Appwrite SDK
const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT)
    .setKey(process.env.APPWRITE_API_KEY);

const account = new Account(client);
const databases = new Databases(client);

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE;
const usersCollectionId = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION;

const testEmail = 'test_' + Math.random().toString(36).substring(2, 8) + '@example.com';

// Test database connection
async function testDatabaseConnection() {
    console.log('\n1. Testing database connection');
    console.log(`   Database ID: ${databaseId}`);
    console.log(`   Users Collection ID: ${usersCollectionId}`);
    
    try {
        const collections = await databases.listCollections(databaseId);
        console.log(`   ✅ Connected to database! Found ${collections.total} collections.`);
        
        // Check if users collection exists
        const found = collections.collections.find(c => c.$id === usersCollectionId);
        if (found) {
            console.log(`   ✅ Users collection exists!`);
        } else {
            console.log(`   ❌ Users collection NOT found! Available collections:`);
            collections.collections.forEach(c => console.log(`      - ${c.$id} (${c.name})`));
        }
    } catch (error) {
        console.log(`   ❌ Database connection error: ${error.message}`);
        console.log('   Error details:', error);
    }
}

// Test account creation and verification
async function testAccountCreation() {
    console.log('\n2. Testing account creation');
    console.log(`   Test email: ${testEmail}`);
    
    try {
        // Create a user
        const user = await account.create(
            ID.unique(),
            testEmail,
            ID.unique(), // Random password
            testEmail.split('@')[0] // Use part of email as name
        );
        console.log(`   ✅ User created with ID: ${user.$id}`);
        
        // Test verification creation
        try {
            const verification = await account.createVerification(testEmail);
            console.log(`   ✅ Verification created! Token:`, verification);
        } catch (verifyError) {
            console.log(`   ❌ Verification creation error: ${verifyError.message}`);
            console.log('   Error details:', verifyError);
        }
        
        // Clean up - delete test user
        try {
            await account.delete(user.$id);
            console.log(`   ✅ Test user deleted`);
        } catch (deleteError) {
            console.log(`   ❌ Error deleting test user: ${deleteError.message}`);
        }
    } catch (error) {
        console.log(`   ❌ Account creation error: ${error.message}`);
        console.log('   Error details:', error);
    }
}

// Run tests
async function runTests() {
    try {
        await testDatabaseConnection();
        await testAccountCreation();
        console.log('\nTests completed!');
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

runTests(); 