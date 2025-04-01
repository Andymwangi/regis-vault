import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

/**
 * IMPORTANT QUICK FIX: If you're still seeing userId errors:
 * 
 * 1. Go to your Appwrite dashboard > Project Settings > API Keys
 * 2. Create a new API key with these permissions:
 *    - users.read
 *    - users.write
 *    - databases.read
 *    - databases.write
 * 3. Then go to Auth > Settings > Users > Configuration
 * 4. Make sure "Enable email and password authentication" is ON
 * 5. In Auth permissions, set "Users read access" and "Users write access" to "role:all"
 * 
 * This is often the quickest way to fix the "Invalid userId param" error.
 */

/**
 * IMPORTANT: Appwrite Collection Setup
 * 
 * This application requires the following collections to be set up in Appwrite:
 * 
 * 1. USERS Collection - Create this in your Appwrite dashboard with these attributes:
 *    - userId (string): The ID of the user in Appwrite's authentication system
 *    - name (string): User's full name
 *    - email (string): User's email address (should be indexed)
 *    - department (string): User's department 
 *    - role (string): User's role (admin, manager, user)
 *    - status (string): User's status (active, pending, suspended)
 *    - createdAt (string): Creation timestamp
 *    - updatedAt (string): Last update timestamp
 * 
 * 2. After creating the collection, add its ID to your .env file as:
 *    NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=your_collection_id_here
 * 
 * 3. IMPORTANT - Set Permissions for the collection:
 *    - Navigate to the collection settings
 *    - Click on the "Permissions" tab
 *    - Add these permissions:
 *      * Create documents: `role:all` (to allow user registration)
 *      * Read documents: `role:all` (to allow user profile access)
 *      * Update documents: `role:all` (to allow profile updates)
 *      * Delete documents: `role:all` or `role:admin` (depending on your requirements)
 * 
 * 4. Set the same permissions for your storage bucket and other collections (DEPARTMENTS, etc.)
 */

// Initialize the Appwrite client
const client = new Client();

// Set Appwrite endpoint and project ID - this should come from your environment variables
client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

// Initialize Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Define database and collection IDs
export const DATABASES = {
  MAIN: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '',
};

export const COLLECTIONS = {
  FILES: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION_ID || '',
  DEPARTMENTS: process.env.NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID || '',
  USERS: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || '',
  FILES_METADATA: process.env.NEXT_PUBLIC_APPWRITE_FILES_METADATA_COLLECTION_ID || '',
  OCR_RESULTS: process.env.NEXT_PUBLIC_APPWRITE_OCR_RESULTS_COLLECTION_ID || '',
  DOCUMENT_TAGS: process.env.NEXT_PUBLIC_APPWRITE_DOCUMENT_TAGS_COLLECTION_ID || '',
};

export const STORAGE_BUCKETS = {
  FILES: process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || '',
};

// Export the ID class for convenience
export { ID, Query };

// Helper function to sanitize userId for Appwrite queries
export const sanitizeUserId = (userId: string): string => {
  // Ensure userId meets Appwrite's requirements:
  // - Max 36 chars
  // - Only a-z, A-Z, 0-9, period, hyphen, and underscore allowed
  // - Can't start with a special char
  return userId.replace(/[^a-zA-Z0-9\-_.]/g, '').substring(0, 36);
};

// Helper functions for authentication
export const createAccount = async (email: string, password: string, name: string, department: string, role: string = 'user') => {
  try {
    // Create user with Appwrite's built-in method - let Appwrite handle the ID
    const newAccount = await account.create(
      'unique()', // Let Appwrite generate a unique ID
      email,
      password,
      name
    );

    // Create session (log the user in)
    await account.createSession(email, password);

    // Store the additional user data
    const user = await databases.createDocument(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS, // Using existing DEPARTMENTS collection
      'unique()', // Let Appwrite generate a unique ID
      {
        userId: newAccount.$id, // Use Appwrite's ID directly
        name,
        email,
        department,
        role,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    return { newAccount, user };
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

// Client-side version of upload file that calls the server action
export const uploadFile = async (file: File, userId: string, departmentId: string) => {
  try {
    // Upload file to storage
    const fileUpload = await storage.createFile(
      STORAGE_BUCKETS.FILES,
      ID.unique(),
      file
    );

    // Create file metadata in database
    const metadata = await databases.createDocument(
      DATABASES.MAIN,
      COLLECTIONS.FILES_METADATA,
      ID.unique(),
      {
        file_id: fileUpload.$id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        user_id: userId,
        department_id: departmentId,
        upload_date: new Date().toISOString(),
      }
    );

    // Call the server action to handle OCR processing
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      const fileUrl = storage.getFileView(STORAGE_BUCKETS.FILES, fileUpload.$id);
      // Import dynamically to avoid client-side bundling of server code
      const { initializeOCRProcessing } = await import('./server-actions');
      await initializeOCRProcessing(fileUpload.$id, fileUrl);
    }

    return { fileUpload, metadata };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Get files by department
export const getFilesByDepartment = async (departmentId: string) => {
  try {
    return await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.FILES_METADATA,
      [Query.equal('departmentId', departmentId)]
    );
  } catch (error) {
    console.error('Error getting files by department:', error);
    throw error;
  }
};

// Get departments list
export const getDepartments = async () => {
  try {
    return await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS
    );
  } catch (error) {
    console.error('Error getting departments:', error);
    throw error;
  }
};

// Helper function to get user by email
export const getUserByEmail = async (email: string) => {
  try {
    // Simply query the DEPARTMENTS collection
    const users = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS,
      [Query.equal('email', email)]
    );
    
    return users.documents.length > 0 ? users.documents[0] : null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
};

// OTP Functions
export async function sendOTP(email: string) {
  try {
    await account.createVerification(
      `${window.location.origin}/dashboard`
    );
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw error;
  }
}

export async function verifyOTP(email: string, otp: string) {
  try {
    await account.updateVerification(
      email,
      otp
    );
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw error;
  }
}

// Helper function to get user profile by Appwrite ID
export const getUserProfileById = async (appwriteUserId: string) => {
  try {
    // Simply query the DEPARTMENTS collection
    const users = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS,
      [Query.equal('userId', appwriteUserId)]
    );
    
    if (users.documents.length > 0) {
      return {
        profile: users.documents[0],
        source: 'departments'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile by ID:', error);
    throw error;
  }
};

// Add a verification function
export const verifyAppwriteSetup = async () => {
  const issues = [];
  
  // Check project ID
  if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
    issues.push("Missing Appwrite Project ID in environment variables");
  }
  
  // Check database ID
  if (!DATABASES.MAIN) {
    issues.push("Missing Appwrite Database ID in environment variables");
  }
  
  // Check for USERS or DEPARTMENTS collection
  if (!COLLECTIONS.USERS && !COLLECTIONS.DEPARTMENTS) {
    issues.push("Missing both USERS and DEPARTMENTS collection IDs");
  }
  
  // Check for storage bucket
  if (!STORAGE_BUCKETS.FILES) {
    issues.push("Missing Appwrite Storage Bucket ID");
  }
  
  // Basic connectivity test
  try {
    await account.getSession('current');
  } catch (error) {
    // Expected to fail if not logged in, but should not throw connection errors
    if (error instanceof Error && !error.message.includes('Session with the requested ID could not be found')) {
      issues.push(`Appwrite connection issue: ${error.message}`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}; 