import { account } from "../appwrite/config";

// Define UserRole type since we're not using NextAuth anymore
type UserRole = 'admin' | 'manager' | 'user';

/**
 * Authentication options for NextAuth
 * This is a placeholder for the actual auth configuration
 * Appwrite is handling most of the authentication in this application
 */
export const authOptions = {
  callbacks: {
    async session({ session, token }: any) {
      // Add user data to session
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
        session.user.role = (token.userRole as UserRole) || 'user';
      }
      return session;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.userId = user.id;
        token.userRole = (user as any).role || 'user';
      }
      return token;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  }
};

/**
 * Helper function to check if the user is authenticated
 * Uses Appwrite's account.get() function
 */
export async function getCurrentUser() {
  try {
    const user = await account.get();
    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Helper function to check if the user has admin role
 * This should be used in combination with Appwrite's getUserProfileById
 */
export async function isAdminUser() {
  try {
    const user = await account.get();
    // Additional role check would require fetching the user profile
    // Implementation depends on your user data structure
    return !!user; // Placeholder - replace with actual admin check
  } catch (error) {
    return false;
  }
} 