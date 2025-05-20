'use server';

import { ID } from 'node-appwrite';
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from './index';
import { fullConfig } from './config';
import { getOcrResult } from './ocr-operations';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/user.actions';
import PDFDocument from 'pdfkit';
import { Packer, Document, Paragraph, TextRun } from 'docx';

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
  // Always use PDFKit for server-side PDF generation
  try {
    // Create a PDF document using PDFKit (Node.js compatible)
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    
    // Collect data chunks
    doc.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    // Add metadata
    doc.info.Title = title;
    doc.info.Author = 'Regis Vault OCR';
    doc.info.Creator = 'Regis Vault OCR';
    doc.info.Subject = 'OCR Export';
    
    // Add title
    doc.fontSize(18);
    doc.text(title, { align: 'center' });
    doc.moveDown();
    
    // Add creation date
    const currentDate = new Date().toISOString().split('T')[0];
    doc.fontSize(10);
    doc.text(`Created on: ${currentDate}`, { align: 'center' });
    doc.moveDown(2);
    
    // Add content
    doc.fontSize(12);
    doc.text(text, {
      align: 'left',
      width: doc.page.width - 100
    });
    
    // End the document to trigger the 'end' event
    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      
      doc.on('error', (err) => {
        reject(err);
      });
      
      doc.end();
    });
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
  try {
    // Create paragraphs from text (split by newlines)
    const paragraphs = text.split('\n').map(line => {
      return new Paragraph({
        children: [
          new TextRun({
            text: line || " ", // Ensure empty lines have at least a space
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
    
    // Create date paragraph - use ISO string which is safe on server
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
  } catch (error) {
    console.error('Error creating DOCX, falling back to text buffer:', error);
    const content = `${title}\n\nCreated on: ${new Date().toISOString().split('T')[0]}\n\n${text}`;
    return Buffer.from(content, 'utf-8');
  }
}