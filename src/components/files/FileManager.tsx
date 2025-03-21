import { useState, useEffect } from 'react';
import { File } from '@/types/file';
import { FileTable } from './FileTable';
import { FileUpload } from './FileUpload';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

export function FileManager() {
  const [files, setFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, [activeTab]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/files?type=${activeTab}`);
      const data = await response.json();
      setFiles(data.files);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('File deleted successfully');
        fetchFiles();
      } else {
        throw new Error('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleShare = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/share`, {
        method: 'POST',
      });
      if (response.ok) {
        toast.success('File shared successfully');
      } else {
        throw new Error('Failed to share file');
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      toast.error('Failed to share file');
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = files.find(f => f.id === fileId)?.name || 'file';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleRefresh = () => {
    fetchFiles();
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2">
          <FileUpload onUploadComplete={handleRefresh} />
          <Button variant="default">
            <Plus className="h-4 w-4 mr-1" /> New File
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Files</TabsTrigger>
          <TabsTrigger value="document">Documents</TabsTrigger>
          <TabsTrigger value="spreadsheet">Spreadsheets</TabsTrigger>
          <TabsTrigger value="presentation">Presentations</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="pt-4">
          <FileTable 
            files={files}
            onDelete={handleDelete}
            onShare={handleShare}
            onDownload={handleDownload}
            loading={loading}
          />
        </TabsContent>
        
        <TabsContent value="document" className="pt-4">
          <FileTable 
            files={files}
            onDelete={handleDelete}
            onShare={handleShare}
            onDownload={handleDownload}
            loading={loading}
          />
        </TabsContent>
        
        <TabsContent value="spreadsheet" className="pt-4">
          <FileTable 
            files={files}
            onDelete={handleDelete}
            onShare={handleShare}
            onDownload={handleDownload}
            loading={loading}
          />
        </TabsContent>
        
        <TabsContent value="presentation" className="pt-4">
          <FileTable 
            files={files}
            onDelete={handleDelete}
            onShare={handleShare}
            onDownload={handleDownload}
            loading={loading}
          />
        </TabsContent>
        
        <TabsContent value="other" className="pt-4">
          <FileTable 
            files={files}
            onDelete={handleDelete}
            onShare={handleShare}
            onDownload={handleDownload}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 