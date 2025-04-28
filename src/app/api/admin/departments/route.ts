'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query, ID } from 'node-appwrite';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { databases } = await createAdminClient();
    
    const departments = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      [Query.orderAsc('name')]
    );
    
    return NextResponse.json({ 
      success: true,
      departments: departments.documents
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch departments' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { name, description } = await request.json();
    const { databases } = await createAdminClient();
    
    const department = await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      ID.unique(),
      {
        name,
        description,
        allocatedStorage: 10 * 1024 * 1024 * 1024, // Default 10GB storage allocation
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    
    return NextResponse.json({ department });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id, name, description } = await request.json();
    const { databases } = await createAdminClient();
    
    const department = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      id,
      {
        name,
        description,
        updatedAt: new Date().toISOString()
      }
    );
    
    return NextResponse.json({ department });
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json(
      { error: 'Failed to update department' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }
    
    const { databases } = await createAdminClient();
    
    // Check if department has users
    const users = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal('department', [id])]
    );
    
    if (users.total > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department with assigned users' },
        { status: 400 }
      );
    }
    
    await databases.deleteDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      id
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    );
  }
} 