import React from 'react';
import { Composition } from 'remotion';
import { GettingStarted } from './compositions/GettingStarted';
import { EmployeeManagement } from './compositions/EmployeeManagement';
import { ShiftScheduling } from './compositions/ShiftScheduling';
import { AttendanceCheckin } from './compositions/AttendanceCheckin';
import { PayrollProcessing } from './compositions/PayrollProcessing';
import { ClientSiteManagement } from './compositions/ClientSiteManagement';
import { IncidentReporting } from './compositions/IncidentReporting';
import { VIDEO_WIDTH, VIDEO_HEIGHT, FPS, seconds } from './lib/constants';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GettingStarted"
        component={GettingStarted}
        durationInFrames={seconds(21)}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
      <Composition
        id="EmployeeManagement"
        component={EmployeeManagement}
        durationInFrames={seconds(17.5)}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
      <Composition
        id="ShiftScheduling"
        component={ShiftScheduling}
        durationInFrames={seconds(15.5)}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
      <Composition
        id="AttendanceCheckin"
        component={AttendanceCheckin}
        durationInFrames={seconds(18.5)}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
      <Composition
        id="PayrollProcessing"
        component={PayrollProcessing}
        durationInFrames={seconds(15.5)}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
      <Composition
        id="ClientSiteManagement"
        component={ClientSiteManagement}
        durationInFrames={seconds(15.5)}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
      <Composition
        id="IncidentReporting"
        component={IncidentReporting}
        durationInFrames={seconds(18.5)}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
    </>
  );
};
