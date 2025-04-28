'use server';

import { submitForOcr, getOcrResult, getOcrStatus, saveOcrResultAsFile } from './ocr-operations';
import { revalidatePath } from 'next/cache';

/**
 * Submits a file for OCR processing
 */
export async function startOcrProcessing(fileId: string, path: string = '/dashboard/tools/ocr') {
  try {
    const result = await submitForOcr(fileId, path);
    revalidatePath(path);
    return result;
  } catch (error) {
    console.error('Error starting OCR processing:', error);
    throw error;
  }
}

/**
 * Retrieves the OCR result for a file
 */
export async function fetchOcrResult(fileId: string) {
  try {
    return await getOcrResult(fileId);
  } catch (error) {
    console.error('Error fetching OCR result:', error);
    throw error;
  }
}

/**
 * Checks the status of an OCR job
 */
export async function checkOcrStatus(fileId: string) {
  try {
    return await getOcrStatus(fileId);
  } catch (error) {
    console.error('Error checking OCR status:', error);
    throw error;
  }
}

/**
 * Saves the OCR result as a text file
 */
export async function saveOcrAsTextFile(fileId: string, fileName: string, path: string = '/dashboard/tools/ocr') {
  try {
    // Get the OCR result first
    const ocrResult = await getOcrResult(fileId);
    
    if (!ocrResult || !ocrResult.text) {
      throw new Error('OCR result not found or processing not complete');
    }
    
    // Save as text file
    const result = await saveOcrResultAsFile(fileId, ocrResult.text, fileName, path);
    revalidatePath(path);
    return result;
  } catch (error) {
    console.error('Error saving OCR as text file:', error);
    throw error;
  }
} 