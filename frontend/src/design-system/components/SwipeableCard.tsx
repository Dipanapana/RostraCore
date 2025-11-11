'use client';

/**
 * SwipeableCard Component
 *
 * Card that reveals action buttons on left/right swipe
 * Common mobile pattern for list actions (iOS Mail, etc.)
 *
 * Features:
 * - Swipe right to reveal primary action (edit)
 * - Swipe left to reveal danger action (delete)
 * - Smooth animations with spring physics
 * - Touch-friendly 48px buttons
 * - Auto-reset after 3 seconds
 * - Haptic feedback support (when available)
 */

import React, { useRef, useState, useEffect } from 'react';

export interface SwipeAction {
  label: string;
  icon?: React.ReactNode;
  color: 'blue' | 'red' | 'green' | 'yellow';
  onClick: () => void;
}

export interface SwipeableCardProps {
  children: React.ReactNode;
  leftAction?: SwipeAction; // Swipe right reveals this (edit)
  rightAction?: SwipeAction; // Swipe left reveals this (delete)
  className?: string;
  disabled?: boolean;
}

const ACTION_COLORS = {
  blue: 'bg-blue-600 text-white',
  red: 'bg-red-600 text-white',
  green: 'bg-green-600 text-white',
  yellow: 'bg-yellow-600 text-white',
};

export function SwipeableCard({
  children,
  leftAction,
  rightAction,
  className = '',
  disabled = false,
}: SwipeableCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [revealed, setRevealed] = useState<'left' | 'right' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const autoResetTimer = useRef<NodeJS.Timeout | null>(null);

  const SWIPE_THRESHOLD = 80; // Minimum swipe distance to reveal action
  const ACTION_WIDTH = 80; // Width of action button

  // Auto-reset after 3 seconds
  useEffect(() => {
    if (revealed) {
      autoResetTimer.current = setTimeout(() => {
        setOffsetX(0);
        setRevealed(null);
      }, 3000);
    }
    return () => {
      if (autoResetTimer.current) {
        clearTimeout(autoResetTimer.current);
      }
    };
  }, [revealed]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || disabled) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;

    // Only allow swipe if action exists
    if (diff > 0 && !leftAction) return;
    if (diff < 0 && !rightAction) return;

    setOffsetX(diff);
  };

  const handleTouchEnd = () => {
    if (!isSwiping || disabled) return;
    setIsSwiping(false);

    // Determine if swipe threshold reached
    if (Math.abs(offsetX) >= SWIPE_THRESHOLD) {
      // Snap to revealed position
      if (offsetX > 0 && leftAction) {
        setOffsetX(ACTION_WIDTH);
        setRevealed('left');
        triggerHaptic();
      } else if (offsetX < 0 && rightAction) {
        setOffsetX(-ACTION_WIDTH);
        setRevealed('right');
        triggerHaptic();
      } else {
        setOffsetX(0);
        setRevealed(null);
      }
    } else {
      // Snap back
      setOffsetX(0);
      setRevealed(null);
    }
  };

  const triggerHaptic = () => {
    // Haptic feedback (iOS/Android)
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    setOffsetX(0);
    setRevealed(null);
    triggerHaptic();
  };

  return (
    <div className={`relative overflow-hidden ${className}`} ref={cardRef}>
      {/* Left Action (Edit - revealed on swipe right) */}
      {leftAction && (
        <button
          onClick={() => handleActionClick(leftAction)}
          className={`absolute left-0 top-0 bottom-0 w-20 flex flex-col items-center justify-center min-h-[48px] ${
            ACTION_COLORS[leftAction.color]
          } font-medium text-sm transition-opacity ${
            revealed === 'left' ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label={leftAction.label}
        >
          {leftAction.icon && <span className="text-2xl mb-1">{leftAction.icon}</span>}
          <span>{leftAction.label}</span>
        </button>
      )}

      {/* Right Action (Delete - revealed on swipe left) */}
      {rightAction && (
        <button
          onClick={() => handleActionClick(rightAction)}
          className={`absolute right-0 top-0 bottom-0 w-20 flex flex-col items-center justify-center min-h-[48px] ${
            ACTION_COLORS[rightAction.color]
          } font-medium text-sm transition-opacity ${
            revealed === 'right' ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label={rightAction.label}
        >
          {rightAction.icon && <span className="text-2xl mb-1">{rightAction.icon}</span>}
          <span>{rightAction.label}</span>
        </button>
      )}

      {/* Card Content */}
      <div
        className="relative bg-white"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
