'use client';

import { useEffect, useState } from 'react';
import { account, getUserProfileById } from '@/lib/appwrite/config';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FileService } from '@/lib/services/fileService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Files, HardDrive, Users } from 'lucide-react';

async function getStats() {
  const stats = await FileService.getFileStats();
  return stats;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is logged in
        const user = await account.get();
        
        try {
          // Get user profile
          const profile = await getUserProfileById(user.$id);
          setUserData({ user, profile });
          
          // Redirect based on role
          if (profile?.profile.role === 'admin') {
            redirect('/dashboard/admin');
          } else {
            redirect('/dashboard/files');
          }
        } catch (profileError) {
          console.error('Profile error:', profileError);
          setError(`Profile error: ${profileError instanceof Error ? profileError.message : 'Unknown error'}`);
        }
      } catch (authError) {
        console.error('Auth error:', authError);
        setError(`Authentication error: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
        redirect('/sign-in');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await getStats();
        setStats(stats);
      } catch (statsError) {
        console.error('Error fetching stats:', statsError);
        setError(`Error fetching stats: ${statsError instanceof Error ? statsError.message : 'Unknown error'}`);
      }
    };

    if (userData) {
      fetchStats();
    }
  }, [userData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        <p className="mt-4 text-lg">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error Loading Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-lg w-full">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
        <Button
          onClick={() => redirect('/sign-in')}
          className="mt-4 bg-red-500 hover:bg-red-600"
        >
          Go to Sign In
        </Button>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <Files className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <HardDrive className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.filesByDepartment.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">File Types</CardTitle>
              <BarChart3 className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.filesByType.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Files by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.filesByDepartment.map((dept: { departmentId: string, departmentName: string, count: number }) => (
                  <div key={dept.departmentId} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{dept.departmentName || 'Unassigned'}</span>
                    <span className="text-sm text-gray-500">{dept.count} files</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Files by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.filesByType.map((type: { type: string, count: number }) => (
                  <div key={type.type} className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {type.type.split('/')[1]?.toUpperCase() || type.type}
                    </span>
                    <span className="text-sm text-gray-500">{type.count} files</span>
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