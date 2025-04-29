'use server';

import { ID } from 'node-appwrite';
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from './index';
import { fullConfig } from './config';
import { getOcrResult } from './ocr-operations';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/user.actions';
import PDFDocument from 'pdfkit';
import * as docx from 'docx';
import { Packer, Document, Paragraph, TextRun } from 'docx';
// No static jsPDF import - we'll import it dynamically when needed

/**
 * Export OCR results as a PDF file
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
    
    // Create PDF
    const pdfBuffer = await createPdf(ocrResult.text, fileName);
    
    // Upload to storage
    const inputFile = InputFile.fromBuffer(pdfBuffer, `${fileName}.pdf`);
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
      size: pdfBuffer.length,
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
 * Export OCR results as a DOCX file
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
    
    // Create DOCX
    const docxBuffer = await createDocx(ocrResult.text, fileName);
    
    // Upload to storage
    const inputFile = InputFile.fromBuffer(docxBuffer, `${fileName}.docx`);
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
      size: docxBuffer.length,
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

/**
 * Create a PDF buffer from OCR text
 */
async function createPdf(text: string, title: string): Promise<Buffer> {
  // For Vercel, don't even try to use jsPDF
  if (process.env.VERCEL === "1") {
    console.log("Vercel environment detected, using text buffer instead of PDF");
    // Create a simple text buffer
    const content = `${title}\n\nCreated on: ${new Date().toISOString().split('T')[0]}\n\n${text}`;
    return Buffer.from(content, 'utf-8');
  }
  
  try {
    // For local development, try to use jsPDF
    // Only import jsPDF in a try block to avoid build errors
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Add metadata
    doc.setProperties({
      title: title,
      author: 'Regis Vault OCR',
      creator: 'Regis Vault OCR',
      subject: 'OCR Export'
    });
    
    // Get page width
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add title
    doc.setFontSize(18);
    doc.text(title, pageWidth / 2, 20, { align: 'center' });
    
    // Add creation date
    const currentDate = new Date().toISOString().split('T')[0];
    doc.setFontSize(10);
    doc.text(`Created on: ${currentDate}`, pageWidth / 2, 30, { align: 'center' });
    
    // Add content
    doc.setFontSize(12);
    
    // Split text into lines to handle pagination
    const lines = doc.splitTextToSize(text, pageWidth - 20);
    doc.text(lines, 10, 50);
    
    // Convert to buffer
    const pdfData = doc.output('arraybuffer');
    return Buffer.from(pdfData as ArrayBuffer);
  } catch (error) {
    // If anything fails, return a simple text buffer
    console.error('Error creating PDF, falling back to text buffer:', error);
    const content = `${title}\n\nCreated on: ${new Date().toISOString().split('T')[0]}\n\n${text}`;
    return Buffer.from(content, 'utf-8');
  }
}

/**
 * Create a DOCX buffer from OCR text
 */
async function createDocx(text: string, title: string): Promise<Buffer> {
  // Create paragraphs from text (split by newlines)
  const paragraphs = text.split('\n').map(line => {
    return new Paragraph({
      children: [
        new TextRun({
          text: line,
          size: 24 // 12pt font
        })
      ]
    });
  });
  
  // Create title paragraph
  const titleParagraph = new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 36 // 18pt font
      })
    ],
    spacing: {
      after: 200 // Space after title
    }
  });
  
  // Create date paragraph - use ISO string to avoid navigator dependency
  const currentDate = new Date().toISOString().split('T')[0];
  const dateParagraph = new Paragraph({
    children: [
      new TextRun({
        text: `Created on: ${currentDate}`,
        size: 20 // 10pt font
      })
    ],
    spacing: {
      after: 400 // Space after date
    }
  });
  
  // Create the document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          titleParagraph,
          dateParagraph,
          ...paragraphs
        ]
      }
    ]
  });
  
  // Generate the buffer
  return await Packer.toBuffer(doc);
} 