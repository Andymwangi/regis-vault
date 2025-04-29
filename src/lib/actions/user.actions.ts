"use server";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { fullConfig } from "@/lib/appwrite/config";
import { Query, ID } from "node-appwrite";
import { parseStringify } from "@/lib/utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "@/constants";
import { redirect } from "next/navigation";
import { deleteCookie } from "@/lib/appwrite/cookie-utils";
import { sendMagicLink } from "@/lib/actions/email.actions";
import { revalidatePath } from 'next/cache';

const handleError = (error: unknown, message: string) => {
  console.error(`${message}:`, error);
  throw error;
};

export const createAccount = async ({
  email,
  name,
  department = "",
  role = "user",
  redirectTo = "/dashboard"
}: {
  email: string;
  name: string;
  department?: string;
  role?: string;
  redirectTo?: string;
}) => {
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      console.log("User already exists, sending sign-in magic link");
      
      // Send magic link for sign-in instead
      const emailResult = await sendMagicLink(email, "sign-in", redirectTo);
      if (!emailResult.success) {
        throw new Error(emailResult.error || "Failed to send magic link");
      }
      
      return { success: true, message: "Magic link sent to your email" };
    }

    // Create new account
    const result = await createAccountServer(email, name, department, role);
    if (!result?.success) throw new Error("Failed to create account");

    // Send magic link for account verification
    const emailResult = await sendMagicLink(email, "sign-up", redirectTo);
    if (!emailResult.success) {
      throw new Error(emailResult.error || "Failed to send magic link");
    }

    return { success: true, message: "Magic link sent to your email" };
  } catch (error) {
    handleError(error, "Failed to create account");
  }
};

export const signOut = async () => {
  try {
    await deleteCookie("session");
    revalidatePath("/");
    redirect("/sign-in");
  } catch (error) {
    handleError(error, "Failed to sign out");
  }
};

export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}) => {
  try {
    // This function is being replaced by verifyOTP in server-actions.ts
    // Use it directly from there instead
    throw new Error("This function is deprecated");
  } catch (error) {
    handleError(error, "Failed to verify OTP");
  }
};

