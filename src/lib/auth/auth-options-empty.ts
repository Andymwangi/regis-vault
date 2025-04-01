'use server';

/**
 * STUB FILE FOR BUILD PROCESS
 * This file provides minimal implementations to prevent build errors
 * from imports that reference auth-options.ts
 */

import { account } from "../appwrite/config";

// Minimal implementation of authOptions
export const authOptions = {
  callbacks: {},
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  }
};

// Helper functions
export async function getCurrentUser() {
  return null;
}

export async function isAdminUser() {
  return false;
} 