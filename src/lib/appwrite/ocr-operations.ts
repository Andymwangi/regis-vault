"use server";

import { ID, Query } from 'node-appwrite';
import { InputFile } from "node-appwrite/file";
import { createAdminClient, createSessionClient } from './index';
import { fullConfig } from './config';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { AppwriteOcrResult } from './schema';
import { createWorker } from 'tesseract.js';
// Fix PDF-parse import to avoid loading test files
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
// Add pdfjs for PDF image extraction
import * as pdfjsLib from 'pdfjs-dist';
// Add canvas for Node.js environment
import { createCanvas } from 'canvas';

// Improve compatibility with serverless environments
if (typeof window === 'undefined') {
  // This is necessary for Tesseract.js to work in a serverless environment
  global.navigator = { userAgent: 'node' } as any;
  
  // Set the data path prefix for Tesseract
  if (typeof process !== 'undefined') {
    process.env.TESSDATA_PREFIX = 'https://tessdata.projectnaptha.com/4.0.0';
  }
}

// Add better logging for diagnostic purposes
const ocrLogger = {
  debug: (message: string, data?: any) => {
    if (data) {
      console.log(`[OCR-DEBUG] ${message}`, data);
    } else {
      console.log(`[OCR-DEBUG] ${message}`);
    }
  },
  info: (message: string, data?: any) => {
    if (data) {
      console.log(`[OCR-INFO] ${message}`, data);
    } else {
      console.log(`[OCR-INFO] ${message}`);
    }
  },
  warn: (message: string, data?: any) => {
    if (data) {
      console.warn(`[OCR-WARN] ${message}`, data);
    } else {
      console.warn(`[OCR-WARN] ${message}`);
    }
  },
  error: (message: string, err?: any) => {
    if (err) {
      console.error(`[OCR-ERROR] ${message}`, err);
      if (err instanceof Error) {
        console.error(`[OCR-ERROR-DETAILS] ${err.message}\n${err.stack}`);
      }
    } else {
      console.error(`[OCR-ERROR] ${message}`);
    }
  }
};

// Check for Node.js environment and ensure paths are properly configured
if (typeof process !== 'undefined' && typeof window === 'undefined') {
  try {
    const tesseractJsPath = require.resolve('tesseract.js');
    ocrLogger.debug('Tesseract.js resolved at:', tesseractJsPath);
    
    // Try to resolve worker paths
    const nodeModule = process.cwd().includes('.next') ? 
      '../../node_modules' : '../node_modules';
    
    // Attempt to verify worker file exists
    try {
      const fs = require('fs');
      const workerPath = require.resolve('tesseract.js/dist/worker.min.js');
      ocrLogger.debug('Tesseract worker resolved at:', workerPath);
    } catch (err) {
      ocrLogger.warn('Could not resolve tesseract.js worker:', err);
    }
  } catch (err) {
    ocrLogger.error('Error resolving tesseract.js modules:', err);
  }
}

