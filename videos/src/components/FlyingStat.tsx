import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { BRAND, FONT_FAMILY } from '../lib/constants';

interface FlyingStatProps {
  value: string;
  label: string;
  color?: string;
  delay?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}

export const FlyingStat: React.FC<FlyingStatProps> = ({
  value,
  label,
  color,
  delay = 0,
  direction = 'up',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 60, mass: 0.8 },
  });

  const getTransform = () => {
    const distance = 80;
    switch (direction) {
      case 'left':
        return `translateX(${interpolate(progress, [0, 1], [-distance, 0])}px)`;
      case 'right':
        return `translateX(${interpolate(progress, [0, 1], [distance, 0])}px)`;
      case 'down':
        return `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`;
      case 'up':
      default:
        return `translateY(${interpolate(progress, [0, 1], [-distance, 0])}px)`;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: BRAND.white,
        borderRadius: 20,
        padding: '28px 40px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        border: `2px solid ${color || BRAND.blue}20`,
        fontFamily: FONT_FAMILY,
        transform: getTransform(),
        opacity: progress,
      }}
    >
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: color || BRAND.blue,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 16,
          color: BRAND.gray500,
          marginTop: 8,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
    </div>
  );
};
