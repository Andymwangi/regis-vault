'use server';

import { NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';

export async function GET() {
  try {
    console.log('Starting trash debugging request');
    
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check if user is admin (limit this endpoint to admins for security)
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { message: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }
    
    console.log(`Admin user authenticated: ${currentUser.$id}`);
    
    // Create Appwrite admin client
    const { databases } = await createAdminClient();
    
    // Step 1: Check all files with deleted status
    console.log('Checking files with deleted status');
    const deletedFiles = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [Query.equal('status', ['deleted'])]
    );
    
    // Step 2: Check files that have deletedBy field but might not have status=deleted
    console.log('Checking files with deletedBy field set');
    const filesWithDeletedBy = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [Query.isNotNull('deletedBy')]
    );
    
    // Find files that have deletedBy but don't have status=deleted (inconsistent state)
    const inconsistentFiles = filesWithDeletedBy.documents.filter(
      file => file.status !== 'deleted'
    );
    
    // Step 3: Check for files with deleted status but missing deletedBy (another inconsistent state)
    const missingDeletedByFiles = deletedFiles.documents.filter(
      file => !file.deletedBy
    );
    
    // Get schema of the files collection to understand what fields are available
    const collections = await databases.listCollections(
      fullConfig.databaseId
    );
    
    const filesCollection = collections.collections.find(
      c => c.$id === fullConfig.filesCollectionId
    );
    
    // Check if the required fields for trash functionality exist
    const schemaHasDeletedBy = filesCollection?.attributes?.some(attr => attr.key === 'deletedBy');
    const schemaHasDeletedAt = filesCollection?.attributes?.some(attr => attr.key === 'deletedAt');
    
    return NextResponse.json({
      success: true,
      deletedFilesCount: deletedFiles.total,
      filesWithDeletedByCount: filesWithDeletedBy.total,
      inconsistentFilesCount: inconsistentFiles.length,
      missingDeletedByFilesCount: missingDeletedByFiles.length,
      schemaHasDeletedByField: schemaHasDeletedBy,
      schemaHasDeletedAtField: schemaHasDeletedAt,
      sampleDeletedFiles: deletedFiles.documents.slice(0, 3).map(file => ({
        id: file.$id,
        name: file.name,
        status: file.status,
        deletedBy: file.deletedBy,
        deletedAt: file.deletedAt,
        updatedAt: file.$updatedAt
      })),
      sampleInconsistentFiles: inconsistentFiles.slice(0, 3).map(file => ({
        id: file.$id,
        name: file.name,
        status: file.status,
        deletedBy: file.deletedBy
      })),
      collectionAttributes: filesCollection?.attributes.map(attr => ({
        key: attr.key,
        type: attr.type,
        required: attr.required
      }))
    });
  } catch (error) {
    console.error('Error in trash debugging endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Error fetching trash debug information',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 