'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/common/layout/DashboardLayout';
import { UserProfile } from '@/components/dashboard/profile/UserProfile';
import { StorageStats } from '@/components/dashboard/profile/StorageStats';
import { useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [storageStats, setStorageStats] = useState({
    total: 20, // GB
    used: 7.5,  // GB
    breakdown: [
      { type: 'Documents', size: 5, color: 'bg-red-400' },
      { type: 'Images', size: 1.5, color: 'bg-green-400' },
      { type: 'Other', size: 1, color: 'bg-yellow-400' }
    ]
  });

  useEffect(() => {
    // Fetch storage statistics
    const fetchStorageStats = async () => {
      try {
        const response = await fetch('/api/users/storage-stats');
        if (response.ok) {
          const data = await response.json();
          setStorageStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch storage stats:', error);
      }
    };

    fetchStorageStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-8 space-y-8">
        <UserProfile />
        <StorageStats stats={storageStats} />
      </div>
    </DashboardLayout>
  );
} 