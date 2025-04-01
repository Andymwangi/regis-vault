# Appwrite Integration Setup Guide

This guide explains how to set up Appwrite for authentication, database, and storage in the Regis Vault application.

## Prerequisites

1. Create an Appwrite account at [cloud.appwrite.io](https://cloud.appwrite.io) or set up a self-hosted Appwrite instance
2. Install the Appwrite SDK in your project:
   ```bash
   npm install appwrite
   ```

## Step 1: Create a Project in Appwrite

1. Log in to your Appwrite Console
2. Click on "Create Project"
3. Name your project (e.g., "Regis Vault")
4. Click "Create"
5. Add your app's platform:
   - Click "Add platform"
   - Choose "Web App"
   - Enter your app's domain (for local development: `localhost`)
   - Click "Next" and "Add"

## Step 2: Set Up Appwrite Services

### Create a Database

1. In the Appwrite Console, navigate to Databases
2. Click "Create Database"
3. Name your database (e.g., "regis_vault_db")
4. Set the appropriate permissions
5. Click "Create"

### Create Collections

Create the following collections in your database:

#### 1. Departments Collection

1. Click "Create Collection"
2. Name: "departments"
3. Add the following attributes:
   - `userId` (String, required) - Appwrite User ID
   - `name` (String, required) - User's name
   - `email` (String, required) - User's email
   - `department` (String, required) - Department name
   - `role` (String, required) - User role: "admin", "manager", or "user"
   - `status` (String, required) - "active", "pending", or "suspended"
   - `createdAt` (String, required) - Creation timestamp
   - `updatedAt` (String, required) - Update timestamp
4. Set appropriate indexes (email should be indexed)
5. Set appropriate permissions

#### 2. Files Metadata Collection

1. Click "Create Collection"
2. Name: "files_metadata"
3. Add the following attributes:
   - `name` (String, required) - File name
   - `type` (String, required) - File type/MIME type
   - `size` (Number, required) - File size in bytes
   - `storageFileId` (String, required) - Reference to the file in Appwrite Storage
   - `userId` (String, required) - User who uploaded the file
   - `departmentId` (String, required) - Department the file belongs to
   - `status` (String, required) - "active" or "deleted"
   - `url` (String, required) - URL to access the file
   - `createdAt` (String, required) - Creation timestamp
   - `updatedAt` (String, required) - Update timestamp
4. Set appropriate indexes
5. Set appropriate permissions

#### 3. Files Collection (for Activity Logs)

1. Click "Create Collection"
2. Name: "files"
3. Add the following attributes:
   - `userId` (String, required) - User who performed the action
   - `action` (String, required) - Type of action performed
   - `details` (String, required) - Description of the action
   - `fileId` (String, optional) - Related file ID if applicable
   - `createdAt` (String, required) - Timestamp when the action occurred
4. Set appropriate indexes
5. Set appropriate permissions

### Create Storage Bucket

1. Navigate to Storage in the Appwrite Console
2. Click "Create Bucket"
3. Name: "files_bucket"
4. Set appropriate permissions
5. Maximum file size: 50MB (or your preferred limit)
6. Allowed file extensions: pdf, doc, docx, xls, xlsx, ppt, pptx, jpg, jpeg, png, txt (and any other formats you need)
7. Click "Create"

## Step 3: Configure Your Environment

Update your `.env.local` file with your Appwrite configuration:

```
# PostgreSQL Database URL (for file metadata)
DATABASE_URL=postgres://user:password@localhost:5432/regis_vault

# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_FILES_COLLECTION_ID=your-files-collection-id
NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID=your-departments-collection-id
NEXT_PUBLIC_APPWRITE_FILES_METADATA_COLLECTION_ID=your-files-metadata-collection-id
NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=your-storage-bucket-id

# File Upload Settings
MAX_FILE_SIZE_MB=50
ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,txt
```

Replace the placeholder values with your actual Appwrite project details.

## Step 4: Testing the Integration

1. Start your application:

   ```bash
   npm run dev
   ```

2. Test the authentication flow:

   - Sign up with a new account
   - Sign in with the created account
   - Verify that you can access the correct dashboard based on the role

3. Test file uploads:
   - Upload files through the file upload component
   - Verify files are stored in Appwrite Storage
   - Verify metadata is stored in both PostgreSQL and Appwrite Database

## Architecture Overview

This implementation uses a hybrid approach:

1. **Authentication**: Fully handled by Appwrite

   - User registration and login
   - Role-based access control
   - Session management

2. **Storage**: Hybrid approach

   - Files are stored in Appwrite Storage
   - Basic file metadata in Appwrite Database
   - Comprehensive metadata and relationships in PostgreSQL

3. **Database**:
   - PostgreSQL: Used for complex relations and queries
   - Appwrite Database: Used for user profiles and basic file metadata

This architecture allows you to:

- Leverage Appwrite's authentication and storage capabilities
- Maintain complex data relationships in PostgreSQL
- Scale file storage independently from relational data

## Troubleshooting

- If authentication fails, check your Appwrite project's API keys and permissions
- Ensure your web app platform is configured correctly in Appwrite
- Check if all environment variables are set correctly
- Verify that collections and attributes are created with the correct names and types
- For local development, ensure localhost is added as a platform in Appwrite
