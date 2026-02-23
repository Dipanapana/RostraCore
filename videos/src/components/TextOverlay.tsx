import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { BRAND, FONT_FAMILY, VIDEO_WIDTH, VIDEO_HEIGHT } from '../lib/constants';

interface TextOverlayProps {
  title: string;
  subtitle?: string;
  step?: number;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({ title, subtitle, step }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });
  const subtitleProgress = spring({ frame: frame - 8, fps, config: { damping: 20, stiffness: 80 } });
  const fadeOut = interpolate(frame, [fps * 2.5, fps * 3], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BRAND.white,
        fontFamily: FONT_FAMILY,
        opacity: fadeOut,
      }}
    >
      {/* Logo area */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          backgroundColor: BRAND.blue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
          transform: `scale(${titleProgress})`,
          color: BRAND.white,
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        RC
      </div>

      {/* Step number */}
      {step && (
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: BRAND.blue,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 16,
            opacity: subtitleProgress,
          }}
        >
          Step {step}
        </div>
      )}

      {/* Title */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: BRAND.gray900,
          textAlign: 'center',
          maxWidth: 900,
          lineHeight: 1.2,
          transform: `translateY(${interpolate(titleProgress, [0, 1], [30, 0])}px)`,
          opacity: titleProgress,
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            fontSize: 24,
            color: BRAND.gray500,
            textAlign: 'center',
            maxWidth: 700,
            marginTop: 16,
            lineHeight: 1.5,
            transform: `translateY(${interpolate(subtitleProgress, [0, 1], [20, 0])}px)`,
            opacity: Math.max(0, subtitleProgress),
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Brand bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          opacity: subtitleProgress * 0.6,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            backgroundColor: BRAND.blue,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: BRAND.white,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          RC
        </div>
        <span style={{ fontSize: 14, color: BRAND.gray400, fontWeight: 500 }}>
          RostraCore Tutorial
        </span>
      </div>
    </div>
  );
};
