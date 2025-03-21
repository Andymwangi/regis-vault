'use client';

interface StorageBreakdown {
  type: string;
  size: number;
  color: string;
}

interface StorageStatsProps {
  stats: {
    total: number;
    used: number;
    breakdown: StorageBreakdown[];
  };
}

export function StorageStats({ stats }: StorageStatsProps) {
  const usedPercentage = (stats.used / stats.total) * 100;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Storage Statistics</h2>
      
      <div className="space-y-6">
        {/* Overall Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{stats.used.toFixed(1)} GB used of {stats.total} GB</span>
            <span>{usedPercentage.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${usedPercentage}%` }}
            />
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-4">
          <h3 className="font-medium">Storage Breakdown</h3>
          <div className="space-y-2">
            {stats.breakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span>{item.type}</span>
                </div>
                <span className="text-gray-600">{item.size} GB</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 