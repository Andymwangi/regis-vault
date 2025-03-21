import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FileService } from '@/lib/services/fileService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Files, HardDrive, Users } from 'lucide-react';

async function getStats() {
  const stats = await FileService.getFileStats();
  return stats;
}

export default async function DashboardPage() {
  const stats = await getStats();

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
                {stats.filesByDepartment.map((dept) => (
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
                {stats.filesByType.map((type) => (
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