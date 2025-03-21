import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { departments, files } from '@/server/db/schema/schema';
import { eq, sql } from 'drizzle-orm';

export async function checkStorageQuota(departmentId: string, fileSize: number) {
  try {
    // Get department's allocated storage and current usage
    const department = await db
      .select({
        allocatedStorage: departments.allocatedStorage,
        usedStorage: sql<number>`COALESCE(SUM(${files.size}), 0)`,
      })
      .from(departments)
      .leftJoin(files, eq(files.departmentId, departments.id))
      .where(eq(departments.id, parseInt(departmentId)))
      .groupBy(departments.id)
      .limit(1);

    if (!department.length) {
      return { allowed: false, message: 'Department not found' };
    }

    const { allocatedStorage, usedStorage } = department[0];
    const newTotal = usedStorage + fileSize;

    // Check if upload would exceed quota
    if (!allocatedStorage || newTotal > allocatedStorage) {
      return {
        allowed: false,
        message: 'Upload would exceed department storage quota',
        current: usedStorage,
        allocated: allocatedStorage || 0,
        required: fileSize,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking storage quota:', error);
    return { allowed: false, message: 'Error checking storage quota' };
  }
} 