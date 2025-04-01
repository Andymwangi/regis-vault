'use client'

import { FC, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, FileIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { uploadFile, account, storage, STORAGE_BUCKETS } from '@/lib/appwrite/config';

interface UploadResponse {
  successfulUploads: any[];
  failedUploads: File[];
}

interface FileUploadProps {
  onUploadComplete: (fileData: UploadResponse) => void;
  acceptedFileTypes?: string;
  maxSizeMB?: number;
  userId?: string;
  departmentId?: string;
}

export const FileUpload: FC<FileUploadProps> = ({ 
  onUploadComplete, 
  acceptedFileTypes = "*",
  maxSizeMB = 50,
  userId,
  departmentId
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
    
    // If userId or departmentId are not provided, get the current user session
    let currentUserId = userId;
    let currentDepartmentId = departmentId;
    
    if (!currentUserId) {
      try {
        // Get current session
        const session = await account.get();
        currentUserId = session.$id;
        
        // If still no departmentId, we need to fetch it
        if (!currentDepartmentId) {
          // This is a simplified approach - in a real app you'd fetch from your database
          currentDepartmentId = session.department || "default";
        }
      } catch (error) {
        toast.error("Authentication required", {
          description: "Please sign in to upload files",
        });
        return;
      }
    }
    
    setUploading(true);
    setProgress(0);
    
    const successfulUploads: any[] = [];
    const failedUploads: File[] = [];
    
    // Process files sequentially with progress tracking
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Upload file using Appwrite SDK
        const uploadResult = await uploadFile(
          file,
          currentUserId!,
          currentDepartmentId!
        );
        
        successfulUploads.push(uploadResult);
        
        // Update progress
        const currentProgress = Math.round(((i + 1) / files.length) * 100);
        setProgress(currentProgress);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        failedUploads.push(file);
      }
    }
    
    setUploading(false);
    
    // Report results
    if (failedUploads.length > 0) {
      toast.error("Some files failed to upload", {
        description: `${failedUploads.length} file(s) failed to upload`,
      });
    } else {
      toast.success("Upload complete", {
        description: `Successfully uploaded ${successfulUploads.length} file(s)`,
      });
    }
    
    // Call the callback with results
    onUploadComplete({
      successfulUploads,
      failedUploads
    });
    
    // Clear the file list
    setFiles([]);
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