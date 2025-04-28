'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';

// This is a stub file created for build purposes only
// It addresses the "A 'use server' file can only export async functions" error
// by ensuring we only export async functions

export async function GET() {
  try {
    // Authenticate the user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all departments
    const { databases } = await createAdminClient();
    const departments = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      [Query.orderAsc('name')]
    );

    // Transform the data for the frontend
    const transformedDepartments = departments.documents.map(dept => ({
      id: dept.$id,
      name: dept.name,
      description: dept.description || ''
    }));

    return NextResponse.json({ departments: transformedDepartments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
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
} 