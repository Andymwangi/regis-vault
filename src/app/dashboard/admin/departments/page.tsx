'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PlusCircle, Edit, Trash2, Loader2, Users } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Department {
  $id: string;
  name: string;
  description: string;
  allocatedStorage: number;
  usedStorage?: number;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
  members?: string[];
}

export default function DepartmentsPage() {
  // Role-based access control
  const { isLoading: isAuthLoading } = useRoleGuard(['admin']);

  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    description: '',
    allocatedStorage: 10
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchDepartments();
    }
  }, [isAuthLoading]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/departments');
      
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      
      const data = await response.json();
      console.log('API response:', data);
      setDepartments(data.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
      setDepartments([]); 
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async () => {
    try {
      if (!newDepartment.name.trim()) {
        toast.error('Department name is required');
        return;
      }

      setIsSubmitting(true);

      const response = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newDepartment.name,
          description: newDepartment.description,
          allocatedStorage: newDepartment.allocatedStorage * 1024 * 1024 * 1024 // Convert GB to bytes
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create department');
      }

      toast.success('Department created successfully');
      setNewDepartment({ name: '', description: '', allocatedStorage: 10 });
      setIsAddDialogOpen(false);
      fetchDepartments();
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error(`Failed to create department: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDepartment = async () => {
    try {
      if (!currentDepartment || !currentDepartment.name.trim()) {
        toast.error('Department name is required');
        return;
      }

      setIsSubmitting(true);

      const response = await fetch(`/api/admin/departments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: currentDepartment.$id,
          name: currentDepartment.name,
          description: currentDepartment.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update department');
      }

      toast.success('Department updated successfully');
      setIsEditDialogOpen(false);
      fetchDepartments();
    } catch (error) {
      console.error('Error updating department:', error);
      toast.error(`Failed to update department: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDepartment = async () => {
    try {
      if (!currentDepartment) return;

      setIsSubmitting(true);

      const response = await fetch(`/api/admin/departments?id=${currentDepartment.$id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete department');
      }

      toast.success('Department deleted successfully');
      setIsDeleteDialogOpen(false);
      fetchDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error(`Failed to delete department: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (department: Department) => {
    setCurrentDepartment(department);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (department: Department) => {
    setCurrentDepartment(department);
    setIsDeleteDialogOpen(true);
  };

  const formatStorageSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const getStorageUsagePercentage = (used: number = 0, allocated: number = 1) => {
    if (!used || !allocated) return 0;
    return Math.min(Math.round((used / allocated) * 100), 100);
  };

  const filteredDepartments = departments?.filter(dept => 
    dept?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept?.description?.toLowerCase().includes(searchQuery.toLowerCase() || '')
  ) || [];

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setAllUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const openMembersDialog = async (department: Department) => {
    setCurrentDepartment(department);
    setSelectedUsers(department.members || []);
    setIsMembersDialogOpen(true);
    
    if (allUsers.length === 0) {
      await fetchUsers();
    }
  };

  const handleUpdateMembers = async () => {
    try {
      if (!currentDepartment) return;

      setIsSubmitting(true);

      const response = await fetch('/api/admin/departments/members', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          departmentId: currentDepartment.$id,
          members: selectedUsers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update department members');
      }

      toast.success('Department members updated successfully');
      setIsMembersDialogOpen(false);
      fetchDepartments();
    } catch (error) {
      console.error('Error updating members:', error);
      toast.error(`Failed to update members: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Departments Management</h1>
          <p className="text-gray-500 mt-1">Manage departments and storage allocation</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
              <DialogDescription>
                Add a new department with storage allocation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Department Name*</Label>
                <Input 
                  id="name" 
                  value={newDepartment.name} 
                  onChange={(e) => setNewDepartment({...newDepartment, name: e.target.value})}
                  placeholder="e.g. Marketing, Sales, Finance"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={newDepartment.description} 
                  onChange={(e) => setNewDepartment({...newDepartment, description: e.target.value})}
                  placeholder="Brief description of this department"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="storage">Storage Allocation (GB)</Label>
                <Input 
                  id="storage" 
                  type="number"
                  value={newDepartment.allocatedStorage} 
                  onChange={(e) => setNewDepartment({...newDepartment, allocatedStorage: Number(e.target.value)})}
                  min={1}
                  max={1000}
                />
                <p className="text-sm text-gray-500">Default: 10GB</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleAddDepartment} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Department'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No departments found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map((dept) => (
                  <TableRow key={dept.$id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{dept.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="text-sm">
                          {formatStorageSize(dept.usedStorage || 0)} / {formatStorageSize(dept.allocatedStorage)}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              getStorageUsagePercentage(dept.usedStorage, dept.allocatedStorage) > 90 
                                ? 'bg-red-500' 
                                : getStorageUsagePercentage(dept.usedStorage, dept.allocatedStorage) > 70 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${getStorageUsagePercentage(dept.usedStorage, dept.allocatedStorage)}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(dept.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(dept)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(dept)}
                          title="Delete"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openMembersDialog(dept)}
                          title="Manage Members"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department details.
            </DialogDescription>
          </DialogHeader>
          {currentDepartment && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input 
                  id="edit-name" 
                  value={currentDepartment.name} 
                  onChange={(e) => setCurrentDepartment({...currentDepartment, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea 
                  id="edit-description" 
                  value={currentDepartment.description || ''} 
                  onChange={(e) => setCurrentDepartment({...currentDepartment, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label>Storage Usage</Label>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        getStorageUsagePercentage(currentDepartment.usedStorage, currentDepartment.allocatedStorage) > 90 
                          ? 'bg-red-500' 
                          : getStorageUsagePercentage(currentDepartment.usedStorage, currentDepartment.allocatedStorage) > 70 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${getStorageUsagePercentage(currentDepartment.usedStorage, currentDepartment.allocatedStorage)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm whitespace-nowrap">
                    {getStorageUsagePercentage(currentDepartment.usedStorage, currentDepartment.allocatedStorage)}%
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {formatStorageSize(currentDepartment.usedStorage || 0)} used of {formatStorageSize(currentDepartment.allocatedStorage)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditDepartment} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this department? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {currentDepartment && (
            <div className="py-4">
              <p className="font-medium">{currentDepartment.name}</p>
              <p className="text-sm text-gray-500 mt-1">{currentDepartment.description || 'No description'}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDepartment} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Department'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Department Members</DialogTitle>
            <DialogDescription>
              {currentDepartment && `Assign users to ${currentDepartment.name}`}
            </DialogDescription>
          </DialogHeader>
          {loadingUsers ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-72 border rounded-md">
              <div className="p-4 space-y-2">
                {allUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No users found</p>
                ) : (
                  allUsers.map((user) => (
                    <div key={user.$id} className="flex items-center space-x-2 py-2 border-b last:border-b-0">
                      <Checkbox 
                        id={`user-${user.$id}`}
                        checked={selectedUsers.includes(user.$id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers([...selectedUsers, user.$id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.$id));
                          }
                        }}
                      />
                      <div className="grid gap-1.5 flex-1">
                        <label 
                          htmlFor={`user-${user.$id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {user.fullName || user.name || 'Unnamed User'}
                        </label>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMembersDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMembers} disabled={isSubmitting || loadingUsers}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 