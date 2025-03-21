// src/lib/auth/email.ts
import emailjs from '@emailjs/browser';

// Initialize EmailJS
emailjs.init({
  publicKey: process.env.EMAILJS_PUBLIC_KEY
});

// Template types for the master template
export enum EmailType {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  OTP = 'otp'
}

/**
 * Send OTP verification email using EmailJS
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  try {
    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID || 'your_service_id',
      process.env.EMAILJS_MASTER_TEMPLATE_ID || 'your_master_template_id',
      {
        to_email: to,
        email_title: 'Verification Code - Regis Vault',
        email_heading: 'Verification Required',
        otp: otp,
        content_align: 'center',
        features_display: 'none',
        
        // Control flags
        isWelcomeEmail: false,
        isPasswordReset: false,
        isVerification: true
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`EmailJS responded with status: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    throw new Error("Failed to send verification email");
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  try {
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID || 'your_service_id',
      process.env.EMAILJS_MASTER_TEMPLATE_ID || 'your_master_template_id',
      {
        to_email: to,
        email_title: 'Welcome to Regis Vault',
        email_heading: 'Welcome to Regis Vault!',
        user_name: name,
        action_url: `${process.env.NEXT_PUBLIC_APP_URL}/sign-in`,
        content_align: 'left',
        features_display: 'block',
        
        // Control flags
        isWelcomeEmail: true,
        isPasswordReset: false,
        isVerification: false
      }
    );
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    // Non-critical error, just log it
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
  
  try {
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID || 'your_service_id',
      process.env.EMAILJS_MASTER_TEMPLATE_ID || 'your_master_template_id',
      {
        to_email: to,
        email_title: 'Password Reset - Regis Vault',
        email_heading: 'Password Reset Request',
        action_url: resetUrl,
        content_align: 'left',
        features_display: 'none',
        
        // Control flags
        isWelcomeEmail: false,
        isPasswordReset: true,
        isVerification: false
      }
    );
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
}

/**
 * Optional: Send a specialized email that doesn't fit the master template
 * Use this for your second template slot
 */
export async function sendSpecializedEmail(to: string, params: Record<string, any>): Promise<void> {
  try {
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID || 'your_service_id',
      process.env.EMAILJS_SPECIAL_TEMPLATE_ID || 'your_special_template_id',
      {
        to_email: to,
        ...params
      }
    );
  } catch (error) {
    console.error("Failed to send specialized email:", error);
    throw new Error("Failed to send specialized email");
  }
}