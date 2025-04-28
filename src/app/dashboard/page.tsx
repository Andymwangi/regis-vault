'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FileManager } from '@/components/files/FileManager';
import { FileUpload } from '@/components/files/FileUpload';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Files, 
  HardDrive, 
  Users, 
  FileType as FileTypeIcon, 
  PieChart, 
  Layers,
  Upload
} from 'lucide-react';
import { getFileStats } from '@/lib/services/fileService';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Button } from '@/components/ui/button';
import { 
  convertFileSize,
  formatDateTime,
  getUserFirstName,
  getUserInitials
} from '@/lib/utils'; // Import utility functions

// Define types for better type safety
interface DepartmentStat {
  departmentId: string;
  departmentName: string;
  count: number;
}

interface TypeStat {
  type: string;
  count: number;
}

interface FileStats {
  totalFiles: number;
  totalSize: number;
  storageLimit: number;
  filesByDepartment: DepartmentStat[];
  filesByType: TypeStat[];
  recentActivity: {
    date: string;
    count: number;
  }[];
}

// Define User interface to match what getCurrentUser returns
interface User {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  departmentId?: string;
}

// Define the props interface for AnimatedCounter
interface AnimatedCounterProps {
  value: number;
  duration?: number;
}

// Counter animation component
const AnimatedCounter = ({ value, duration = 1000 }: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = parseInt(value.toString(), 10);
    
    // Make sure we don't divide by zero
    if (end === 0) {
      setCount(0);
      return;
    }
    
    // Increment to achieve the effect
    const incrementTime = (duration / end) > 10 ? (duration / end) : 10;
    
    // Timer for the animation
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, incrementTime);

    // Clean up
    return () => {
      clearInterval(timer);
    };
  }, [value, duration]);
  
  return <span>{count}</span>;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState('Welcome');
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  // Calculate storage used percentage
  const getStoragePercentage = (): number => {
    if (stats?.totalSize && stats?.storageLimit) {
      return (stats.totalSize / stats.storageLimit) * 100;
    }
    return 0;
  };

  // Get appropriate greeting based on time of day
  const getTimeBasedGreeting = (): string => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 18) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both stats and user data in parallel
        const [statsData, userData] = await Promise.all([
          getFileStats(),
          getCurrentUser()
        ]);
        
        // If the API doesn't provide a storageLimit, we can use a default
        if (!statsData.storageLimit) {
          statsData.storageLimit = 5 * 1024 * 1024 * 1024; // 5GB default
        }
        
        setStats(statsData);
        setUser(userData);
        setGreeting(getTimeBasedGreeting());
        setLastRefreshed(new Date().toISOString());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Update greeting every minute to keep it current
    const greetingInterval = setInterval(() => {
      setGreeting(getTimeBasedGreeting());
    }, 60000);
    
    // Clean up interval
    return () => clearInterval(greetingInterval);
  }, []);

  const getFileTypeName = (mimeType: string): string => {
    // Extract file type from MIME type or clean up presentation
    if (!mimeType) return 'Other';
    
    const parts = mimeType.split('/');
    if (parts.length > 1) {
      // Make first letter uppercase
      return parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    }
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  };

  // Get color for different file types (for visual elements)
  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'pdf': 'bg-red-500',
      'document': 'bg-blue-500',
      'image': 'bg-green-500',
      'jpeg': 'bg-green-500',
      'png': 'bg-green-500',
      'spreadsheet': 'bg-emerald-500',
      'presentation': 'bg-amber-500',
      'text': 'bg-gray-500',
      'video': 'bg-purple-500',
      'audio': 'bg-pink-500'
    };
    
    const lowerType = type.toLowerCase();
    for (const key in colors) {
      if (lowerType.includes(key)) {
        return colors[key];
      }
    }
    return 'bg-gray-400'; // Default color
  };

  const handleRefresh = () => {
    setLoading(true);
    window.location.reload();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600"></div>
            <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) {
    return (
      <DashboardLayout>
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="text-lg font-medium text-amber-800">Unable to load statistics</h3>
          <p className="text-amber-700">There was a problem loading your dashboard data. Please try refreshing the page.</p>
          <Button 
            className="mt-4 bg-amber-600 hover:bg-amber-700" 
            onClick={handleRefresh}
          >
            Refresh Page
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Get user's first name using the utility function
  const firstName = getUserFirstName(user?.fullName || user?.name, user?.email);
  const userInitials = getUserInitials(user?.fullName || user?.name, user?.email);

  return (
    <DashboardLayout>
        <div className="space-y-8">
        {/* Welcome Banner - make it more spacious */}
        <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-full bg-red-600 flex items-center justify-center text-white text-xl font-bold">
              {userInitials}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {greeting}, <span className="text-red-600">{firstName}</span>!
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
                Your document storage at a glance
              </p>
            </div>
          </div>
          {lastRefreshed && (
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: {formatDateTime(lastRefreshed)}
            </p>
          )}
        </div>

        {/* Main Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <Files className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter value={stats.totalFiles} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Documents in your storage</p>
            </CardContent>
          </Card>

          <Card className="p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">
                  {convertFileSize(stats.totalSize)}
                </div>
                <span className="text-xs text-muted-foreground">
                  of {convertFileSize(stats.storageLimit)}
                </span>
              </div>
              <div className="mt-3">
                <Progress value={getStoragePercentage()} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  <AnimatedCounter value={Math.round(getStoragePercentage())} />% of storage used
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter value={stats.filesByDepartment.length} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active departments</p>
              {stats.filesByDepartment.length > 0 && (
                <div className="mt-3 flex items-center gap-1">
                  {stats.filesByDepartment.slice(0, 5).map((dept, index) => (
                    <div 
                      key={dept.departmentId || index} 
                      className="h-2 flex-1 rounded-full bg-red-600" 
                      style={{ opacity: 1 - (index * 0.15) }}
                      title={dept.departmentName}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">File Types</CardTitle>
              <FileTypeIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter value={stats.filesByType.length} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Different file formats</p>
              {stats.filesByType.length > 0 && (
                <div className="mt-3 flex items-center gap-1">
                  {stats.filesByType.slice(0, 5).map((type, index) => (
                    <div 
                      key={type.type || index} 
                      className={`h-2 flex-1 rounded-full ${getTypeColor(type.type)}`} 
                      title={getFileTypeName(type.type)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid gap-8 md:grid-cols-2 mt-8">
        <Card className="p-2">
            <CardHeader>
              <CardTitle>Department Activity</CardTitle>
              <CardDescription>Files stored by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.filesByDepartment.map((dept, index) => (
                  <div key={dept.departmentId || index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{dept.departmentName || 'Unassigned'}</span>
                      <span className="text-sm text-muted-foreground">
                        <AnimatedCounter value={dept.count} /> files
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-600 rounded-full" 
                        style={{ 
                          width: `${(dept.count / stats.totalFiles) * 100}%`,
                          opacity: 0.7 + (index * 0.05) 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="p-2">
            <CardHeader>
              <CardTitle>File Types</CardTitle>
              <CardDescription>Distribution by format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.filesByType.map((type) => (
                  <div key={type.type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getTypeColor(type.type)}`} />
                        <span className="text-sm font-medium">
                          {getFileTypeName(type.type)}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        <AnimatedCounter value={type.count} /> files
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${getTypeColor(type.type)}`}
                        style={{ width: `${(type.count / stats.totalFiles) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Files Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Recent Files</h2>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              <span>View All</span>
            </Button>
          </div>
          <FileManager />
        </div>
      </div>
    </DashboardLayout>
  );
}