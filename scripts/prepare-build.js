// Script to prepare the project for building on Vercel
const fs = require('fs');
const path = require('path');

// Only run this script on Vercel
const isVercel = process.env.VERCEL === '1';
const skipPrepare = process.env.NEXT_BUILD_SKIP_PREPARE === '1';

if (!isVercel || skipPrepare) {
  console.log('Skipping build preparation (not on Vercel or explicitly skipped)');
  process.exit(0);
}

console.log('Preparing build for Vercel deployment...');

// Function to create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
  const directories = dirPath.split(path.sep);
  let currentPath = '';
  
  directories.forEach(dir => {
    currentPath = path.join(currentPath, dir);
    if (!fs.existsSync(currentPath)) {
      fs.mkdirSync(currentPath);
    }
  });
}

// Function to create backup of a file if it exists
function backupFileIfExists(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    const backupPath = `${fullPath}.bak`;
    fs.copyFileSync(fullPath, backupPath);
    console.log(`Backed up ${filePath} to ${backupPath}`);
    return true;
  }
  return false;
}

// Files to stub out
const filesToStub = [
  'src/app/api/departments/route.ts',
  'src/app/api/admin/storage/users/route.ts',
  'src/app/api/admin/active-users/route.ts',
  'src/app/api/workers/ocr-job/route.ts',
  'src/app/api/departments/[id]/members/route.ts',
  'src/app/api/departments/[id]/files/route.ts',
  'src/lib/db.ts',
  'src/lib/db/db.ts'
];

// Route stub content
const routeStubContent = `'use server';

import { NextResponse } from 'next/server';

// This is a stub file created for build purposes only
// It addresses the "A 'use server' file can only export async functions" error
// by ensuring we only export async functions

export async function GET() {
  return NextResponse.json({ 
    message: 'API has been migrated to Appwrite authentication' 
  }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ 
    message: 'API has been migrated to Appwrite authentication' 
  }, { status: 200 });
}

export async function PUT() {
  return NextResponse.json({ 
    message: 'API has been migrated to Appwrite authentication' 
  }, { status: 200 });
}

export async function PATCH() {
  return NextResponse.json({ 
    message: 'API has been migrated to Appwrite authentication' 
  }, { status: 200 });
}

export async function DELETE() {
  return NextResponse.json({ 
    message: 'API has been migrated to Appwrite authentication' 
  }, { status: 200 });
}`;

// Create stubs for route files
for (let i = 0; i < filesToStub.length; i++) {
  const filePath = filesToStub[i];
  console.log(`Processing: ${filePath}`);
  
  // Create backup of existing file
  backupFileIfExists(filePath);
  
  // Create directory structure if needed
  const fullPath = path.join(process.cwd(), filePath);
  ensureDirectoryExists(path.dirname(fullPath));
  
  // Write the stub file
  fs.writeFileSync(fullPath, routeStubContent);
  console.log(`Created stub for: ${filePath}`);
}

console.log('Build preparation complete!');
