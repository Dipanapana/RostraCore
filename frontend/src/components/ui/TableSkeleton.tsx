"use client";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export default function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Search bar skeleton */}
      <div className="animate-pulse">
        <div className="h-10 w-72 bg-gray-200 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="animate-pulse flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="px-6 py-4 flex gap-4 border-b border-gray-100 last:border-0"
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div key={colIdx} className="animate-pulse flex-1">
                <div
                  className="h-4 bg-gray-200 rounded"
                  style={{ width: `${55 + ((rowIdx + colIdx) % 4) * 12}%` }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
