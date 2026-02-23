import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TextOverlay } from '../components/TextOverlay';
import { StepCard } from '../components/StepCard';
import { BRAND, seconds } from '../lib/constants';

export const IncidentReporting: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.gray50 }}>
      <Sequence from={0} durationInFrames={seconds(3.5)}>
        <TextOverlay title="Incident Reporting" subtitle="Report, investigate, and resolve security incidents" />
      </Sequence>

      <Sequence from={seconds(3.5)} durationInFrames={seconds(4)}>
        <StepCard step={1} title="Report an Incident" description="Guards report incidents from the mobile app with location, severity, photos, and a description of what happened." />
      </Sequence>

      <Sequence from={seconds(7.5)} durationInFrames={seconds(4)}>
        <StepCard step={2} title="Investigation Workflow" description="Admins review incidents on the dashboard. Update status through: Reported → Investigating → Resolved → Closed." />
      </Sequence>

      <Sequence from={seconds(11.5)} durationInFrames={seconds(4)}>
        <StepCard step={3} title="Analytics & Trends" description="View incident analytics — trends by type, severity, site, and time. Identify patterns to improve security." />
      </Sequence>

      <Sequence from={seconds(15.5)} durationInFrames={seconds(3)}>
        <TextOverlay title="Stay Informed" subtitle="Real-time incident alerts and comprehensive analytics" />
      </Sequence>
    </AbsoluteFill>
  );
};
