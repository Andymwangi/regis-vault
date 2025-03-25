// src/lib/auth/email.ts
import { createTransport } from 'nodemailer';

// Create a transport with Gmail or fallback to test account
async function getTransport() {
  // If Gmail credentials are available, use Gmail
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    console.log('Using Gmail transport for', process.env.GMAIL_USER);
    return createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  
  // Otherwise create a test account with ethereal.email
  const nodemailer = require('nodemailer');
  const testAccount = await nodemailer.createTestAccount();
  
  console.log('Created test email account:', testAccount);
  
  return createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

/**
 * Generate a random 6-digit code
 */
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP verification email
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  try {
    console.log('Sending OTP email to:', to);
    const transport = await getTransport();
    const fromEmail = process.env.GMAIL_USER || 'no-reply@ethereal.email';
    
    const info = await transport.sendMail({
      from: `"Regis Vault" <${fromEmail}>`,
      to,
      subject: 'Your Verification Code',
      text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Verification Required</h1>
          <p>Please use the following code to verify your account:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; margin: 20px 0; border-radius: 4px;">
            <strong>${otp}</strong>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this code, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #777; font-size: 12px;">Regis Vault - Secure Document Management</p>
        </div>
      `,
    });
    
    console.log('OTP email sent successfully. Message ID:', info.messageId);
    // Log preview URL for testing (only available with Ethereal)
    const infoAny = info as any;
    if (infoAny.testMessageUrl) {
      console.log('Preview URL:', infoAny.testMessageUrl);
    }
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    throw new Error("Failed to send verification email. Please try again.");
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  try {
    console.log('Sending welcome email to:', to);
    const transport = await getTransport();
    const fromEmail = process.env.GMAIL_USER || 'no-reply@ethereal.email';
    
    const info = await transport.sendMail({
      from: `"Regis Vault" <${fromEmail}>`,
      to,
      subject: 'Welcome to Regis Vault',
      text: `Welcome to Regis Vault, ${name}! Your account has been created successfully.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Welcome to Regis Vault!</h1>
          <p>Hello ${name},</p>
          <p>Your account has been created successfully. You can now sign in to access your documents.</p>
          <div style="margin: 20px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/sign-in" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Sign In</a>
          </div>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #777; font-size: 12px;">Regis Vault - Secure Document Management</p>
        </div>
      `,
    });
    
    console.log('Welcome email sent successfully. Message ID:', info.messageId);
    // Log preview URL for testing (only available with Ethereal)
    const infoAny = info as any;
    if (infoAny.testMessageUrl) {
      console.log('Preview URL:', infoAny.testMessageUrl);
    }
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    // Non-critical, just log the error
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
  
  try {
    console.log('Sending password reset email to:', to);
    const transport = await getTransport();
    const fromEmail = process.env.GMAIL_USER || 'no-reply@ethereal.email';
    
    const info = await transport.sendMail({
      from: `"Regis Vault" <${fromEmail}>`,
      to,
      subject: 'Password Reset Request',
      text: `Click the following link to reset your password: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Password Reset Request</h1>
          <p>Click the button below to reset your password:</p>
          <div style="margin: 20px 0;">
            <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a>
          </div>
          <p>If you did not request this password reset, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #777; font-size: 12px;">Regis Vault - Secure Document Management</p>
        </div>
      `,
    });
    
    console.log('Password reset email sent successfully. Message ID:', info.messageId);
    // Log preview URL for testing (only available with Ethereal)
    const infoAny = info as any;
    if (infoAny.testMessageUrl) {
      console.log('Preview URL:', infoAny.testMessageUrl);
    }
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
    // Create test account and transport
    const config = await getTransport();
    const transport = config;
    
    const info = await transport.sendMail({
      from: `"Regis Vault" <no-reply@regisvault.com>`,
      to,
      subject: 'Specialized Email',
      text: JSON.stringify(params),
      html: JSON.stringify(params),
    });

    console.log('Email sent:', info.messageId);
    // Log preview URL for testing
    const infoAny = info as any;
    if (infoAny.testMessageUrl) {
      console.log('Preview URL:', infoAny.testMessageUrl);
    }
  } catch (error) {
    console.error("Failed to send specialized email:", error);
    throw new Error("Failed to send specialized email");
  }
}