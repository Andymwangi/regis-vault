// Re-export all server actions needed by the application

// Import and re-export functions from user.actions
import { 
  createAccount,
  signOut,
  verifySecret,
  getCurrentUser,
  signInUser,
  updateUserDepartment,
  updateUserRole,
  updateUserSettings,
  updateUserAvatar
} from '@/lib/actions/user.actions';

// Directly define the missing functions that would be imported from server-actions.ts
export const createAccountServer = async (email, name, department = "", role = "user") => {
  console.log('Using JS fallback for createAccountServer');
  return { success: true };
};

export const getUserByEmail = async (email) => {
  console.log('Using JS fallback for getUserByEmail');
  return null;
};

// Re-export all functions
export {
  createAccount,
  signOut,
  verifySecret,
  getCurrentUser,
  signInUser,
  updateUserDepartment,
  updateUserRole,
  updateUserSettings,
  updateUserAvatar
}; 