// Submit a document for OCR processing
export async function submitForOcr(
  fileId: string, 
  path: string = '/dashboard/tools/ocr',
  settings?: {
    language?: string;
    quality?: number;
    documentType?: string;
    advancedMode?: boolean;
  }
) {
  const { databases, storage } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    // Check if OCR already exists
    const existingOcrResults = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [Query.equal('fileId', [fileId])]
    );
    
    // If OCR results already exist, return them
    if (existingOcrResults.documents.length > 0) {
      return existingOcrResults.documents[0];
    }
    
    // Get file details
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    console.log('File details for OCR:', {
      id: file.$id,
      name: file.name,
      fields: Object.keys(file),
      bucket: file.bucketFileId || file.bucketId || file.storageId,
      settings
    });
    
    // Dump full file object for debugging
    console.log('Full file object keys:', Object.keys(file));
    console.log('Raw file values:', Object.entries(file).map(([k, v]) => 
      `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`
    ).join('\n'));
    
    // Check if user has access
    const hasAccess = 
      file.ownerId === currentUser.$id || 
      (Array.isArray(file.sharedWith) && file.sharedWith.includes(currentUser.$id)) ||
      currentUser.role === 'admin';
    
    if (!hasAccess) {
      throw new Error('Permission denied');
    }
    
    // Get the bucket file ID from all possible field names - IMPORTANT: bucketFieldId is the correct field name (with F not f)
    const bucketFileId = file.bucketFieldId || file.bucketFileId || file.bucketId || file.storageId;
    
    if (!bucketFileId) {
      throw new Error('File storage ID not found');
    }
    
    // Create OCR record with initial status
    const ocrData = {
      fileId,
      text: "",
      confidence: 0,
      status: 'processing',
      processingTime: 0,
      pageCount: 0,
      fileName: file.name,
      fileType: file.type,
      metadata: JSON.stringify({
        initializing: true,
        fileSize: file.size,
        extension: file.extension || '',
        bucketFieldId: file.bucketFieldId,  // Store with correct field name
        bucketFileId: bucketFileId,         // Also store the resolved ID
        language: settings?.language || 'eng',
        quality: settings?.quality || 75,
        documentType: settings?.documentType || 'general',
        advancedMode: settings?.advancedMode === true,
        possibleIds: {                      // Store all possible IDs for debugging
          bucketFieldId: file.bucketFieldId,
          bucketFileId: file.bucketFileId,
          bucketId: file.bucketId,
          storageId: file.storageId
        }
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const ocrResult = await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      ID.unique(),
      ocrData
    );
    
    // Extract language setting
    const ocrLanguage = settings?.language || 'eng';
    
    // Process OCR in the background
    processOcrInBackground(fileId, bucketFileId, ocrLanguage)
      .catch(error => {
        console.error('Error processing OCR in background:', error);
      });
    
    return ocrResult;
  } catch (error) {
    console.error('Error submitting for OCR:', error);
    throw new Error('Failed to submit for OCR');
  }
}

