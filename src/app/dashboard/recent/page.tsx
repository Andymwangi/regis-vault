'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/common/layout/DashboardLayout';
import { FileTable } from '@/components/common/file-table/FileTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ShareDialog } from '@/components/dashboard/share-dialog/ShareDialog';
import { Search, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { File } from '@/types/file';

export default function RecentFilesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const fetchRecentFiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        timeRange: timeFilter,
        ...(selectedDepartment !== 'all' && { department: selectedDepartment }),
      });

      const response = await fetch(`/api/files/recent?${params}`);
      if (!response.ok) throw new Error('Failed to fetch recent files');
      
      const data = await response.json();
      setFiles(data.files);
    } catch (error) {
      console.error('Error fetching recent files:', error);
      toast.error('Failed to fetch recent files');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (!response.ok) throw new Error('Failed to fetch departments');
      
      const data = await response.json();
      setDepartments(data.departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  useEffect(() => {
    fetchRecentFiles();
    fetchDepartments();
  }, [timeFilter, selectedDepartment]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery !== '') {
        fetchRecentFiles();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleShare = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setSelectedFile(file);
      setShareDialogOpen(true);
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);
      if (!response.ok) throw new Error('Failed to download file');

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

  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete file');
      
      toast.success('File deleted successfully');
      fetchRecentFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Recent Files</h1>
          <p className="text-gray-500">View and manage your recently accessed files</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <FileTable
            files={files}
            showOwner={true}
            showDepartment={true}
            onShare={handleShare}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {selectedFile && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          file={selectedFile}
          onShareComplete={() => {
            fetchRecentFiles();
            setShareDialogOpen(false);
          }}
        />
      )}
    </DashboardLayout>
  );
} 