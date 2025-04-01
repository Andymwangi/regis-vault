import { db } from '@/lib/db';
import { 
  files, 
  departments, 
  activityLogs,
  ocrResults,
  users
} from '@/server/db/schema/schema';
import { eq, sql, desc, asc, and, like, or } from 'drizzle-orm';
import { createWorker } from 'tesseract.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { account } from '@/lib/appwrite/config';

import { GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';

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
      where.push(eq(files.departmentId, sql`${departmentId}::uuid`));
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
        name: users.name,
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
        uploadedBy: file.uploadedBy ? file.uploadedBy.name : 'Unknown',
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
    try {
      // Check if user is authenticated with Appwrite
      const user = await account.get();
      
      // Start a transaction
      return await db.transaction(async (tx) => {
        // Update files status to deleted
        await tx.update(files)
          .set({ status: 'deleted', updatedAt: new Date() })
          .where(sql`id = ANY(${fileIds}::uuid[])`);

        // Log the activity
        await tx.insert(activityLogs).values({
          userId: user.$id.substring(0, 36),
          action: 'DELETE_FILES',
          details: `Deleted files: ${fileIds.join(', ')}`
        });

        return { success: true };
      });
    } catch (error) {
      console.error('Error deleting files:', error);
      throw error;
    }
  }

  static async updateFileAccess(fileId: string, status: string) {
    try {
      // Check if user is authenticated with Appwrite
      const user = await account.get();

      return await db.transaction(async (tx) => {
        // Update file status
        const [updatedFile] = await tx.update(files)
          .set({ 
            status,
            updatedAt: new Date()
          })
          .where(eq(files.id, sql`${fileId}::uuid`))
          .returning();

        // Log the activity
        await tx.insert(activityLogs).values({
          userId: user.$id.substring(0, 36),
          action: 'UPDATE_FILE_ACCESS',
          details: `Updated file ${fileId} status to ${status}`
        });

        return updatedFile;
      });
    } catch (error) {
      console.error('Error updating file access:', error);
      throw error;
    }
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
        .where(eq(ocrResults.fileId, sql`${file.id}::uuid`));

      if (existingResult) {
        return existingResult.text;
      }

      // Get file content from URL
      const response = await fetch(file.url);
      if (!response.ok) {
        console.error('Failed to fetch file:', response.statusText);
        return null;
      }
      const buffer = await response.arrayBuffer();

      let extractedText: string | null = null;

      if (file.type.includes('pdf')) {
        try {
          // Lazy load pdf-parse only when needed
          const pdf = (await import('pdf-parse')).default;
          const pdfData = await pdf(Buffer.from(buffer));
          extractedText = pdfData.text;
        } catch (error) {
          console.error('Error parsing PDF:', error);
          return null;
        }
      }
      
      if (file.type.includes('image')) {
        try {
          // For images, use Tesseract OCR
          const worker = await createWorker('eng');
          const { data: { text } } = await worker.recognize(Buffer.from(buffer));
          await worker.terminate();
          extractedText = text;
        } catch (error) {
          console.error('Error performing OCR:', error);
          return null;
        }
      }
      
      if (file.type.includes('text')) {
        try {
          // For text files, convert buffer to string
          extractedText = Buffer.from(buffer).toString('utf-8');
        } catch (error) {
          console.error('Error reading text file:', error);
          return null;
        }
      }

      if (extractedText) {
        // Store the result in the database
        await db.insert(ocrResults).values({
          fileId: sql`${file.id}::uuid`,
          text: extractedText,
          status: 'completed',
          confidence: 0,
          language: 'en',
          pageCount: 1,
          processingTime: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      return extractedText;
    } catch (error) {
      console.error('Error extracting text from file:', error);
      return null;
    }
  }
} 