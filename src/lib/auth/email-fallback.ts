/**
 * Fallback email service that doesn't depend on EmailJS
 * This is used when EmailJS fails or is not available
 */

import { createTransport } from 'nodemailer';

// Create a test account if no SMTP credentials are available
async function createTestAccount() {
  const nodemailer = require('nodemailer');
  const testAccount = await nodemailer.createTestAccount();
  
  console.log('Created test email account:', testAccount);
  
  return {
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  };
}

// Create a transport with available credentials or a test account
async function getTransport() {
  // If you have your own SMTP credentials, use them here
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // Otherwise create a test account with ethereal.email
  const config = await createTestAccount();
  return createTransport(config);
}

/**
 * Send an OTP code via email
 */
export async function sendOtpEmailFallback(to: string, otp: string): Promise<void> {
  try {
    const transport = await getTransport();
    
    const info = await transport.sendMail({
      from: `"Regis Vault" <no-reply@regisvault.com>`,
      to,
      subject: 'Your Verification Code - Regis Vault',
      text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Verification Required</h1>
          <p>Please use the following code to verify your account:</p>
          <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
            <strong>${otp}</strong>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this code, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #777; font-size: 12px;">Regis Vault - Secure Document Management</p>
        </div>
      `,
    });
    
    console.log('Fallback email sent:', info.messageId);
    // Access testMessageUrl safely using type assertion
    const infoAny = info as any;
    if (infoAny.testMessageUrl) {
      console.log('Test message URL:', infoAny.testMessageUrl);
    }
  } catch (error) {
    console.error('Fallback email error:', error);
    throw new Error('Failed to send verification email through fallback system');
  }
}

/**
 * Send a welcome email
 */
export async function sendWelcomeEmailFallback(to: string, name: string): Promise<void> {
  try {
    const transport = await getTransport();
    
    const info = await transport.sendMail({
      from: `"Regis Vault" <no-reply@regisvault.com>`,
      to,
      subject: 'Welcome to Regis Vault',
      text: `Welcome to Regis Vault, ${name}! Your account has been created successfully.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
    
    console.log('Fallback welcome email sent:', info.messageId);
  } catch (error) {
    console.error('Fallback welcome email error:', error);
    // Non-critical, just log the error
  }
} 