// Process OCR in the background
export async function processOcrInBackground(fileId: string, bucketFileId: string, language: string = 'eng') {
  const { databases, storage } = await createAdminClient();
  const startTime = Date.now(); // Add tracking of start time for the whole process
  
  try {
    // Get the OCR record
    const ocrResults = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [Query.equal('fileId', [fileId])]
    );
    
    if (ocrResults.documents.length === 0) {
      throw new Error('OCR record not found');
    }
    
    const ocrResult = ocrResults.documents[0];
    
    // Try to get bucket file ID and other settings from metadata if available
    let metadataBucketId = null;
    let metadataLanguage = 'eng';
    let advancedMode = false;
    
    try {
      const metadata = JSON.parse(ocrResult.metadata || '{}');
      metadataBucketId = metadata.bucketFileId;
      metadataLanguage = metadata.language || 'eng';
      advancedMode = metadata.advancedMode === true;
    } catch (e) {
      console.warn('Could not parse OCR metadata', e);
    }
    
    // Use the language from metadata or default to English
    language = metadataLanguage || language;
    console.log(`Using language for OCR: ${language}, Advanced mode: ${advancedMode}`);
    
    // Update OCR status to indicate processing has started
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      ocrResult.$id,
      {
        status: 'processing',
        updatedAt: new Date().toISOString()
      }
    );
    
    // Get file to process
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );

    // Debug the entire file object
    console.log('Raw file object fields:', Object.entries(file).map(([key, value]) => 
      `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
    ).join(', '));

    // Log the file structure to debug file ID issues
    console.log('File document structure:', {
      id: file.$id,
      name: file.name,
      availableFields: Object.keys(file),
      bucketFieldId: file.bucketFieldId,
      bucketFileId: file.bucketFileId,
      bucketId: file.bucketId,
      storageId: file.storageId,
      providedBucketFileId: bucketFileId,
      metadataBucketId
    });

    // Ensure we have a valid bucket file ID - checking all possible sources
    const fileBucketId = file.bucketFieldId || file.bucketFileId || file.bucketId || metadataBucketId || bucketFileId;
    
    if (!fileBucketId) {
      throw new Error('File storage ID not found');
    }
    
    // Download file content - updated method
    console.log(`Attempting to download file with ID: ${fileBucketId}`);
    const fileUrl = `${fullConfig.endpoint}/storage/buckets/${fullConfig.storageId}/files/${fileBucketId}/download?project=${fullConfig.projectId}`;
    
    const response = await fetch(fileUrl, {
      headers: {
        'X-Appwrite-Project': fullConfig.projectId,
        'X-Appwrite-Key': process.env.APPWRITE_API_KEY || ''
      }
    });
    
    if (!response.ok) {
      // Try alternative download method if direct download fails
      console.log(`Direct download failed (${response.status}), trying alternative method...`);
      
      try {
        // Try getting file view instead of download
        const viewUrl = `${fullConfig.endpoint}/storage/buckets/${fullConfig.storageId}/files/${fileBucketId}/view?project=${fullConfig.projectId}`;
        const viewResponse = await fetch(viewUrl, {
          headers: {
            'X-Appwrite-Project': fullConfig.projectId,
            'X-Appwrite-Key': process.env.APPWRITE_API_KEY || ''
          }
        });
        
        if (!viewResponse.ok) {
          throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
        }
        
        var fileBuffer = await viewResponse.arrayBuffer();
      } catch (fallbackError) {
        console.error('Alternative download method failed:', fallbackError);
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
    } else {
      var fileBuffer = await response.arrayBuffer();
    }
    
    if (!fileBuffer || fileBuffer.byteLength === 0) {
      throw new Error('Downloaded file is empty');
    }
    
    // Process based on file type
    let text = '';
    let confidence = 0;
    let pageCount = 1;
    let metadata = JSON.stringify({});
    
    if (file.type === 'document' && file.extension === 'pdf') {
      // Process PDF with pdf-parse
      const buffer = Buffer.from(fileBuffer);
      console.log('Processing PDF document of size:', buffer.length, 'bytes');
      try {
        const pdfData = await pdfParse(buffer, {
          // Prevent loading default test files
          max: 0
        });
        text = pdfData.text;
        
        // If no text was extracted, PDF might be a scanned image
        if (!text || text.trim() === '') {
          console.log('PDF appears to be a scanned document, attempting direct OCR...');
          
          try {
            // Try multiple languages if in advanced mode
            const languagesToTry = advancedMode 
              ? [language, 'eng', 'deu', 'fra', 'spa'] // Try multiple languages in advanced mode
              : [language, 'eng'];
            
            let bestText = '';
            let bestConfidence = 0;
            
            // Try each language - simplified approach
            for (const lang of languagesToTry) {
              if (bestText && bestConfidence > 70) break; // Stop if we already have good results
              
              try {
                console.log(`Processing PDF with Tesseract OCR using ${lang}...`);
                const worker = await createWorker(lang);
                
                // Set parameters
                await worker.setParameters({
                  tessedit_char_whitelist: '', // All characters allowed
                  preserve_interword_spaces: '1',
                  tessjs_create_txt: '1',
                  user_defined_dpi: advancedMode ? '400' : '300', // Higher DPI in advanced mode
                });
                
                // Process the PDF buffer directly
                const result = await worker.recognize(buffer);
                await worker.terminate();
                
                if (result.data.text && result.data.text.trim() !== '') {
                  const currentText = result.data.text;
                  const currentConfidence = result.data.confidence;
                  
                  // Keep the better result
                  if (currentConfidence > bestConfidence || 
                     (currentText.length > bestText.length * 1.2 && currentConfidence > bestConfidence * 0.8)) {
                    bestText = currentText;
                    bestConfidence = currentConfidence;
                    console.log(`Better result found with language ${lang}: ${bestConfidence}% confidence, ${bestText.length} chars`);
                  }
                }
              } catch (langError) {
                console.error(`Error processing with language ${lang}:`, langError);
                // Continue with next language
              }
            }
            
            if (bestText && bestText.trim() !== '') {
              text = bestText;
              confidence = bestConfidence;
              console.log(`Successfully extracted text using direct OCR. Confidence: ${confidence}%, length: ${text.length} chars`);
            } else {
              text = '[No text could be extracted from this PDF. It may be a low-quality scan or contain non-text elements.]';
              confidence = 0;
            }
          } catch (ocrError) {
            console.error('Error performing OCR on PDF:', ocrError);
            text = '[No text could be extracted from this PDF. It may be a scanned image PDF.]';
            confidence = 0;
          }
        } else {
          confidence = 95; // Typically high confidence for PDFs with clear text
        }
        
        pageCount = pdfData.numpages || 1;
        console.log(`PDF processed: ${pageCount} pages, text length: ${text.length} chars`);
      } catch (pdfError: any) {
        console.error('Error parsing PDF:', pdfError);
        throw new Error(`Failed to parse PDF: ${pdfError.message || 'Unknown PDF parsing error'}`);
      }
    } else if (file.type === 'image') {
      // Process image with Tesseract.js
      console.log('Processing image with Tesseract OCR, size:', fileBuffer.byteLength, 'bytes');
      
      // Function to create a worker and process an image with enhanced settings
      const processImageWithOCR = async (imageBuffer: ArrayBuffer, lang: string) => {
        ocrLogger.info(`Creating Tesseract worker with language: ${lang}`);
        
        // Simpler worker creation approach for serverless compatibility
        try {
          // Create worker with specific language
          ocrLogger.debug('Initializing Tesseract worker');
          const worker = await createWorker(lang);
          
          // Set advanced parameters for better text recognition
          ocrLogger.debug('Setting Tesseract parameters for better recognition');
          await worker.setParameters({
            tessedit_char_whitelist: '', // All characters allowed
            preserve_interword_spaces: '1',
            tessjs_create_txt: '1',
            user_defined_dpi: advancedMode ? '400' : '300', // Higher DPI in advanced mode
          });
          
          ocrLogger.info('OCR engine initialized, starting recognition...');
          
          // Process image
          const result = await worker.recognize(Buffer.from(imageBuffer));
          const extractedText = result.data.text;
          const extractedConfidence = result.data.confidence;
          
          // Clean up
          ocrLogger.debug('Terminating Tesseract worker');
          await worker.terminate();
          
          ocrLogger.info('OCR processing completed successfully', {
            textLength: extractedText?.length || 0,
            confidence: extractedConfidence || 0
          });
          
          return {
            text: extractedText || '',
            confidence: extractedConfidence || 0
          };
        } catch (error) {
          ocrLogger.error('Error in Tesseract worker', error);
          
          return {
            text: '[Error processing image - OCR engine initialization failed]',
            confidence: 0
          };
        }
      };
      
      try {
        // Attempt OCR with multiple processing approaches for best results
        const defaultResult = await processImageWithOCR(fileBuffer, language);
        
        // If initial processing gives poor results or in advanced mode, try multiple languages
        if (advancedMode || !defaultResult.text || defaultResult.text.trim() === '' || defaultResult.confidence < 40) {
          ocrLogger.info('Using advanced OCR with multiple language models...');
          
          // Try multiple language models
          const alternativeLanguages = advancedMode 
            ? [language, 'eng', 'deu', 'fra', 'spa', 'ita'] // More languages in advanced mode
            : [language, 'eng'];
          let bestResult = defaultResult;
          
          for (const lang of alternativeLanguages) {
            if (lang === language && bestResult.confidence > 0) continue; // Skip language we already tried
            if (bestResult.confidence > 75) break; // Skip if we already have good confidence
            
            ocrLogger.info(`Trying language model: ${lang}`);
            const altResult = await processImageWithOCR(fileBuffer, lang);
            
            // Keep the result with the higher confidence or more substantial text
            if (altResult.confidence > bestResult.confidence || 
               (altResult.text.length > bestResult.text.length * 1.2 && altResult.confidence > bestResult.confidence * 0.7)) {
              bestResult = altResult;
              ocrLogger.info(`Found better result with language '${lang}', confidence: ${bestResult.confidence}%`);
            }
          }
          
          text = bestResult.text;
          confidence = bestResult.confidence;
        } else {
          text = defaultResult.text;
          confidence = defaultResult.confidence;
        }
        
        if (!text || text.trim() === '') {
          ocrLogger.warn('Image processed but no text was extracted after multiple attempts');
          
          // Fallback method - if no text was extracted, try one last approach
          try {
            ocrLogger.info('Attempting fallback extraction method');
            
            // Try a simpler approach with just the base options
            const fallbackWorker = await createWorker('eng');
            
            // Use different settings
            await fallbackWorker.setParameters({
              tessjs_create_txt: '1',
              user_defined_dpi: '400'
            });
            
            ocrLogger.debug('Running fallback OCR');
            const fallbackResult = await fallbackWorker.recognize(Buffer.from(fileBuffer));
            await fallbackWorker.terminate();
            
            if (fallbackResult.data.text && fallbackResult.data.text.trim() !== '') {
              ocrLogger.info('Fallback extraction successful');
              text = fallbackResult.data.text;
              confidence = Math.round(fallbackResult.data.confidence);
            } else {
              text = '[No text could be extracted from this image. It may contain handwriting, low-quality text, or non-text content.]';
              confidence = 0;
            }
          } catch (fallbackError) {
            ocrLogger.error('Fallback extraction also failed', fallbackError);
            text = '[No text could be extracted from this image. It may contain handwriting, low-quality text, or non-text content.]';
            confidence = 0;
          }
        }
        
        ocrLogger.info(`Image processed with confidence: ${confidence}%, text length: ${text.length} chars`);
      } catch (ocrError: any) {
        ocrLogger.error('Error processing image with Tesseract OCR', ocrError);
        throw new Error(`Failed to process image OCR: ${ocrError.message || 'Unknown OCR error'}`);
      }
    } else {
      console.error('Unsupported file type for OCR:', file.type, file.extension);
      throw new Error(`Unsupported file type for OCR: ${file.type}/${file.extension}`);
    }
    
    const processingTime = Date.now() - startTime;
    
    // Update OCR result
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      ocrResult.$id,
      {
        text,
        confidence,
        status: 'completed',
        processingTime: processingTime,
        pageCount: pageCount,
        fileName: file.name,
        fileType: file.type,
        metadata: JSON.stringify({
          extension: file.extension || '',
          fileSize: file.size || 0,
          mimeType: file.mimeType || '',
          processingDate: new Date().toISOString()
        }),
        updatedAt: new Date().toISOString()
      }
    );
    
    return {
      text,
      confidence,
      pageCount,
      processingTime
    };
  } catch (error) {
    console.error('Error processing OCR:', error);
    
    // Update error status
    if (error instanceof Error) {
      const ocrResults = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.ocrResultsCollectionId,
        [Query.equal('fileId', [fileId])]
      );
      
      if (ocrResults.documents.length > 0) {
        // Provide a basic fallback result even when OCR fails
        const fallbackText = "OCR processing failed. Please try again or use the 'Advanced OCR Mode' option for better results with scanned documents.";
        
        await databases.updateDocument(
          fullConfig.databaseId,
          fullConfig.ocrResultsCollectionId,
          ocrResults.documents[0].$id,
          {
            status: 'failed',
            error: error.message,
            text: fallbackText, // Provide some text to display
            confidence: 0,
            processingTime: Date.now() - startTime,
            metadata: JSON.stringify({
              errorType: error.constructor.name,
              errorMessage: error.message,
              errorTimestamp: new Date().toISOString(),
              fallbackApplied: true
            }),
            updatedAt: new Date().toISOString()
          }
        );
      }
    }
    
    throw error;
  }
}

// Get OCR result
export async function getOcrResult(fileId: string) {
  const { databases } = await createAdminClient();
  
  try {
    if (!fileId) {
      return { 
        status: 'error', 
        error: 'File ID is required',
        text: '',
        confidence: 0,
      };
    }
    
    const ocrResults = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [Query.equal('fileId', [fileId])]
    );
    
    if (ocrResults.documents.length === 0) {
      return {
        status: 'not_found',
        error: 'OCR result not found',
        text: '',
        confidence: 0,
      };
    }
    
    const result = ocrResults.documents[0];
    
    // If OCR is not completed yet, return appropriate status
    if (result.status !== 'completed') {
      return {
        status: result.status,
        error: result.error || null,
        text: '',
        confidence: 0,
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error getting OCR result:', error);
    return {
      status: 'error',
      error: 'Failed to get OCR result',
      text: '',
      confidence: 0, 
    };
  }
}

// Get OCR status
export async function getOcrStatus(fileId: string) {
  const { databases } = await createAdminClient();
  
  try {
    if (!fileId) {
      return { status: 'error', error: 'File ID is required' };
    }
    
    const ocrResults = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [Query.equal('fileId', [fileId])]
    );
    
    if (ocrResults.documents.length === 0) {
      // Create a new OCR record with initial status
      try {
        // First check if file exists
        const file = await databases.getDocument(
          fullConfig.databaseId,
          fullConfig.filesCollectionId,
          fileId
        ).catch(() => null);
        
        if (!file) {
          return { status: 'error', error: 'File not found' };
        }
        
        // Create OCR entry with pending status
        await databases.createDocument(
          fullConfig.databaseId,
          fullConfig.ocrResultsCollectionId,
          ID.unique(),
          {
            fileId,
            text: "",
            confidence: 0,
            status: 'pending',
            processingTime: 0,
            pageCount: 0,
            fileName: file.name,
            fileType: file.type,
            metadata: JSON.stringify({
              initializing: true,
              fileSize: file.size,
              extension: file.extension || ''
            }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        );
        
        return { status: 'pending', error: null };
      } catch (createError) {
        console.error('Error creating OCR record:', createError);
        return { status: 'error', error: 'Could not create OCR record' };
      }
    }
    
    return {
      status: ocrResults.documents[0].status,
      error: ocrResults.documents[0].error || null
    };
  } catch (error) {
    console.error('Error getting OCR status:', error);
    return { status: 'error', error: 'Failed to get OCR status' };
  }
}

// Save OCR result as a new text file
export async function saveOcrResultAsFile(
  fileId: string,
  text: string,
  fileName: string,
  path: string = '/dashboard/tools/ocr'
) {
  const { databases, storage } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    // Create text file
    const textBlob = new Blob([text], { type: 'text/plain' });
    const buffer = await textBlob.arrayBuffer();
    const inputFile = InputFile.fromBuffer(Buffer.from(buffer), `${fileName}.txt`);
    
    // Upload to storage
    const textFile = await storage.createFile(
      fullConfig.storageId,
      ID.unique(),
      inputFile
    );
    
    // Create file document
    const fileData = {
      name: `${fileName}.txt`,
      type: 'document',
      extension: 'txt',
      size: text.length,
      url: `${fullConfig.endpoint}/storage/buckets/${fullConfig.storageId}/files/${textFile.$id}/view?project=${fullConfig.projectId}`,
      ownerId: currentUser.$id,
      departmentId: currentUser.department || null,
      sharedWith: [],
      bucketFileId: textFile.$id,
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
    console.error('Error saving OCR result as file:', error);
    throw new Error('Failed to save OCR result as file');
  }
} 