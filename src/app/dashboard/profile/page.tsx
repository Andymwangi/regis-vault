'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Mail, Calendar, User as UserIcon, Check, Award, Briefcase } from 'lucide-react';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { getAllDepartments, getDepartmentById } from '@/lib/appwrite/department-operations';
import { User as UserType } from '@/lib/types';
import { DepartmentSwitcher } from '@/components/department/DepartmentSwitcher';
import { Separator } from '@/components/ui/separator';
import { formatDate, getUserInitials } from '@/lib/utils';
import { PageContextualHelp } from '@/components/assistant/RegisvaultAssistant';

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDepartment, setCurrentDepartment] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        
        // Fetch all departments
        const departmentsData = await getAllDepartments();
        setDepartments(departmentsData);
        
        // First check if user has department field directly
        if (userData?.department) {
          try {
            // Handle case where department is an object instead of a string
            const departmentId = typeof userData.department === 'object' && userData.department !== null 
              ? userData.department.$id 
              : userData.department;
              
            // Validate department ID format
            const validIdRegex = /^[a-zA-Z0-9]{1,36}$/;
            if (typeof departmentId === 'string' && validIdRegex.test(departmentId)) {
              const departmentData = await getDepartmentById(departmentId);
              setCurrentDepartment(departmentData);
            } else {
              console.error('Invalid department ID format:', departmentId);
              // Clear the invalid department ID in the user profile
              try {
                await fetch(`/api/users/${userData.$id}/department`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ departmentId: null }),
                });
              } catch (updateError) {
                console.error('Error clearing invalid department ID:', updateError);
              }
            }
          } catch (error) {
            console.error('Error fetching department:', error);
          }
        } 
        // If not, check if user is a member of any department
        else if (departmentsData?.length > 0) {
          // Find department where user is a member
          const userDept = departmentsData.find(dept => 
            dept.members && Array.isArray(dept.members) && dept.members.includes(userData.$id)
          );
          
          if (userDept) {
            setCurrentDepartment(userDept);
            // Update the user's department field in the database
            try {
              await fetch(`/api/users/${userData.$id}/department`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ departmentId: userDept.$id }),
              });
            } catch (updateError) {
              console.error('Error updating user department:', updateError);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600"></div>
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">User Not Found</CardTitle>
            <CardDescription>
              Unable to load your profile information. Please try again later.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const userInitials = getUserInitials(user.name, user.email);
  
  return (
    <PageContextualHelp pageName="profile">
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Profile</h1>
          <p className="text-muted-foreground">
            Manage your profile and settings
          </p>
        </div>

        {user.role === 'admin' && (
          <div className="flex gap-4">
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              onClick={() => window.location.href = '/dashboard/admin/profile'}
            >
              <Briefcase className="h-4 w-4" />
              <span>Admin View</span>
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="department">Department</TabsTrigger>
          {user.role === 'admin' && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your personal information and profile details</CardDescription>
                </div>
                <Avatar className="h-16 w-16 border-2 border-red-600">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-red-600 text-white text-lg font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                      <UserIcon className="mr-2 h-4 w-4" />
                      Full Name
                    </div>
                    <div className="font-medium">{user.fullName || user.name || 'Not set'}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </div>
                    <div className="font-medium">{user.email}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                      <Building2 className="mr-2 h-4 w-4" />
                      Department
                    </div>
                    <div className="font-medium">
                      {currentDepartment ? currentDepartment.name : 'Not assigned'}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                      <Award className="mr-2 h-4 w-4" />
                      Role
                    </div>
                    <div className="font-medium capitalize">
                      {user.role || 'User'}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                      <Calendar className="mr-2 h-4 w-4" />
                      Account Created
                    </div>
                    <div className="font-medium">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                      <Calendar className="mr-2 h-4 w-4" />
                      Last Login
                    </div>
                    <div className="font-medium">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="department" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Management</CardTitle>
              <CardDescription>
                Change your department affiliation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4 text-lg font-medium">Current Department</h3>
                  {currentDepartment ? (
                    <div className="bg-gray-50 border rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-full">
                          <Building2 className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{currentDepartment.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {currentDepartment.description || 'No description available'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4">
                      You are not assigned to any department yet.
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="mb-4 text-lg font-medium">Switch Department</h3>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Select a department from the list below to change your affiliation.
                    </p>
                    
                    {departments.length > 0 ? (
                      <DepartmentSwitcher
                        currentDepartment={user.departmentId || null}
                        departments={departments.map(dept => ({
                          id: dept.$id,
                          name: dept.name
                        }))}
                        userId={user.$id}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No departments available. Please contact your administrator.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {user.role === 'admin' && (
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Profile</CardTitle>
                <CardDescription>
                  Administrator-specific information and capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-full mt-1">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-800">Administrator Access</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          You have administrative privileges on this platform, which grants you access to system management, 
                          user administration, and other privileged operations.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm font-medium text-muted-foreground">
                        <Check className="mr-2 h-4 w-4" />
                        Access Level
                      </div>
                      <div className="font-medium">Full Administrative Access</div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center text-sm font-medium text-muted-foreground">
                        <Check className="mr-2 h-4 w-4" />
                        Permissions
                      </div>
                      <div className="font-medium">
                        User Management, Content Management, System Settings
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
    </PageContextualHelp>
  );
} 