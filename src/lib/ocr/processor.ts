'use server';

import { createAdminClient } from '../appwrite';
import { fullConfig } from '../appwrite/config';
import { ID, Query } from 'node-appwrite';
import path from 'path';
// Fix PDF-parse import to avoid loading test files
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

// Completely disable Tesseract worker loading - we'll use the system installation instead
if (typeof process !== 'undefined') {
  process.env.DISABLE_TESSERACT = 'true';
  console.log('Using system-installed Tesseract OCR through API endpoint instead of Tesseract.js worker.');
}

// Process image with OCR - using external HTTP API
async function processImageWithOCR(imageBuffer: ArrayBuffer, language: string = 'eng', fileId?: string) {
  console.log(`Processing image with ${language} language model via OCR API`);
  
  // STEP 1: Convert image buffer to base64 for API transmission
  const base64Image = Buffer.from(imageBuffer).toString('base64');
  
  try {
    // STEP 2: Determine the endpoint URL with fallbacks
    let apiEndpoint;
    
    // Try to use the configured base URL, with fallbacks
    if (process.env.NEXT_PUBLIC_APP_URL) {
      apiEndpoint = new URL('/api/ocr/process-image', process.env.NEXT_PUBLIC_APP_URL).toString();
    } else if (process.env.VERCEL_URL) {
      apiEndpoint = `https://${process.env.VERCEL_URL}/api/ocr/process-image`;
    } else {
      // Use local development URL as a last resort
      apiEndpoint = 'http://localhost:3000/api/ocr/process-image';
    }
    
    console.log(`Using OCR API endpoint: ${apiEndpoint}`);
    
    // STEP 3: Make API request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': process.env.INTERNAL_API_KEY || 'dev-key',
      },
      body: JSON.stringify({
        image: base64Image,
        language: language,
        fileId: fileId, // Pass the fileId for tracing
      }),
      // Add timeout
      signal: AbortSignal.timeout(60000), // 60 second timeout (Tesseract can be slow)
    });
    
    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = errorData.message || errorData.error || '';
      } catch (e) {
        // Ignore JSON parsing error
      }
      
      throw new Error(`OCR API error ${response.status}: ${errorDetails || response.statusText}`);
    }
    
    // STEP 4: Parse API response
    const result = await response.json();
    
    if (result.error) {
      throw new Error(`OCR processing error: ${result.text}`);
    }
    
    console.log(`Image processed via API: ${result.text?.length || 0} characters, confidence: ${result.confidence || 0}%`);
    
    return {
      text: result.text || '',
      confidence: result.confidence || 0
    };
  } catch (error) {
    console.error('OCR API processing error:', error);
    
    // FALLBACK: Return a helpful error message
    return {
      text: "OCR processing encountered an error. Please verify that Tesseract OCR is installed on the server and properly added to the system PATH.",
      confidence: 0
    };
  }
}

