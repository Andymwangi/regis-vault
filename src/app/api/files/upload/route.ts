import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db/db";
import { files, activityLogs, departments, users } from "@/server/db/schema/schema";
import { eq } from "drizzle-orm";
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { checkStorageQuota } from '@/middleware/storage-quota';
import { sql } from 'drizzle-orm';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const uploadedFiles = formData.getAll("files") as File[];

    if (!uploadedFiles.length) {
      return NextResponse.json(
        { message: "No files provided" },
        { status: 400 }
      );
    }

    // Get user's department
    const user = await db
      .select({ departmentId: users.departmentId })
      .from(users)
      .where(eq(users.id, sql`${session.user.id}::uuid`))
      .limit(1);

    if (!user.length || !user[0].departmentId) {
      return NextResponse.json({ message: 'User has no department assigned' }, { status: 400 });
    }

    const results = await Promise.all(
      uploadedFiles.map(async (file) => {
        try {
          // Check storage quota
          const quotaCheck = await checkStorageQuota(user[0].departmentId!, file.size);
          if (!quotaCheck.allowed) {
            return {
              success: false,
              error: quotaCheck.message,
              details: quotaCheck
            };
          }

          // Generate unique filename
          const fileExtension = file.name.split('.').pop();
          const uniqueFilename = `${uuidv4()}.${fileExtension}`;
          const filePath = join(UPLOAD_DIR, uniqueFilename);

          // Convert File to Buffer and save to disk
          const buffer = await file.arrayBuffer();
          await writeFile(filePath, Buffer.from(buffer));

          // Get department ID from department name
          const department = await db.query.departments.findFirst({
            where: eq(departments.name, session.user.department),
          });

          if (!department) {
            throw new Error('Department not found');
          }

          // Create file record in database
          const [newFile] = await db.insert(files).values({
            name: file.name,
            type: file.type,
            size: file.size,
            url: `/uploads/${uniqueFilename}`,
            userId: sql`${session.user.id}::uuid`,
            departmentId: sql`${department.id}::uuid`,
            status: 'active'
          }).returning();

          // Log file upload activity
          await db.insert(activityLogs).values({
            userId: sql`${session.user.id}::uuid`,
            action: "FILE_UPLOADED",
            details: `Uploaded file: ${file.name}`,
          });

          return {
            success: true,
            file: newFile,
          };
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          return {
            success: false,
            error: `Failed to upload ${file.name}`,
          };
        }
      })
    );

    const successfulUploads = results.filter((r) => r.success);
    const failedUploads = results.filter((r) => !r.success);

    return NextResponse.json({
      message: "Files uploaded successfully",
      successfulUploads,
      failedUploads,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { message: "Failed to upload files" },
      { status: 500 }
    );
  }
} 