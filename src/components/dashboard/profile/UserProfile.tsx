'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/components/providers/SessionProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Edit, Upload } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { getDepartmentById } from '@/lib/appwrite/department-operations';

export function UserProfile() {
  const { user } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departmentName, setDepartmentName] = useState<string>('');
  const [formData, setFormData] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ')[1] || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    department: user?.department || '',
    role: user?.role || '',
  });

  useEffect(() => {
    // Fetch department name if department ID exists
    const fetchDepartmentName = async () => {
      if (user?.department) {
        try {
          // Handle case where department is an object instead of a string
          const departmentId = typeof user.department === 'object' && user.department !== null 
            ? user.department.$id 
            : user.department;
            
          // Validate department ID format before fetching
          const validIdRegex = /^[a-zA-Z0-9]{1,36}$/;
          if (typeof departmentId === 'string' && validIdRegex.test(departmentId)) {
            const departmentData = await getDepartmentById(departmentId);
            if (departmentData) {
              setDepartmentName(departmentData.name);
            }
          } else {
            console.error("Invalid department ID format:", departmentId);
            // Clear the invalid department ID
            if (user?.$id) {
              try {
                await fetch(`/api/users/${user.$id}/department`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ departmentId: null }),
                });
              } catch (updateError) {
                console.error('Error clearing invalid department ID:', updateError);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching department:", error);
        }
      } else {
        // If no department field, try to find by membership
        try {
          const departments = await fetch('/api/admin/departments').then(res => res.json());
          if (departments?.success && departments?.data) {
            // Find department where user is a member
            const userDept = departments.data.find((dept: any) => 
              dept.members && Array.isArray(dept.members) && dept.members.includes(user?.$id)
            );
            
            if (userDept) {
              setDepartmentName(userDept.name);
              
              // Update user's department field in database
              if (user?.$id) {
                try {
                  await fetch(`/api/users/${user.$id}/department`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ departmentId: userDept.$id }),
                  });
                } catch (updateError) {
                  console.error('Error updating user department:', updateError);
                }
              }
            }
          }
        } catch (error) {
          console.error("Error fetching departments:", error);
        }
      }
    };

    fetchDepartmentName();
  }, [user?.department, user?.$id]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setLoading(true);
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload avatar');

      const data = await response.json();
      toast.success('Avatar updated successfully');
      window.location.reload();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const updatedUser = await response.json();
      toast.success('Profile updated successfully');
      window.location.reload();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[1][0]}`;
    }
    return user.name[0].toUpperCase();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-6">
        <h2 className="text-2xl font-bold">User Profile</h2>
        <Button
          variant="outline"
          onClick={() => setIsEditing(!isEditing)}
          disabled={loading}
        >
          <Edit className="h-4 w-4 mr-2" />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt="Profile"
                width={128}
                height={128}
                className="rounded-full"
              />
            ) : (
              <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center text-white text-2xl">
                {getUserInitials()}
              </div>
            )}
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-100"
            >
              <Upload className="h-4 w-4" />
              <input
                id="avatar-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={loading}
              />
            </label>
          </div>
          <div className="text-center">
            <h3 className="font-medium">{user?.name}</h3>
            <p className="text-gray-500 mb-2">{user?.role}</p>
            {departmentName && (
              <Badge variant="secondary" className="mb-2">{departmentName}</Badge>
            )}
            <p className="text-sm text-gray-400">Member since {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={!isEditing || loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={!isEditing || loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled={true}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                disabled={!isEditing || loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={departmentName || 'Not Assigned'}
                disabled={true}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={formData.role}
                disabled={true}
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 