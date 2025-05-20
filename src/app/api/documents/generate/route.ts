import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as docx from 'docx';
import { Buffer } from 'buffer';

// Function to handle document generation via API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, title, format } = body;
    
    if (!text || !title || !format) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    let buffer: Buffer;
    let contentType: string;
    
    if (format === 'pdf') {
      // Dynamically import PDFKit only in this API route
      const PDFKit = (await import('pdfkit')).default;
      buffer = await createPdf(PDFKit, text, title);
      contentType = 'application/pdf';
    } else if (format === 'docx') {
      buffer = await createDocx(text, title);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }
    
    // Return the buffer directly
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.${format}"`,
      },
    });
  } catch (error) {
    console.error('Document generation error:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}

// Create PDF using PDFKit
async function createPdf(PDFKit: any, text: string, title: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFKit();
    const chunks: Uint8Array[] = [];
    
    // Collect data chunks
    doc.on('data', (chunk: Uint8Array) => {
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
    
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer);
    });
    
    doc.on('error', (err: Error) => {
      reject(err);
    });
    
    doc.end();
  });
}

// Create DOCX using docx library
async function createDocx(text: string, title: string): Promise<Buffer> {
  // Create paragraphs from text (split by newlines)
  const paragraphs = text.split('\n').map((line: string) => {
    return new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: line || " ", // Ensure empty lines have at least a space
          size: 24 // 12pt font
        })
      ]
    });
  });
  
  // Create title paragraph
  const titleParagraph = new docx.Paragraph({
    children: [
      new docx.TextRun({
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
  const currentDate = new Date().toISOString().split('T')[0];
  const dateParagraph = new docx.Paragraph({
    children: [
      new docx.TextRun({
        text: `Created on: ${currentDate}`,
        size: 20 // 10pt font
      })
    ],
    spacing: {
      after: 400 // Space after date
    }
  });
  
  // Create the document
  const doc = new docx.Document({
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
  return await docx.Packer.toBuffer(doc);
}