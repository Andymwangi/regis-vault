'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { File } from '@/types/file';
import { shareFileBridge } from '@/lib/bridge/file-bridge';
import { Switch } from '@/components/ui/switch';

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  avatar?: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onShareComplete: () => void;
}

export function ShareDialog({ open, onOpenChange, file, onShareComplete }: ShareDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [role, setRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [loading, setLoading] = useState(false);
  const [shareAsDepartment, setShareAsDepartment] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchDepartments();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      if (data && data.users) {
        setUsers(data.users);
      } else {
        console.error('Unexpected response format from users API:', data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      toast.error('Failed to fetch users');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (!response.ok) throw new Error(`Failed to fetch departments: ${response.status}`);
      
      const data = await response.json();
      if (data && Array.isArray(data.departments)) {
        setDepartments(data.departments);
      } else {
        console.error('Unexpected departments response format:', data);
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
      toast.error('Failed to fetch departments');
    }
  };

  const handleShare = async () => {
    if (!file) return;

    try {
      setLoading(true);
      await shareFileBridge(file.id, {
        users: selectedUsers,
        departments: selectedDepartments,
        role,
        shareAsDepartment
      });

      toast.success('File shared successfully');
      onShareComplete();
    } catch (error) {
      console.error('Error sharing file:', error);
      toast.error('Failed to share file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>
            Share "{file?.name}" with users or departments
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="departments">
              <Building2 className="w-4 h-4 mr-2" />
              Departments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-4">
                {users && users.length > 0 ? (
                  users
                    .filter(user => 
                      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      user.email.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(user => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={user.id}
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(prev => [...prev, user.id]);
                            } else {
                              setSelectedUsers(prev => prev.filter(id => id !== user.id));
                            }
                          }}
                        />
                        <Label htmlFor={user.id}>
                          {user.name} ({user.email})
                        </Label>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No users found
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded-md">
              <div>
                <Label className="font-medium">Share as Department</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, files are shared with the department as an entity rather than with all members
                </p>
              </div>
              <Switch 
                checked={shareAsDepartment}
                onCheckedChange={setShareAsDepartment}
              />
            </div>
            
            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-4">
                {departments && departments.length > 0 ? (
                  departments.map(dept => (
                    <div key={dept.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={dept.id}
                        checked={selectedDepartments.includes(dept.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDepartments(prev => [...prev, dept.id]);
                          } else {
                            setSelectedDepartments(prev => prev.filter(id => id !== dept.id));
                          }
                        }}
                      />
                      <Label htmlFor={dept.id}>
                        {dept.name}
                      </Label>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No departments found
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <Label>Permission Level</Label>
          <div className="flex space-x-4">
            <Button
              variant={role === 'viewer' ? 'default' : 'outline'}
              onClick={() => setRole('viewer')}
            >
              Viewer
            </Button>
            <Button
              variant={role === 'editor' ? 'default' : 'outline'}
              onClick={() => setRole('editor')}
            >
              Editor
            </Button>
            <Button
              variant={role === 'admin' ? 'default' : 'outline'}
              onClick={() => setRole('admin')}
            >
              Admin
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={loading}>
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 