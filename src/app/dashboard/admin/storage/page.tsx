'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
  ResponsiveContainer 
} from 'recharts';
import { 
  BarChart, 
  Bar 
} from 'recharts';
import { 
  Building2, 
  HardDrive, 
  Users, 
  TrendingUp,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { PieChart, Pie, Cell } from 'recharts';

interface DepartmentStorage {
  id: string;
  name: string;
  allocatedStorage: number;
  usedStorage: number;
  userCount: number;
  fileCount: number;
}

interface StorageTrend {
  date: string;
  totalStorage: number;
  usedStorage: number;
}

interface UserStorage {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  usedStorage: number;
  fileCount: number;
}

interface FileTypeDistribution {
  type: string;
  count: number;
  totalSize: number;
}

// Add API response interfaces
interface ApiResponse<T> {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<T>;
}

interface DepartmentsResponse {
  departments: DepartmentStorage[];
  message?: string;
}

interface UsersResponse {
  users: UserStorage[];
  message?: string;
}

interface TrendsResponse {
  trends: StorageTrend[];
  message?: string;
}

interface FileTypeResponse {
  distribution: FileTypeDistribution[];
  message?: string;
}

export default function StorageAllocationsPage() {
  const [departments, setDepartments] = useState<DepartmentStorage[]>([]);
  const [users, setUsers] = useState<UserStorage[]>([]);
  const [storageTrends, setStorageTrends] = useState<StorageTrend[]>([]);
  const [fileTypeDistribution, setFileTypeDistribution] = useState<FileTypeDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchStorageData();
  }, [selectedDepartment, timeRange]);

  const fetchStorageData = async () => {
    setLoading(true);
    setErrors({});
    
    try {
      // Fetch departments data
      let deptResponse: Response;
      try {
        deptResponse = await fetch('/api/admin/storage/departments');
        if (!deptResponse.ok) {
          const errorData = await deptResponse.json() as { message: string };
          setErrors(prev => ({ ...prev, departments: `Departments: ${errorData.message || deptResponse.statusText}` }));
          throw new Error(`Departments API error: ${deptResponse.status}`);
        }
        const deptData = await deptResponse.json() as DepartmentsResponse;
        setDepartments(deptData.departments || []);
      } catch (error) {
        console.error('Error fetching departments:', error);
        setErrors(prev => ({ ...prev, departments: `Failed to fetch departments: ${error instanceof Error ? error.message : 'Unknown error'}` }));
      }

      // Fetch users data
      let usersResponse: Response;
      try {
        usersResponse = await fetch('/api/admin/storage/users');
        if (!usersResponse.ok) {
          const errorData = await usersResponse.json() as { message: string };
          setErrors(prev => ({ ...prev, users: `Users: ${errorData.message || usersResponse.statusText}` }));
          throw new Error(`Users API error: ${usersResponse.status}`);
        }
        const usersData = await usersResponse.json() as UsersResponse;
        setUsers(usersData.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
        setErrors(prev => ({ ...prev, users: `Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}` }));
      }

      // Fetch trends data
      let trendsResponse: Response;
      try {
        trendsResponse = await fetch(`/api/admin/storage/trends?range=${timeRange}`);
        if (!trendsResponse.ok) {
          const errorData = await trendsResponse.json() as { message: string };
          setErrors(prev => ({ ...prev, trends: `Trends: ${errorData.message || trendsResponse.statusText}` }));
          throw new Error(`Trends API error: ${trendsResponse.status}`);
        }
        const trendsData = await trendsResponse.json() as TrendsResponse;
        setStorageTrends(trendsData.trends || []);
      } catch (error) {
        console.error('Error fetching trends:', error);
        setErrors(prev => ({ ...prev, trends: `Failed to fetch trends: ${error instanceof Error ? error.message : 'Unknown error'}` }));
      }

      // Fetch file type distribution data
      let distributionResponse: Response;
      try {
        distributionResponse = await fetch('/api/admin/storage/file-types');
        if (!distributionResponse.ok) {
          const errorData = await distributionResponse.json() as { message: string };
          setErrors(prev => ({ ...prev, fileTypes: `File Types: ${errorData.message || distributionResponse.statusText}` }));
          throw new Error(`File types API error: ${distributionResponse.status}`);
        }
        const distributionData = await distributionResponse.json() as FileTypeResponse;
        setFileTypeDistribution(distributionData.distribution || []);
      } catch (error) {
        console.error('Error fetching file type distribution:', error);
        setErrors(prev => ({ ...prev, fileTypes: `Failed to fetch file types: ${error instanceof Error ? error.message : 'Unknown error'}` }));
      }

    } catch (error) {
      console.error('Error fetching storage data:', error);
      toast.error('Failed to fetch storage data');
    } finally {
      setLoading(false);
    }
  };

  const handleStorageAllocation = async (departmentId: string, newAllocation: number) => {
    try {
      const response = await fetch(`/api/admin/storage/departments/${departmentId}/allocation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocatedStorage: newAllocation }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { message: string };
        throw new Error(errorData.message || 'Failed to update storage allocation');
      }
      
      toast.success('Storage allocation updated successfully');
      fetchStorageData();
    } catch (error) {
      console.error('Error updating storage allocation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update storage allocation');
    }
  };

  const formatStorage = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalAllocatedStorage = departments.reduce((acc, dept) => acc + dept.allocatedStorage, 0);
  const totalUsedStorage = departments.reduce((acc, dept) => acc + dept.usedStorage, 0);
  const storageUsagePercentage = totalAllocatedStorage > 0 ? (totalUsedStorage / totalAllocatedStorage) * 100 : 0;

  // If we have any errors, display them in a debug card
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Storage Allocations</h1>
          <p className="text-gray-500">Manage storage space for departments and monitor usage</p>
        </div>

        {/* Error display section - only shown when errors exist */}
        {hasErrors && (
          <Card className="border-red-400">
            <CardHeader>
              <CardTitle className="text-red-600">API Connection Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(errors).map(([key, error]) => (
                  <div key={key} className="text-sm text-red-600">
                    <strong>{key}:</strong> {error}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchStorageData}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Retry Connection
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Allocated Storage</CardTitle>
              <HardDrive className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatStorage(totalAllocatedStorage)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Used Storage</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatStorage(totalUsedStorage)}</div>
              <Progress value={storageUsagePercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
              <Building2 className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as '7d' | '30d' | '90d')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Storage Usage Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">Loading trends...</div>
                ) : storageTrends.length === 0 ? (
                  <div className="flex items-center justify-center h-full">No trend data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={storageTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="usedStorage" 
                        stroke="#8884d8" 
                        name="Used Storage"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalStorage" 
                        stroke="#82ca9d" 
                        name="Total Storage"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Storage Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">Loading department data...</div>
                ) : departments.length === 0 ? (
                  <div className="flex items-center justify-center h-full">No department data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departments}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="usedStorage" fill="#8884d8" name="Used Storage" />
                      <Bar dataKey="allocatedStorage" fill="#82ca9d" name="Allocated Storage" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">Loading file type data...</div>
                ) : fileTypeDistribution.length === 0 ? (
                  <div className="flex items-center justify-center h-full">No file type data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fileTypeDistribution}
                        dataKey="totalSize"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {fileTypeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Department Storage Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Allocated Storage</TableHead>
                  <TableHead>Used Storage</TableHead>
                  <TableHead>Usage %</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No departments found
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell>{dept.name}</TableCell>
                      <TableCell>{formatStorage(dept.allocatedStorage)}</TableCell>
                      <TableCell>{formatStorage(dept.usedStorage)}</TableCell>
                      <TableCell>
                        <Progress 
                          value={(dept.usedStorage / dept.allocatedStorage) * 100} 
                          className="w-[100px]"
                        />
                      </TableCell>
                      <TableCell>{dept.userCount}</TableCell>
                      <TableCell>{dept.fileCount}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          placeholder="New allocation (GB)"
                          className="w-[120px]"
                          onChange={(e) => handleStorageAllocation(dept.id, Number(e.target.value) * 1024 * 1024 * 1024)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Storage Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Used Storage</TableHead>
                  <TableHead>Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>{formatStorage(user.usedStorage)}</TableCell>
                      <TableCell>{user.fileCount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}