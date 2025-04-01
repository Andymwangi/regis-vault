'use server';

import { db } from '../db';
import { ocrResults } from '../../server/db/schema/schema';
import { databases, storage, STORAGE_BUCKETS, DATABASES, COLLECTIONS } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import { eq } from 'drizzle-orm';
import { createWorker } from 'tesseract.js';
import PDFParse from 'pdf-parse';

export async function processOCR(fileId: string, fileUrl: string) {
  try {
    // Update status to processing
    await db
      .update(ocrResults)
      .set({
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(ocrResults.fileId, fileId));
    
    // Download the file from Appwrite Storage
    const fileBuffer = await storage.getFileDownload(
      STORAGE_BUCKETS.FILES,
      fileId
    );

    // Get file information to determine its type
    const fileInfo = await storage.getFile(
      STORAGE_BUCKETS.FILES,
      fileId
    );
    
    const startTime = Date.now();
    let text = '';
    let confidence = 0;
    let pageCount = 1;
    
    // Process based on file type
    if (fileInfo.mimeType === 'application/pdf') {
      // Process PDF with pdf-parse
      try {
        // Convert fileBuffer (string) to Buffer for pdf-parse
        const buffer = Buffer.from(fileBuffer);
        const pdfData = await PDFParse(buffer);
        text = pdfData.text;
        confidence = 95; // Typically high confidence for PDFs with clear text
        pageCount = pdfData.numpages || 1;
        
        console.log(`PDF processed: ${pageCount} pages, ${text.length} characters`);
      } catch (error) {
        const pdfError = error as Error;
        console.error('PDF parsing error:', pdfError);
        throw new Error(`PDF parsing failed: ${pdfError.message}`);
      }
    } else {
      // Process image with Tesseract.js
      try {
        const worker = await createWorker('eng');
        const result = await worker.recognize(fileBuffer);
        text = result.data.text;
        confidence = Math.round(result.data.confidence);
        
        // Terminate worker
        await worker.terminate();
        
        console.log(`Image processed: ${text.length} characters, confidence: ${confidence}%`);
      } catch (error) {
        const imgError = error as Error;
        console.error('Tesseract processing error:', imgError);
        throw new Error(`Image OCR failed: ${imgError.message}`);
      }
    }

    const processingTime = Date.now() - startTime;
    
    // Update PostgreSQL with OCR results
    await db
      .update(ocrResults)
      .set({
        text,
        confidence,
        language: 'eng',
        pageCount,
        status: 'completed',
        processingTime,
        updatedAt: new Date(),
      })
      .where(eq(ocrResults.fileId, fileId));

    // Update Appwrite OCR result status
    const appwriteOcrResult = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.OCR_RESULTS,
      [Query.equal('fileId', fileId)]
    );

    if (appwriteOcrResult.documents.length > 0) {
      await databases.updateDocument(
        DATABASES.MAIN,
        COLLECTIONS.OCR_RESULTS,
        appwriteOcrResult.documents[0].$id,
        {
          status: 'completed',
          updatedAt: new Date().toISOString(),
        }
      );
    }

    return {
      text,
      confidence,
      language: 'eng',
      pageCount,
      processingTime,
    };
  } catch (error) {
    console.error('Error processing OCR:', error);

    // Update error status in PostgreSQL
    await db
      .update(ocrResults)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        updatedAt: new Date(),
      })
      .where(eq(ocrResults.fileId, fileId));

    // Update error status in Appwrite
    const appwriteOcrResult = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.OCR_RESULTS,
      [Query.equal('fileId', fileId)]
    );

    if (appwriteOcrResult.documents.length > 0) {
      await databases.updateDocument(
        DATABASES.MAIN,
        COLLECTIONS.OCR_RESULTS,
        appwriteOcrResult.documents[0].$id,
        {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          updatedAt: new Date().toISOString(),
        }
      );
    }

    throw error;
  }
}

export async function getOCRResult(fileId: string) {
  try {
    const [ocrResult] = await db
      .select()
      .from(ocrResults)
      .where(eq(ocrResults.fileId, fileId));

    if (!ocrResult) {
      throw new Error('OCR result not found');
    }

    return ocrResult;
  } catch (error) {
    console.error('Error getting OCR result:', error);
    throw error;
  }
}

export async function getOCRStatus(fileId: string) {
  try {
    const [ocrResult] = await db
      .select({
        status: ocrResults.status,
        error: ocrResults.error,
      })
      .from(ocrResults)
      .where(eq(ocrResults.fileId, fileId));

    if (!ocrResult) {
      throw new Error('OCR result not found');
    }

    return ocrResult;
  } catch (error) {
    console.error('Error getting OCR status:', error);
    throw error;
  }
} 