export const getCurrentUser = async () => {
  try {
    const sessionClient = await createSessionClient();
    if (!sessionClient) return null;
    
    const userData = sessionClient.user;
    
    // Get user settings
    const { databases } = await createAdminClient();
    const settings = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.userSettingsCollectionId,
      [Query.equal('userId', [userData.$id])]
    );
    
    // Get department details if assigned
    let department = null;
    if (userData.department) {
      try {
        // Validate department ID format
        const validIdRegex = /^[a-zA-Z0-9]{1,36}$/;
        if (validIdRegex.test(userData.department)) {
          const deptResult = await databases.getDocument(
            fullConfig.databaseId,
            fullConfig.departmentsCollectionId,
            userData.department
          );
          department = deptResult;
        } else {
          console.error('Invalid department ID format:', userData.department);
          // Clear the invalid department ID
          await databases.updateDocument(
            fullConfig.databaseId,
            fullConfig.usersCollectionId,
            userData.$id,
            { 
              department: null,
              updatedAt: new Date().toISOString()
            }
          );
        }
      } catch (error) {
        console.error('Error fetching department:', error);
      }
    }
    
    // If no department assigned, check if user is a member of any department
    if (!department) {
      try {
        // Fetch all departments
        const departmentsResult = await databases.listDocuments(
          fullConfig.databaseId,
          fullConfig.departmentsCollectionId,
          [Query.limit(100)]
        );
        
        // Find department where user is a member
        const userDept = departmentsResult.documents.find(dept => 
          dept.members && Array.isArray(dept.members) && dept.members.includes(userData.$id)
        );
        
        if (userDept) {
          department = userDept;
          
          // Update user's department field in database
          await databases.updateDocument(
            fullConfig.databaseId,
            fullConfig.usersCollectionId,
            userData.$id,
            { 
              department: userDept.$id,
              updatedAt: new Date().toISOString()
            }
          );
        }
      } catch (error) {
        console.error('Error searching user department membership:', error);
      }
    }
    
    return parseStringify({
      ...userData,
      settings: settings.total > 0 ? settings.documents[0] : null,
      department,
      departmentId: department?.$id || (typeof userData.department === 'string' ? userData.department : null),
      needsProfileCompletion: !department && !userData.department || !userData.role
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const signInUser = async ({ 
  email,
  redirectTo = "/dashboard"
}: { 
  email: string,
  redirectTo?: string
}) => {
  try {
    console.log("Attempting to sign in:", email, "with redirect to:", redirectTo);
    
    // Clean the email
    const cleanEmail = email.toLowerCase().trim();
    
    // Look up user by email in our database
    const existingUser = await getUserByEmail(cleanEmail);
    
    // If user exists in our database, send magic link
    if (existingUser) {
      console.log("User found in database, sending magic link");
      
      // Send magic link for sign-in
      const emailResult = await sendMagicLink(cleanEmail, "sign-in", redirectTo);
      
      return parseStringify({ 
        accountId: existingUser.accountId,
        success: emailResult.success,
        message: emailResult.message || "Sign-in link sent. Please check your email.",
        error: emailResult.error
      });
    }
    
    // User not found in our database, check if they exist in Appwrite Auth
    console.log("User not found in database, checking Appwrite Auth...");
    
    // Try a direct approach - attempt to create a user document
    try {
      const { account, databases } = await createAdminClient();
      
      // Try to create a recovery - this will only work if user exists in Auth
      try {
        await account.createRecovery(cleanEmail, redirectTo);
        console.log("User exists in Auth but not in database. Creating database record.");
      } catch (recoveryError: any) {
        // If recovery fails, the user likely doesn't exist at all
        if (recoveryError.code === 404) {
          console.log("User not found in Appwrite Auth either:", email);
          return parseStringify({ 
            accountId: null, 
            success: false,
            error: "No account found with this email. Please sign up."
          });
        }
        // For other recovery errors, continue trying to create the user
        console.log("Recovery attempt error, but continuing:", recoveryError.message);
      }
      
      // Get JWT token to try identifying the user
      let authUserId = null;
      try {
        // Email exists in Auth. Try alternative approach to get user ID
        // WARNING: This is a temporary login to get the user ID
        console.log("Creating temporary password session to get user ID");
        const tempPassword = `Temp${Date.now()}`;
        
        // Try to update the user's password and create a session
        await account.updateRecovery(
          cleanEmail,
          tempPassword,
          tempPassword
        );
        
        // Now try to log in with this password
        const session = await account.createEmailPasswordSession(
          cleanEmail,
          tempPassword
        );
        
        // Get the user ID
        const authUser = await account.get();
        authUserId = authUser.$id;
        
        // Cleanup
        await account.deleteSessions();
        
        console.log("Successfully retrieved Auth user ID:", authUserId);
      } catch (authError: any) {
        console.log("Could not get Auth user ID, using fallback method:", authError.message);
        // We'll use a fallback ID creation approach
      }
      
      // Create a user document with the information we have
      console.log("Creating user document for existing Auth user");
      const userDoc = await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.usersCollectionId,
        ID.unique(),
        {
          fullName: cleanEmail.split('@')[0], // Use part of email as name
          email: cleanEmail,
          avatar: avatarPlaceholderUrl,
          accountId: authUserId || ID.unique(), // Use the retrieved ID or generate a temporary one
          department: "",
          role: "user",
          status: "active",
          theme: "light",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
      
      console.log("User document created successfully:", userDoc.$id);
      
      // Now send a magic link
      const emailResult = await sendMagicLink(cleanEmail, "sign-in", redirectTo);
      
      return parseStringify({ 
        accountId: authUserId || "pending",
        success: true,
        message: "Account linked. Sign-in link sent. Please check your email.",
      });
      
    } catch (createError: any) {
      console.error("Error creating user document for Auth user:", createError);
      
      // Try one last approach - send the user to sign up again
      return parseStringify({ 
        accountId: null, 
        success: false,
        error: "There was an issue with your account. Please try signing up again.",
      });
    }
  } catch (error: any) {
    console.error("Sign-in error:", error);
    return parseStringify({
      success: false,
      error: error.message || "Failed to sign in"
    });
  }
};

export async function updateUserDepartment(userId: string, departmentId: string | null) {
  const { databases } = await createAdminClient();
  
  try {
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId,
      { 
        department: departmentId,
        updatedAt: new Date().toISOString()
      }
    );
    
    revalidatePath('/dashboard/profile');
    return { success: true };
  } catch (error) {
    console.error('Error updating user department:', error);
    throw new Error('Failed to update user department');
  }
}

export async function updateUserRole(userId: string, role: string) {
  const { databases } = await createAdminClient();
  
  try {
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId,
      { 
        role,
        updatedAt: new Date().toISOString()
      }
    );
    
    revalidatePath('/dashboard/profile');
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new Error('Failed to update user role');
  }
}

export async function updateUserSettings(userId: string, settings: any) {
  const { databases } = await createAdminClient();
  
  try {
    // First check if settings exist
    const existingSettings = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.userSettingsCollectionId,
      [Query.equal('userId', [userId])]
    );
    
    if (existingSettings.total > 0) {
      // Update existing settings
      await databases.updateDocument(
        fullConfig.databaseId,
        fullConfig.userSettingsCollectionId,
        existingSettings.documents[0].$id,
        {
          ...settings,
          updatedAt: new Date().toISOString()
        }
      );
    } else {
      // Create new settings
      await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.userSettingsCollectionId,
        ID.unique(),
        {
          userId,
          ...settings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
    }
    
    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw new Error('Failed to update user settings');
  }
}

export async function updateUserAvatar(userId: string, file: File) {
  try {
    const { storage, databases } = await createAdminClient();
    
    // Create a unique file ID
    const fileId = ID.unique();
    
    // Upload file to storage bucket
    const storageFile = await storage.createFile(
      fullConfig.avatarBucketId,
      fileId,
      file
    );
    
    // Get file preview URL
    const fileUrl = storage.getFileView(
      fullConfig.avatarBucketId,
      fileId
    );
    
    // Update user avatar in database
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId,
      { 
        avatar: fileUrl.toString(),
        updatedAt: new Date().toISOString()
      }
    );
    
    revalidatePath('/dashboard/profile');
    return { success: true, avatarUrl: fileUrl.toString() };
  } catch (error) {
    console.error('Error updating user avatar:', error);
    return { success: false, error: 'Failed to update avatar' };
  }
}

// Implement these functions directly to avoid circular dependencies
export const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();

  try {
    // Clean the email
    const cleanEmail = email.toLowerCase().trim();
    
    console.log('Looking up user by email:', cleanEmail);
    
    const result = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal("email", cleanEmail)]
    );

    if (result.total > 0) {
      console.log('User found in database:', result.documents[0].$id);
      return parseStringify(result.documents[0]);
    }
    
    console.log('No user found in database for email:', cleanEmail);
    return null;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return null;
  }
};

export const createAccountServer = async (
  email: string,
  name: string,
  department: string = "",
  role: string = "user"
) => {
  const { account, databases } = await createAdminClient();
  let authUser = null;

  try {
    // Basic implementation for Vercel build
    console.log('Creating account for:', email);
    
    // Clean the email
    const cleanEmail = email.toLowerCase().trim();
    
    // Create user document in database
    const userDoc = await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      ID.unique(),
      {
        fullName: name.trim(),
        email: cleanEmail,
        avatar: avatarPlaceholderUrl,
        accountId: ID.unique(),
        department,
        role,
        status: "active",
        theme: "light",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    
    return { 
      success: true, 
      userId: userDoc.$id,
      userDocId: userDoc.$id
    };
  } catch (error: any) {
    console.error('Error in createAccountServer:', error);
    throw new Error(error.message || 'Failed to create account');
  }
};
