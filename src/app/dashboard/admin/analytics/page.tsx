'use client';

import { useState, useEffect } from 'react';
import  DashboardLayout  from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Users, 
  HardDrive, 
  FileText, 
  Clock,
  Activity,
  Download,
  ChevronDown,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, subMonths } from 'date-fns';

// Interfaces for type checking
interface ActivityData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  createdAt: string;
  resourceId?: string;
  departmentId?: string;
}

interface UserStorageStat {
  userId: string;
  name: string;
  email: string;
  totalFiles: number;
  totalStorage: number;
  lastActive: string;
}

interface FileTypeStat {
  type: string;
  count: number;
  size: number;
}

interface DepartmentStat {
  id: string;
  name: string;
  userCount: number;
  fileCount: number;
  storageUsed: number;
}

interface TimeSeriesData {
  date: string;
  uploads: number;
  downloads: number;
  views: number;
  deletes: number;
  activeUsers: number;
}

interface SummaryStats {
  totalStorage: number;
  totalFiles: number;
  totalUsers: number;
  activeUsers: number;
  totalActivities: number;
}

// Helper function to format storage size
const formatStorageSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("30days");
  const [searchQuery, setSearchQuery] = useState("");
  const [activityType, setActivityType] = useState("all");
  
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [userStorageStats, setUserStorageStats] = useState<UserStorageStat[]>([]);
  const [fileTypeStats, setFileTypeStats] = useState<FileTypeStat[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    totalStorage: 0,
    totalFiles: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalActivities: 0
  });

  // Fetch data function defined for reuse
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all analytics data from our API endpoint
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      
      // Update state with fetched data
      setActivityData(data.recentActivities || []);
      setUserStorageStats(data.userStorageStats || []);
      setFileTypeStats(data.fileTypeStats || []);
      setDepartmentStats(data.departmentStats || []);
      setTimeSeriesData(data.activityTrends || []);
      setSummary(data.summary || {
        totalStorage: 0,
        totalFiles: 0,
        totalUsers: 0,
        activeUsers: 0,
        totalActivities: 0
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);
  
  // Filter activities based on search query
  const filteredActivities = activityData.filter(activity => 
    activity.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.details?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Chart colors from CSS variables
  const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-4xl font-bold text-gray-800">Analytics Dashboard</h1>
          <p className="text-lg text-gray-500">Comprehensive insights into your document management system</p>
        </div>
        
        {/* Time range selector */}
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2 max-w-md flex-1">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <div>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Activity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="FILE_UPLOAD">File Uploads</SelectItem>
                <SelectItem value="FILE_DOWNLOAD">File Downloads</SelectItem>
                <SelectItem value="FILE_VIEW">File Views</SelectItem>
                <SelectItem value="FILE_DELETE">File Deletions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          
          {(activityData.length === 0 || fileTypeStats.length === 0 || departmentStats.length === 0) && (
            <Button 
              variant="default"
              onClick={async () => {
                try {
                  setLoading(true);
                  const response = await fetch('/api/admin/populate-samples', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ dataType: 'all' }),
                  });
                  
                  if (!response.ok) {
                    throw new Error('Failed to generate sample data');
                  }
                  
                  const data = await response.json();
                  toast.success('Sample data generated successfully');
                  
                  // Refresh the page data
                  fetchData();
                } catch (error) {
                  console.error('Error generating sample data:', error);
                  toast.error('Failed to generate sample data');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Sample Data'}
            </Button>
          )}
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Total Files</CardTitle>
              <FileText className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.totalFiles.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {formatStorageSize(summary.totalStorage)} total storage
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Active Users</CardTitle>
              <Users className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Out of {summary.totalUsers.toLocaleString()} total users
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">File Uploads</CardTitle>
              <HardDrive className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {timeSeriesData.reduce((sum, day) => sum + day.uploads, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                In the selected time period
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-gray-100 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">User Activity</CardTitle>
              <Activity className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.totalActivities.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total activities recorded
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="uploads" stackId="1" stroke="#8884d8" fill="#8884d8" name="Uploads" />
                      <Area type="monotone" dataKey="downloads" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Downloads" />
                      <Area type="monotone" dataKey="views" stackId="1" stroke="#ffc658" fill="#ffc658" name="Views" />
                      <Area type="monotone" dataKey="deletes" stackId="1" stroke="#ff8042" fill="#ff8042" name="Deletes" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* File Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>File Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fileTypeStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="size"
                        nameKey="type"
                      >
                        {fileTypeStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatStorageSize(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Department Storage Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Department Storage Usage</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => formatStorageSize(value)} />
                      <Tooltip formatter={(value: number) => formatStorageSize(value)} />
                      <Bar dataKey="storageUsed" fill="#8884d8" name="Storage Used" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Top Users by Storage */}
          <Card>
            <CardHeader>
              <CardTitle>Top Users by Storage</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={userStorageStats.slice(0, 10).sort((a, b) => b.totalStorage - a.totalStorage)}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => formatStorageSize(value)} />
                      <YAxis type="category" dataKey="name" width={120} />
                      <Tooltip formatter={(value: number) => formatStorageSize(value)} />
                      <Bar dataKey="totalStorage" fill="#82ca9d" name="Storage Used" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Recent Activity Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent User Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading activity data...</TableCell>
                  </TableRow>
                ) : filteredActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No activities found</TableCell>
                  </TableRow>
                ) : (
                  filteredActivities.slice(0, 10).map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.userName || 'Unknown'}</TableCell>
                      <TableCell>{activity.action}</TableCell>
                      <TableCell>{activity.details}</TableCell>
                      <TableCell>{format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {filteredActivities.length > 10 && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={() => toast.info('Full activity log view would be implemented here')}>
                  View All Activities
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 