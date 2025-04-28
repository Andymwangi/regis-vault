"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Home,
  FileText,
  Share2,
  Clock,
  Users,
  Building2,
  Settings,
  Trash2,
  FolderCog,
  BarChart3,
  Scan,
  Tags,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navigation: NavItem[] = [
  // User pages
  { name: 'My Files', href: '/dashboard/files', icon: FileText },
  { name: 'Shared with Me', href: '/dashboard/shared', icon: Share2 },
  { name: 'Recent', href: '/dashboard/recent', icon: Clock },
  { name: 'Teams', href: '/dashboard/teams', icon: Users },
  { name: 'Trash', href: '/dashboard/trash', icon: Trash2 },
  
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
    name: 'File Manager', 
    href: '/dashboard/admin/files', 
    icon: FolderCog,
    roles: ['admin'] 
  },
  { 
    name: 'Trash', 
    href: '/dashboard/admin/trash', 
    icon: Trash2,
    roles: ['admin'] 
  },
  { 
    name: 'Analytics', 
    href: '/dashboard/admin/analytics', 
    icon: BarChart3,
    roles: ['admin'] 
  },
  { 
    name: 'Settings', 
    href: '/dashboard/admin/settings', 
    icon: Settings,
    roles: ['admin'] 
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const userRole = user?.role || 'user';
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const filteredNavigation = navigation.filter(
    item => !item.roles || item.roles.includes(userRole)
  );

  const sections = {
    main: filteredNavigation.filter(item => !item.href.includes('/tools') && !item.href.includes('/admin')),
    tools: filteredNavigation.filter(item => item.href.includes('/tools')),
    admin: filteredNavigation.filter(item => item.href.includes('/admin')),
  };

  return (
    <div className="w-80 border-r bg-white">
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-1 p-4">
          <nav className="space-y-8">
            <div>
              <div className="px-3 py-2">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Files
                </h2>
                <div className="space-y-2">
                  {sections.main.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium transition-colors',
                        pathname === item.href
                          ? 'bg-red-50 text-red-600'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-red-600'
                      )}
                    >
                      <item.icon className="h-6 w-6" />
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {sections.tools.length > 0 && (
              <div>
                <div className="px-3 py-2">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Tools
                  </h2>
                  <div className="space-y-2">
                    {sections.tools.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium transition-colors',
                          pathname === item.href
                            ? 'bg-red-50 text-red-600'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-red-600'
                        )}
                      >
                        <item.icon className="h-6 w-6" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {sections.admin.length > 0 && (
              <div>
                <div className="px-3 py-2">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Admin
                  </h2>
                  <div className="space-y-2">
                    {sections.admin.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium transition-colors',
                          pathname === item.href
                            ? 'bg-red-50 text-red-600'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-red-600'
                        )}
                      >
                        <item.icon className="h-6 w-6" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
} 