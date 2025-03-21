'use client'

import { FC, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, FileIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface UploadResponse {
  successfulUploads: File[];
  failedUploads: File[];
}

interface FileUploadProps {
  onUploadComplete: (fileData: UploadResponse) => void;
  acceptedFileTypes?: string;
  maxSizeMB?: number;
}

export const FileUpload: FC<FileUploadProps> = ({ 
  onUploadComplete, 
  acceptedFileTypes = "*",
  maxSizeMB = 50
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Check file size
      const oversizedFiles = selectedFiles.filter(
        file => file.size > maxSizeMB * 1024 * 1024
      );
      
      if (oversizedFiles.length > 0) {
        toast.error("File too large", {
          description: `Files must be smaller than ${maxSizeMB}MB`,
        });
        return;
      }
      
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };
  
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const uploadFiles = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setProgress(0);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json() as UploadResponse;
      
      if (data.failedUploads?.length > 0) {
        toast.error("Some files failed to upload", {
          description: `${data.failedUploads.length} file(s) failed to upload`,
        });
      } else {
        toast.success("Upload complete", {
          description: `Successfully uploaded ${data.successfulUploads.length} file(s)`,
        });
      }
      
      onUploadComplete(data);
      setFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Upload failed", {
        description: "There was an error uploading your files",
      });
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="w-full space-y-4">
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          multiple 
          accept={acceptedFileTypes}
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium">
          Click to upload or drag and drop files
        </p>
        <p className="text-xs text-gray-500 mt-1">
          File types: {acceptedFileTypes || 'All files'} (Max size: {maxSizeMB}MB)
        </p>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected files ({files.length})</p>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {files.map((file, index) => (
              <div 
                key={index}
                className="bg-gray-50 p-2 rounded-md flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <FileIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm truncate max-w-xs">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 rounded-full"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} className="h-1" />
              <p className="text-xs text-gray-500 text-right">{progress}%</p>
            </div>
          )}
          
          <Button variant="default" className="w-full" onClick={uploadFiles} disabled={uploading || files.length === 0}>
            {uploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
          </Button>
        </div>
      )}
    </div>
  );
};