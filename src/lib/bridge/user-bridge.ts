import { 
  createAccount, 
  signOut, 
  updateUserRole, 
  updateUserDepartment, 
  updateUserSettings 
} from "@/lib/actions/user.actions";
import { sendMagicLink } from "@/lib/actions/email.actions";

// Convert Appwrite user format to the format expected by your UI
export const convertAppwriteUserToUIFormat = (user: any) => {
  return {
    id: user.$id,
    accountId: user.accountId,
    email: user.email,
    name: user.fullName,
    avatar: user.avatar,
    role: user.role,
    department: user.department,
    departmentDetails: user.departmentDetails,
    settings: user.settings,
    status: user.status,
    createdAt: user.$createdAt,
    updatedAt: user.$updatedAt
  };
};

// Get current user wrapper
export const getCurrentUserBridge = async () => {
  try {
    const response = await fetch("/api/user/current");
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.user ? convertAppwriteUserToUIFormat(data.user) : null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

// Sign in wrapper
export const signInBridge = async (email: string, redirectTo: string = "/dashboard") => {
  try {
    const result = await sendMagicLink(email, "sign-in", redirectTo);
    if (!result.success) {
      throw new Error(result.error || "Failed to send magic link");
    }
    return { success: true, message: "Magic link sent to your email" };
  } catch (error) {
    console.error("Error signing in:", error);
    return { success: false, error: "Failed to sign in" };
  }
};

// Sign up wrapper
export const signUpBridge = async (
  name: string,
  email: string,
  redirectTo: string = "/dashboard",
  department: string = "",
  role: string = "user"
) => {
  try {
    console.log('Signing up with:', { name, email, department, role, redirectTo });
    const result = await createAccount({ 
      email, 
      name, 
      department, 
      role, 
      redirectTo 
    });
    if (!result?.success) {
      throw new Error("Failed to create account");
    }
    return { success: true, message: "Magic link sent to your email" };
  } catch (error: any) {
    console.error("Error signing up:", error);
    return { 
      success: false, 
      error: error.message || "Failed to sign up" 
    };
  }
};

// Sign out wrapper
export const signOutBridge = async () => {
  try {
    await signOut();
    return { success: true };
  } catch (error) {
    console.error("Error signing out:", error);
    return { success: false, error: "Failed to sign out" };
  }
};

// Update user role
export const updateUserRoleBridge = async (userId: string, role: string) => {
  const result = await updateUserRole(userId, role);
  
  return { success: result?.success };
};

// Update user department
export const updateUserDepartmentBridge = async (userId: string, department: string) => {
  const result = await updateUserDepartment(userId, department);
  
  return { success: result?.success };
};

// Update user settings
export const updateUserSettingsBridge = async (userId: string, settings: any) => {
  const result = await updateUserSettings(userId, settings);
  
  return { success: result?.success };
}; 