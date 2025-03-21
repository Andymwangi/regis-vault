import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db/db';
import { files, activities } from '@/server/db/schema/schema';
import { convertTextToPDF } from '@/lib/utils/pdfUtils';
import { uploadFile } from '@/lib/services/storageService';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, fileName, confidence } = await request.json();

    if (!text || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert the OCR text to a PDF buffer
    const pdfBuffer = await convertTextToPDF(text);

    // Generate a unique file name
    const timestamp = new Date().getTime();
    const uniqueFileName = `${timestamp}-${fileName.replace(/\s+/g, '-')}`;

    // Save the file to storage and get the URL
    const fileUrl = await uploadFile(pdfBuffer, uniqueFileName, 'application/pdf');

    // Start a transaction to save both file and activity
    const result = await db.transaction(async (tx) => {
      // Save file record
      const [file] = await tx.insert(files).values({
        name: fileName,
        type: 'application/pdf',
        size: pdfBuffer.length,
        url: fileUrl,
        userId: session.user.id,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // Log the activity
      await tx.insert(activities).values({
        userId: session.user.id,
        type: 'OCR_PROCESS',
        description: `Processed document ${fileName} with OCR`,
        metadata: {
          confidence,
          fileId: file.id,
          processedAt: new Date().toISOString(),
        },
      });

      return file;
    });

    return NextResponse.json({
      message: 'Document saved successfully',
      file: result
    });
  } catch (error) {
    console.error('Error saving OCR document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save document' },
      { status: 500 }
    );
  }
} 