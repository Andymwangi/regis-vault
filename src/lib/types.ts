export interface User {
  id: string;
  $id: string;  // Appwrite document ID
  name: string;
  fullName?: string; // For Appwrite compatibility
  email: string;
  departmentId?: string;
  createdAt: string;
  lastLogin?: string;
  role?: 'admin' | 'user';
  avatar?: string;
  preferences?: {
    notifications: boolean;
    darkMode: boolean;
  };
} 
