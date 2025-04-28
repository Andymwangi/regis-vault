import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { updateUserDepartment } from '@/lib/actions/user.actions';

interface Department {
  id: string;
  name: string;
}

interface DepartmentSwitcherProps {
  currentDepartment: string | null;
  departments: Department[];
  userId: string;
}

export function DepartmentSwitcher({
  currentDepartment,
  departments,
  userId,
}: DepartmentSwitcherProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDepartmentChange = async (departmentId: string) => {
    setIsLoading(true);
    try {
      await updateUserDepartment(userId, departmentId);
      toast.success('Department switched successfully');
      router.refresh();
    } catch (error) {
      console.error('Error switching department:', error);
      toast.error('Failed to switch department');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentDepartment || ''}
        onValueChange={handleDepartmentChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select department" />
        </SelectTrigger>
        <SelectContent>
          {departments.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 