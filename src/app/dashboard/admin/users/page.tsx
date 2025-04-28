'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Mail, Loader2, Users, Filter, Search, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRoleGuard } from '@/hooks/use-role-guard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  departmentName?: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
}

interface Department {
  id: string;
  name: string;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  byDepartment: Record<string, number>;
  byRole: Record<string, number>;
}

type UserRole = 'admin' | 'manager' | 'user';

export default function UsersPage() {
  // Role-based access control
  const { isLoading: isAuthLoading } = useRoleGuard(['admin']);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    inactive: 0,
    pending: 0,
    byDepartment: {},
    byRole: {}
  });

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    department: '',
    role: 'user' as UserRole
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // For viewing all users or by department

  useEffect(() => {
    if (!isAuthLoading) {
      fetchDepartments();
      fetchUsers();
    }
  }, [isAuthLoading]);

  useEffect(() => {
    if (departments.length > 0 && !newUser.department) {
      setNewUser(prev => ({ ...prev, department: departments[0].id }));
    }
  }, [departments]);

  // Calculate statistics from user data
  useEffect(() => {
    const calculateStats = () => {
      const stats: UserStats = {
        total: users.length,
        active: 0,
        inactive: 0,
        pending: 0,
        byDepartment: {},
        byRole: {}
      };

      users.forEach(user => {
        // Count by status
        if (user.status === 'active') stats.active++;
        else if (user.status === 'inactive') stats.inactive++;
        else if (user.status === 'pending') stats.pending++;

        // Count by department
        const deptName = user.departmentName || 'Unknown';
        stats.byDepartment[deptName] = (stats.byDepartment[deptName] || 0) + 1;

        // Count by role
        stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
      });

      setStats(stats);
    };

    calculateStats();
  }, [users]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments');
      if (!response.ok) throw new Error('Failed to fetch departments');
      const data = await response.json();
      setDepartments(data.departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Fix: Only add department parameter if it's not 'all'
      if (filterDepartment && filterDepartment !== 'all') {
        params.append('department', filterDepartment);
      }
      
      if (filterRole !== 'all') params.append('role', filterRole);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);
  
      console.log("Sending request with params:", params.toString());  // Add this for debugging
      
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch users');
  
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };
  const handleAddUser = async () => {
    try {
      setIsSubmitting(true);
      if (!newUser.name.trim() || !newUser.email.trim() || !newUser.department) {
        toast.error('Name, email, and department are required');
        return;
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (!response.ok) throw new Error('Failed to create user');

      toast.success('User created and invitation sent');
      setNewUser({
        name: '',
        email: '',
        department: departments[0]?.id || '',
        role: 'user'
      });
      setIsAddDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };
  const getDepartmentName = (departmentId: string): string => {
    if (departmentId === 'all') return 'All Departments';
    const department = departments.find(dept => dept.id === departmentId);
    return department ? department.name : 'Unknown Department';
  };
  
  const handleEditUser = async () => {
    try {
      setIsSubmitting(true);
      if (!currentUser || !currentUser.name.trim() || !currentUser.department) {
        toast.error('Name and department are required');
        return;
      }

      const response = await fetch(`/api/admin/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: currentUser.role,
          status: currentUser.status,
          department: currentUser.department
        })
      });

      if (!response.ok) throw new Error('Failed to update user');

      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setIsSubmitting(true);
      if (!currentUser) return;

      const response = await fetch(`/api/admin/users/${currentUser.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete user');

      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendInvite = async (id: string, email: string) => {
    try {
      const response = await fetch(`/api/admin/users/${id}/invite`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to send invitation');

      toast.success(`Invitation sent to ${email}`);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    }
  };

  const openEditDialog = (user: User) => {
    setCurrentUser(user);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setCurrentUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Filter users by department when viewing departmental tabs
  const filteredUsers = activeTab === 'all' 
    ? users 
    : users.filter(user => user.departmentName === activeTab);

  const roles: UserRole[] = ['admin', 'manager', 'user'];
  const statuses = ['active', 'inactive', 'pending'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (dateString === 'Never') return 'Never';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get distinctive color for avatar based on user name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const index = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">Users Management</h1>
            <p className="text-muted-foreground ">Manage your organization's users and their permissions</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user and send them an invitation.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="Email address"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={newUser.department}
                    onValueChange={(value) => setNewUser({ ...newUser, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: UserRole) =>
                      setNewUser({ ...newUser, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser} disabled={isSubmitting}>
                  {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  Create & Invite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Across all departments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of total users
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting user registration</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
              <div className="h-2 w-2 rounded-full bg-gray-500"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inactive}</div>
              <p className="text-xs text-muted-foreground">Deactivated accounts</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>User Search & Filters</CardTitle>
            <CardDescription>Find users by name, email, department, role, or status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-2/5 flex items-center relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-1 gap-2 flex-wrap md:flex-nowrap">
              <Select 
                  value={filterDepartment} 
                  onValueChange={(value: string) => {
                    setFilterDepartment(value);
                  }}
                >
                  <SelectTrigger id="department-select" className="md:w-full">
                    <SelectValue placeholder="All Departments">
                      {filterDepartment !== 'all' ? getDepartmentName(filterDepartment) : 'All Departments'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterRole} onValueChange={(value) => setFilterRole(value)}>
                  <SelectTrigger className="md:w-full">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roles.map(role => (
                        <SelectItem key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value)}>
                  <SelectTrigger className="md:w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statuses.map(status => (
                        <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button variant="secondary" onClick={fetchUsers} className="whitespace-nowrap">
                  <Filter className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Users</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchUsers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Department Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="mb-4 flex flex-wrap">
                <TabsTrigger value="all">All Users</TabsTrigger>
                {Object.keys(stats.byDepartment).map(dept => (
                  <TabsTrigger key={dept} value={dept}>
                    {dept} ({stats.byDepartment[dept]})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className={getAvatarColor(user.name)}>
                              <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.departmentName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                            user.role === 'manager' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(user.status)}`}>
                            {user.status}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(user.lastLogin)}</TableCell>
                        <TableCell className="text-right">
                          {user.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendInvite(user.id, user.email)}
                              className="mr-1"
                              title="Resend invitation"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            className="mr-1"
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(user)}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        {searchQuery || filterDepartment !== 'all' || filterRole !== 'all' || filterStatus !== 'all' ?
                          'No users found matching your search criteria' :
                          'No users found. Add users to get started.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to user role, status and department.
            </DialogDescription>
          </DialogHeader>
          {currentUser && (
            <div className="grid gap-4 py-4">
              <div>
                <p className="font-medium">{currentUser.name}</p>
                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={currentUser.role}
                  onValueChange={(value: UserRole) =>
                    setCurrentUser({ ...currentUser, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {roles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={currentUser.status}
                  onValueChange={(value: 'active' | 'inactive' | 'pending') =>
                    setCurrentUser({ ...currentUser, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-department">Department</Label>
                <Select
                  value={currentUser.department} 
                  onValueChange={(value) =>
                    setCurrentUser({ ...currentUser, department: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}  {/* Show department name in dropdown */}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser} disabled={isSubmitting}>
              {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete User Dialog */}
    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this user? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {currentUser && (
          <div className="py-4">
            <p className="font-medium">{currentUser.name}</p>
            <p className="text-sm text-muted-foreground">{currentUser.email}</p>
            <p className="text-sm mt-2">
              <Badge variant={currentUser.role}>
                {currentUser.role}
              </Badge>
              <span className="ml-2">
                {/* Use departmentName instead of looking up by ID */}
                {currentUser.departmentName || "Unknown Department"}
              </span>
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>
            {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Delete User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </DashboardLayout>
  );
} 