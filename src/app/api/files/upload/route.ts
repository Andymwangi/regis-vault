import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite";
import { fullConfig } from "@/lib/appwrite/config";
import { ID } from "node-appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { constructFileUrl, getFileType } from "@/lib/utils";
import { uploadFile } from '@/lib/appwrite/file-operations';
import { getSession } from '@/lib/auth/session';

// Format the response to ensure it has consistent structure
const formatFileResponse = (file: any) => {
  if (!file) return null;
  
  return {
    // Ensure both id and $id exist for compatibility
    id: file.id || file.$id || null,
    $id: file.$id || file.id || null,
    name: file.name || '',
    url: file.url || '',
    size: file.size || 0,
    type: file.type || 'unknown',
    extension: file.extension || '',
    bucketFileId: file.bucketFileId || file.bucketFieldId || null,
    bucketFieldId: file.bucketFieldId || file.bucketFileId || null,
    // Include all original properties
    ...file
  };
};

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/files/upload: Received file upload request');
    
    // Check authentication
    const session = await getSession();
    if (!session) {
      console.log('[API] /api/files/upload: Authentication failed - no session');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }
    
    console.log('[API] /api/files/upload: User authenticated', { userId: session.id });

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const redirectPath = formData.get('path') as string || '/dashboard/files';
    const departmentId = formData.get('departmentId') as string || undefined;

    if (!file) {
      console.log('[API] /api/files/upload: No file provided in request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    console.log('[API] /api/files/upload: Processing file', { 
      name: file.name, 
      size: file.size, 
      type: file.type,
      redirectPath
    });

    // Upload the file with the correct parameters
    const result = await uploadFile({
      file,
      ownerId: currentUser.$id,
      departmentId,
      redirectPath
    });
    
    console.log('[API] /api/files/upload: Upload successful', { 
      fileId: result.$id || result.id,
      fileName: result.name
    });

    // Format and return the result
    const formattedResult = formatFileResponse(result);
    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error('[API] /api/files/upload: Error in file upload', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    );
  }
}