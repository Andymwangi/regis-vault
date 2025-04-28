'use client';

import { useState, useEffect, useRef } from 'react';
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
  Trash2, 
  RotateCcw, 
  FileText, 
  Filter, 
  UserPlus, 
  Clock, 
  Calendar,
  Users,
  Building2,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal
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
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeletedFile extends Omit<File, 'deletedBy'> {
  id: string;
  deletedAt: string;
  deletedBy: {
    id: string;
    name: string;
    email: string;
    department?: {
      id: string;
      name: string;
    }
  };
  department?: {
    id: string;
    name: string;
  };
}

interface Department {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email?: string;
}

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-red-600 border-opacity-80"></div>
    <p className="mt-4 text-gray-600 font-medium">Loading...</p>
  </div>
);

export default function TrashDashboardPage() {
  const { user } = useAuth();
  const [deletedFiles, setDeletedFiles] = useState<DeletedFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<DeletedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [fileType, setFileType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'byDepartment' | 'byUser'>('all');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<DeletedFile | null>(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [stats, setStats] = useState({
    totalDeleted: 0,
    recentlyDeleted: 0,
    myDeleted: 0,
    departmentDeleted: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  useEffect(() => {
    fetchDeletedFiles();
    fetchDepartments();
    fetchUsers();
  }, []);

  // Apply filters when filter values change
  useEffect(() => {
    applyFilters();
  }, [selectedDepartment, selectedUser, timeFilter, fileType, searchQuery, deletedFiles]);

  // Add keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K or Command+K
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchDeletedFiles = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (timeFilter !== 'all') params.append('timeRange', timeFilter);
      if (fileType !== 'all') params.append('fileType', fileType);
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      if (selectedUser !== 'all') params.append('deletedBy', selectedUser);
      
      // Add cache-busting parameter to ensure fresh data
      params.append('_t', Date.now().toString());
      
      console.log('Fetching deleted files with params:', params.toString());
      
      const response = await fetch(`/api/files/trash?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        console.error('Error response from server:', response.status, response.statusText);
        throw new Error('Failed to fetch deleted files');
      }
      
      const data = await response.json();
      console.log(`Received ${data.files?.length || 0} files from server`);
      
      // Ensure all files have valid IDs before setting state
      const files = (data.files || []).filter((file: any) => {
        if (!file || !file.id || file.id === 'undefined' || file.id === 'null') {
          console.warn('Filtering out file with invalid ID:', file);
          return false;
        }
        return true;
      });
      
      console.log(`Filtered to ${files.length} valid files after ID validation`);
      
      setDeletedFiles(files);
      
      // Calculate stats
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      setStats({
        totalDeleted: files.length,
        recentlyDeleted: files.filter((file: DeletedFile) => 
          file?.deletedAt && new Date(file.deletedAt) >= sevenDaysAgo
        ).length,
        myDeleted: files.filter((file: DeletedFile) => user?.id === file.deletedBy?.id).length,
        departmentDeleted: files.filter((file: DeletedFile) => 
          user?.department === file.department?.id
        ).length
      });
      
      // Apply filters to update filteredFiles
      setTimeout(applyFilters, 0);
      
    } catch (error) {
      console.error('Error fetching deleted files:', error);
      toast.error('Failed to fetch deleted files');
      setDeletedFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (!response.ok) throw new Error('Failed to fetch departments');
      
      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch departments');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  const applyFilters = () => {
    if (!deletedFiles.length) {
      setFilteredFiles([]);
      return;
    }
    
    let filtered = [...deletedFiles];
    
    // Apply department filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(file => file.department?.id === selectedDepartment);
    }
    
    // Apply user filter
    if (selectedUser !== 'all') {
      filtered = filtered.filter(file => file.deletedBy?.id === selectedUser);
    }
    
    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      let cutoffDate: Date;
      
      switch (timeFilter) {
        case 'today':
          cutoffDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          cutoffDate = new Date(now);
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate = new Date(now);
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        default:
          cutoffDate = new Date(0); // Beginning of time
      }
      
      filtered = filtered.filter(file => new Date(file.deletedAt) >= cutoffDate);
    }
    
    // Apply file type filter
    if (fileType !== 'all') {
      filtered = filtered.filter(file => file.type.toLowerCase().includes(fileType.toLowerCase()));
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file => {
        return (
          file.name.toLowerCase().includes(query) ||
          file.deletedBy?.name.toLowerCase().includes(query) ||
          file.department?.name.toLowerCase().includes(query)
        );
      });
    }
    
    setFilteredFiles(filtered);
  };

  const handleRestore = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/restore`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to restore file');
      
      toast.success('File restored successfully');
      fetchDeletedFiles();
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
    } catch (error) {
      console.error('Error restoring file:', error);
      toast.error('Failed to restore file');
    }
  };

  const handleBulkRestore = async () => {
    if (!selectedFiles.length) return;
    
    try {
      setBulkActionLoading(true);
      
      // Sequentially restore files
      for (const fileId of selectedFiles) {
        const response = await fetch(`/api/files/${fileId}/restore`, {
          method: 'POST',
        });
        
        if (!response.ok) throw new Error(`Failed to restore file ${fileId}`);
      }
      
      toast.success(`${selectedFiles.length} files restored successfully`);
      fetchDeletedFiles();
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error restoring files:', error);
      toast.error('Failed to restore some files');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const confirmPermanentDelete = (fileId: string) => {
    if (!fileId || fileId === 'undefined' || fileId === 'null') {
      console.error('Attempted to delete file with invalid ID:', fileId);
      toast.error('Cannot delete: Invalid file ID');
      return;
    }
    
    // Verify that the file exists in our list
    const fileExists = deletedFiles.some(file => file.id === fileId);
    if (!fileExists) {
      console.error(`File with ID ${fileId} not found in current file list`);
      toast.error('Cannot delete: File not found in current list');
      return;
    }
    
    console.log(`Setting file to delete: ${fileId}`);
    setFileToDelete(fileId);
    setShowConfirmDelete(true);
  };
  
  const handlePermanentDelete = async () => {
    if (!fileToDelete) {
      console.error('No file selected for deletion');
      toast.error('No file selected for deletion');
      return;
    }
    
    // Validate file ID
    if (!fileToDelete || fileToDelete === 'undefined' || fileToDelete === 'null') {
      console.error('Invalid file ID for deletion:', fileToDelete);
      toast.error('Cannot delete: Invalid file ID');
      setShowConfirmDelete(false);
      setFileToDelete(null);
      return;
    }
    
    // Log the file ID to help with debugging
    console.log(`Starting permanent delete process for file ID: "${fileToDelete}"`);
    
    try {
      setBulkActionLoading(true);
      
      // Clear the UI immediately to provide better feedback
      const fileToDeleteObject = deletedFiles.find(file => file.id === fileToDelete);
      if (!fileToDeleteObject) {
        console.error(`File with ID ${fileToDelete} not found in state`);
        toast.error('File not found in current list');
        setShowConfirmDelete(false);
        setFileToDelete(null);
        setBulkActionLoading(false);
        return;
      }
      
      const fileToDeleteName = fileToDeleteObject.name || 'File';
      toast.loading(`Deleting ${fileToDeleteName}...`);
      
      setDeletedFiles(prevFiles => prevFiles.filter(file => file.id !== fileToDelete));
      setFilteredFiles(prevFiles => prevFiles.filter(file => file.id !== fileToDelete));
      setSelectedFiles(prev => prev.filter(id => id !== fileToDelete));
      
      // Close the dialog early for better UX
      setShowConfirmDelete(false);
      
      // Sanitize file ID to ensure no undefined or null values
      const safeFileId = fileToDelete.trim();
      
      if (!safeFileId) {
        console.error('Failed to sanitize file ID:', fileToDelete);
        toast.error('Invalid file ID after sanitization');
        setBulkActionLoading(false);
        await fetchDeletedFiles();
        return;
      }
      
      // Make the actual delete request
      const response = await fetch(`/api/files/${safeFileId}/permanent-delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      // Log raw response status
      console.log('Server response status:', response.status);
      
      let responseBody;
      try {
        responseBody = await response.json();
        console.log('Server response body:', responseBody);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        responseBody = {};
      }
      
      if (!response.ok) {
        const errorMessage = responseBody?.error || responseBody?.message || `Server returned ${response.status}`;
        console.error(`API error: ${errorMessage}`);
        
        // Try one more time with force flag
        console.log('Retrying deletion with force flag...');
        const forceResponse = await fetch(`/api/files/${safeFileId}/permanent-delete?force=true`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!forceResponse.ok) {
          // If the second attempt also failed, show error
          toast.dismiss();
          toast.error(`Failed to delete ${fileToDeleteName}: ${errorMessage}`);
          
          // Re-fetch all data to get consistent view
          await fetchDeletedFiles();
        } else {
          // Second attempt succeeded
          toast.dismiss();
          toast.success(`${fileToDeleteName} permanently deleted`);
        }
      } else {
        toast.dismiss();
        toast.success(`${fileToDeleteName} permanently deleted`);
      }
      
      // Refresh all data to ensure consistency
      await fetchDeletedFiles();
      
      // Clear file to delete
      setFileToDelete(null);
    } catch (error: any) {
      console.error('Error permanently deleting file:', error);
      toast.error(`Failed to permanently delete file: ${error.message || 'Unknown error'}`);
      // Make sure to refresh to get a consistent state
      await fetchDeletedFiles();
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (!selectedFiles.length) return;
    
    // Validate all selected files first
    const validFileIds = selectedFiles.filter(id => {
      if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
        console.error(`Invalid file ID in bulk delete: ${id}`);
        return false;
      }
      
      // Verify file exists in our list
      const fileExists = deletedFiles.some(file => file.id === id);
      if (!fileExists) {
        console.error(`File ID ${id} not found in current list`);
        return false;
      }
      
      return true;
    });
    
    if (validFileIds.length === 0) {
      toast.error('No valid files to delete');
      return;
    }
    
    if (validFileIds.length !== selectedFiles.length) {
      console.warn(`Filtered out ${selectedFiles.length - validFileIds.length} invalid file IDs`);
    }
    
    try {
      setBulkActionLoading(true);
      
      // Show loading toast
      toast.loading(`Deleting ${validFileIds.length} files...`);
      
      // Use bulk delete for efficiency if we have many files
      if (validFileIds.length > 5) {
        const response = await fetch('/api/files/bulk-permanent-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            fileIds: validFileIds
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || 'Failed to permanently delete some files');
        }
        
        // Immediately update local state after bulk delete
        setDeletedFiles(prevFiles => 
          prevFiles.filter(file => !validFileIds.includes(file.id))
        );
        setFilteredFiles(prevFiles => 
          prevFiles.filter(file => !validFileIds.includes(file.id))
        );
      } else {
        // For smaller batches, delete sequentially for better error handling
        const successfullyDeletedIds = [];
        
        for (const fileId of validFileIds) {
          // Sanitize file ID
          const safeFileId = fileId.trim();
          
          const response = await fetch(`/api/files/${safeFileId}/permanent-delete`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Failed to delete file ${safeFileId}:`, errorData);
            // Continue with other files even if this one fails
          } else {
            successfullyDeletedIds.push(fileId);
            
            // Update files list after each successful deletion
            setDeletedFiles(prevFiles => 
              prevFiles.filter(file => file.id !== fileId)
            );
            setFilteredFiles(prevFiles => 
              prevFiles.filter(file => file.id !== fileId)
            );
          }
        }
      }
      
      toast.dismiss();
      toast.success(`${validFileIds.length} files permanently deleted`);
      
      // Refresh data to ensure consistency with server
      fetchDeletedFiles();
      setSelectedFiles([]);
    } catch (error: any) {
      console.error('Error permanently deleting files:', error);
      toast.dismiss();
      toast.error(`Failed to delete files: ${error.message || 'Unknown error'}`);
      
      // Refresh to ensure UI state is consistent with server state
      fetchDeletedFiles();
    } finally {
      setBulkActionLoading(false);
    }
  };

  const toggleSelectFile = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const toggleSelectAllFiles = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(file => file.id));
    }
  };

  const handleViewModeChange = (mode: 'all' | 'byDepartment' | 'byUser') => {
    setViewMode(mode);
    
    // Reset filters when changing view mode
    if (mode === 'byDepartment') {
      setSelectedUser('all');
    } else if (mode === 'byUser') {
      setSelectedDepartment('all');
    }
  };

  const handleFileDetails = (file: DeletedFile) => {
    setFileDetails(file);
    setShowFileDetails(true);
  };

  // Highlight search matches in text
  const highlightSearchMatch = (text: string): React.ReactNode => {
    if (!searchQuery.trim() || !text) return text;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === searchQuery.toLowerCase() 
        ? <span key={index} className="bg-yellow-200 text-black font-medium px-0.5 rounded">{part}</span> 
        : part
    );
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
    if (type.includes('powerpoint') || type.includes('ppt') || type.includes('pptx') || 
        type.includes('presentation')) return 'PowerPoint';
    
    // Text files
    if (type.includes('text') || type.includes('txt')) return 'Text';
    
    // Try to extract extension from filename if MIME type doesn't work
    if (type.endsWith('.pptx') || type.endsWith('.ppt')) return 'PowerPoint';
    if (type.endsWith('.docx') || type.endsWith('.doc')) return 'Word';
    if (type.endsWith('.xlsx') || type.endsWith('.xls')) return 'Spreadsheet';
    
    // Try to extract subtype from mime type
    const parts = type.split('/');
    if (parts.length > 1 && parts[1]) {
      return parts[1].toUpperCase();
    }
    
    return 'Unknown';
  };

  // Helper function to safely format dates
  const safeFormatDate = (dateString: string | undefined, formatStr: string): string => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Unknown date';
      return format(date, formatStr);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown date';
    }
  };

  // Group files by department for department view
  const filesByDepartment = departments.map(department => {
    const departmentFiles = filteredFiles.filter(file => 
      file.department?.id === department.id
    );
    
    return {
      department,
      files: departmentFiles
    };
  }).filter(group => group.files.length > 0);

  // Group files by user for user view
  const filesByUser = users.map(user => {
    const userFiles = filteredFiles.filter(file => 
      file.deletedBy?.id === user.id
    );
    
    return {
      user,
      files: userFiles
    };
  }).filter(group => group.files.length > 0);

  // Add a function to check API health for debugging
  const checkApiHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      setDebugInfo(data);
      setShowDebugInfo(true);
      
      if (data.status === 'healthy') {
        toast.success('API connection is healthy');
      } else {
        toast.error('API connection issues detected');
      }
    } catch (error) {
      console.error('Error checking API health:', error);
      toast.error('Failed to check API health');
      
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
      setShowDebugInfo(true);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-4xl font-bold text-gray-800">Trash</h1>
          <p className="text-lg text-gray-500">
            View and manage deleted files from all departments and users
          </p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Total Deleted</CardTitle>
              <Trash2 className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalDeleted}</div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Recently Deleted</CardTitle>
              <Clock className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.recentlyDeleted}</div>
              <div className="text-xs text-gray-500 mt-1">Last 7 days</div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">My Deleted Files</CardTitle>
              <Users className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.myDeleted}</div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Department Deleted</CardTitle>
              <Building2 className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.departmentDeleted}</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center">
          <div className="relative max-w-2xl w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search deleted files, departments, users... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <Tabs value={viewMode} onValueChange={(value: string) => handleViewModeChange(value as any)}>
              <TabsList>
                <TabsTrigger value="all">All Files</TabsTrigger>
                <TabsTrigger value="byDepartment">By Department</TabsTrigger>
                <TabsTrigger value="byUser">By User</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  <Badge className="ml-1 bg-red-500">{
                    (selectedDepartment !== 'all' ? 1 : 0) + 
                    (selectedUser !== 'all' ? 1 : 0) + 
                    (timeFilter !== 'all' ? 1 : 0) + 
                    (fileType !== 'all' ? 1 : 0)
                  }</Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <h4 className="font-medium">Filter Options</h4>
                  
                  <div className="grid gap-2">
                    <label htmlFor="time-filter" className="text-sm">Time Period</label>
                    <Select value={timeFilter} onValueChange={setTimeFilter}>
                      <SelectTrigger id="time-filter">
                        <SelectValue placeholder="Select time period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label htmlFor="file-type" className="text-sm">File Type</label>
                    <Select value={fileType} onValueChange={setFileType}>
                      <SelectTrigger id="file-type">
                        <SelectValue placeholder="Select file type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="doc">Word Documents</SelectItem>
                        <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
                        <SelectItem value="image">Images</SelectItem>
                        <SelectItem value="presentation">Presentations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {viewMode !== 'byDepartment' && (
                    <div className="grid gap-2">
                      <label htmlFor="department-filter" className="text-sm">Department</label>
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger id="department-filter">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          {departments.map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {viewMode !== 'byUser' && (
                    <div className="grid gap-2">
                      <label htmlFor="user-filter" className="text-sm">Deleted By</label>
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger id="user-filter">
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={() => {
                      setTimeFilter('all');
                      setFileType('all');
                      setSelectedDepartment('all');
                      setSelectedUser('all');
                    }}>
                      Reset Filters
                    </Button>
                    <Button size="sm" onClick={() => setShowFilters(false)}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Admin debug button - only shown for admins */}
            {user?.role === 'admin' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkApiHealth}
                className="gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Check API
              </Button>
            )}
          </div>
        </div>
        
        {/* Bulk Actions */}
        {selectedFiles.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">
              {selectedFiles.length} files selected
            </span>
            <div className="flex-1"></div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBulkRestore}
              disabled={bulkActionLoading}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restore Selected
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleBulkPermanentDelete}
              disabled={bulkActionLoading}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        )}
        
        {/* File List - All Files View */}
        {viewMode === 'all' && (
          <Card className="border-0 shadow-none overflow-hidden">
            <CardHeader className="bg-zinc-900 border-b border-zinc-800">
              <CardTitle className="text-xl font-semibold text-white">Deleted Files</CardTitle>
            </CardHeader>
            
            <CardContent className="p-0">
              {loading ? (
                <LoadingSpinner />
              ) : filteredFiles.length === 0 ? (
                <div className="py-8 text-center text-gray-400">No deleted files found</div>
              ) : (
                <div className="bg-zinc-900">
                  <div className="grid grid-cols-7 gap-4 p-4 text-sm font-medium text-gray-400 border-b border-zinc-800">
                    <div className="col-span-1 flex items-center">
                      <Checkbox 
                        id="select-all" 
                        checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                        onCheckedChange={toggleSelectAllFiles}
                        className="mr-2"
                      />
                      <label htmlFor="select-all">File</label>
                    </div>
                    <div className="col-span-1">Type</div>
                    <div className="col-span-1">Size</div>
                    <div className="col-span-1">Deleted By</div>
                    <div className="col-span-1">User Department</div>
                    <div className="col-span-1">Deletion Date</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>
                  
                  <div className="divide-y divide-zinc-800">
                    {filteredFiles.map((file) => (
                      <div key={`file-${file.id || Math.random().toString(36)}`} className="grid grid-cols-7 gap-4 p-4 items-center text-white hover:bg-zinc-800">
                        <div className="col-span-1 flex items-center gap-2">
                          <Checkbox 
                            id={`select-${file.id}`}
                            checked={selectedFiles.includes(file.id)}
                            onCheckedChange={() => toggleSelectFile(file.id)}
                          />
                          <div className="truncate font-medium cursor-pointer" onClick={() => handleFileDetails(file)}>
                            {highlightSearchMatch(file.name)}
                          </div>
                        </div>
                        <div className="col-span-1">{getFileTypeDisplay(file.type)}</div>
                        <div className="col-span-1">{formatFileSize(file.size)}</div>
                        <div className="col-span-1 truncate">
                          {file.deletedBy ? highlightSearchMatch(file.deletedBy.name) : 'Unknown'}
                        </div>
                        <div className="col-span-1 truncate">
                          {file.deletedBy?.department ? highlightSearchMatch(file.deletedBy.department.name) : 'N/A'}
                        </div>
                        <div className="col-span-1">
                          {safeFormatDate(file.deletedAt, 'MMM d, yyyy')}
                        </div>
                        <div className="col-span-1 flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                            onClick={() => handleRestore(file.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span className="sr-only">Restore</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                            onClick={() => confirmPermanentDelete(file.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Permanently</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                              >
                                <ChevronDown className="h-4 w-4" />
                                <span className="sr-only">More</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-zinc-800 border-zinc-700 text-white">
                              <DropdownMenuItem onClick={() => handleFileDetails(file)}>
                                <Info className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* File List - By Department View */}
        {viewMode === 'byDepartment' && (
          <div className="space-y-6">
            {loading ? (
              <LoadingSpinner />
            ) : filesByDepartment.length === 0 ? (
              <div className="py-8 text-center text-gray-400">No deleted files found</div>
            ) : (
              filesByDepartment.map(({ department, files }) => (
                <Card key={department.id} className="border-0 shadow-none overflow-hidden">
                  <CardHeader className="bg-zinc-900 border-b border-zinc-800">
                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-red-500" />
                      {department.name} ({files.length})
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    <div className="bg-zinc-900">
                      <div className="grid grid-cols-7 gap-4 p-4 text-sm font-medium text-gray-400 border-b border-zinc-800">
                        <div className="col-span-1 flex items-center">
                          <Checkbox 
                            id={`select-all-${department.id}`}
                            checked={files.every(file => selectedFiles.includes(file.id))}
                            onCheckedChange={() => {
                              if (files.every(file => selectedFiles.includes(file.id))) {
                                setSelectedFiles(selectedFiles.filter(id => !files.some(file => file.id === id)));
                              } else {
                                setSelectedFiles([...new Set([...selectedFiles, ...files.map(file => file.id)])]);
                              }
                            }}
                            className="mr-2"
                          />
                          <label htmlFor={`select-all-${department.id}`}>File</label>
                        </div>
                        <div className="col-span-1">Type</div>
                        <div className="col-span-1">Size</div>
                        <div className="col-span-1">Deleted By</div>
                        <div className="col-span-1">User Department</div>
                        <div className="col-span-1">Deletion Date</div>
                        <div className="col-span-1 text-right">Actions</div>
                      </div>
                      
                      <div className="divide-y divide-zinc-800">
                        {files.map((file) => (
                          <div key={`file-${file.id || Math.random().toString(36)}`} className="grid grid-cols-7 gap-4 p-4 items-center text-white hover:bg-zinc-800">
                            <div className="col-span-1 flex items-center gap-2">
                              <Checkbox 
                                id={`select-${file.id}`}
                                checked={selectedFiles.includes(file.id)}
                                onCheckedChange={() => toggleSelectFile(file.id)}
                              />
                              <div className="truncate font-medium cursor-pointer" onClick={() => handleFileDetails(file)}>
                                {highlightSearchMatch(file.name)}
                              </div>
                            </div>
                            <div className="col-span-1">{getFileTypeDisplay(file.type)}</div>
                            <div className="col-span-1">{formatFileSize(file.size)}</div>
                            <div className="col-span-1 truncate">
                              {file.deletedBy ? highlightSearchMatch(file.deletedBy.name) : 'Unknown'}
                            </div>
                            <div className="col-span-1 truncate">
                              {file.deletedBy?.department ? highlightSearchMatch(file.deletedBy.department.name) : 'N/A'}
                            </div>
                            <div className="col-span-1">
                              {safeFormatDate(file.deletedAt, 'MMM d, yyyy')}
                            </div>
                            <div className="col-span-1 flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                                onClick={() => handleRestore(file.id)}
                              >
                                <RotateCcw className="h-4 w-4" />
                                <span className="sr-only">Restore</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                                onClick={() => confirmPermanentDelete(file.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete Permanently</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
        
        {/* File List - By User View */}
        {viewMode === 'byUser' && (
          <div className="space-y-6">
            {loading ? (
              <LoadingSpinner />
            ) : filesByUser.length === 0 ? (
              <div className="py-8 text-center text-gray-400">No deleted files found</div>
            ) : (
              filesByUser.map(({ user, files }) => (
                <Card key={user.id} className="border-0 shadow-none overflow-hidden">
                  <CardHeader className="bg-zinc-900 border-b border-zinc-800">
                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-red-500" />
                      {user.name} ({files.length})
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    <div className="bg-zinc-900">
                      <div className="grid grid-cols-5 gap-4 p-4 text-sm font-medium text-gray-400 border-b border-zinc-800">
                        <div className="col-span-1 flex items-center">
                          <Checkbox 
                            id={`select-all-${user.id}`}
                            checked={files.every(file => selectedFiles.includes(file.id))}
                            onCheckedChange={() => {
                              if (files.every(file => selectedFiles.includes(file.id))) {
                                setSelectedFiles(selectedFiles.filter(id => !files.some(file => file.id === id)));
                              } else {
                                setSelectedFiles([...new Set([...selectedFiles, ...files.map(file => file.id)])]);
                              }
                            }}
                            className="mr-2"
                          />
                          <label htmlFor={`select-all-${user.id}`}>File</label>
                        </div>
                        <div className="col-span-1">Type</div>
                        <div className="col-span-1">Size</div>
                        <div className="col-span-1">User Department</div>
                        <div className="col-span-1">Deletion Date</div>
                      </div>
                      
                      <div className="divide-y divide-zinc-800">
                        {files.map((file) => (
                          <div key={`file-${file.id || Math.random().toString(36)}`} className="grid grid-cols-5 gap-4 p-4 items-center text-white hover:bg-zinc-800">
                            <div className="col-span-1 flex items-center gap-2">
                              <Checkbox 
                                id={`select-${file.id}`}
                                checked={selectedFiles.includes(file.id)}
                                onCheckedChange={() => toggleSelectFile(file.id)}
                              />
                              <div className="truncate font-medium cursor-pointer" onClick={() => handleFileDetails(file)}>
                                {highlightSearchMatch(file.name)}
                              </div>
                            </div>
                            <div className="col-span-1">{getFileTypeDisplay(file.type)}</div>
                            <div className="col-span-1">{formatFileSize(file.size)}</div>
                            <div className="col-span-1">
                              {file.deletedBy?.department ? highlightSearchMatch(file.deletedBy.department.name) : 'N/A'}
                            </div>
                            <div className="col-span-1">
                              {safeFormatDate(file.deletedAt, 'MMM d, yyyy')}
                            </div>
                            <div className="col-span-1 flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                                onClick={() => handleRestore(file.id)}
                              >
                                <RotateCcw className="h-4 w-4" />
                                <span className="sr-only">Restore</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                                onClick={() => confirmPermanentDelete(file.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete Permanently</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
        
        {/* Permanent Delete Confirmation */}
        <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently Delete File</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This file will be permanently deleted and cannot be recovered.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePermanentDelete} className="bg-red-600 hover:bg-red-700">
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* File Details Dialog */}
        <Dialog open={showFileDetails} onOpenChange={setShowFileDetails}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>File Details</DialogTitle>
              <DialogDescription>
                Complete information about the deleted file
              </DialogDescription>
            </DialogHeader>
            
            {fileDetails && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-sm font-medium">File Name:</div>
                  <div className="col-span-2 text-sm">{fileDetails.name}</div>
                  
                  <div className="text-sm font-medium">Type:</div>
                  <div className="col-span-2 text-sm">{getFileTypeDisplay(fileDetails.type)}</div>
                  
                  <div className="text-sm font-medium">Size:</div>
                  <div className="col-span-2 text-sm">{formatFileSize(fileDetails.size)}</div>
                  
                  <div className="text-sm font-medium">Created:</div>
                  <div className="col-span-2 text-sm">{safeFormatDate(fileDetails.createdAt, 'MMM d, yyyy h:mm a')}</div>
                  
                  <div className="text-sm font-medium">Last Modified:</div>
                  <div className="col-span-2 text-sm">{safeFormatDate(fileDetails.updatedAt, 'MMM d, yyyy h:mm a')}</div>
                  
                  <div className="text-sm font-medium">Deleted On:</div>
                  <div className="col-span-2 text-sm">{safeFormatDate(fileDetails.deletedAt, 'MMM d, yyyy h:mm a')}</div>
                  
                  <div className="text-sm font-medium">Deleted By:</div>
                  <div className="col-span-2 text-sm">
                    {fileDetails.deletedBy?.name || 'Unknown'}
                  </div>
                  
                  {fileDetails.deletedBy?.department && (
                    <>
                      <div className="text-sm font-medium">User Department:</div>
                      <div className="col-span-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span>{fileDetails.deletedBy.department.name}</span>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="text-sm font-medium">Owner:</div>
                  <div className="col-span-2 text-sm">{fileDetails.owner?.name || 'Unknown'}</div>
                </div>
                
                <div className="pt-4 flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(fileDetails.id)}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore File
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (!fileDetails || !fileDetails.id) {
                        toast.error('Cannot delete: Missing file information');
                        return;
                      }
                      setShowFileDetails(false);
                      confirmPermanentDelete(fileDetails.id);
                    }}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Permanently
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Debug Info Dialog */}
        <Dialog open={showDebugInfo} onOpenChange={setShowDebugInfo}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>API Debug Information</DialogTitle>
              <DialogDescription>
                Technical details about the API connection
              </DialogDescription>
            </DialogHeader>
            
            <div className="border rounded bg-gray-50 p-4">
              <pre className="text-xs whitespace-pre-wrap">
                {debugInfo ? JSON.stringify(debugInfo, null, 2) : 'No debug info available'}
              </pre>
            </div>
            
            <DialogFooter>
              <Button onClick={() => setShowDebugInfo(false)}>Close</Button>
              {user?.role === 'admin' && (
                <Button 
                  onClick={async () => {
                    try {
                      // Test the deletion endpoint directly
                      const testResponse = await fetch(`/api/files/test-connection`, {
                        method: 'GET'
                      });
                      
                      const testData = await testResponse.json();
                      setDebugInfo({
                        ...debugInfo,
                        testConnection: testData
                      });
                      
                      toast.success('Connection test completed');
                    } catch (error) {
                      console.error('Error testing connection:', error);
                      toast.error('Connection test failed');
                      
                      setDebugInfo({
                        ...debugInfo,
                        testConnection: { error: error instanceof Error ? error.message : 'Unknown error' }
                      });
                    }
                  }}
                  variant="outline"
                >
                  Test Connection
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 