'use client';

import { useState, useEffect } from 'react';
import { getFiles } from '@/lib/bridge/file-bridge';
import { getDepartments } from '@/lib/appwrite/server-actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, Download, Share2, Trash2, Users, Building2,
  FileText, FileImage, FileAudio, FileVideo, File as FileIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { deleteFileBridge, shareFileBridge } from '@/lib/bridge/file-bridge';
import { logActivity } from '@/lib/bridge/activity-bridge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Department {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  description?: string;
  allocatedStorage?: number;
  usedStorage?: number;
  [key: string]: any; // Allow for additional Appwrite document properties
}

interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  departmentId?: string;
  uploadedBy?: string;
  createdAt: string;
  lastViewed?: string;
  sharedWith?: string[];
  bucketFileId?: string;
}

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to get file icon based on file type
const getFileIcon = (fileType: string) => {
  if (fileType.includes('image')) {
    return <FileImage className="h-4 w-4 mr-2" />;
  } else if (fileType.includes('video')) {
    return <FileVideo className="h-4 w-4 mr-2" />;
  } else if (fileType.includes('audio')) {
    return <FileAudio className="h-4 w-4 mr-2" />;
  } else if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) {
    return <FileText className="h-4 w-4 mr-2" />;
  } else {
    return <FileIcon className="h-4 w-4 mr-2" />;
  }
};

