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
import { Search, SlidersHorizontal, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { File, Department } from '@/types/file';
import { useAuth } from '@/hooks/use-auth';

// Define the interface matching what FileTable expects
interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  department?: {
    id: string;
    name: string;
  };
  deletedBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
}

export default function SharedDashboardPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [permissionFilter, setPermissionFilter] = useState<string>('all');

  useEffect(() => {
    fetchSharedFiles();
    fetchDepartments();
  }, [selectedDepartment, permissionFilter]);

  const fetchSharedFiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        department: selectedDepartment !== 'all' ? selectedDepartment : '',
        permission: permissionFilter !== 'all' ? permissionFilter : '',
      });

      const response = await fetch(`/api/files/shared?${params}`);
      if (!response.ok) throw new Error('Failed to fetch shared files');
      
      const data = await response.json();
      setFiles(data.files);
    } catch (error) {
      console.error('Error fetching shared files:', error);
      toast.error('Failed to fetch shared files');
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
      toast.error('Failed to fetch departments');
    }
  };

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
      
      toast.success('File downloaded successfully');
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
      fetchSharedFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  // Function to convert File[] to FileData[]
  const mapFilesToFileData = (files: File[]): FileData[] => {
    return files.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      owner: {
        id: file.userId,
        name: file.owner ? `${file.owner.firstName} ${file.owner.lastName}` : 'Unknown',
        email: '',
        firstName: file.owner?.firstName,
        lastName: file.owner?.lastName
      },
      department: file.department ? {
        id: file.departmentId || '',
        name: file.department.name
      } : undefined,
      deletedBy: file.deletedBy ? {
        id: '',
        firstName: file.deletedBy.firstName,
        lastName: file.deletedBy.lastName
      } : undefined
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Shared Files</h1>
          <p className="text-gray-500">View and manage files shared with you</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search shared files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-4">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={permissionFilter} onValueChange={setPermissionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Permission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Permissions</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <FileTable
            files={mapFilesToFileData(files)}
            showOwner={true}
            showDepartment={true}
            onShare={handleShare}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        file={selectedFile}
        onShareComplete={() => {
          fetchSharedFiles();
          setShareDialogOpen(false);
        }}
      />
    </DashboardLayout>
  );
} 