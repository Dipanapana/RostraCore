import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { BRAND, FONT_FAMILY } from '../lib/constants';

interface AnnotationProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  delay?: number;
}

export const Annotation: React.FC<AnnotationProps> = ({
  x,
  y,
  width,
  height,
  label,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  if (progress <= 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: x - 4,
        top: y - 4,
        width: width + 8,
        height: height + 8,
        borderRadius: 8,
        border: `3px solid ${BRAND.blue}`,
        boxShadow: `0 0 0 4px rgba(37, 99, 235, 0.15)`,
        transform: `scale(${interpolate(progress, [0, 1], [0.8, 1])})`,
        opacity: progress,
        pointerEvents: 'none',
      }}
    >
      {label && (
        <div
          style={{
            position: 'absolute',
            top: -36,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: BRAND.blue,
            color: BRAND.white,
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: FONT_FAMILY,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {label}
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${BRAND.blue}`,
            }}
          />
        </div>
      )}
    </div>
  );
};
