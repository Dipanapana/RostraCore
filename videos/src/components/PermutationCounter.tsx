import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { BRAND, FONT_FAMILY } from '../lib/constants';

interface PermutationCounterProps {
  from?: number;
  to: number;
  label?: string;
  delay?: number;
  color?: string;
  fontSize?: number;
}

export const PermutationCounter: React.FC<PermutationCounterProps> = ({
  from = 0,
  to,
  label,
  delay = 0,
  color,
  fontSize = 72,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const duration = fps * 2.5; // 2.5 seconds to count up
  const adjustedFrame = Math.max(0, frame - delay);
  const progress = interpolate(adjustedFrame, [0, duration], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const currentValue = Math.round(from + (to - from) * progress);

  const opacity = interpolate(adjustedFrame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: FONT_FAMILY,
        opacity,
      }}
    >
      <div
        style={{
          fontSize,
          fontWeight: 800,
          color: color || BRAND.blue,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: -2,
        }}
      >
        {currentValue.toLocaleString('en-ZA')}
      </div>
      {label && (
        <div
          style={{
            fontSize: 20,
            color: BRAND.gray500,
            marginTop: 8,
            fontWeight: 500,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
