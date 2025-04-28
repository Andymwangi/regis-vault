import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { updateUserRole } from '@/lib/actions/user.actions';

interface AdminAccessDialogProps {
  userId: string;
}

export function AdminAccessDialog({ userId }: AdminAccessDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAdminAccess = async () => {
    setIsLoading(true);
    try {
      // Check if the password matches the admin access password
      if (password === process.env.NEXT_PUBLIC_ADMIN_ACCESS_PASSWORD) {
        await updateUserRole(userId, 'admin');
        toast.success('Admin access granted');
        router.push('/dashboard/admin');
        router.refresh();
      } else {
        toast.error('Invalid admin access password');
      }
    } catch (error) {
      console.error('Error granting admin access:', error);
      toast.error('Failed to grant admin access');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
      setPassword('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Request Admin Access</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin Access Request</DialogTitle>
          <DialogDescription>
            Enter the admin access password to gain administrative privileges.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="password"
            placeholder="Enter admin access password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleAdminAccess} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Grant Admin Access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 