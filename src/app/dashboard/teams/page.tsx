'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Users, 
  FileText, 
  Building2, 
  ChevronLeft, 
  Share2, 
  Download, 
  Filter, 
  UserPlus, 
  Clock, 
  Upload, 
  Folder,
  ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { File } from '@/types/file';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { uploadFileBridge, getFiles } from '@/lib/bridge/file-bridge';
import { PageContextualHelp } from '@/components/assistant/RegisvaultAssistant';

interface Department {
  id: string;
  name: string;
  description: string;
  memberCount?: number;
  fileCount?: number;
}

interface DepartmentMember {
  id: string;
  name: string;
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
  const [sharedFiles, setSharedFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'departments' | 'department-details'>('departments');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userDepartment, setUserDepartment] = useState<Department | null>(null);
  const [shareTarget, setShareTarget] = useState<'department' | 'user'>('department');
  const [targetDepartment, setTargetDepartment] = useState<string>('');
  const [targetEmail, setTargetEmail] = useState<string>('');
  const [sharingLoading, setSharingLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedUploadFile, setSelectedUploadFile] = useState<globalThis.File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [fileViewOption, setFileViewOption] = useState<'all' | 'direct' | 'shared'>('all');
  const [stats, setStats] = useState({
    totalDepartments: 0,
    totalMembers: 0,
    totalFiles: 0,
    myDepartmentFiles: 0
  });

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
      
      // Count total members and files across all departments
      let totalMembers = 0;
      let totalFiles = 0;
      
      // Enhanced departments with member and file counts
      const departmentsWithCounts = await Promise.all(data.departments.map(async (dept: Department) => {
        try {
          const [membersRes, filesRes] = await Promise.all([
            fetch(`/api/departments/${dept.id}/members`),
            fetch(`/api/departments/${dept.id}/files`)
          ]);
          
          const membersData = await membersRes.json();
          const filesData = await filesRes.json();
          
          const memberCount = membersData.members.length;
          const fileCount = filesData.files.length;
          
          totalMembers += memberCount;
          totalFiles += fileCount;
          
          // Check if this is the user's department
          if (user?.department === dept.id) {
            setUserDepartment(dept);
            setStats(prev => ({
              ...prev,
              myDepartmentFiles: fileCount
            }));
          }
          
          return {
            ...dept,
            memberCount,
            fileCount
          };
        } catch (error) {
          console.error(`Error fetching details for department ${dept.id}:`, error);
          return {
            ...dept,
            memberCount: 0,
            fileCount: 0
          };
        }
      }));
      
