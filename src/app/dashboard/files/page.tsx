// src/app/dashboard/files/page.tsx
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout  from '@/components/layout/DashboardLayout';
import { FileManager } from '@/components/files/FileManager';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Files, Upload, Share2, Clock, Search } from 'lucide-react';
import { getFiles } from '@/lib/bridge/file-bridge';
import { Input } from '@/components/ui/input';

interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  createdAt: string;
  lastViewed?: string;
  sharedWith?: string[];
}

interface FileResponse {
  files: File[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function FilesPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalFiles: 0,
    recentUploads: 0,
    sharedFiles: 0,
    recentlyViewed: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [allFiles, setAllFiles] = useState<File[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<File[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Function to trigger a refresh
  const refreshData = () => setRefreshTrigger(prev => prev + 1);
  
  useEffect(() => {
    // Fetch file statistics directly using the bridge function
    const fetchFileStats = async () => {
      try {
        const result = await getFiles({ 
          limit: 100,
          status: 'active' // Only get active files
        });
        const files = result.files as File[];
        setAllFiles(files);
        setFilteredFiles(files);
        
        // Calculate stats from files
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        setStats({
          totalFiles: files.length,
          recentUploads: files.filter((file: File) => 
            new Date(file.createdAt) >= sevenDaysAgo
          ).length,
          sharedFiles: files.filter((file: File) => 
            file.sharedWith && file.sharedWith.length > 0
          ).length,
          recentlyViewed: files.filter((file: File) => 
            file.lastViewed
          ).length
        });
      } catch (error) {
        console.error('Error fetching file stats:', error);
      }
    };
    
    fetchFileStats();
  }, [refreshTrigger]);

  // Filter files when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(allFiles);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = allFiles.filter(file => 
      file.name.toLowerCase().includes(query)
    );
    setFilteredFiles(filtered);
  }, [searchQuery, allFiles]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-4xl font-bold text-gray-800">My Files</h1>
          <p className="text-lg text-gray-500">Manage and organize your documents</p>
        </div>
        
        {/* Improved Search Bar */}
        <div className="max-w-2xl mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
          <Input
            type="text"
            placeholder="Search files by name (e.g., 'annual' to find 'annual reports')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-400 focus:bg-zinc-800 focus:text-white"
            style={{ color: 'white', backgroundColor: '#27272a' }} // Force styles with inline styling
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Total Files</CardTitle>
              <Files className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalFiles}</div>
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
              <CardTitle className="text-base font-medium">Shared Files</CardTitle>
              <Share2 className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.sharedFiles}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Recently Viewed</CardTitle>
              <Clock className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.recentlyViewed}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-none overflow-hidden">
          <CardHeader className="bg-zinc-900 border-b border-zinc-800">
            <CardTitle className="text-xl font-semibold text-white">File Manager</CardTitle>
          </CardHeader>
          <CardContent className="p-0 bg-zinc-900">
            <FileManager onFileDeleted={refreshData} />
          </CardContent>
        </Card>
        
        {/* Display search results if there's a search query */}
        {searchQuery.trim() && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Search Results</h2>
            {filteredFiles.length === 0 ? (
              <div className="text-gray-500">No files found matching "{searchQuery}"</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredFiles.map(file => (
                  <Card key={file.id} className="border-2 border-gray-100 hover:shadow-md transition-shadow cursor-pointer" 
                        onClick={() => router.push(`/dashboard/files/${file.id}`)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium truncate">{file.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-500">
                        <div>Type: {file.type}</div>
                        <div>Modified: {new Date(file.createdAt).toLocaleDateString()}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}