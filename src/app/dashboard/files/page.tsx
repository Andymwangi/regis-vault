// src/app/dashboard/files/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FileTable } from '@/components/common/file-table/FileTable';
import { FileUpload } from '@/components/dashboard/file-upload/FileUpload';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { File } from '@/types/file';
import { toast } from 'sonner';
import { FileManager } from '@/components/files/FileManager';
import { AISearchBar } from '@/components/common/search/AISearchBar';
import { useRouter } from 'next/navigation';

interface FileResponse {
  files: File[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function FilesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  
  const fetchFiles = async (type?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(type && type !== 'all' && { type }),
      });
      
      const response = await fetch(`/api/files?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      const data: FileResponse = await response.json();
      setFiles(data.files);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchFiles(activeTab === 'all' ? undefined : activeTab);
  }, [activeTab, currentPage]);
  
  const handleRefresh = () => {
    fetchFiles(activeTab === 'all' ? undefined : activeTab);
  };
  
  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete file');
      }
      
      toast.success('File deleted successfully');
      handleRefresh();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };
  
  const handleShare = async (fileId: string) => {
    // Implement share functionality
    console.log('Sharing file:', fileId);
  };
  
  const handleDownload = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = files.find(f => f.id === fileId)?.name || 'file';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };
  
  const handleSearchSelect = (result: any) => {
    // Navigate to the file details page
    router.push(`/dashboard/files/${result.id}`);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">File Manager</h1>
          <div className="max-w-xl">
            <AISearchBar
              onSelect={handleSearchSelect}
              placeholder="Search files by name, department, or content..."
            />
          </div>
        </div>
        <FileManager />
      </div>
    </DashboardLayout>
  );
}