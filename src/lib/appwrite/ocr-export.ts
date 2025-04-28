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
import { jsPDF } from 'jspdf';

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
  // Create new document
  const doc = new jsPDF();

  // Add metadata
  doc.setProperties({
    title: title,
    author: 'Regis Vault OCR',
    creator: 'Regis Vault OCR',
    subject: 'OCR Export'
  });

  // Add title
  doc.setFontSize(18);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

  // Add creation date
  doc.setFontSize(10);
  doc.text(`Created on: ${new Date().toLocaleDateString()}`, 
    doc.internal.pageSize.getWidth() / 2, 30, 
    { align: 'center' });

  // Add content
  doc.setFontSize(12);
  
  // Split text into lines to handle pagination
  const lines = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - 20);
  doc.text(lines, 10, 50);

  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
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
  
  // Create date paragraph
  const dateParagraph = new Paragraph({
    children: [
      new TextRun({
        text: `Created on: ${new Date().toLocaleDateString()}`,
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