export default function SharedDashboardPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [sharedFiles, setSharedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareDepartment, setShareDepartment] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareMethod, setShareMethod] = useState<'email' | 'department'>('email');

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch('/api/departments');
        if (!response.ok) throw new Error(`Failed to fetch departments: ${response.status}`);
        
        const data = await response.json();
        if (data && Array.isArray(data.departments)) {
          setDepartments(data.departments);
        } else {
          console.error('Unexpected departments response format:', data);
          setDepartments([]);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        toast.error('Failed to load departments');
      }
    };

    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchSharedFiles = async () => {
      try {
        setLoading(true);
        console.log('Fetching shared files...');
        
        const result = await getFiles({
          type: 'shared',
          departmentId: selectedDepartment !== 'all' ? selectedDepartment : undefined,
          limit: 50
        });
        
        console.log('Shared files result:', {
          count: result.files?.length || 0,
          files: result.files
        });
        
        setSharedFiles(result.files);
      } catch (error) {
        console.error('Error fetching shared files:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSharedFiles();
  }, [selectedDepartment]);

  const filteredFiles = sharedFiles.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleShare = async (fileId: string) => {
    const file = sharedFiles.find(f => f.id === fileId);
    if (!file) {
      toast.error('File not found');
      return;
    }
    setSelectedFile(file);
    setShareDialogOpen(true);
  };

  const handleShareSubmit = async () => {
    if (!selectedFile) return;
    
    if (shareMethod === 'email' && !shareEmail) {
      toast.error('Please enter an email address');
      return;
    }
    
    if (shareMethod === 'department' && !shareDepartment) {
      toast.error('Please select a department');
      return;
    }

    try {
      setIsSharing(true);
      
      if (shareMethod === 'email') {
        console.log('Sharing file', selectedFile.id, 'with email:', shareEmail);
        const response = await shareFileBridge(selectedFile.id, {
          emails: [shareEmail],
          role: 'viewer'
        });
        
        console.log('Share response:', response);
        
        if (response.warning) {
          toast.warning('Warning: ' + response.warning);
        } else if (response.success) {
          toast.success(`File shared successfully with ${shareEmail}`);
        }
      } else {
        console.log('Sharing file', selectedFile.id, 'with department:', shareDepartment);
        const response = await shareFileBridge(selectedFile.id, {
          departments: [shareDepartment],
          role: 'viewer',
          shareAsDepartment: true
        });
        
        console.log('Share response:', response);
        
        if (response.warning) {
          toast.warning('Warning: ' + response.warning);
        } else if (response.success) {
          toast.success('File shared successfully with department');
        }
      }
      
      setShareDialogOpen(false);
      setShareEmail('');
      setShareDepartment('');
    } catch (error: any) {
      console.error('Error sharing file:', error);
      toast.error('Failed to share file: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const file = sharedFiles.find(f => f.id === fileId);
      if (!file) {
        toast.error('File not found');
        return;
      }
      
      toast.info(`Preparing download for "${file.name}"...`);
      
      const response = await fetch(`/api/files/${fileId}/download`);
      if (!response.ok) {
        throw new Error(`Download failed with status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
        
      await logActivity('FILE_DOWNLOAD', `Downloaded file: ${file.name}`, fileId);
      toast.success(`"${file.name}" downloaded successfully`);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast.error(`Failed to download file: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const file = sharedFiles.find(f => f.id === fileId);
      if (!file) {
        toast.error('File not found');
        return;
      }
      
      if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
        return;
      }
      
      await deleteFileBridge(fileId, file.bucketFileId || '');
      setSharedFiles(sharedFiles.filter(f => f.id !== fileId));
      toast.success(`"${file.name}" deleted successfully`);
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error(`Failed to delete file: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl  font-bold text-black">Shared Files</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[200px] bg-gray-700 border-gray-800 text-black">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-800 text-white">
              <SelectItem value="all" className="focus:bg-white focus:text-black">All Departments</SelectItem>
              {departments && departments.length > 0 ? 
                departments.map(dept => (
                  <SelectItem key={dept.$id || dept.id} value={dept.$id || dept.id} className="focus:bg-black focus:text-white">{dept.name}</SelectItem>
                )) : null
              }
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-black border border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Shared Files</CardTitle>
            <Share2 className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{filteredFiles.length}</div>
            <p className="text-xs text-gray-400 mt-1">
              Files shared with you by others
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-black border border-gray-700 ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total File Size</CardTitle>
            <FileIcon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatFileSize(filteredFiles.reduce((total, file) => total + (file.size || 0), 0))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Combined size of all shared files
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-black border border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Last Updated</CardTitle>
            <FileText className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {filteredFiles.length > 0 
                ? new Date(
                    Math.max(...filteredFiles.map(f => new Date(f.createdAt).getTime()))
                  ).toLocaleDateString() 
                : "N/A"}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Most recent shared file date
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg bg-black border-gray-800 shadow">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400">
            <div className="h-10 w-10 rounded-full border-2 border-t-red-600 animate-spin mb-4"></div>
            <p>Loading shared files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400">
            <Share2 className="h-10 w-10 mb-2 text-red" />
            <p className="text-lg mb-1 text-white">No shared files found</p>
            <p className="text-sm text-gray-400">
              Files shared with you will appear here
            </p>
          </div>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-5 gap-4 px-4 py-3 text-sm font-medium border-b border-gray-700 text-white">
              <div>Name</div>
              <div>Type</div>
              <div>Size</div>
              <div>Last Modified</div>
              <div className="text-right">Actions</div>
            </div>
            
            <div className="divide-y divide-gray-700">
              {filteredFiles.map((file) => (
                <div key={file.id} className="grid grid-cols-5 gap-4 px-4 py-3 items-center hover:bg-black text-white">
                  <div className="truncate flex items-center">
                    {getFileIcon(file.type)}
                    <span>{file.name}</span>
                  </div>
                  <div className="text-gray-400 text-sm">{file.type}</div>
                  <div>{formatFileSize(file.size)}</div>
                  <div>{new Date(file.createdAt).toLocaleString()}</div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDownload(file.id)}
                      className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleShare(file.id)}
                      className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(file.id)}
                      className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share File</DialogTitle>
            <DialogDescription>
              Share "{selectedFile?.name}" with others
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="email" className="w-full" onValueChange={(value) => setShareMethod(value as 'email' | 'department')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="email">
                <Users className="w-4 h-4 mr-2" />
                User Email
              </TabsTrigger>
              <TabsTrigger value="department">
                <Building2 className="w-4 h-4 mr-2" />
                Department
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="department" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={shareDepartment} onValueChange={setShareDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments && departments.length > 0 ? (
                      departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No departments available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShareDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleShareSubmit}
              disabled={
                isSharing || 
                (shareMethod === 'email' && !shareEmail) || 
                (shareMethod === 'department' && !shareDepartment)
              }
            >
              {isSharing ? 'Sharing...' : 'Share'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}