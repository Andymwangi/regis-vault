'use client';

import { FC } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StorageUsageProps {
  used: number;
  total: number;
  breakdown?: {
    type: string;
    size: number;
    color: string;
  }[];
}

export const StorageUsage: FC<StorageUsageProps> = ({ used, total, breakdown }) => {
  const usedPercentage = (used / total) * 100;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Storage Used</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Progress value={usedPercentage} className="h-2" />
          <div className="flex justify-between text-sm">
            <span>{used.toFixed(1)} GB used</span>
            <span>of {total} GB</span>
          </div>
          
          {breakdown && (
            <div className="mt-4 space-y-2">
              {breakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="h-3 w-3 rounded-sm mr-2" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.type}</span>
                  </div>
                  <span className="text-sm">{item.size.toFixed(1)} GB</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};