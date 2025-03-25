'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/common/layout/DashboardLayout';
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
  ResponsiveContainer 
} from 'recharts';
import { 
  Users, 
  Activity, 
  Clock, 
  Download,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ActivityLog {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  action: string;
  details: string;
  createdAt: string;
  lastActive: string;
  status: 'active' | 'inactive';
}

interface ActivityTrend {
  date: string;
  activeUsers: number;
  totalActions: number;
}

interface ActiveUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  lastActivity: string;
  currentAction: string;
}

export default function ActivityLogsPage() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [activityTrends, setActivityTrends] = useState<ActivityTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  useEffect(() => {
    fetchActivityData();
    // Set up real-time updates
    const interval = setInterval(fetchActivityData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange, selectedUser]);

  const fetchActivityData = async () => {
    try {
      setLoading(true);
      const [logsResponse, activeResponse, trendsResponse] = await Promise.all([
        fetch(`/api/admin/activity/logs?timeRange=${timeRange}&user=${selectedUser}`),
        fetch('/api/admin/activity/active-users'),
        fetch(`/api/admin/activity/trends?timeRange=${timeRange}`)
      ]);

      if (!logsResponse.ok || !activeResponse.ok || !trendsResponse.ok) {
        throw new Error('Failed to fetch activity data');
      }

      const [logsData, activeData, trendsData] = await Promise.all([
        logsResponse.json(),
        activeResponse.json(),
        trendsResponse.json()
      ]);

      setActivityLogs(logsData.logs);
      setActiveUsers(activeData.users);
      setActivityTrends(trendsData.trends);
    } catch (error) {
      console.error('Error fetching activity data:', error);
      toast.error('Failed to fetch activity data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      const response = await fetch(`/api/admin/activity/logs/${logId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete activity log');
      
      toast.success('Activity log deleted successfully');
      fetchActivityData();
    } catch (error) {
      console.error('Error deleting activity log:', error);
      toast.error('Failed to delete activity log');
    }
  };

  const handleDownloadLogs = async () => {
    try {
      const response = await fetch(`/api/admin/activity/logs/export?timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to download logs');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Activity logs downloaded successfully');
    } catch (error) {
      console.error('Error downloading logs:', error);
      toast.error('Failed to download activity logs');
    }
  };

  const filteredLogs = activityLogs.filter(log =>
    log.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Activity Logs</h1>
            <p className="text-gray-500">Monitor and manage user activity</p>
          </div>
          <Button onClick={handleDownloadLogs}>
            <Download className="w-4 h-4 mr-2" />
            Download Logs
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeUsers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
              <Activity className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activityLogs.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activityLogs.filter(log => log.status === 'inactive').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <AlertCircle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activityLogs.filter(log => 
                  log.status === 'inactive' && 
                  new Date(log.lastActive) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="activeUsers" 
                      stroke="#8884d8" 
                      name="Active Users"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalActions" 
                      stroke="#82ca9d" 
                      name="Total Actions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Currently Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{user.currentAction}</p>
                      <p className="text-xs text-gray-400">
                        Last active: {format(new Date(user.lastActivity), 'HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Activity Logs</CardTitle>
              <div className="flex gap-4">
                <Select value={timeRange} onValueChange={(value: '24h' | '7d' | '30d') => setTimeRange(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[200px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No activity logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {log.firstName} {log.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{log.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.details}</TableCell>
                      <TableCell>{format(new Date(log.createdAt), 'PPp')}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          log.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {log.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.status === 'inactive' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLog(log.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
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