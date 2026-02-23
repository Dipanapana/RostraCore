import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { BRAND, FONT_FAMILY, VIDEO_WIDTH, VIDEO_HEIGHT } from '../lib/constants';

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  delay?: number;
}

export const StepCard: React.FC<StepCardProps> = ({ step, title, description, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 80 } });
  const fadeOut = interpolate(frame - delay, [fps * 3.5, fps * 4], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BRAND.gray50,
        fontFamily: FONT_FAMILY,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          transform: `translateY(${interpolate(progress, [0, 1], [40, 0])}px)`,
          opacity: progress,
        }}
      >
        {/* Step badge */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: BRAND.blue,
            color: BRAND.white,
            fontSize: 24,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          {step}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: BRAND.gray900,
            maxWidth: 800,
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 22,
            color: BRAND.gray500,
            maxWidth: 600,
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
};
