'use client';

import { useState, useEffect, useCallback } from 'react';
import { File } from '@/types/file';
import { FileUpload } from './FileUpload';
import { Button } from '@/components/ui/button';
import { Plus, Download, Share2, Trash2, Users, Building2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getFiles, deleteFileBridge, shareFileBridge } from '@/lib/bridge/file-bridge';
import { logActivity } from '@/lib/bridge/activity-bridge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssistant } from '@/components/assistant/RegisvaultAssistant';

// Extend the File type with Appwrite specific properties
interface AppwriteFile extends File {
  bucketFileId?: string;
  bucketFieldId?: string;
  lastViewed?: string;
  sharedWith?: string[];
}

interface FileManagerProps {
  onFileDeleted?: () => void;
}

export function FileManager({ onFileDeleted }: FileManagerProps) {
  const [files, setFiles] = useState<AppwriteFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<AppwriteFile | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareDepartment, setShareDepartment] = useState('');
  const [departments, setDepartments] = useState<{ id: string, name: string }[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMethod, setShareMethod] = useState<'email' | 'department'>('email');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<AppwriteFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showHelp } = useAssistant();

  const fetchFilesData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getFiles({
        limit: 50
      });
      
      const fetchedFiles = result.files;
      setFiles(fetchedFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilesData();
    // Fetch departments
    const fetchDepartments = async () => {
      try {
        const response = await fetch('/api/departments');
        if (!response.ok) throw new Error(`Failed to fetch departments: ${response.status}`);
        
        const data = await response.json();
        console.log('Departments data:', data); // Log for debugging
        
        if (data && Array.isArray(data.departments)) {
          setDepartments(data.departments);
        } else {
          console.error('Unexpected departments response format:', data);
          setDepartments([]);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        setDepartments([]);
        toast.error('Failed to load departments');
      }
    };
    fetchDepartments();
  }, [fetchFilesData]);

  const handleShare = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) {
      toast.error('File not found in current list');
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
      fetchFilesData();
    } catch (error: any) {
      console.error('Error sharing file:', error);
      toast.error('Failed to share file: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) {
        toast.error('File not found in current list');
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
    const file = files.find(f => f.id === fileId);
    if (!file) {
      toast.error('File not found in current list');
      return;
    }
    
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteFileBridge(fileToDelete.id, fileToDelete.bucketFileId || '');
      
      // Immediately remove from local state
      setFiles(files.filter(f => f.id !== fileToDelete.id));
      toast.success(`"${fileToDelete.name}" moved to trash`);
      
      // Notify parent component about the deletion
      if (onFileDeleted) {
        onFileDeleted();
      }
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error(`Failed to delete file: ${error.message || 'Unknown error'}`);
    } finally {
      setDeleteDialogOpen(false);
      setFileToDelete(null);
      setIsDeleting(false);
    }
  };

  const handleRefresh = () => {
    fetchFilesData();
  };

  return (
    <div className="w-full">
      {/* Upload Buttons */}
      <div className="p-4 bg-zinc-900 flex justify-end gap-2 border-b border-zinc-800">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => showHelp('search')}
          className="text-gray-400 hover:text-white"
        >
          <HelpCircle className="h-4 w-4 mr-1" />
          Search Help
        </Button>
        <FileUpload onUploadComplete={handleRefresh} />
        <Button variant="default">
          <Plus className="h-4 w-4 mr-1" /> New File
        </Button>
      </div>

      {/* File Table Container - Dark Theme */}
      <div className="w-full bg-zinc-900">
        {/* Custom File Listing */}
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No files found</div>
        ) : (
          <div className="w-full">
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-4 px-4 py-3 text-sm font-medium text-gray-400 bg-zinc-900 border-b border-zinc-800">
              <div>Name</div>
              <div>Type</div>
              <div>Size</div>
              <div>Last Modified</div>
              <div className="text-right">Actions</div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-zinc-800">
              {files.map((file) => (
                <div key={file.id} className="grid grid-cols-5 gap-4 px-4 py-3 items-center text-white hover:bg-zinc-800">
                  <div className="truncate">{file.name}</div>
                  <div>{file.type}</div>
                  <div>{file.size}</div>
                  <div>{new Date(file.createdAt).toLocaleString()}</div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDownload(file.id)}
                      className="h-8 w-8 text-gray-400 hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleShare(file.id)}
                      className="h-8 w-8 text-gray-400 hover:text-white"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => showHelp('sharing')}
                      className="text-gray-400 hover:text-white"
                      >
                      <HelpCircle className="h-4 w-4 mr-1" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(file.id)}
                      className="h-8 w-8 text-gray-400 hover:text-white"
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{fileToDelete?.name}"?
              This file will be moved to the trash. You can restore it later from
              the Trash page if needed.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
