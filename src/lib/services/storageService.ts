import { writeFile } from 'fs/promises';
import { join } from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads';

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    // Ensure the upload directory exists
    await ensureDir(UPLOAD_DIR);

    // Save the file
    const filePath = join(UPLOAD_DIR, fileName);
    await writeFile(filePath, buffer);

    // Return the public URL
    return `/uploads/${fileName}`;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}

async function ensureDir(dirPath: string): Promise<void> {
  const { mkdir } = await import('fs/promises');
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as { code?: string }).code !== 'EEXIST') {
      throw error;
    }
  }
} 