export async function processOCR(fileId: string, fileUrl: string) {
  const { databases, storage } = await createAdminClient();
  const startTime = Date.now(); // Add tracking of start time for the whole process
  
  try {
    // Get OCR document from Appwrite
    const ocrResults = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [Query.equal('fileId', [fileId])]
    );
    
    if (ocrResults.documents.length === 0) {
      // Get file information
      const fileInfo = await databases.getDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        fileId
      );
      
      // Create OCR document if it doesn't exist
      await databases.createDocument(
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
    } else {
      // Update status to processing
      await databases.updateDocument(
        fullConfig.databaseId,
        fullConfig.ocrResultsCollectionId,
        ocrResults.documents[0].$id,
        {
          status: 'processing',
          updatedAt: new Date().toISOString()
        }
      );
    }
    
    // Get file information
    const fileInfo = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    // Download the file from Appwrite Storage
    const bucketFileId = fileInfo.bucketFieldId;
    const fileBuffer = await storage.getFileDownload(
      fullConfig.storageId,
      bucketFileId
    );
    
    let text = '';
    let confidence = 0;
    let pageCount = 1;
    
    // Process based on file type
    if (fileInfo.type === 'document' && fileInfo.extension === 'pdf') {
      // Process PDF with pdf-parse
      try {
        // Convert fileBuffer to Buffer for pdf-parse
        const buffer = Buffer.from(fileBuffer);
        const pdfData = await pdfParse(buffer, {
          // Prevent loading default test files
          max: 0
        });
        text = pdfData.text;
        confidence = 95; // Typically high confidence for PDFs with clear text
        pageCount = pdfData.numpages || 1;
        
        console.log(`PDF processed: ${pageCount} pages, ${text.length} characters`);
      } catch (error) {
        const pdfError = error as Error;
        console.error('PDF parsing error:', pdfError);
        throw new Error(`PDF parsing failed: ${pdfError.message}`);
      }
    } else if (fileInfo.type === 'image') {
      try {
        console.log('Processing image via server-side approach');
        console.log(`File info: ${fileInfo.name}, type: ${fileInfo.type}, size: ${fileInfo.size}`);
        
        // Process image with our OCR function
        const ocrResult = await processImageWithOCR(fileBuffer, 'eng', fileId);
        text = ocrResult.text;
        confidence = ocrResult.confidence;
        
        if (!text || text.trim() === '') {
          text = '[No text could be extracted from this image]';
          confidence = 0;
        }
        
        console.log(`Image processed: ${text.length} characters, confidence: ${confidence}%`);
      } catch (error) {
        console.error('OCR processing error:', error);
        
        // Return a more helpful error message
        text = "OCR processing encountered an error. Please ensure Tesseract OCR is installed on the server and properly added to the system PATH.";
        confidence = 0;
        console.warn('Using fallback error text for failed OCR');
      }
    } else {
      throw new Error('Unsupported file type for OCR');
    }

    const processingTime = Date.now() - startTime;
    
    // Update OCR results in Appwrite
    const updatedOcrResults = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [Query.equal('fileId', [fileId])]
    );
    
    if (updatedOcrResults.documents.length > 0) {
      await databases.updateDocument(
        fullConfig.databaseId,
        fullConfig.ocrResultsCollectionId,
        updatedOcrResults.documents[0].$id,
        {
          text,
          confidence,
          status: 'completed',
          processingTime: processingTime,
          pageCount: pageCount,
          fileName: fileInfo.name,
          fileType: fileInfo.type,
          metadata: JSON.stringify({
            extension: fileInfo.extension || '',
            fileSize: fileInfo.size || 0,
            mimeType: fileInfo.mimeType || '',
            processingDate: new Date().toISOString()
          }),
          updatedAt: new Date().toISOString(),
        }
      );
    } else {
      // Create new OCR document with results
      const processingTime = Date.now() - startTime;
      
      await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.ocrResultsCollectionId,
        ID.unique(),
        {
          fileId,
          text,
          confidence,
          status: 'completed',
          processingTime: processingTime,
          pageCount: pageCount,
          fileName: fileInfo.name,
          fileType: fileInfo.type,
          metadata: JSON.stringify({
            extension: fileInfo.extension || '',
            fileSize: fileInfo.size || 0,
            mimeType: fileInfo.mimeType || '',
            processingDate: new Date().toISOString()
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
    }

    return {
      text,
      confidence,
      pageCount,
      processingTime,
    };
  } catch (error) {
    console.error('Error processing OCR:', error);

    // Update error status in Appwrite
    const ocrResults = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [Query.equal('fileId', [fileId])]
    );

    if (ocrResults.documents.length > 0) {
      await databases.updateDocument(
        fullConfig.databaseId,
        fullConfig.ocrResultsCollectionId,
        ocrResults.documents[0].$id,
        {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          processingTime: Date.now() - startTime,
          metadata: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
            timestamp: Date.now()
          }),
          updatedAt: new Date().toISOString()
        }
      );
    } else {
      // Create new OCR document with error status
      await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.ocrResultsCollectionId,
        ID.unique(),
        {
          fileId,
          text: "",
          confidence: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          processingTime: 0,
          pageCount: 0,
          fileName: "error-document.txt",  // Default values
          fileType: "unknown",
          metadata: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
            timestamp: Date.now()
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
    }

    throw error;
  }
}

export async function getOCRResult(fileId: string) {
  const { databases } = await createAdminClient();
  
  try {
    const ocrResults = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [Query.equal('fileId', [fileId])]
    );

    if (ocrResults.documents.length === 0) {
      throw new Error('OCR result not found');
    }

    return ocrResults.documents[0];
  } catch (error) {
    console.error('Error getting OCR result:', error);
    throw error;
  }
}

export async function getOCRStatus(fileId: string) {
  const { databases } = await createAdminClient();
  
  try {
    const ocrResults = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [Query.equal('fileId', [fileId])]
    );

    if (ocrResults.documents.length === 0) {
      throw new Error('OCR status not found');
    }

    return {
      status: ocrResults.documents[0].status,
      error: ocrResults.documents[0].error || null
    };
  } catch (error) {
    console.error('Error getting OCR status:', error);
    throw error;
  }
}