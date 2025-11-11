/**
 * Pull to Refresh Component
 *
 * Native mobile pull-to-refresh pattern for lists and dashboards
 * Works on touch devices only
 *
 * Features:
 * - Pull distance indicator
 * - Spinner animation during refresh
 * - Success feedback
 * - Smooth transitions
 * - Touch-optimized (desktop mouse drag disabled)
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  pullThreshold?: number; // Distance in px to trigger refresh (default 80)
  maxPullDistance?: number; // Max pull distance (default 120)
}

export function PullToRefresh({
  onRefresh,
  children,
  className = '',
  pullThreshold = 80,
  maxPullDistance = 120,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect if user can pull (at top of scroll)
  const canPull = () => {
    const container = containerRef.current;
    if (!container) return false;

    // Check if scrolled to top
    return container.scrollTop === 0;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canPull() || refreshing) return;

    setStartY(e.touches[0].clientY);
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || refreshing) return;

    const touchY = e.touches[0].clientY;
    const distance = touchY - startY;

    // Only allow pulling down
    if (distance > 0 && canPull()) {
      // Apply resistance (diminishing returns)
      const resistedDistance = Math.min(
        distance * 0.5, // 50% resistance
        maxPullDistance
      );

      setPullDistance(resistedDistance);

      // Prevent default scroll behavior when pulling
      if (resistedDistance > 10) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;

    setIsPulling(false);

    // Trigger refresh if pulled beyond threshold
    if (pullDistance >= pullThreshold) {
      setRefreshing(true);

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        // Delay reset for smooth animation
        setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      // Reset pull distance if threshold not met
      setPullDistance(0);
    }
  };

  // Calculate pull progress percentage
  const pullProgress = Math.min((pullDistance / pullThreshold) * 100, 100);

  // Calculate indicator opacity
  const indicatorOpacity = Math.min(pullDistance / pullThreshold, 1);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        transform: refreshing
          ? `translateY(${pullThreshold}px)`
          : `translateY(${pullDistance}px)`,
      }}
    >
      {/* Pull Indicator */}
      <div
        className="
          absolute
          top-0
          left-0
          right-0
          flex
          flex-col
          items-center
          justify-center
          transition-opacity
          duration-200
        "
        style={{
          height: `${pullDistance}px`,
          opacity: indicatorOpacity,
        }}
      >
        {refreshing ? (
          // Refreshing Spinner
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-8 h-8 text-blue-600 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm text-gray-600 font-medium">
              Refreshing...
            </span>
          </div>
        ) : (
          // Pull Down Icon
          <div className="flex flex-col items-center gap-2">
            <svg
              className={`
                w-6 h-6 text-gray-600
                transition-transform
                duration-200
                ${pullProgress >= 100 ? 'rotate-180' : 'rotate-0'}
              `}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>

            {/* Progress Ring */}
            <svg className="w-12 h-12" viewBox="0 0 50 50">
              <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="4"
              />
              <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - pullProgress / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 25 25)"
                style={{ transition: 'stroke-dashoffset 0.1s' }}
              />
            </svg>

            <span className="text-sm text-gray-600 font-medium">
              {pullProgress >= 100
                ? 'Release to refresh'
                : 'Pull down to refresh'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}

export default PullToRefresh;
