'use client';

import { toast } from 'sonner';

/**
 * Normalizes file response to ensure consistent structure
 */
const normalizeFileResponse = (fileData: any) => {
  if (!fileData) return null;
  
  // Make sure the response has an id property
  return {
    id: fileData.id || fileData.$id || null,
    name: fileData.name || '',
    url: fileData.url || '',
    size: fileData.size || 0,
    type: fileData.type || 'unknown',
    extension: fileData.extension || '',
    bucketFileId: fileData.bucketFileId || fileData.bucketFieldId || null,
    ...fileData
  };
};

/**
 * Client-side function to upload a file using the API
 */
export const uploadFile = async (file: File, path: string = '/dashboard/files') => {
  try {
    console.log(`[Client] Uploading file ${file.name} (${Math.round(file.size / 1024)} KB) to path: ${path}`);
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    // Upload using fetch to API endpoint
    console.log('[Client] Sending file to /api/files/upload');
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMsg = errorData.error || `Server returned ${response.status}: ${response.statusText}`;
      console.error(`[Client] Upload failed: ${errorMsg}`);
      toast.error('Upload failed', { description: errorMsg });
      throw new Error(errorMsg);
    }

    console.log('[Client] File uploaded successfully');
    const fileData = await response.json();
    const normalizedData = normalizeFileResponse(fileData);
    console.log('[Client] Normalized file data:', normalizedData);
    return normalizedData;
  } catch (error) {
    console.error('[Client] Error uploading file:', error);
    toast.error('Upload failed', { 
      description: error instanceof Error ? error.message : 'Unknown error occurred'
    });
    throw error;
  }
}; 