'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/common/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Search,
  Upload,
  Download,
  Trash2,
  FileText,
  Image,
  File,
  MoreVertical,
  Filter,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';

interface Department {
  id: string;
  name: string;
}

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  department: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  total: number;
  pages: number;
  current: number;
}

export default function FileManagerPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    pages: 1,
    current: 1
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [filterDepartment, filterType, sortBy, pagination.current]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments');
      if (!response.ok) throw new Error('Failed to fetch departments');
      const data = await response.json();
      setDepartments(data.departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch departments');
    }
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        department: filterDepartment,
        type: filterType,
        sort: sortBy,
        page: pagination.current.toString(),
        limit: '10'
      });

      const response = await fetch('/api/admin/files?' + params);
      if (!response.ok) throw new Error('Failed to fetch files');
      const data = await response.json();
      setFiles(data.files);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch('/api/admin/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: [fileId] })
      });

      if (!response.ok) throw new Error('Failed to delete file');
      
      toast.success('File deleted successfully');
      setFileToDelete(null);
      setDeleteDialogOpen(false);
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedFiles.length) return;

    try {
      const response = await fetch('/api/admin/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: selectedFiles })
      });

      if (!response.ok) throw new Error('Failed to delete files');

      toast.success('Files deleted successfully');
      setSelectedFiles([]);
      fetchFiles();
    } catch (error) {
      console.error('Error deleting files:', error);
      toast.error('Failed to delete files');
    }
  };

  const handleUpdateFileAccess = async (fileId: string, status: string) => {
    try {
      const response = await fetch('/api/admin/files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, status })
      });

      if (!response.ok) throw new Error('Failed to update file access');

      toast.success('File access updated successfully');
      fetchFiles();
    } catch (error) {
      console.error('Error updating file access:', error);
      toast.error('Failed to update file access');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type.split('/')[0]) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">File Manager</h1>
            <p className="text-gray-500">Manage and organize system files</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={!selectedFiles.length}
              onClick={() => {
                setFileToDelete(null);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedFiles.length})
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Files</CardTitle>
              <div className="text-sm text-gray-500">
                Total: {pagination.total} files
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="File Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Upload Date</SelectItem>
                    <SelectItem value="name">File Name</SelectItem>
                    <SelectItem value="size">File Size</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedFiles.length === filteredFiles.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedFiles(filteredFiles.map(f => f.id));
                            } else {
                              setSelectedFiles([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredFiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          No files found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFiles.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedFiles.includes(file.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedFiles([...selectedFiles, file.id]);
                                } else {
                                  setSelectedFiles(selectedFiles.filter(id => id !== file.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.type)}
                              {file.name}
                            </div>
                          </TableCell>
                          <TableCell>{file.type}</TableCell>
                          <TableCell>{formatFileSize(file.size)}</TableCell>
                          <TableCell>{file.uploadedBy}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{file.department}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={file.status === 'active' ? 'default' : 'secondary'}
                            >
                              {file.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(file.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={file.url} download>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleUpdateFileAccess(
                                    file.id,
                                    file.status === 'active' ? 'inactive' : 'active'
                                  )}
                                >
                                  {file.status === 'active' ? (
                                    <>
                                      <EyeOff className="h-4 w-4 mr-2" />
                                      Disable Access
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Enable Access
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    setFileToDelete(file.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {pagination.pages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPagination(prev => ({
                            ...prev,
                            current: Math.max(1, prev.current - 1)
                          }))}
                          disabled={pagination.current === 1}
                        />
                      </PaginationItem>
                      {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setPagination(prev => ({
                              ...prev,
                              current: page
                            }))}
                            isActive={page === pagination.current}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPagination(prev => ({
                            ...prev,
                            current: Math.min(prev.pages, prev.current + 1)
                          }))}
                          disabled={pagination.current === pagination.pages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              {fileToDelete ? (
                <>Are you sure you want to delete this file? This action cannot be undone.</>
              ) : (
                <>Are you sure you want to delete {selectedFiles.length} selected files? This action cannot be undone.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setFileToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (fileToDelete) {
                  handleDeleteFile(fileToDelete);
                } else {
                  handleDeleteSelected();
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
} 