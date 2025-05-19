import { NextRequest, NextResponse } from 'next/server';
import { renameFile, validateFileName } from '@/lib/actions/file.actions';
import { getCurrentUser } from '@/lib/actions/user.actions';

export async function PUT(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { fileId } = params;
    const body = await request.json();
    const { newName, path = '/dashboard/files' } = body;

    // Validate input
    if (!newName) {
      return NextResponse.json(
        { error: 'New file name is required' },
        { status: 400 }
      );
    }

    // Validate file name
    const validation = await validateFileName(newName);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Perform rename
    const result = await renameFile({
      fileId,
      newName,
      path,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      file: result.file,
      message: 'File renamed successfully',
    });
  } catch (error: any) {
    console.error('API Error renaming file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle batch rename
export async function PATCH(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { files, path = '/dashboard/files' } = body;

    // Validate input
    if (!files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Files array is required' },
        { status: 400 }
      );
    }

    // Import batch rename function
    const { renameMultipleFiles } = await import('@/lib/actions/file.actions');
    
    // Perform batch rename
    const result = await renameMultipleFiles(files, path);

    return NextResponse.json({
      success: result.success,
      results: result.results,
      message: result.success 
        ? 'All files renamed successfully' 
        : 'Some files failed to rename',
    });
  } catch (error: any) {
    console.error('API Error batch renaming files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}