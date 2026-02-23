import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TextOverlay } from '../components/TextOverlay';
import { StepCard } from '../components/StepCard';
import { BrowserFrame } from '../components/BrowserFrame';
import { Annotation } from '../components/Annotation';
import { BRAND, FONT_FAMILY, seconds } from '../lib/constants';

export const ShiftScheduling: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.gray50 }}>
      <Sequence from={0} durationInFrames={seconds(3.5)}>
        <TextOverlay title="Shift Scheduling & Roster" subtitle="Auto-generate compliant rosters for your security team" />
      </Sequence>

      <Sequence from={seconds(3.5)} durationInFrames={seconds(5)}>
        <BrowserFrame url="/roster/generate">
          <div style={{ padding: 32, fontFamily: FONT_FAMILY }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: BRAND.gray900, marginBottom: 24 }}>Generate Roster</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ backgroundColor: BRAND.white, borderRadius: 12, border: `1px solid ${BRAND.gray200}`, padding: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: BRAND.gray900, marginBottom: 16 }}>Constraints</div>
                {[
                  { label: 'BCEA Compliance', desc: 'Max 45 hours/week, 10 hours/day' },
                  { label: 'PSIRA Grade Match', desc: 'Guards match site grade requirements' },
                  { label: 'Skill Matching', desc: 'Armed sites get armed guards' },
                  { label: 'Rest Periods', desc: 'Minimum 12 hours between shifts' },
                ].map((c) => (
                  <div key={c.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#065F46', flexShrink: 0, marginTop: 2 }}>✓</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.gray900 }}>{c.label}</div>
                      <div style={{ fontSize: 12, color: BRAND.gray500 }}>{c.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ backgroundColor: BRAND.white, borderRadius: 12, border: `1px solid ${BRAND.gray200}`, padding: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: BRAND.gray900, marginBottom: 16 }}>Period</div>
                {['Start Date', 'End Date'].map((f) => (
                  <div key={f} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: BRAND.gray700, marginBottom: 4 }}>{f}</div>
                    <div style={{ height: 40, borderRadius: 8, border: `1px solid ${BRAND.gray200}`, backgroundColor: BRAND.gray50 }} />
                  </div>
                ))}
                <div style={{ height: 44, borderRadius: 8, backgroundColor: BRAND.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BRAND.white, fontWeight: 600, fontSize: 15, marginTop: 24 }}>
                  Generate Roster
                </div>
              </div>
            </div>
          </div>
          <Annotation x={32} y={90} width={620} height={350} label="Automatic compliance checks" delay={seconds(1.5)} />
        </BrowserFrame>
      </Sequence>

      <Sequence from={seconds(8.5)} durationInFrames={seconds(4)}>
        <StepCard step={2} title="Review & Confirm" description="Review the generated roster, resolve any conflicts, then confirm to publish shifts to your guards." />
      </Sequence>

      <Sequence from={seconds(12.5)} durationInFrames={seconds(3)}>
        <TextOverlay title="Roster Published!" subtitle="Guards receive their schedules via the mobile app" />
      </Sequence>
    </AbsoluteFill>
  );
};
