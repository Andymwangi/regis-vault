'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/common/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, HardDrive, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface StorageData {
  month: string;
  usage: number;
}

interface SystemActivity {
  id: string;
  activity: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  time: string;
}

interface ActiveUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  department: string;
  lastActive: string;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('30');
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalStorage, setTotalStorage] = useState(0);
  const [activeSessions, setActiveSessions] = useState(0);
  const [storageData, setStorageData] = useState<StorageData[]>([]);
  const [systemActivities, setSystemActivities] = useState<SystemActivity[]>([]);
  const [topActiveUsers, setTopActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.department !== 'Management') {
      // Redirect non-admin users
      window.location.href = '/dashboard';
      return;
    }

    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [
        statsResponse,
        storageResponse,
        activitiesResponse,
        usersResponse
      ] = await Promise.all([
        fetch(`/api/admin/stats?timeRange=${timeRange}`),
        fetch(`/api/admin/storage-trend?timeRange=${timeRange}`),
        fetch('/api/admin/activities'),
        fetch('/api/admin/active-users')
      ]);

      if (!statsResponse.ok || !storageResponse.ok || !activitiesResponse.ok || !usersResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [stats, storage, activities, users] = await Promise.all([
        statsResponse.json(),
        storageResponse.json(),
        activitiesResponse.json(),
        usersResponse.json()
      ]);

      setTotalUsers(stats.totalUsers);
      setTotalStorage(stats.totalStorage);
      setActiveSessions(stats.activeSessions);
      setStorageData(storage.data);
      setSystemActivities(activities.activities);
      setTopActiveUsers(users.activeUsers);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatStorageSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${Math.round(gb)} GB`;
  };

  const formatUserGrowth = (current: number, previous: number) => {
    const growth = ((current - previous) / previous) * 100;
    return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
  };

  const formatStorageUsage = (used: number, total: number) => {
    return `${Math.round((used / total) * 100)}%`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Users Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {formatUserGrowth(totalUsers, totalUsers - 15)} from last month
              </p>
            </CardContent>
          </Card>

          {/* Total Storage Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatStorageSize(totalStorage)}</div>
              <p className="text-xs text-muted-foreground">
                {formatStorageUsage(totalStorage, 1024 * 1024 * 1024 * 1000)} used
              </p>
            </CardContent>
          </Card>

          {/* Active Sessions Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSessions}</div>
              <p className="text-xs text-muted-foreground">Currently online</p>
            </CardContent>
          </Card>
        </div>

        {/* Storage Usage Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Usage Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={storageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="usage" 
                    stroke="#ff4d4f" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent System Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Recent System Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    {activity.user.avatar ? (
                      <img
                        src={activity.user.avatar}
                        alt={activity.user.name}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-sm">
                          {activity.user.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {activity.activity}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.user.name}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {activity.time}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Active Users */}
          <Card>
            <CardHeader>
              <CardTitle>Top Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topActiveUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-4">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-sm">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-none">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.department}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Last active: {user.lastActive}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
} 