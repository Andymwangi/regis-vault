'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  User, Mail, ShieldCheck, Calendar, Activity, Building2, Users, 
  Lock, KeyRound, FileText, Bell, Briefcase
} from 'lucide-react';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { getDepartmentById } from '@/lib/appwrite/department-operations';
import { User as UserType } from '@/lib/types';
import { getUserInitials } from '@/lib/utils';

export default function AdminProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDepartment, setCurrentDepartment] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        
        if (userData?.role !== 'admin') {
          // Redirect if not admin
          window.location.href = '/dashboard/profile';
        }

        if (userData?.departmentId) {
          const departmentData = await getDepartmentById(userData.departmentId);
          setCurrentDepartment(departmentData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600"></div>
          <p className="text-sm text-muted-foreground">Loading admin profile...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to view this page. This page is only accessible to administrators.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={() => window.location.href = '/dashboard/profile'}
              variant="outline"
            >
              Go to User Profile
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const userInitials = getUserInitials(user?.name, user?.email);
  const lastLoginDate = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Unknown';
  const accountCreatedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown';

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Administrator Profile</h1>
          <p className="text-muted-foreground">
            Manage your administrator profile and review access details
          </p>
        </div>

        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.location.href = '/dashboard/profile'}
          >
            <User className="h-4 w-4" />
            <span>User View</span>
          </Button>
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            onClick={() => window.location.href = '/dashboard/admin/settings'}
          >
            <Lock className="h-4 w-4" />
            <span>Admin Settings</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Admin Profile Summary Card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24 border-2 border-red-600">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-red-600 text-white text-xl font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <CardTitle>{user.fullName || user.name}</CardTitle>
                <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
                <Badge className="bg-red-600 hover:bg-red-700">Administrator</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Department</p>
                  <p className="text-sm text-muted-foreground">
                    {currentDepartment ? currentDepartment.name : 'Global Administration'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Account Created</p>
                  <p className="text-sm text-muted-foreground">{accountCreatedDate}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Last Login</p>
                  <p className="text-sm text-muted-foreground">{lastLoginDate}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Details Content */}
        <div className="md:col-span-2">
          <Tabs defaultValue="permissions" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="responsibilities">Responsibilities</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            
            <TabsContent value="permissions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Administrative Permissions</CardTitle>
                  <CardDescription>
                    Your current administrative access and capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        <span className="font-medium">User Management</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-7">
                        Create, edit, and delete user accounts, assign roles and departments
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Department Management</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-7">
                        Create and manage departments, assign users to departments
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        <span className="font-medium">File System Management</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-7">
                        View all files, override permissions, restore deleted files
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        <span className="font-medium">System Configuration</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-7">
                        Configure system settings, manage storage quotas, set global policies
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="responsibilities" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Administrative Responsibilities</CardTitle>
                  <CardDescription>
                    Key areas of responsibility as an administrator
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex gap-4 items-start">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-base">User Oversight</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Monitor user activity, ensure compliance with policies, and provide support for user issues. 
                          Regularly review user accounts and permissions to maintain security.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start">
                      <div className="bg-purple-100 p-2 rounded-full">
                        <FileText className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-base">Content Management</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Oversee document organization, ensure proper tagging and classification, and maintain the integrity of the document repository.
                          Implement data retention policies and content governance.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start">
                      <div className="bg-amber-100 p-2 rounded-full">
                        <Bell className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-base">System Monitoring</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Regularly monitor system health, storage utilization, and performance metrics. 
                          Address issues proactively and coordinate with IT for system maintenance.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start">
                      <div className="bg-green-100 p-2 rounded-full">
                        <Briefcase className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-base">Compliance Management</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ensure the system meets organizational and regulatory compliance requirements.
                          Implement and enforce document handling procedures according to policy guidelines.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Security Information</CardTitle>
                  <CardDescription>
                    Security details and access information for your administrator account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex gap-3 items-start">
                        <KeyRound className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-800">Administrative Privilege Notice</h4>
                          <p className="text-sm text-red-700 mt-1">
                            Your account has elevated permissions that provide access to sensitive system functions and data. 
                            Always follow security protocols and maintain the confidentiality of your credentials.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Access Level</h4>
                        <p className="font-medium">Full Administrative Access</p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Authentication Method</h4>
                        <p className="font-medium">Email + Magic Link</p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Session Timeout</h4>
                        <p className="font-medium">30 minutes (adjustable in settings)</p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Activity Logging</h4>
                        <p className="font-medium">All administrative actions are logged</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.location.href = '/dashboard/settings'}
                  >
                    Manage Security Settings
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 