      setDepartments(departmentsWithCounts);
      setStats(prev => ({
        ...prev,
        totalDepartments: departmentsWithCounts.length,
        totalMembers,
        totalFiles
      }));
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentDetails = async (departmentId: string) => {
    try {
      setLoading(true);
      
      // Fetch department members
      const membersResponse = await fetch(`/api/departments/${departmentId}/members`);
      if (!membersResponse.ok) {
        throw new Error('Failed to fetch department members');
      }
      const membersData = await membersResponse.json();
      setDepartmentMembers(membersData.members || []);
      
      // Fetch direct department files
      const filesResponse = await fetch(`/api/departments/${departmentId}/files`);
      if (!filesResponse.ok) {
        throw new Error('Failed to fetch department files');
      }
      const filesData = await filesResponse.json();
      
      // Process direct files
      const directFiles = (filesData.files || []).map((file: any) => ({
        id: file.id,
        name: file.name,
        type: file.type || 'unknown',
        size: file.size || 0,
        url: file.url,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt || file.createdAt,
        owner: file.owner || { id: 'unknown', name: 'Unknown' },
        departmentId: file.departmentId || departmentId,
        bucketFileId: file.bucketFileId,
        isShared: false // Mark as direct files
      }));
      
      // Fetch shared files for this department
      const sharedFilesResult = await getFiles({
        type: 'shared',
        departmentId: departmentId,
        limit: 50
      });
      
      // Process shared files
      const departmentSharedFiles = (sharedFilesResult.files || []).map((file: any) => ({
        ...file,
        isShared: true // Mark as shared files
      }));
      
      setDepartmentFiles(directFiles);
      setSharedFiles(departmentSharedFiles);
      
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
    setSharedFiles([]);
  };

  const handleShare = (file: File) => {
    setSelectedFile(file);
    setShareDialogOpen(true);
  };
  
  const handleDownload = async (file: File) => {
    try {
      const response = await fetch(`/api/files/${file.id}/download`);
      if (!response.ok) throw new Error('Failed to download file');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Downloaded ${file.name}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };
  
  const handleShareSubmit = async () => {
    if (!selectedFile) return;
    
    try {
      setSharingLoading(true);
      
      let endpoint = '';
      let payload = {};
      
      if (shareTarget === 'department') {
        if (!targetDepartment) {
          toast.error('Please select a department');
          return;
        }
        
        endpoint = `/api/files/${selectedFile.id}/share`;
        payload = {
          departments: [targetDepartment],
          role: 'viewer'
        };
      } else {
        if (!targetEmail) {
          toast.error('Please enter an email address');
          return;
        }
        
        endpoint = `/api/files/${selectedFile.id}/share`;
        payload = {
          emails: [targetEmail],
          role: 'viewer'
        };
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to share file');
      }
      
      toast.success(
        shareTarget === 'department' 
          ? `Shared "${selectedFile.name}" with department` 
          : `Shared "${selectedFile.name}" with ${targetEmail}`
      );
      
      // Refresh files list
      if (selectedDepartment) {
        fetchDepartmentDetails(selectedDepartment.id);
      }
      
      // Close dialog and reset form
      setShareDialogOpen(false);
      setTargetDepartment('');
      setTargetEmail('');
      setShareTarget('department');
      
    } catch (error) {
      console.error('Error sharing file:', error);
      toast.error('Failed to share file');
    } finally {
      setSharingLoading(false);
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter files based on type and view option (all/direct/shared)
  const getFilteredFiles = () => {
    // Start with filtering by file type
    const typeFiltered = [...departmentFiles, ...sharedFiles].filter(file => {
      if (filterType === 'all') return true;
      return file.type.toLowerCase().includes(filterType.toLowerCase());
    });
    
    // Then filter by file source (direct/shared)
    if (fileViewOption === 'all') return typeFiltered;
    if (fileViewOption === 'direct') return typeFiltered.filter(file => !file.isShared);
    if (fileViewOption === 'shared') return typeFiltered.filter(file => file.isShared);
    
    return typeFiltered;
  };

  const filteredFiles = getFilteredFiles();
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedUploadFile(e.target.files[0]);
    }
  };
  
  const handleFileUpload = async () => {
    if (!selectedUploadFile || !selectedDepartment) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      // Pass the browser File directly
      const result = await uploadFileBridge(selectedUploadFile, `/dashboard/teams/${selectedDepartment.id}`);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success(`File uploaded successfully: ${selectedUploadFile.name} has been uploaded to ${selectedDepartment.name} department`);
      fetchDepartmentDetails(selectedDepartment.id);
      
      setTimeout(() => {
        setUploadDialogOpen(false);
        setSelectedUploadFile(null);
        setUploadProgress(0);
        setIsUploading(false);
      }, 500);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Upload failed: There was an error uploading your file. Please try again.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Format file size to human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Get file icon based on file type
  const getFileTypeDisplay = (fileType: string): string => {
    if (!fileType) return 'Unknown';
    
    const type = fileType.toLowerCase();
    
    // PDF documents
    if (type.includes('pdf')) return 'PDF';
    
    // Word documents
    if (type.includes('word') || type.includes('doc') || type.includes('docx')) return 'Word';
    
    // Excel/Spreadsheets
    if (type.includes('excel') || type.includes('sheet') || type.includes('csv') || 
        type.includes('xls') || type.includes('xlsx')) return 'Spreadsheet';
    
    // Images
    if (type.includes('image') || type.includes('png') || type.includes('jpg') || 
        type.includes('jpeg') || type.includes('gif') || type.includes('svg')) return 'Image';
    
    // PowerPoint
    if (type.includes('powerpoint') || type.includes('ppt') || type.includes('presentation')) return 'PowerPoint';
    
    // Text files
    if (type.includes('text') || type.includes('txt')) return 'Text';
    
    // Try to extract subtype from mime type
    const parts = type.split('/');
    if (parts.length > 1 && parts[1]) {
      return parts[1].toUpperCase();
    }
    
    return 'Unknown';
  };

  return (
    <DashboardLayout>
      <PageContextualHelp pageName="teams">
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-4xl font-bold text-gray-800">Departments</h1>
          <p className="text-lg text-gray-500">
            {viewMode === 'departments' 
              ? 'Browse departments and team files' 
              : `Viewing ${selectedDepartment?.name} department`
            }
          </p>
        </div>
        
        {viewMode === 'departments' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Departments</CardTitle>
                <Building2 className="h-6 w-6 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalDepartments}</div>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Members</CardTitle>
                <Users className="h-6 w-6 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalMembers}</div>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Total Files</CardTitle>
                <FileText className="h-6 w-6 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalFiles}</div>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">My Department Files</CardTitle>
                <Folder className="h-6 w-6 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.myDepartmentFiles}</div>
                {userDepartment && (
                  <div className="text-xs text-gray-500 mt-1">{userDepartment.name}</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {viewMode === 'department-details' && (
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={handleBackToDepartments}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Departments
            </Button>
            
            {selectedDepartment && user?.department === selectedDepartment.id && (
              <Badge variant="outline" className="px-3 py-1">
                Your Department
              </Badge>
            )}
          </div>
        )}
        
        {viewMode === 'departments' ? (
          <>
            <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
              <Input
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-400 focus:bg-zinc-800 focus:text-white"
                style={{ color: 'white', backgroundColor: '#27272a' }} // Force styles with inline styling
              />
            </div>
              
              {userDepartment && (
                <Button 
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleDepartmentClick(userDepartment)}
                >
                  <Folder className="h-4 w-4 mr-2" />
                  My Department
                </Button>
              )}
            </div>

            <Card className="border-0 shadow-none overflow-hidden">
              <CardHeader className="bg-zinc-900 border-b border-zinc-800">
                <CardTitle className="text-xl font-semibold text-white">Departments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-zinc-900">
                  {loading ? (
                    <div className="col-span-3 py-8 text-center text-gray-400">Loading departments...</div>
                  ) : filteredDepartments.length === 0 ? (
                    <div className="col-span-3 py-8 text-center text-gray-400">No departments found</div>
                  ) : (
                    filteredDepartments.map((department) => (
                      <Card
                        key={department.id}
                        className="cursor-pointer hover:bg-zinc-800 transition-colors bg-zinc-850 border border-zinc-700 text-white overflow-hidden"
                        onClick={() => handleDepartmentClick(department)}
                      >
                        <CardHeader className="bg-zinc-800 pb-2">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Building2 className="h-5 w-5 text-red-500" />
                            {department.name}
                          </CardTitle>
                          <CardDescription className="text-gray-400">
                            {department.description || 'No description available'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-blue-400" />
                              <span>{department.memberCount || 0} members</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4 text-amber-400" />
                              <span>{department.fileCount || 0} files</span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="bg-zinc-800 bg-opacity-50 pt-2 text-xs text-gray-400">
                          {user?.department === department.id ? 'Your department' : '\u00A0'}
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="space-y-6">
            <Tabs defaultValue="files" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
              </TabsList>
              
              <TabsContent value="files">
                <Card className="border-0 shadow-none overflow-hidden">
                  <CardHeader className="bg-zinc-900 border-b border-zinc-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <CardTitle className="text-xl font-semibold text-white">
                      {selectedDepartment?.name} Files
                    </CardTitle>
                    
                    <div className="flex flex-wrap gap-2">
                      {user?.department === selectedDepartment?.id && (
                        <Button 
                          onClick={() => setUploadDialogOpen(true)}
                          className="bg-red-600 hover:bg-red-700 text-white gap-2" 
                        >
                          <Upload className="h-4 w-4" />
                          Upload File
                        </Button>
                      )}
                      
                      <Select value={fileViewOption} onValueChange={(value: any) => setFileViewOption(value)}>
                        <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue placeholder="File source" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectItem value="all">All Files</SelectItem>
                          <SelectItem value="direct">Department Files</SelectItem>
                          <SelectItem value="shared">Shared with Department</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="document">Documents</SelectItem>
                          <SelectItem value="image">Images</SelectItem>
                          <SelectItem value="pdf">PDFs</SelectItem>
                          <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0 bg-zinc-900">
                    {loading ? (
                      <div className="p-8 text-center text-gray-400">Loading files...</div>
                    ) : filteredFiles.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">
                        {fileViewOption === 'direct' ? 'No department files found' : 
                         fileViewOption === 'shared' ? 'No shared files found' : 
                         'No files found in this department'}
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="grid grid-cols-5 gap-4 p-4 text-sm font-medium text-gray-400 border-b border-zinc-800">
                          <div>Name</div>
                          <div>Type</div>
                          <div>Owner</div>
                          <div>Status</div>
                          <div className="text-right">Actions</div>
                        </div>
                        
                        <div className="divide-y divide-zinc-800">
                          {filteredFiles.map((file) => (
                            <div key={file.id} className="grid grid-cols-5 gap-4 p-4 items-center text-white hover:bg-zinc-800">
                              <div className="truncate font-medium">{file.name}</div>
                              <div>{getFileTypeDisplay(file.type)}</div>
                              <div className="truncate">{file.owner?.name || 'Unknown'}</div>
                              <div>
                                {file.isShared ? (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                    <Share2 className="h-3 w-3 mr-1" />
                                    Shared
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-100 text-green-800">
                                    <Folder className="h-3 w-3 mr-1" />
                                    Department
                                  </Badge>
                                )}
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                                  onClick={() => handleDownload(file)}
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Download</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                                  onClick={() => handleShare(file)}
                                >
                                  <Share2 className="h-4 w-4" />
                                  <span className="sr-only">Share</span>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="members">
                <Card className="border-0 shadow-none overflow-hidden">
                  <CardHeader className="bg-zinc-900 border-b border-zinc-800">
                    <CardTitle className="text-xl font-semibold text-white">{selectedDepartment?.name} Members</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-0 bg-zinc-900">
                    {loading ? (
                      <div className="p-8 text-center text-gray-400">Loading members...</div>
                    ) : departmentMembers.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">No members found in this department</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {departmentMembers.map((member) => (
                          <Card key={member.id} className="bg-zinc-800 border-zinc-700 text-white">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                                  <span className="text-white">
                                    {member.name.split(' ')[0]?.[0] || ''}
                                    {member.name.split(' ')[1]?.[0] || ''}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{member.name}</p>
                                  <p className="text-sm text-gray-400">{member.email}</p>
                                  <Badge variant={member.role === 'admin' ? 'destructive' : member.role === 'manager' ? 'default' : 'secondary'} className="mt-1">
                                    {member.role}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {/* File Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Share File</DialogTitle>
              <DialogDescription>
                Share "{selectedFile?.name}" with a department or specific user
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={shareTarget === 'department' ? 'default' : 'outline'}
                  onClick={() => setShareTarget('department')}
                  className="w-full"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Department
                </Button>
                <Button
                  variant={shareTarget === 'user' ? 'default' : 'outline'}
                  onClick={() => setShareTarget('user')}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  User
                </Button>
              </div>
              
              {shareTarget === 'department' ? (
                <div className="grid gap-2">
                  <label htmlFor="department" className="text-sm font-medium">
                    Select Department
                  </label>
                  <Select value={targetDepartment} onValueChange={setTargetDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    User Email
                  </label>
                  <Input
                    id="email"
                    placeholder="Enter email address"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                  />
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleShareSubmit} 
                disabled={
                  sharingLoading || 
                  (shareTarget === 'department' && !targetDepartment) || 
                  (shareTarget === 'user' && !targetEmail)
                }
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {sharingLoading ? 'Sharing...' : 'Share'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
       <DialogHeader>
          <DialogTitle>Upload File to Department</DialogTitle>
          <DialogDescription>
              Upload a file to share with the {selectedDepartment?.name} department
          </DialogDescription>
       </DialogHeader>
      <div className="grid gap-4 py-4">
        <label className="flex flex-col gap-2">
       <span className="text-sm font-medium">
          Select File
        </span>
        <Input
          type="file"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      </label>
      
      {selectedUploadFile && (
        <div className="text-sm">
          <p className="font-medium">{selectedUploadFile.name}</p>
          <p className="text-gray-500">
            {formatFileSize(selectedUploadFile.size)}
          </p>
        </div>
      )}
      
      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-center">{uploadProgress}% complete</p>
        </div>
      )}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={isUploading}>
        Cancel
      </Button>
      <Button 
        onClick={handleFileUpload} 
        disabled={isUploading || !selectedUploadFile}
        className="bg-red-600 hover:bg-red-700 text-white"
      >
        {isUploading ? 'Uploading...' : 'Upload'}
      </Button>
    </DialogFooter>
  </DialogContent>
  </Dialog>
  </PageContextualHelp>
</DashboardLayout>
  );
} 