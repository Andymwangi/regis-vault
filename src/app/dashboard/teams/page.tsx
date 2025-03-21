'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/common/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Users, FileText, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { FileTable } from '@/components/common/file-table/FileTable';
import { File } from '@/types/file';
import { useAuth } from '@/hooks/use-auth';
import { ShareDialog } from '@/components/dashboard/share-dialog/ShareDialog';

interface Department {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  fileCount: number;
}

interface DepartmentMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

export default function TeamsDashboardPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [departmentMembers, setDepartmentMembers] = useState<DepartmentMember[]>([]);
  const [departmentFiles, setDepartmentFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'departments' | 'department-details'>('departments');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchDepartmentDetails(selectedDepartment.id);
    }
  }, [selectedDepartment]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/departments');
      if (!response.ok) throw new Error('Failed to fetch departments');
      
      const data = await response.json();
      setDepartments(data.departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentDetails = async (departmentId: number) => {
    try {
      setLoading(true);
      const [membersResponse, filesResponse] = await Promise.all([
        fetch(`/api/departments/${departmentId}/members`),
        fetch(`/api/departments/${departmentId}/files`)
      ]);

      if (!membersResponse.ok || !filesResponse.ok) {
        throw new Error('Failed to fetch department details');
      }

      const [membersData, filesData] = await Promise.all([
        membersResponse.json(),
        filesResponse.json()
      ]);

      setDepartmentMembers(membersData.members);
      setDepartmentFiles(filesData.files);
    } catch (error) {
      console.error('Error fetching department details:', error);
      toast.error('Failed to fetch department details');
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentClick = (department: Department) => {
    setSelectedDepartment(department);
    setViewMode('department-details');
  };

  const handleBackToDepartments = () => {
    setSelectedDepartment(null);
    setViewMode('departments');
    setDepartmentMembers([]);
    setDepartmentFiles([]);
  };

  const handleShare = (fileId: string) => {
    const file = departmentFiles.find(f => f.id === fileId);
    if (file) {
      setSelectedFile(file);
      setShareDialogOpen(true);
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Teams</h1>
            <p className="text-gray-500">Manage and view department information</p>
          </div>
          {viewMode === 'department-details' && (
            <Button variant="outline" onClick={handleBackToDepartments}>
              Back to Departments
            </Button>
          )}
        </div>

        {viewMode === 'departments' ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDepartments.map((department) => (
                <Card
                  key={department.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleDepartmentClick(department)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {department.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">{department.description}</p>
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{department.memberCount} members</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{department.fileCount} files</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">{selectedDepartment?.name} Members</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departmentMembers.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={`${member.firstName} ${member.lastName}`}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500">
                              {member.firstName[0]}{member.lastName[0]}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{member.firstName} {member.lastName}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                          <p className="text-xs text-gray-400">{member.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Department Files</h2>
                <FileTable
                  files={departmentFiles}
                  showOwner={true}
                  showDepartment={true}
                  onDownload={async (fileId) => {
                    try {
                      const response = await fetch(`/api/files/${fileId}/download`);
                      if (!response.ok) throw new Error('Failed to download file');
                      
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = departmentFiles.find(f => f.id === fileId)?.name || 'file';
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      
                      toast.success('File downloaded successfully');
                    } catch (error) {
                      console.error('Error downloading file:', error);
                      toast.error('Failed to download file');
                    }
                  }}
                  onDelete={async (fileId) => {
                    try {
                      const response = await fetch(`/api/files/${fileId}`, {
                        method: 'DELETE',
                      });
                      if (!response.ok) throw new Error('Failed to delete file');
                      toast.success('File deleted successfully');
                      fetchDepartmentDetails(selectedDepartment!.id);
                    } catch (error) {
                      console.error('Error deleting file:', error);
                      toast.error('Failed to delete file');
                    }
                  }}
                  onShare={handleShare}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        file={selectedFile}
        onShareComplete={() => {
          fetchDepartmentDetails(selectedDepartment!.id);
          setShareDialogOpen(false);
        }}
      />
    </DashboardLayout>
  );
} 