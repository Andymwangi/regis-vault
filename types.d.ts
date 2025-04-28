// Add this to a types.d.ts file in your project
import { Models } from 'node-appwrite';

// Extend Appwrite's Bucket type to include additional properties
declare module 'node-appwrite' {
  namespace Models {
    interface Bucket {
      compression: string; 
      encryption: string;
      antivirus: string;
      allowedFileExtensions: string[];
      fileSizeLimit?: number;
      maximum?: number;
      maxSize?: number;
      fileSize?: number;
      maxFileSize?: number;
      [key: string]: any; // Allow any additional properties
    }
  }
}