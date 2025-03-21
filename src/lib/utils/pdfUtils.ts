/// <reference types="node" />
import PDFDocument from 'pdfkit';

export async function convertTextToPDF(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
      });

      // Create a buffer to store the PDF
      const chunks: any[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Add the text content
      doc
        .font('Helvetica')
        .fontSize(12)
        .text(text, {
          align: 'left',
          lineGap: 5,
        });

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
} 