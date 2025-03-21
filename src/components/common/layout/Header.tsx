'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  SearchIcon, 
  LogOutIcon,
  BellIcon,
  PlusIcon,
  FilterIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface HeaderProps {
  onNewFolder?: () => void;
  onSearch?: (query: string) => void;
}

export const Header: FC<HeaderProps> = ({ onNewFolder, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };
  
  const handleLogout = () => {
    // Handle logout logic here
    toast.success("Logged out", {
      description: "You have been logged out successfully",
    });
  };
  
  return (
    <header className="hidden lg:flex items-center justify-between border-b p-4 bg-white">
      <div className="flex-1 max-w-md">
        <form onSubmit={handleSearch} className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search files and folders..." 
            className="w-full pl-9 bg-gray-50 border-gray-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            type="button"
          >
            <FilterIcon className="h-4 w-4 text-gray-500" />
          </Button>
        </form>
      </div>
      
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="icon"
          className="relative"
        >
          <BellIcon className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </Button>
        
        <Button 
          variant="default"
          size="sm"
          onClick={onNewFolder}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Folder
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 rounded-full bg-slate-800 p-0"
            >
              <span className="text-white text-xs">JD</span>
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
    </header>
  );
}; 