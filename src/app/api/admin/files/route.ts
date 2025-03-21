import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db/db';
import { files, users, departments as deptTable, activityLogs } from '@/server/db/schema/schema';
import { eq, and, desc, asc, like, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const type = searchParams.get('type');
    const sort = searchParams.get('sort');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where = [];
    
    // Add department filter
    if (department && department !== 'all') {
      where.push(eq(files.departmentId, department));
    }

    // Add type filter
    if (type && type !== 'all') {
      where.push(like(files.type, type === 'document' ? 'application/%' : `${type}/%`));
    }

    // Add status filter - only show active files by default
    where.push(eq(files.status, 'active'));

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Determine sort field and direction
    const orderBy = sort === 'name' ? files.name : 
                   sort === 'size' ? files.size :
                   files.createdAt; // default to date

    // Fetch files with joins
    const filesList = await db
      .select({
        id: files.id,
        name: files.name,
        type: files.type,
        size: files.size,
        url: files.url,
        thumbnailUrl: files.thumbnailUrl,
        status: files.status,
        createdAt: files.createdAt,
        updatedAt: files.updatedAt,
        uploadedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        },
        department: {
          id: deptTable.id,
          name: deptTable.name
        }
      })
      .from(files)
      .leftJoin(users, eq(files.userId, users.id))
      .leftJoin(deptTable, eq(files.departmentId, deptTable.id))
      .where(and(...where))
      .orderBy(desc(orderBy))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(and(...where));

    // Format response
    const formattedFiles = filesList.map(file => ({
      ...file,
      uploadedBy: file.uploadedBy ? `${file.uploadedBy.firstName} ${file.uploadedBy.lastName}` : 'Unknown',
      department: file.department?.name || 'N/A'
    }));

    return NextResponse.json({
      files: formattedFiles,
      pagination: {
        total: Number(count),
        pages: Math.ceil(Number(count) / limit),
        current: page
      }
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    // Here you would typically:
    // 1. Validate file types and sizes
    // 2. Upload files to storage (e.g., S3, Azure Blob Storage)
    // 3. Save file metadata to database

    return NextResponse.json({ 
      message: 'Files uploaded successfully',
      count: files.length 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileIds } = await request.json();
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: fileIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Verify files exist and get their details
      const filesToDelete = await tx
        .select({
          id: files.id,
          userId: files.userId,
          departmentId: files.departmentId,
          url: files.url
        })
        .from(files)
        .where(sql`id = ANY(${fileIds})`);

      if (filesToDelete.length !== fileIds.length) {
        throw new Error('One or more files not found');
      }

      // Update files status to deleted
      await tx
        .update(files)
        .set({ 
          status: 'deleted',
          updatedAt: new Date()
        })
        .where(sql`id = ANY(${fileIds})`);

      // Log the activity
      await tx.insert(activityLogs).values({
        action: 'DELETE_FILES',
        details: `Admin deleted files: ${fileIds.join(', ')}`,
        userId: parseInt(session.user.id)
      });

      return filesToDelete;
    });

    return NextResponse.json({ 
      message: 'Files deleted successfully',
      deletedCount: fileIds.length 
    });
  } catch (error) {
    console.error('Error deleting files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete files' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId, status } = await request.json();
    if (!fileId || typeof status !== 'string' || !['active', 'inactive'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request: fileId and valid status are required' },
        { status: 400 }
      );
    }

    // Update file status in a transaction
    const result = await db.transaction(async (tx) => {
      // Verify file exists
      const [existingFile] = await tx
        .select({
          id: files.id,
          name: files.name,
          userId: files.userId,
          departmentId: files.departmentId
        })
        .from(files)
        .where(eq(files.id, fileId))
        .limit(1);

      if (!existingFile) {
        throw new Error('File not found');
      }

      // Update file status
      const [updatedFile] = await tx
        .update(files)
        .set({ 
          status,
          updatedAt: new Date()
        })
        .where(eq(files.id, fileId))
        .returning();

      // Log the activity
      await tx.insert(activityLogs).values({
        action: 'UPDATE_FILE_ACCESS',
        details: `Admin updated file ${existingFile.name} (${fileId}) status to ${status}`,
        userId: parseInt(session.user.id)
      });

      return updatedFile;
    });

    return NextResponse.json({ 
      message: 'File access updated successfully',
      file: result
    });
  } catch (error) {
    console.error('Error updating file access:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update file access' },
      { status: 500 }
    );
  }
}

// Helper function to get available departments
export async function getDepartments() {
  const departments = await db
    .select({
      id: deptTable.id,
      name: deptTable.name
    })
    .from(deptTable)
    .orderBy(asc(deptTable.name));

  return departments;
} 