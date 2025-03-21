'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/common/layout/DashboardLayout';
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

export default function StorageAllocationsPage() {
  const [departments, setDepartments] = useState<DepartmentStorage[]>([]);
  const [users, setUsers] = useState<UserStorage[]>([]);
  const [storageTrends, setStorageTrends] = useState<StorageTrend[]>([]);
  const [fileTypeDistribution, setFileTypeDistribution] = useState<FileTypeDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchStorageData();
  }, [selectedDepartment, timeRange]);

  const fetchStorageData = async () => {
    try {
      setLoading(true);
      const [deptResponse, usersResponse, trendsResponse, distributionResponse] = await Promise.all([
        fetch('/api/admin/storage/departments'),
        fetch('/api/admin/storage/users'),
        fetch(`/api/admin/storage/trends?range=${timeRange}`),
        fetch('/api/admin/storage/file-types')
      ]);

      if (!deptResponse.ok || !usersResponse.ok || !trendsResponse.ok || !distributionResponse.ok) {
        throw new Error('Failed to fetch storage data');
      }

      const [deptData, usersData, trendsData, distributionData] = await Promise.all([
        deptResponse.json(),
        usersResponse.json(),
        trendsResponse.json(),
        distributionResponse.json()
      ]);

      setDepartments(deptData.departments);
      setUsers(usersData.users);
      setStorageTrends(trendsData.trends);
      setFileTypeDistribution(distributionData.distribution);
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

      if (!response.ok) throw new Error('Failed to update storage allocation');
      
      toast.success('Storage allocation updated successfully');
      fetchStorageData();
    } catch (error) {
      console.error('Error updating storage allocation:', error);
      toast.error('Failed to update storage allocation');
    }
  };

  const formatStorage = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
  };

  const totalAllocatedStorage = departments.reduce((acc, dept) => acc + dept.allocatedStorage, 0);
  const totalUsedStorage = departments.reduce((acc, dept) => acc + dept.usedStorage, 0);
  const storageUsagePercentage = (totalUsedStorage / totalAllocatedStorage) * 100;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Storage Allocations</h1>
          <p className="text-gray-500">Manage storage space for departments and monitor usage</p>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Storage Usage Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Storage Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
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