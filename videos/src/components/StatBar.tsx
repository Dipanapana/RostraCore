import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { BRAND, FONT_FAMILY } from '../lib/constants';

interface StatBarItem {
  label: string;
  value: number;
  prefix?: string;
}

interface StatBarProps {
  items: StatBarItem[];
  maxValue?: number;
  delay?: number;
}

export const StatBar: React.FC<StatBarProps> = ({ items, maxValue, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const max = maxValue || Math.max(...items.map((i) => i.value));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        width: '100%',
        fontFamily: FONT_FAMILY,
      }}
    >
      {items.map((item, i) => {
        const itemDelay = delay + i * 4;
        const progress = spring({
          frame: frame - itemDelay,
          fps,
          config: { damping: 20, stiffness: 60 },
        });
        const barWidth = interpolate(progress, [0, 1], [0, (item.value / max) * 100]);
        const countUp = Math.round(interpolate(progress, [0, 1], [0, item.value]));

        return (
          <div key={item.label} style={{ opacity: progress }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              <span style={{ color: BRAND.gray700 }}>{item.label}</span>
              <span style={{ color: BRAND.blue }}>
                {item.prefix || 'R'}
                {countUp.toLocaleString('en-ZA')}
              </span>
            </div>
            <div
              style={{
                height: 28,
                backgroundColor: BRAND.gray100,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${barWidth}%`,
                  background: `linear-gradient(90deg, ${BRAND.blue}, #818CF8)`,
                  borderRadius: 14,
                  transition: 'width 0.1s',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
