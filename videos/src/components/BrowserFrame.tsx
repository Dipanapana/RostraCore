import React from 'react';
import { BRAND, VIDEO_WIDTH, VIDEO_HEIGHT } from '../lib/constants';

interface BrowserFrameProps {
  url: string;
  children: React.ReactNode;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({ url, children }) => {
  const chromeHeight = 48;

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        backgroundColor: BRAND.gray100,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          height: chromeHeight,
          backgroundColor: BRAND.white,
          borderBottom: `1px solid ${BRAND.gray200}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FF5F56' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#27C93F' }} />
        </div>

        {/* Address bar */}
        <div
          style={{
            flex: 1,
            height: 30,
            backgroundColor: BRAND.gray50,
            borderRadius: 8,
            border: `1px solid ${BRAND.gray200}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            fontSize: 13,
            color: BRAND.gray500,
          }}
        >
          <span style={{ color: BRAND.green, marginRight: 4 }}>🔒</span>
          <span style={{ color: BRAND.gray400 }}>app.rostracore.com</span>
          <span style={{ color: BRAND.gray700 }}>{url}</span>
        </div>
      </div>

      {/* Page content area */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: BRAND.gray50,
        }}
      >
        {children}
      </div>
    </div>
  );
};
