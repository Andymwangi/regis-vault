'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Account, Client, Databases, Storage } from 'appwrite';

interface AppwriteContextType {
  client: Client;
  account: Account;
  databases: Databases;
  storage: Storage;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: any | null;
  checkAuth: () => Promise<boolean>;
}

// Default context value
const AppwriteContext = createContext<AppwriteContextType>({
  client: new Client(),
  account: new Account(new Client()),
  databases: new Databases(new Client()),
  storage: new Storage(new Client()),
  isLoading: true,
  isAuthenticated: false,
  user: null,
  checkAuth: async () => false,
});

// Hook for using Appwrite context
export const useAppwrite = () => useContext(AppwriteContext);

export const AppwriteProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

  const account = new Account(client);
  const databases = new Databases(client);
  const storage = new Storage(client);

  // Function to check authentication
  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const session = await account.getSession('current');
      
      if (session) {
        try {
          // Get account details
          const accountDetails = await account.get();
          
          // Fetch user profile from database
          const response = await fetch('/api/auth/me');
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
            return true;
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } catch (error) {
      console.error('Authentication error:', error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  const contextValue = {
    client,
    account,
    databases,
    storage,
    isLoading,
    isAuthenticated,
    user,
    checkAuth,
  };

  return (
    <AppwriteContext.Provider value={contextValue}>
      {children}
    </AppwriteContext.Provider>
  );
}; 