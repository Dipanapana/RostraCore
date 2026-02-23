import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TextOverlay } from '../components/TextOverlay';
import { StepCard } from '../components/StepCard';
import { BRAND, seconds } from '../lib/constants';

export const AttendanceCheckin: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.gray50 }}>
      <Sequence from={0} durationInFrames={seconds(3.5)}>
        <TextOverlay title="Attendance & Check-In" subtitle="GPS-verified check-in from the mobile app" />
      </Sequence>

      <Sequence from={seconds(3.5)} durationInFrames={seconds(4)}>
        <StepCard step={1} title="Guard Opens Mobile App" description="The guard opens the RostraCore mobile app and taps 'Check In' to start their shift." />
      </Sequence>

      <Sequence from={seconds(7.5)} durationInFrames={seconds(4)}>
        <StepCard step={2} title="GPS & Photo Verification" description="The app captures GPS location and a selfie photo to verify the guard is on-site at the correct location." />
      </Sequence>

      <Sequence from={seconds(11.5)} durationInFrames={seconds(4)}>
        <StepCard step={3} title="Real-Time Dashboard" description="Admins see check-ins in real-time on the Attendance dashboard with GPS coordinates and timestamps." />
      </Sequence>

      <Sequence from={seconds(15.5)} durationInFrames={seconds(3)}>
        <TextOverlay title="Always Know Who's On Site" subtitle="GPS tracking and photo verification for complete accountability" />
      </Sequence>
    </AbsoluteFill>
  );
};
