'use client';
import { FC, ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { 
  FolderIcon, 
  UsersIcon, 
  ClockIcon, 
  Share2Icon, 
  TrashIcon, 
  SettingsIcon,
  UserIcon,
  MenuIcon,
  XIcon,
  LogOutIcon,
  SearchIcon,
  PlusIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/hooks/use-auth';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout: FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  const isActive = (path: string) => pathname?.startsWith(path);
  
  const routes = [
    { name: 'My Files', path: '/dashboard/files', icon: FolderIcon },
    { name: 'Shared with Me', path: '/dashboard/shared', icon: Share2Icon },
    { name: 'Recent', path: '/dashboard/recent', icon: ClockIcon },
    { name: 'Teams', path: '/dashboard/teams', icon: UsersIcon },
    { name: 'Trash', path: '/dashboard/trash', icon: TrashIcon },
  ];
  
  const accountRoutes = [
    { name: 'Profile', path: '/dashboard/profile', icon: UserIcon },
    { name: 'Settings', path: '/dashboard/settings', icon: SettingsIcon },
  ];
  
  const handleLogout = () => {
    logout();
  };
  
  const handleSearch = (query: string) => {
    // Implement search functionality
    console.log('Searching for:', query);
  };
  
  const handleNewFolder = () => {
    // Implement new folder functionality
    console.log('Creating new folder');
  };
  
  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-2"
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <div className="h-8 w-8 bg-red-500 rounded-full"></div>
            <span className="ml-2 font-medium">ORPP File Management</span>
          </div>
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 rounded-full bg-slate-800 p-0"
              >
                <span className="text-white text-xs">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOutIcon className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className={`lg:ml-64 pt-16 lg:pt-0 min-h-screen`}>
        <Header onSearch={handleSearch} onNewFolder={handleNewFolder} />
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};