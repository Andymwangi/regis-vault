'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const departmentId = params.id;
    if (!departmentId) {
      return new Response('Department ID is required', { status: 400 });
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { databases } = await createAdminClient();
    
    // Query files that are associated with this department
    const filesResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [
        Query.equal('departmentId', [departmentId]),
        Query.equal('status', ['active']),
        Query.limit(100),
      ]
    );

    // Format the file data for the frontend
    const files = filesResult.documents.map(file => ({
      id: file.$id,
      name: file.name,
      type: file.type,
      size: file.size,
      url: file.url,
      thumbnailUrl: file.thumbnailUrl || null,
      createdAt: file.$createdAt,
      updatedAt: file.$updatedAt,
      owner: {
        id: file.ownerId,
        name: file.ownerName || "Unknown",
      },
      bucketFileId: file.bucketFileId || file.bucketFieldId,
      departmentId: file.departmentId,
    }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error fetching department files:', error);
    return new Response('Failed to fetch department files', { status: 500 });
  }
} 