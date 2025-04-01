# Appwrite Integration Implementation

This document outlines the implementation details for integrating Appwrite authentication, database, and storage functionalities with our existing PostgreSQL-based Regis Vault application.

## Architecture Overview

We've implemented a hybrid storage solution that leverages both PostgreSQL and Appwrite:

1. **Authentication**: Fully managed by Appwrite

   - User registration and login
   - Role-based access control (admin, manager, user)
   - Department-based grouping
   - OTP verification capabilities

2. **Storage**: Hybrid approach

   - **PostgreSQL**: Stores file metadata and relationships
   - **Appwrite Storage**: Stores the actual files
   - **Appwrite Database**: Stores additional file metadata for quick queries

3. **Database**:
   - **PostgreSQL**: Used for complex relations and SQL queries
   - **Appwrite Database**: Used for user profiles and simplified queries

## Key Components

### 1. Appwrite Configuration (`src/lib/appwrite/config.ts`)

Central configuration file that initializes Appwrite services and provides utility functions for authentication, file uploads, and data retrieval.

```typescript
import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

// Initialize client and services
const client = new Client();
client.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '');
client.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Define database and collection IDs
export const DATABASES = { ... };
export const COLLECTIONS = { ... };
export const STORAGE_BUCKETS = { ... };

// Utility functions for authentication
export const createAccount = async (...) => { ... };
export const getUserByEmail = async (...) => { ... };

// File utilities
export const uploadFile = async (...) => { ... };
export const getFilesByDepartment = async (...) => { ... };
```

### 2. Authentication Components

#### Sign-Up Form (`src/components/auth/SignUpForm.tsx`)

- Collects user information including department and role
- Uses Appwrite to create user accounts
- Handles redirection based on user role

#### Sign-In Form (`src/components/auth/SignInForm.tsx`)

- Authenticates users with Appwrite
- Retrieves user profile information
- Handles role-based redirection

#### Authentication Provider (`src/components/providers/AuthProvider.tsx`)

- Provides authentication context to the application
- Manages user session state

#### Authentication Hook (`src/hooks/use-appwrite-auth.ts`)

- Custom hook for accessing authentication functions and user state

### 3. File Upload and Storage

#### File Upload Component (`src/components/dashboard/file-upload/FileUpload.tsx`)

- Allows users to select and upload files
- Uses Appwrite Storage for file upload
- Stores metadata in both PostgreSQL and Appwrite

#### File Upload API Route (`src/app/api/files/upload/route.ts`)

- Handles file upload requests
- Manages storage and metadata creation

### 4. Department Management

#### Department Utilities (`src/lib/appwrite/department-files.ts`)

- Functions for managing department-file relationships
- Provides statistics and analytics

#### Departments API Route (`src/app/api/departments/route.ts`)

- CRUD operations for departments
- Hybrid approach using both PostgreSQL and Appwrite

## Integration Benefits

1. **Simplified Authentication**: Appwrite provides a complete authentication system with OTP verification out of the box.

2. **Scalable File Storage**: Appwrite Storage automatically handles file hosting, thumbnails, and access control.

3. **Hybrid Database Approach**:

   - PostgreSQL for complex relational data and transactions
   - Appwrite for simple document-based queries

4. **Real-time Capabilities**: Potential for real-time updates using Appwrite's subscription system.

5. **Department-Based Access Control**: Users are grouped by departments, with files properly related to departments and users.

## Implementation Notes

1. **Environment Variables**: All Appwrite configuration settings are stored in environment variables.

2. **Database Schema**: The PostgreSQL schema remains largely the same, but we've added integration points for Appwrite IDs.

3. **Authentication Flow**:

   - Sign-up creates an Appwrite user and database profile
   - Sign-in creates an Appwrite session
   - Role-based redirection directs users to the proper dashboard

4. **File Storage Flow**:
   - Files are uploaded to Appwrite Storage
   - Metadata is stored in Appwrite Database for quick access
   - Relationships are maintained in PostgreSQL

## Future Enhancements

1. **Implement file versioning** using Appwrite's document history capabilities.

2. **Add real-time collaboration** features using Appwrite's realtime subscriptions.

3. **Enhance security** with additional access control rules.

4. **Implement file previews** using Appwrite's file preview capabilities.

5. **Add mobile authentication** options such as phone number verification.
