// These are client-side utilities that mirror the server-side functions
// but don't use the 'use server' directive
import { fullConfig } from './config';

// Helper to get file type from filename or MIME type
export const getFileType = (input: string): { type: string; extension: string } => {
  // Get extension from filename
  const extension = input.split('.').pop()?.toLowerCase() || '';
  
  // Determine file type based on extension or MIME type
  let type = 'other';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
    type = 'image';
  } else if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) {
    type = 'video';
  } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
    type = 'audio';
  } else if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
    type = 'document';
  }
  
  return { type, extension };
};

// Helper to construct file URL from bucket and ID
export const getFileUrl = (fileId: string): string => {
  return `${fullConfig.endpoint}/storage/buckets/${fullConfig.storageId}/files/${fileId}/view?project=${fullConfig.projectId}`;
}; 