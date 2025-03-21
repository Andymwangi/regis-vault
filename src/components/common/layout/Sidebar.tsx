'use client';

import { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  FolderIcon, 
  UsersIcon, 
  ClockIcon, 
  Share2Icon, 
  TrashIcon, 
  SettingsIcon,
  UserIcon,
  XIcon,
  PlusIcon
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainRoutes: NavItem[] = [
  { name: 'My Files', path: '/dashboard/files', icon: FolderIcon },
  { name: 'Shared with Me', path: '/dashboard/shared', icon: Share2Icon },
  { name: 'Recent', path: '/dashboard/recent', icon: ClockIcon },
  { name: 'Teams', path: '/dashboard/teams', icon: UsersIcon },
  { name: 'Trash', path: '/dashboard/trash', icon: TrashIcon },
];

const accountRoutes: NavItem[] = [
  { name: 'Profile', path: '/dashboard/profile', icon: UserIcon },
  { name: 'Settings', path: '/dashboard/settings', icon: SettingsIcon },
];

export const Sidebar: FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;
  
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-red-500 rounded-full"></div>
            <span className="ml-2 font-medium">RegisVault Management</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="lg:hidden"
          >
            <XIcon className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-4">
          <Button variant="default" className="w-full">
            <PlusIcon className="mr-1 h-4 w-4" />
            New Folder
          </Button>
        </div>
        
        <nav className="space-y-1 px-3">
          {mainRoutes.map((route) => (
            <Link 
              key={route.path} 
              href={route.path}
              className={`flex items-center px-3 py-2 rounded-md text-sm ${
                isActive(route.path) 
                  ? 'bg-red-50 text-red-600 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <route.icon className={`h-5 w-5 mr-2 ${
                isActive(route.path) ? 'text-red-500' : 'text-gray-500'
              }`} />
              {route.name}
            </Link>
          ))}
        </nav>
        
        <div className="px-3 mt-6">
          <p className="px-3 text-xs font-medium uppercase text-gray-500 mb-2">Account</p>
          {accountRoutes.map((route) => (
            <Link 
              key={route.path} 
              href={route.path}
              className={`flex items-center px-3 py-2 rounded-md text-sm ${
                isActive(route.path) 
                  ? 'bg-red-50 text-red-600 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <route.icon className={`h-5 w-5 mr-2 ${
                isActive(route.path) ? 'text-red-500' : 'text-gray-500'
              }`} />
              {route.name}
            </Link>
          ))}
        </div>
        
        {/* Mobile Close Button */}
        <div className="absolute bottom-4 left-4 right-4 lg:hidden">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={onClose}
          >
            Close Menu
          </Button>
        </div>
      </aside>
    </>
  );
}; 