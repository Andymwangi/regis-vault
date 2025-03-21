import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { File as CustomFile } from '@/types/file';

interface UseFilesOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useFiles(options: UseFilesOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFiles = useCallback(async (files: CustomFile[]) => {
    setLoading(true);
    setProgress(0);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file as unknown as File);
      });
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      options.onSuccess?.(data);
      toast.success('Files uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      options.onError?.(error as Error);
      toast.error('Failed to upload files');
    } finally {
      setLoading(false);
    }
  }, [options]);

  const deleteFile = useCallback(async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete file');
      
      options.onSuccess?.({ fileId });
      toast.success('File deleted successfully');
    } catch (error) {
      options.onError?.(error as Error);
      toast.error('Failed to delete file');
    }
  }, [options]);

  const downloadFile = useCallback(async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);
      if (!response.ok) throw new Error('Failed to download file');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      options.onError?.(error as Error);
      toast.error('Failed to download file');
    }
  }, [options]);

  return {
    loading,
    progress,
    uploadFiles,
    deleteFile,
    downloadFile,
  };
}
