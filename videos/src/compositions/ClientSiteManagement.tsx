import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TextOverlay } from '../components/TextOverlay';
import { StepCard } from '../components/StepCard';
import { BrowserFrame } from '../components/BrowserFrame';
import { Annotation } from '../components/Annotation';
import { BRAND, FONT_FAMILY, seconds } from '../lib/constants';

export const ClientSiteManagement: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.gray50 }}>
      <Sequence from={0} durationInFrames={seconds(3.5)}>
        <TextOverlay title="Client & Site Management" subtitle="Manage your clients, sites, and staffing requirements" />
      </Sequence>

      <Sequence from={seconds(3.5)} durationInFrames={seconds(5)}>
        <BrowserFrame url="/clients">
          <div style={{ padding: 32, fontFamily: FONT_FAMILY }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: BRAND.gray900, marginBottom: 24 }}>Clients</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { name: 'Sandton City', sites: 3, guards: 18, value: 'R 245,000/mo' },
                { name: 'Rosebank Properties', sites: 5, guards: 24, value: 'R 312,000/mo' },
                { name: 'Menlyn Industrial', sites: 2, guards: 8, value: 'R 98,000/mo' },
              ].map((client) => (
                <div key={client.name} style={{ backgroundColor: BRAND.white, borderRadius: 12, border: `1px solid ${BRAND.gray200}`, padding: 24 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: BRAND.gray900, marginBottom: 12 }}>{client.name}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: BRAND.gray600 }}>
                      <span>Sites</span><span style={{ fontWeight: 600, color: BRAND.gray900 }}>{client.sites}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: BRAND.gray600 }}>
                      <span>Guards</span><span style={{ fontWeight: 600, color: BRAND.gray900 }}>{client.guards}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: BRAND.gray600 }}>
                      <span>Value</span><span style={{ fontWeight: 600, color: BRAND.green }}>{client.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Annotation x={32} y={80} width={600} height={300} label="Track client contracts and revenue" delay={seconds(1.5)} />
        </BrowserFrame>
      </Sequence>

      <Sequence from={seconds(8.5)} durationInFrames={seconds(4)}>
        <StepCard step={2} title="Configure Site Staffing" description="Set staffing requirements per site: guard count, PSIRA grades, shift patterns, and geofence boundaries." />
      </Sequence>

      <Sequence from={seconds(12.5)} durationInFrames={seconds(3)}>
        <TextOverlay title="Complete Visibility" subtitle="Monitor site profitability, SLA compliance, and contract values" />
      </Sequence>
    </AbsoluteFill>
  );
};
