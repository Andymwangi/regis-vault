import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  onUploadComplete: () => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      toast.success('Files uploaded successfully');
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        id="file-upload"
        className="hidden"
        multiple
        onChange={handleFileChange}
        disabled={uploading}
      />
      <Button
        variant="outline"
        onClick={() => document.getElementById('file-upload')?.click()}
        disabled={uploading}
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? 'Uploading...' : 'Upload Files'}
      </Button>
    </div>
  );
} 