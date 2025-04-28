'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { User as UserType } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  FileText, 
  Share2, 
  Clock, 
  Users, 
  Trash2, 
  Scan, 
  Tags, 
  Building2, 
  FolderCog, 
  BarChart3, 
  Settings,
  Menu,
  X,
  User,
  ChevronRight,
  ChevronLeft,
  Home,
  HardDrive
} from 'lucide-react';
import Link from 'next/link';
import { cn, getUserFirstName, getUserInitials } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles?: string[];
}

const navigation: NavItem[] = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'My Files', href: '/dashboard/files', icon: FileText },
  { name: 'Shared with Me', href: '/dashboard/shared', icon: Share2 },
  { name: 'Recent', href: '/dashboard/recent', icon: Clock },
  { name: 'Teams', href: '/dashboard/teams', icon: Users },
  { name: 'Trash', href: '/dashboard/trash', icon: Trash2 },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  
  // Tools
  { name: 'OCR Tool', href: '/dashboard/tools/ocr', icon: Scan },
  { name: 'Tagging Tool', href: '/dashboard/tools/tagging', icon: Tags },
  
  // Admin pages
  { 
    name: 'Departments', 
    href: '/dashboard/admin/departments', 
    icon: Building2,
    roles: ['admin'] 
  },
  { 
    name: 'Users', 
    href: '/dashboard/admin/users', 
    icon: Users,
    roles: ['admin'] 
  },
  { 
    name: 'Storage Usage', 
    href: '/dashboard/admin/storage', 
    icon: HardDrive,
    roles: ['admin'] 
  },
  { 
    name: 'Trash', 
    href: '/dashboard/admin/trash', 
    icon: Trash2,
    roles: ['admin'] 
  },
  { 
    name: 'File Manager', 
    href: '/dashboard/admin/files', 
    icon: FolderCog,
    roles: ['admin'] 
  },
  { 
    name: 'Analytics', 
    href: '/dashboard/admin/analytics', 
    icon: BarChart3,
    roles: ['admin'] 
  },
  { 
    name: 'Profile', 
    href: '/dashboard/admin/profile', 
    icon: User,
    roles: ['admin'] 
  },
  { 
    name: 'Settings', 
    href: '/dashboard/admin/settings', 
    icon: Settings,
    roles: ['admin'] 
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [hoverSection, setHoverSection] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const result = await getCurrentUser();
        if (result) {
          setUser(result);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Auto-close mobile sidebar on route changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const handleRoleSwitch = async () => {
    if (adminPassword === process.env.NEXT_PUBLIC_ADMIN_ACCESS_PASSWORD) {
      try {
        const response = await fetch('/api/user/role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user?.$id,
            role: user?.role === 'admin' ? 'user' : 'admin',
          }),
        });

        if (response.ok) {
          toast.success(`Role switched to ${user?.role === 'admin' ? 'user' : 'admin'}`);
          setIsAdminDialogOpen(false);
          setAdminPassword('');
          
          // Refresh user data after role change
          const updatedUser = await getCurrentUser();
          if (updatedUser) {
            setUser(updatedUser);
          }
        } else {
          const errorData = await response.json();
          toast.error(`Failed to switch role: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error switching role:', error);
        toast.error('Failed to switch role');
      }
    } else {
      toast.error('Invalid admin password');
    }
  };

  const filteredNavigation = navigation.filter(
    item => !item.roles || item.roles.includes(user?.role || 'user')
  );

  const sections = {
    main: filteredNavigation.filter(item => !item.href.includes('/tools') && !item.href.includes('/admin')),
    tools: filteredNavigation.filter(item => item.href.includes('/tools')),
    admin: filteredNavigation.filter(item => item.href.includes('/admin')),
  };

  const firstName = getUserFirstName(user?.fullName || user?.name, user?.email);
  const userInitials = getUserInitials(user?.fullName || user?.name, user?.email);

  

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Enhanced Header with RegisVault branding */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b h-16 shadow-sm">
        <div className="flex h-full items-center justify-between px-4 lg:px-8">
          <div className="flex items-center">
            {/* Mobile menu toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden mr-2 hover:bg-gray-100 text-gray-700"
            >
              {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Logo placeholder and brand name */}
            <div className="flex items-center">
              <div className="h-8 w-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold mr-2">
                R
              </div>
              <span className="font-bold text-xl text-red-600">RegisVault</span>
            </div>
          </div>

          {/* Current section indicator - desktop only */}
          <div className="hidden lg:block">
            <div className="flex items-center">
              <span className="text-lg font-semibold text-gray-800">
                {pathname.includes('/dashboard/admin') ? 'Admin Dashboard' : 'Document Management System'}
              </span>
            </div>
          </div>

          {/* User information and avatar - Enhanced with better formatting */}
          <div className="flex items-center space-x-2">
            {/* Always show Welcome message when user data is available */}
            {user && (
              <span className="hidden md:inline-block text-sm font-medium text-gray-600 mr-2">
                Welcome, {firstName}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-red-600">
                    <AvatarFallback className="bg-red-600 text-white font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2 border-b">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-red-600 text-white font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{user?.fullName || firstName}</p>
                    <p className="text-xs text-gray-500">{user?.email || 'No email'}</p>
                  </div>
                </div>
                <DropdownMenuItem className="hover:bg-gray-100">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">Admin Mode</span>
                    <Switch
                      checked={user?.role === 'admin'}
                      onCheckedChange={() => setIsAdminDialogOpen(true)}
                    />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-100">
                  <Link href="/dashboard/profile" className="w-full">
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-100">
                  <Link href="/dashboard/settings" className="w-full">
                    App Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-gray-100">
                  <Link href="/api/auth/signout" className="w-full font-medium text-red-600">Logout</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      {/* Improved Collapsible Sidebar with better display */}
      <div className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'w-16' : 'w-64'} 
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Sidebar Toggle Button - Outside the sidebar for better visibility */}
        <button 
          className="absolute -right-3 top-20 bg-red-600 text-white rounded-full p-1 shadow-md hidden lg:flex items-center justify-center z-50 h-6 w-6"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          {isSidebarCollapsed ? 
            <ChevronRight className="h-4 w-4" /> : 
            <ChevronLeft className="h-4 w-4" />
          }
        </button>

        {/* Actual Sidebar */}
        <div className="h-full flex flex-col bg-gray-900 text-white pt-16">
          <div className="flex-1 overflow-y-auto">
            <div className="px-2 py-4">
              <div className="space-y-6">
                {/* Main Navigation */}
                <div>
                  <h3 className={`text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2
                    ${isSidebarCollapsed ? 'text-center' : ''}`}
                  >
                    {isSidebarCollapsed ? 'Main' : 'Main'}
                  </h3>
                  <div 
                    className="space-y-1"
                    onMouseEnter={() => isSidebarCollapsed && setHoverSection('main')}
                    onMouseLeave={() => isSidebarCollapsed && setHoverSection(null)}
                  >
                    {sections.main.map((item) => (
                      <div key={item.href} className="relative">
                        <Link
                          href={item.href}
                          className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm rounded-md ${
                            pathname === item.href
                              ? 'bg-red-600 text-white'
                              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          <item.icon className={`h-5 w-5 ${!isSidebarCollapsed && 'mr-3'}`} />
                          {!isSidebarCollapsed && <span>{item.name}</span>}
                        </Link>
                        
                        {/* Tooltip/Dropdown for collapsed items on hover */}
                        {isSidebarCollapsed && hoverSection === 'main' && (
                          <div className="absolute left-full top-0 ml-2 bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-50">
                            {item.name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tools Navigation */}
                {sections.tools.length > 0 && (
                  <div>
                    <h3 className={`text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2
                      ${isSidebarCollapsed ? 'text-center' : ''}`}
                    >
                      {isSidebarCollapsed ? 'Tools' : 'Tools'}
                    </h3>
                    <div 
                      className="space-y-1"
                      onMouseEnter={() => isSidebarCollapsed && setHoverSection('tools')}
                      onMouseLeave={() => isSidebarCollapsed && setHoverSection(null)}
                    >
                      {sections.tools.map((item) => (
                        <div key={item.href} className="relative">
                          <Link
                            href={item.href}
                            className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm rounded-md ${
                              pathname === item.href
                                ? 'bg-red-600 text-white'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                          >
                            <item.icon className={`h-5 w-5 ${!isSidebarCollapsed && 'mr-3'}`} />
                            {!isSidebarCollapsed && <span>{item.name}</span>}
                          </Link>
                          
                          {/* Tooltip for collapsed items on hover */}
                          {isSidebarCollapsed && hoverSection === 'tools' && (
                            <div className="absolute left-full top-0 ml-2 bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-50">
                              {item.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Navigation */}
                {sections.admin.length > 0 && (
                  <div>
                    <h3 className={`text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2
                      ${isSidebarCollapsed ? 'text-center' : ''}`}
                    >
                      {isSidebarCollapsed ? 'Admin' : 'Admin'}
                    </h3>
                    <div 
                      className="space-y-1"
                      onMouseEnter={() => isSidebarCollapsed && setHoverSection('admin')}
                      onMouseLeave={() => isSidebarCollapsed && setHoverSection(null)}
                    >
                      {sections.admin.map((item) => (
                        <div key={item.href} className="relative">
                          <Link
                            href={item.href}
                            className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm rounded-md ${
                              pathname === item.href
                                ? 'bg-red-600 text-white'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                          >
                            <item.icon className={`h-5 w-5 ${!isSidebarCollapsed && 'mr-3'}`} />
                            {!isSidebarCollapsed && <span>{item.name}</span>}
                          </Link>
                          
                          {/* Tooltip for collapsed items on hover */}
                          {isSidebarCollapsed && hoverSection === 'admin' && (
                            <div className="absolute left-full top-0 ml-2 bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-50">
                              {item.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Adjusted for sidebar width */}
      <main 
        className={`transition-all duration-300 ease-in-out pt-16 ${
          isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        }`}
      >
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
          <div className="px-4 py-6 lg:px-6">
            {children}
          </div>
        </div>
      </main>

      {/* Admin Password Dialog */}
      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Role</DialogTitle>
            <DialogDescription>
              Enter admin password to switch roles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Admin Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAdminDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRoleSwitch}>
                Switch Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile sidebar backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}