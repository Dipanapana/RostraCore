import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { BRAND, FONT_FAMILY, VIDEO_WIDTH, VIDEO_HEIGHT } from '../lib/constants';

interface SlideTitleProps {
  title: string;
  subtitle?: string;
  accent?: string;
  dark?: boolean;
}

export const SlideTitle: React.FC<SlideTitleProps> = ({ title, subtitle, accent, dark }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });
  const subtitleProgress = spring({ frame: frame - 6, fps, config: { damping: 20, stiffness: 80 } });
  const accentProgress = spring({ frame: frame - 12, fps, config: { damping: 20, stiffness: 80 } });

  const bg = dark ? BRAND.gray900 : BRAND.white;
  const textColor = dark ? BRAND.white : BRAND.gray900;
  const subColor = dark ? BRAND.gray400 : BRAND.gray500;

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          backgroundColor: BRAND.blue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 40,
          transform: `scale(${titleProgress})`,
          color: BRAND.white,
          fontSize: 30,
          fontWeight: 700,
        }}
      >
        RC
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: textColor,
          textAlign: 'center',
          maxWidth: 1200,
          lineHeight: 1.15,
          transform: `translateY(${interpolate(titleProgress, [0, 1], [40, 0])}px)`,
          opacity: titleProgress,
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            fontSize: 28,
            color: subColor,
            textAlign: 'center',
            maxWidth: 800,
            marginTop: 20,
            lineHeight: 1.5,
            transform: `translateY(${interpolate(subtitleProgress, [0, 1], [20, 0])}px)`,
            opacity: Math.max(0, subtitleProgress),
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Accent line */}
      {accent && (
        <div
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: BRAND.blue,
            marginTop: 24,
            letterSpacing: 1,
            textTransform: 'uppercase',
            opacity: Math.max(0, accentProgress),
          }}
        >
          {accent}
        </div>
      )}

      {/* Bottom bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          background: `linear-gradient(90deg, ${BRAND.blue}, #818CF8)`,
          transform: `scaleX(${titleProgress})`,
          transformOrigin: 'left',
        }}
      />
    </div>
  );
};
