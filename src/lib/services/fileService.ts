import { db } from '@/lib/db/db';
import { files, users, departments, activityLogs, ocrResults } from '@/server/db/schema/schema';
import { eq, and, desc, asc, like, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createWorker } from 'tesseract.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  userId: string;
  departmentId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FileService {
  static async getFiles(options: {
    departmentId?: string;
    type?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) {
    const { departmentId, type, sortBy = 'createdAt', page = 1, limit = 10 } = options;

    const where = [];
    if (departmentId && departmentId !== 'all') {
      where.push(eq(files.departmentId, parseInt(departmentId)));
    }
    if (type && type !== 'all') {
      where.push(like(files.type, type === 'document' ? 'application/%' : `${type}/%`));
    }
    where.push(eq(files.status, 'active'));

    const orderByField = sortBy === 'date' ? files.createdAt : 
                        sortBy === 'name' ? files.name : 
                        files.size;

    const results = await db.select({
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
        email: users.email,
      },
      department: {
        id: departments.id,
        name: departments.name,
      }
    })
    .from(files)
    .leftJoin(users, eq(files.userId, users.id))
    .leftJoin(departments, eq(files.departmentId, departments.id))
    .where(and(...where))
    .orderBy(desc(orderByField))
    .limit(limit)
    .offset((page - 1) * limit);

    const total = await db.select({ count: sql<number>`count(*)` })
      .from(files)
      .where(and(...where));

    return {
      files: results.map(file => ({
        ...file,
        uploadedBy: file.uploadedBy ? `${file.uploadedBy.firstName} ${file.uploadedBy.lastName}` : 'Unknown',
        department: file.department?.name || 'N/A'
      })),
      pagination: {
        total: total[0].count,
        pages: Math.ceil(total[0].count / limit),
        current: page
      }
    };
  }

  static async deleteFiles(fileIds: string[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Update files status to deleted
      await tx.update(files)
        .set({ status: 'deleted', updatedAt: new Date() })
        .where(sql`id = ANY(${fileIds})`);

      // Log the activity
      await tx.insert(activityLogs).values({
        action: 'DELETE_FILES',
        details: `Deleted files: ${fileIds.join(', ')}`,
        userId: parseInt(session.user.id)
      });

      return { success: true };
    });
  }

  static async updateFileAccess(fileId: string, status: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    return await db.transaction(async (tx) => {
      // Update file status
      const [updatedFile] = await tx.update(files)
        .set({ 
          status,
          updatedAt: new Date()
        })
        .where(eq(files.id, parseInt(fileId)))
        .returning();

      // Log the activity
      await tx.insert(activityLogs).values({
        action: 'UPDATE_FILE_ACCESS',
        details: `Updated file ${fileId} status to ${status}`,
        userId: parseInt(session.user.id)
      });

      return updatedFile;
    });
  }

  static async getFileStats() {
    const [totalFiles] = await db.select({ count: sql<number>`count(*)` })
      .from(files)
      .where(eq(files.status, 'active'));

    const [totalSize] = await db.select({ 
      total: sql<number>`sum(size)` 
    })
    .from(files)
    .where(eq(files.status, 'active'));

    const filesByDepartment = await db.select({
      departmentId: departments.id,
      departmentName: departments.name,
      count: sql<number>`count(*)`,
      totalSize: sql<number>`sum(${files.size})`
    })
    .from(files)
    .leftJoin(departments, eq(files.departmentId, departments.id))
    .where(eq(files.status, 'active'))
    .groupBy(departments.id, departments.name);

    const filesByType = await db.select({
      type: files.type,
      count: sql<number>`count(*)`
    })
    .from(files)
    .where(eq(files.status, 'active'))
    .groupBy(files.type);

    return {
      totalFiles: totalFiles.count,
      totalSize: totalSize.total || 0,
      filesByDepartment,
      filesByType
    };
  }

  static async extractTextFromFile(file: {
    id: string;
    name: string;
    type: string;
    url: string;
  }): Promise<string | null> {
    try {
      // Check if OCR result already exists
      const [existingResult] = await db
        .select({
          text: ocrResults.text,
        })
        .from(ocrResults)
        .where(eq(ocrResults.fileId, parseInt(file.id)));

      if (existingResult) {
        return existingResult.text;
      }

      // Get file content from URL
      const response = await fetch(file.url);
      const buffer = await response.arrayBuffer();

      let extractedText: string | null = null;

      if (file.type.includes('pdf')) {
        // Parse PDF content
        const pdfData = await pdf(Buffer.from(buffer));
        extractedText = pdfData.text;
      }
      
      if (file.type.includes('image')) {
        // For images, use Tesseract OCR
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(Buffer.from(buffer));
        await worker.terminate();
        extractedText = text;
      }
      
      if (file.type.includes('text')) {
        // For text files, convert buffer to string
        extractedText = Buffer.from(buffer).toString('utf-8');
      }

      if (extractedText) {
        // Store the result in the database
        await db.insert(ocrResults).values({
          fileId: parseInt(file.id),
          text: extractedText,
        });
      }
      
      return extractedText;
    } catch (error) {
      console.error('Error extracting text from file:', error);
      return null;
    }
  }
} 