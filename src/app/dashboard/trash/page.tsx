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
import { Search, SlidersHorizontal, Trash2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { File } from '@/types/file';
import { useAuth } from '@/hooks/use-auth';

export default function TrashDashboardPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  useEffect(() => {
    fetchTrashedFiles();
    fetchDepartments();
  }, [selectedDepartment]);

  const fetchTrashedFiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        department: selectedDepartment !== 'all' ? selectedDepartment : '',
      });

      const response = await fetch(`/api/files/trash?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trashed files');
      
      const data = await response.json();
      setFiles(data.files);
    } catch (error) {
      console.error('Error fetching trashed files:', error);
      toast.error('Failed to fetch trashed files');
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

  const handleRestore = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/restore`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to restore file');
      
      toast.success('File restored successfully');
      fetchTrashedFiles();
    } catch (error) {
      console.error('Error restoring file:', error);
      toast.error('Failed to restore file');
    }
  };

  const handlePermanentDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to permanently delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/files/${fileId}/permanent-delete`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to permanently delete file');
      
      toast.success('File permanently deleted');
      fetchTrashedFiles();
    } catch (error) {
      console.error('Error permanently deleting file:', error);
      toast.error('Failed to permanently delete file');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Trash</h1>
          <p className="text-gray-500">View and manage deleted files</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search deleted files..."
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
            showDeletedBy={true}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            customActions={[
              {
                icon: RotateCcw,
                label: 'Restore',
                onClick: handleRestore,
                className: 'text-blue-600 hover:text-blue-700',
              },
              {
                icon: Trash2,
                label: 'Delete Permanently',
                onClick: handlePermanentDelete,
                className: 'text-red-600 hover:text-red-700',
              },
            ]}
          />
        </div>
      </div>
    </DashboardLayout>
  );
} 