import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TextOverlay } from '../components/TextOverlay';
import { StepCard } from '../components/StepCard';
import { BrowserFrame } from '../components/BrowserFrame';
import { Annotation } from '../components/Annotation';
import { Cursor } from '../components/Cursor';
import { BRAND, FONT_FAMILY, seconds } from '../lib/constants';

export const GettingStarted: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.gray50 }}>
      {/* Title card */}
      <Sequence from={0} durationInFrames={seconds(3.5)}>
        <TextOverlay
          title="Getting Started with RostraCore"
          subtitle="Set up your security workforce management in minutes"
        />
      </Sequence>

      {/* Step 1: Registration */}
      <Sequence from={seconds(3.5)} durationInFrames={seconds(5)}>
        <BrowserFrame url="/register">
          <div style={{ padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONT_FAMILY }}>
            <div style={{ width: 480, backgroundColor: BRAND.white, borderRadius: 16, border: `1px solid ${BRAND.gray200}`, padding: 40 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: BRAND.gray900, marginBottom: 8 }}>Create Your Account</div>
              <div style={{ fontSize: 14, color: BRAND.gray500, marginBottom: 32 }}>Start your 14-day free trial</div>

              {/* Form fields */}
              {['Company Name', 'Full Name', 'Email Address', 'Username', 'Password'].map((label, i) => (
                <div key={label} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: BRAND.gray700, marginBottom: 4 }}>{label}</div>
                  <div style={{ height: 40, borderRadius: 8, border: `1px solid ${BRAND.gray200}`, backgroundColor: BRAND.gray50 }} />
                </div>
              ))}

              <div style={{ height: 44, borderRadius: 8, backgroundColor: BRAND.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BRAND.white, fontWeight: 600, fontSize: 15, marginTop: 24 }}>
                Create Account
              </div>
            </div>
          </div>
          <Annotation x={690} y={120} width={480} height={580} label="Fill in your company details" delay={seconds(1)} />
          <Cursor path={[
            { x: 960, y: 300, frame: 0 },
            { x: 930, y: 260, frame: seconds(1.5) },
            { x: 930, y: 620, frame: seconds(3) },
          ]} clickAt={[seconds(3)]} />
        </BrowserFrame>
      </Sequence>

      {/* Step 2: Dashboard Overview */}
      <Sequence from={seconds(8.5)} durationInFrames={seconds(5)}>
        <BrowserFrame url="/dashboard">
          <div style={{ display: 'flex', fontFamily: FONT_FAMILY }}>
            {/* Sidebar mock */}
            <div style={{ width: 260, backgroundColor: BRAND.white, borderRight: `1px solid ${BRAND.gray200}`, padding: '20px 12px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: BRAND.blue, padding: '8px 12px', marginBottom: 16 }}>RostraCore</div>
              {['Dashboard', 'Employees', 'Roster', 'Clients', 'Payroll', 'Reports', 'Settings'].map((item, i) => (
                <div key={item} style={{
                  padding: '10px 12px', borderRadius: 8, fontSize: 14, fontWeight: 500, marginBottom: 4,
                  backgroundColor: i === 0 ? BRAND.blueLight : 'transparent',
                  color: i === 0 ? BRAND.blue : BRAND.gray700,
                }}>
                  {item}
                </div>
              ))}
            </div>

            {/* Main content */}
            <div style={{ flex: 1, padding: 32 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: BRAND.gray900, marginBottom: 24 }}>Dashboard</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {[
                  { label: 'Active Guards', value: '47', color: BRAND.blue },
                  { label: 'Sites', value: '12', color: BRAND.green },
                  { label: 'Shifts Today', value: '24', color: BRAND.amber },
                  { label: 'Incidents', value: '2', color: BRAND.red },
                ].map((metric) => (
                  <div key={metric.label} style={{
                    backgroundColor: BRAND.white, borderRadius: 12, border: `1px solid ${BRAND.gray200}`, padding: 20,
                  }}>
                    <div style={{ fontSize: 13, color: BRAND.gray500, marginBottom: 4 }}>{metric.label}</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: metric.color }}>{metric.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Annotation x={0} y={0} width={260} height={400} label="Navigate using the sidebar" delay={seconds(1)} />
          <Annotation x={292} y={60} width={1580} height={160} label="Key metrics at a glance" delay={seconds(2.5)} />
        </BrowserFrame>
      </Sequence>

      {/* Step 3: Explore features */}
      <Sequence from={seconds(13.5)} durationInFrames={seconds(4.5)}>
        <StepCard
          step={3}
          title="Explore Your Modules"
          description="Navigate through Workforce, Operations, Finance, and Compliance modules to manage your security operation."
        />
      </Sequence>

      {/* Outro */}
      <Sequence from={seconds(18)} durationInFrames={seconds(3)}>
        <TextOverlay
          title="You're All Set!"
          subtitle="Visit the Help Center for detailed guides on each feature"
        />
      </Sequence>
    </AbsoluteFill>
  );
};
