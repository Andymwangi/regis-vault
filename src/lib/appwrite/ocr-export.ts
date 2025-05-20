'use server';

import { ID } from 'node-appwrite';
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from './index';
import { fullConfig } from './config';
import { getOcrResult } from './ocr-operations';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/user.actions';

/**
 * Export OCR results as a PDF file by using the API route
 */
export async function exportOcrAsPdf(
  fileId: string,
  fileName: string,
  path: string = '/dashboard/tools/ocr'
) {
  const { databases, storage } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    // Get OCR result
    const ocrResult = await getOcrResult(fileId);
    
    if (!ocrResult || !ocrResult.text) {
      throw new Error('OCR result not found or processing not complete');
    }
    
    // Generate document using API route
    const response = await fetch('/api/documents/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: ocrResult.text,
        title: fileName,
        format: 'pdf'
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
    }
    
    // Get buffer from response
    const pdfBuffer = await response.arrayBuffer();
    
    // Upload to storage
    const inputFile = InputFile.fromBuffer(Buffer.from(pdfBuffer), `${fileName}.pdf`);
    const pdfFile = await storage.createFile(
      fullConfig.storageId,
      ID.unique(),
      inputFile
    );
    
    // Create file document
    const fileData = {
      name: `${fileName}.pdf`,
      type: 'document',
      extension: 'pdf',
      size: pdfBuffer.byteLength,
      url: `${fullConfig.endpoint}/storage/buckets/${fullConfig.storageId}/files/${pdfFile.$id}/view?project=${fullConfig.projectId}`,
      ownerId: currentUser.$id,
      sharedWith: [],
      bucketFieldId: pdfFile.$id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };
    
    const fileDocument = await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      ID.unique(),
      fileData
    );
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return fileDocument;
  } catch (error) {
    console.error('Error exporting OCR as PDF:', error);
    throw new Error('Failed to export OCR as PDF');
  }
}

/**
 * Export OCR results as a DOCX file by using the API route
 */
export async function exportOcrAsDocx(
  fileId: string,
  fileName: string,
  path: string = '/dashboard/tools/ocr'
) {
  const { databases, storage } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    // Get OCR result
    const ocrResult = await getOcrResult(fileId);
    
    if (!ocrResult || !ocrResult.text) {
      throw new Error('OCR result not found or processing not complete');
    }
    
    // Generate document using API route
    const response = await fetch('/api/documents/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: ocrResult.text,
        title: fileName,
        format: 'docx'
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to generate DOCX: ${error.message || 'Unknown error'}`);
    }
    
    // Get buffer from response
    const docxBuffer = await response.arrayBuffer();
    
    // Upload to storage
    const inputFile = InputFile.fromBuffer(Buffer.from(docxBuffer), `${fileName}.docx`);
    const docxFile = await storage.createFile(
      fullConfig.storageId,
      ID.unique(),
      inputFile
    );
    
    // Create file document
    const fileData = {
      name: `${fileName}.docx`,
      type: 'document',
      extension: 'docx',
      size: docxBuffer.byteLength,
      url: `${fullConfig.endpoint}/storage/buckets/${fullConfig.storageId}/files/${docxFile.$id}/view?project=${fullConfig.projectId}`,
      ownerId: currentUser.$id,
      sharedWith: [],
      bucketFieldId: docxFile.$id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };
    
    const fileDocument = await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      ID.unique(),
      fileData
    );
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return fileDocument;
  } catch (error) {
    console.error('Error exporting OCR as DOCX:', error);
    throw new Error('Failed to export OCR as DOCX');
  }
}

// Emergency fallback function if API route approach fails
export async function createSimpleTextBuffer(text: string, title: string): Promise<Buffer> {
  const content = `${title}\n\nCreated on: ${new Date().toISOString().split('T')[0]}\n\n${text}`;
  return Buffer.from(content, 'utf-8');
}