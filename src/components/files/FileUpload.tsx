'use client';

import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFileBridge } from '@/lib/bridge/file-bridge';
import { logFileUpload } from '@/lib/bridge/activity-bridge';
import { useAssistant } from '@/components/assistant/RegisvaultAssistant';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FileUploadProps {
  onUploadComplete?: () => void;
  children?: ReactNode;
  variant?: 'default' | 'outline' | 'custom';
  showHelpButton?: boolean;
}

export function FileUpload({ 
  onUploadComplete, 
  children, 
  variant = 'default',
  showHelpButton = true
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { startTour } = useAssistant();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      // Upload each file individually
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadFileBridge(file);
        
        // Log the file upload activity
        await logFileUpload(file.name, result.id);
      }
      
      toast.success('Files uploaded successfully');
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      // Reset the file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    document.getElementById('file-upload')?.click();
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        id="file-upload"
        className="hidden"
        multiple
        onChange={handleFileChange}
        disabled={uploading}
      />
      
      {/* Render children if provided, otherwise use default button */}
      {children ? (
        <div onClick={handleUploadClick} className={uploading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}>
          {children}
        </div>
      ) : (
        <Button
          variant={variant === 'custom' ? 'default' : variant}
          onClick={handleUploadClick}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Files'}
        </Button>
      )}
      
      {showHelpButton && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startTour('firstUpload')}
                className="h-9 w-9"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Help with uploading</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}