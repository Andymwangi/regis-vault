'use server';

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import { promisify } from 'util';
import { rateLimitMiddleware } from '@/middleware/rate-limit';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';

// Use promisify to convert exec to promise-based
const execAsync = promisify(exec);

// Define temporary directory
const TMP_DIR = os.tmpdir();

/**
 * API route that processes OCR requests using the system's Tesseract installation
 */
export async function POST(request: Request) {
  try {
    console.log('[OCR-API] Starting OCR processing using system Tesseract');
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request format', details: 'JSON parsing failed' },
        { status: 400 }
      );
    }

    const { fileId, language = 'eng', useAdvanced = false } = requestBody;

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing fileId parameter' },
        { status: 400 }
      );
    }

    console.log(`[OCR-API] Processing file ID: ${fileId} with language: ${language}, advanced mode: ${useAdvanced}`);
    
    try {
      // 1. Get file information from Appwrite
      const { databases, storage } = await createAdminClient();
      
      // Get file details
      const fileInfo = await databases.getDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        fileId
      );
      
      console.log(`[OCR-API] File info: ${fileInfo.name}, type: ${fileInfo.type}`);
      
      // Create an OCR document or update status
      // Create an OCR document or update status
      // Create an OCR document or update status
let ocrDocId = '';
try {
  const ocrResults = await databases.listDocuments(
    fullConfig.databaseId,
    fullConfig.ocrResultsCollectionId,
    [Query.equal('fileId', fileId)]
  )
  
  if (ocrResults.documents.length === 0) {
    // Create new OCR document
    const newOcrDoc = await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      ID.unique(),
      {
        fileId,
        text: "",
        confidence: 0,
        status: 'processing',
        processingTime: 0,
        pageCount: 0,
        fileName: fileInfo.name,
        fileType: fileInfo.type,
        metadata: JSON.stringify({
          initializing: true,
          fileSize: fileInfo.size,
          extension: fileInfo.extension || ''
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    ocrDocId = newOcrDoc.$id;
  } else {
    // Update existing document
    ocrDocId = ocrResults.documents[0].$id;
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      ocrDocId,
      {
        status: 'processing',
        updatedAt: new Date().toISOString()
      }
    );
  }
} catch (dbError) {
  console.error('[OCR-API] Database operation error:', dbError);
  throw dbError;
}
      console.log(`[OCR-API] OCR document created/updated with ID: ${ocrDocId}`);
      
      // Process the file in the background and return the document ID
      // This allows long-running OCR processes to continue in the background
      processFileWithOCR(fileId, fileInfo, databases, storage)
        .catch(error => {
          console.error('[OCR-API] Background OCR processing error:', error);
        });
      
      // Return immediate success response with the doc ID
      return NextResponse.json({
        success: true,
        message: 'OCR processing initiated successfully',
        ocrDocId: ocrDocId
      });
      
    } catch (error) {
      console.error('[OCR-API] Error with OCR processing:', error);
      return NextResponse.json(
        { 
          error: 'OCR processing error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[OCR-API] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Process file with OCR in the background
async function processFileWithOCR(fileId: string, fileInfo: any, databases: any, storage: any) {
  const startTime = Date.now();
  let text = '';
  let confidence = 0;
  let pageCount = 1;
  let error = null;
  
  try {
    console.log(`[OCR-API] Starting background OCR for file: ${fileInfo.name}`);
    const bucketFileId = fileInfo.bucketFieldId;
    
    // Download the file
    const fileBuffer = await storage.getFileDownload(
      fullConfig.storageId,
      bucketFileId
    );
    
    // Process based on file type
    if (fileInfo.type === 'document' && fileInfo.extension === 'pdf') {
      // PDF processing with pdf-parse
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const buffer = Buffer.from(fileBuffer);
      const pdfData = await pdfParse(buffer, { max: 0 });
      text = pdfData.text;
      confidence = 95;
      pageCount = pdfData.numpages || 1;
      console.log(`[OCR-API] PDF processed: ${pageCount} pages, ${text.length} characters`);
    } 
    else if (fileInfo.type === 'image') {
      console.log(`[OCR-API] Processing image with system Tesseract`);
      
      // For images, use system tesseract directly
      // Save image to temporary file
      const tempFileName = `ocr-${uuidv4()}`;
      const imgPath = join(TMP_DIR, `${tempFileName}.png`);
      const outputPath = join(TMP_DIR, `${tempFileName}`);
      
      try {
        // Write image to temp file
        await writeFile(imgPath, Buffer.from(fileBuffer));
        console.log(`[OCR-API] Image saved to ${imgPath}`);
        
        // Check if tesseract is available and get version
        try {
          const { stdout: versionOutput } = await execAsync('tesseract --version');
          console.log(`[OCR-API] Using Tesseract version: ${versionOutput.split('\n')[0]}`);
        } catch (versionError) {
          console.error('[OCR-API] Tesseract not found on system PATH:', versionError);
          throw new Error('Tesseract not installed or not in PATH. Install Tesseract OCR and ensure it is added to system PATH.');
        }
        
        // Run tesseract command directly
        const language = 'eng'; // Default to English
        const psm = '3'; // Page segmentation mode: 3 = auto
        const oem = '1'; // OCR Engine mode: 1 = LSTM only
        
        // Build a tesseract command with proper quotes for Windows paths
        const command = `tesseract "${imgPath}" "${outputPath}" -l ${language} --psm ${psm} --oem ${oem}`;
        console.log(`[OCR-API] Running Tesseract command: ${command}`);
        
        const { stdout, stderr } = await execAsync(command);
        console.log(`[OCR-API] Tesseract stdout: ${stdout}`);
        if (stderr) console.log(`[OCR-API] Tesseract stderr: ${stderr}`);
        
        // Read the output file
        const textPath = `${outputPath}.txt`;
        console.log(`[OCR-API] Reading OCR result from: ${textPath}`);
        text = await readFile(textPath, 'utf-8');
        confidence = 70; // Default confidence since tesseract command doesn't provide this
        
        // Clean up temp files
        await unlink(imgPath).catch(() => {});
        await unlink(textPath).catch(() => {});
        
        console.log(`[OCR-API] OCR completed: ${text.length} characters`);
      } catch (ocrError) {
        console.error('[OCR-API] System Tesseract error:', ocrError);
        throw ocrError;
      }
    } else {
      throw new Error(`Unsupported file type for OCR: ${fileInfo.type}`);
    }
  } catch (processError) {
    console.error('[OCR-API] Error in OCR processing:', processError);
    error = processError instanceof Error ? processError : new Error(String(processError));
    text = `OCR processing failed: ${error instanceof Error ? error.message : String(error)}`;
    confidence = 0;
  }
  
  // Calculate processing time
  const processingTime = Date.now() - startTime;
  
  // Update the OCR document with results
  try {
    const status = error ? 'failed' : 'completed';
    
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      // Get the document ID again to ensure we have the latest
      (await databases.listDocuments(
        fullConfig.databaseId, 
        fullConfig.ocrResultsCollectionId,
        [Query.equal('fileId', fileId)]
      )).documents[0].$id,
      {
        text,
        confidence,
        status,
        processingTime,
        pageCount,
        error: error instanceof Error ? error.message : String(error),
        metadata: JSON.stringify({
          extension: fileInfo.extension || '',
          fileSize: fileInfo.size || 0,
          mimeType: fileInfo.mimeType || '',
          error: error instanceof Error ? error.message : String(error),
          processingMethod: fileInfo.type === 'image' ? 'system-tesseract' : 'pdf-parse',
          processingDate: new Date().toISOString()
        }),
        updatedAt: new Date().toISOString()
      }
    );
    
    console.log(`[OCR-API] OCR document updated with status: ${status}, text length: ${text.length}`);
  } catch (updateError) {
    console.error('[OCR-API] Error updating OCR document:', updateError);
  }
} 