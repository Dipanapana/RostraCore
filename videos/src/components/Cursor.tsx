import React from 'react';
import { useCurrentFrame, interpolate, useVideoConfig } from 'remotion';

interface CursorPoint {
  x: number;
  y: number;
  frame: number;
}

interface CursorProps {
  path: CursorPoint[];
  clickAt?: number[];
}

export const Cursor: React.FC<CursorProps> = ({ path, clickAt = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (path.length < 2) return null;

  const frames = path.map((p) => p.frame);
  const xs = path.map((p) => p.x);
  const ys = path.map((p) => p.y);

  const x = interpolate(frame, frames, xs, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, frames, ys, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Click animation — pulse effect
  const isClicking = clickAt.some(
    (clickFrame) => frame >= clickFrame && frame < clickFrame + 8
  );
  const scale = isClicking ? 0.85 : 1;

  if (frame < frames[0]) return null;

  return (
    <>
      {/* Click ripple */}
      {clickAt.map((clickFrame) => {
        if (frame < clickFrame || frame > clickFrame + 15) return null;
        const rippleProgress = (frame - clickFrame) / 15;
        const clickX = interpolate(clickFrame, frames, xs, {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const clickY = interpolate(clickFrame, frames, ys, {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={clickFrame}
            style={{
              position: 'absolute',
              left: clickX - 20,
              top: clickY - 20,
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '2px solid rgba(37, 99, 235, 0.6)',
              transform: `scale(${1 + rippleProgress * 1.5})`,
              opacity: 1 - rippleProgress,
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* Cursor SVG */}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `scale(${scale})`,
          transition: 'transform 0.05s',
          pointerEvents: 'none',
          zIndex: 100,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.87c.45 0 .67-.54.35-.85L5.85 2.35a.5.5 0 00-.85.35l.5.51z"
            fill="#111827"
            stroke="white"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </>
  );
};
