"use server";

import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/appwrite";
import { fullConfig } from "@/lib/appwrite/config";
import { Query } from "node-appwrite";
import jwt from "jsonwebtoken";

// Setup email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Generate a JWT token for the magic link
const generateMagicLinkToken = (userId: string, email: string): string => {
  const token = jwt.sign(
    { userId, email, purpose: "magic-link" },
    process.env.JWT_SECRET || "fallback-secret",
    { expiresIn: "1h" }
  );
  
  return token;
};

// Send a magic link to the user's email
export const sendMagicLink = async (
  email: string, 
  type: "sign-in" | "sign-up",
  redirectTo: string = "/dashboard"
) => {
  try {
    // First, check if the user exists
    const { databases } = await createAdminClient();
    const result = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal("email", [email])]
    );
    
    if (result.total === 0 && type === "sign-in") {
      return {
        success: false,
        error: "No account found with this email. Please sign up first."
      };
    }
    
    const user = result.total > 0 ? result.documents[0] : null;
    const userId = user ? user.accountId : "";
    
    // Generate a magic link token
    const token = generateMagicLinkToken(userId, email);
    
    // Generate the magic link URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const magicLinkUrl = `${baseUrl}/api/auth/callback/magic-link?token=${token}&redirect=${encodeURIComponent(redirectTo)}`;
    
    // Prepare email content
    const subject = type === "sign-up" 
      ? "Complete your registration at RegisVault"
      : "Sign in to RegisVault";
    
    const text = type === "sign-up"
      ? `Welcome to RegisVault! Please click the link below to complete your registration:\n\n${magicLinkUrl}\n\nThis link will expire in 1 hour.`
      : `Click the link below to sign in to RegisVault:\n\n${magicLinkUrl}\n\nThis link will expire in 1 hour.`;
    
    const html = type === "sign-up"
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e53e3e;">Welcome to RegisVault!</h2>
          <p>Please click the button below to complete your registration:</p>
          <p style="margin: 20px 0;">
            <a href="${magicLinkUrl}" style="background-color: #e53e3e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Complete Registration
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e53e3e;">Sign in to RegisVault</h2>
          <p>Click the button below to sign in:</p>
          <p style="margin: 20px 0;">
            <a href="${magicLinkUrl}" style="background-color: #e53e3e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Sign In
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        </div>
      `;
    
    // Send the email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject,
      text,
      html,
    };
    
    await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      message: type === "sign-up" 
        ? "Registration email sent. Please check your inbox." 
        : "Sign-in link sent. Please check your inbox."
    };
  } catch (error) {
    console.error("Failed to send magic link:", error);
    return {
      success: false,
      error: "Failed to send email. Please try again later."
    };
  }
};

// Send a notification when a file is shared
export const sendFileSharedNotification = async (
  recipientEmail: string,
  fileName: string,
  sharedByName: string,
  fileId: string
) => {
  try {
    console.log(`Sending file shared notification to: ${recipientEmail} for file: ${fileName}`);
    
    // Generate the file access URL - point to "Shared with me" page
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const sharedFilesUrl = `${baseUrl}/dashboard/shared`;
    
    // Prepare email content
    const subject = `${sharedByName} shared a file with you on RegisVault`;
    
    const text = `Hello,\n\n${sharedByName} has shared the file "${fileName}" with you on RegisVault.\n\nYou can access this file by signing in to your account and visiting your "Shared with me" page at:\n${sharedFilesUrl}\n\nThis file has been shared directly with you and will appear in this dedicated section.\n\nIf you don't have a RegisVault account yet, you'll need to sign up first.\n\nRegards,\nThe RegisVault Team`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e53e3e;">File Shared on RegisVault</h2>
        <p><strong>${sharedByName}</strong> has shared the file "<strong>${fileName}</strong>" with you.</p>
        <p>After signing in, you'll be taken directly to your "Shared with me" page where you can find this file.</p>
        <p style="margin: 20px 0;">
          <a href="${sharedFilesUrl}" style="background-color: #e53e3e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Shared Files
          </a>
        </p>
        <p>If you don't have a RegisVault account yet, you'll need to sign up first.</p>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">Regards,<br>The RegisVault Team</p>
      </div>
    `;
    
    // Send the email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: recipientEmail,
      subject,
      text,
      html,
    };
    
    await transporter.sendMail(mailOptions);
    
    console.log(`File shared notification sent successfully to ${recipientEmail}`);
    return {
      success: true,
      message: `Notification sent to ${recipientEmail}`
    };
  } catch (error) {
    console.error(`Failed to send file shared notification to ${recipientEmail}:`, error);
    return {
      success: false,
      error: "Failed to send notification email."
    };
  }
}; 