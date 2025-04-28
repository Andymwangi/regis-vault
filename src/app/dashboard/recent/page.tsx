'use client';

import { useState, useEffect } from 'react';
import  DashboardLayout  from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Clock, 
  Upload, 
  Share2, 
  UserCheck,
  Search,
  CalendarDays, 
  SlidersHorizontal,
  FileText,
  Download,
  X,
  Info,
  Eye
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { File } from '@/types/file';
import React from 'react';

interface ReceivedFile extends File {
  sharedBy?: {
    id: string;
    name: string;
    email: string;
    date: string;
  };
  lastViewed?: string;
}

export default function RecentFilesPage() {
  const [recentFiles, setRecentFiles] = useState<ReceivedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFiles, setFilteredFiles] = useState<ReceivedFile[]>([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [fileType, setFileType] = useState('all');
  const [selectedFile, setSelectedFile] = useState<ReceivedFile | null>(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({
    recentlyViewed: 0,
    recentUploads: 0,
    sharedWithMe: 0,
    sharedByMe: 0
  });

  const fetchRecentFiles = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (timeFilter !== 'all') params.append('timeRange', timeFilter);
      if (fileType !== 'all') params.append('fileType', fileType);
      
      const response = await fetch(`/api/files/recent?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch recent files');
      
      const data = await response.json();
      const files = Array.isArray(data.files) ? data.files : [];
      
      setRecentFiles(files);
      setFilteredFiles(files);
      
      // Calculate stats
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      setStats({
        recentlyViewed: files.filter((file: ReceivedFile) => file?.lastViewed).length,
        recentUploads: files.filter((file: ReceivedFile) => 
          file?.createdAt && new Date(file.createdAt) >= sevenDaysAgo
        ).length,
        sharedWithMe: files.filter((file: ReceivedFile) => file?.sharedBy).length,
        sharedByMe: files.filter((file: ReceivedFile) => 
          file?.owner?.id === data.currentUserId && 
          ((file.sharedWith && file.sharedWith.length > 0) || !!file.department)
        ).length || 0
      });
      
      if (files.length === 0) {
        console.log('No files returned from API');
      }
    } catch (error) {
      console.error('Error fetching recent files:', error);
      toast.error('Failed to fetch recent files');
      setRecentFiles([]);
      setFilteredFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentFiles();
  }, [timeFilter, fileType]);

  // Filter files when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(recentFiles);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = recentFiles.filter(file => {
      // Check filename (always required)
      const nameMatch = file.name.toLowerCase().includes(query);
      if (nameMatch) return true;
      
      // Check department name
      const deptMatch = file.department?.name?.toLowerCase()?.includes(query) || false;
      if (deptMatch) return true;
      
      // Check owner name
      const ownerMatch = file.owner?.name?.toLowerCase()?.includes(query) || false;
      
      return ownerMatch;
    });
    
    setFilteredFiles(filtered);
  }, [searchQuery, recentFiles]);

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

  const handleFileClick = (file: ReceivedFile) => {
    setSelectedFile(file);
    setShowFileDetails(true);
  };

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-4xl font-bold text-gray-800">Recent Files</h1>
          <p className="text-lg text-gray-500">Your recently accessed, uploaded, and shared files</p>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div className="relative max-w-2xl w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search files, departments, owners... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              ref={searchInputRef}
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="File type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="documents">Documents</SelectItem>
                <SelectItem value="images">Images</SelectItem>
                <SelectItem value="spreadsheets">Spreadsheets</SelectItem>
                <SelectItem value="pdfs">PDFs</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Recently Viewed</CardTitle>
              <Clock className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.recentlyViewed}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Recent Uploads</CardTitle>
              <Upload className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.recentUploads}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Shared With Me</CardTitle>
              <UserCheck className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.sharedWithMe}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Shared By Me</CardTitle>
              <Share2 className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.sharedByMe}</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Search Results Summary - Only show when searching */}
        {searchQuery.trim() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-800">Search Results</h3>
                <p className="text-sm text-blue-600">
                  Found {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'} matching{' '}
                  <span className="font-medium">"{searchQuery}"</span>
                </p>
              </div>
              {filteredFiles.length > 0 && searchQuery.trim() && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-100"
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </Button>
              )}
            </div>
            {filteredFiles.length === 0 && (
              <div className="mt-2 text-sm text-gray-600">
                No files match your search. Try using different keywords or filters.
              </div>
            )}
          </div>
        )}
        
        {/* File Manager Card */}
        <Card className="border-0 shadow-none overflow-hidden">
          <CardHeader className="bg-zinc-900 border-b border-zinc-800">
            <CardTitle className="text-xl font-semibold text-white">Recent Files</CardTitle>
          </CardHeader>
          <CardContent className="p-0 bg-zinc-900">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading recent files...</div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No recent files found</div>
            ) : (
              <div className="w-full">
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-4 px-4 py-3 text-sm font-medium text-gray-400 bg-zinc-900 border-b border-zinc-800">
                  <div className="flex items-center gap-1">
                    Name 
                    {searchQuery && <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full ml-2">Searchable</span>}
                  </div>
                  <div>Type</div>
                  <div>Size</div>
                  <div>Last Activity</div>
                  <div className="flex items-center gap-1">
                    Source
                    {searchQuery && <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full ml-2">Searchable</span>}
                  </div>
                </div>
                
                {/* Table Body */}
                <div className="divide-y divide-zinc-800">
                  {filteredFiles.map((file) => (
                    <div key={file.id} className="grid grid-cols-5 gap-4 px-4 py-3 items-center text-white hover:bg-zinc-800 cursor-pointer" onClick={() => handleFileClick(file)}>
                      <div className="truncate">{highlightSearchMatch(file.name)}</div>
                      <div>{getFileTypeDisplay(file.type)}</div>
                      <div>{formatFileSize(file.size)}</div>
                      <div className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-2 text-gray-400" />
                        {file.lastViewed 
                          ? safeFormatDate(file.lastViewed, 'MMM d, yyyy')
                          : safeFormatDate(file.createdAt, 'MMM d, yyyy')
                        }
                      </div>
                      <div>
                        {file.sharedBy ? (
                          <div className="flex items-center">
                            <UserCheck className="h-4 w-4 mr-2 text-blue-400" />
                            Shared by {highlightSearchMatch(file.sharedBy.name || 'unknown user')}
                          </div>
                        ) : file.department?.name ? (
                          <div className="flex items-center">
                            <Share2 className="h-4 w-4 mr-2 text-green-400" />
                            {highlightSearchMatch(file.department.name)}
                          </div>
                        ) : file.owner?.name ? (
                          <div className="flex items-center">
                            <Upload className="h-4 w-4 mr-2 text-amber-400" />
                            {highlightSearchMatch(file.owner.name)}
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Upload className="h-4 w-4 mr-2 text-amber-400" />
                            Uploaded by you
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Recent Activity Section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredFiles.slice(0, 5).map((file) => (
                <div key={`activity-${file.id}`} className="flex items-start gap-4 pb-4 border-b border-gray-100">
                  <div className="bg-gray-100 p-2 rounded">
                    {file.lastViewed ? (
                      <Clock className="h-5 w-5 text-blue-600" />
                    ) : file.sharedBy ? (
                      <Share2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Upload className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{highlightSearchMatch(file.name)}</p>
                    <p className="text-sm text-gray-500">
                      {file.lastViewed
                        ? `Viewed on ${safeFormatDate(file.lastViewed, 'MMMM d, yyyy')}`
                        : file.sharedBy?.name
                        ? `Shared by ${file.sharedBy.name} on ${safeFormatDate(file.createdAt, 'MMMM d, yyyy')}`
                        : `Uploaded on ${safeFormatDate(file.createdAt, 'MMMM d, yyyy')}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* File Details Dialog */}
        <Dialog open={showFileDetails} onOpenChange={setShowFileDetails}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedFile ? highlightSearchMatch(selectedFile.name) : 'File Details'}
              </DialogTitle>
              <button 
                onClick={() => setShowFileDetails(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </DialogHeader>
            
            {selectedFile && (
              <div className="grid gap-4">
                {/* File Preview Section */}
                <div className="border rounded-md p-4 bg-gray-50">
                  <div className="flex justify-center items-center p-8 bg-white border rounded">
                    {selectedFile.type.includes('image') ? (
                      <img 
                        src={selectedFile.url} 
                        alt={selectedFile.name} 
                        className="max-h-64 object-contain" 
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <FileText className="h-20 w-20 text-gray-400" />
                        <span>Preview not available</span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => window.open(selectedFile.url, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" /> View File
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* File Info Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">File Name</h3>
                      <p className="text-base font-medium">{highlightSearchMatch(selectedFile.name)}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">File Type</h3>
                      <p className="text-base">{getFileTypeDisplay(selectedFile.type)} ({selectedFile.type})</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">File Size</h3>
                      <p className="text-base">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    
                    {selectedFile.department?.name && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Department</h3>
                        <p className="text-base">{highlightSearchMatch(selectedFile.department.name)}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Created At</h3>
                      <p className="text-base">{safeFormatDate(selectedFile.createdAt, 'MMMM d, yyyy h:mm a')}</p>
                    </div>
                    
                    {selectedFile.lastViewed && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Last Viewed</h3>
                        <p className="text-base">{safeFormatDate(selectedFile.lastViewed, 'MMMM d, yyyy h:mm a')}</p>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Owner</h3>
                      <p className="text-base">
                        {selectedFile.owner?.name 
                          ? highlightSearchMatch(selectedFile.owner.name) 
                          : 'Unknown'}
                      </p>
                    </div>
                    
                    {selectedFile.sharedBy && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Shared By</h3>
                        <p className="text-base flex items-center gap-1">
                          <UserCheck className="h-4 w-4 text-blue-500" />
                          {highlightSearchMatch(selectedFile.sharedBy.name || 'Unknown user')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowFileDetails(false);
                    }}
                  >
                    Close
                  </Button>
                  <Button 
                    variant="default"
                    onClick={() => {
                      window.open(selectedFile.url, '_blank');
                      toast.success('Opening file in new tab');
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 