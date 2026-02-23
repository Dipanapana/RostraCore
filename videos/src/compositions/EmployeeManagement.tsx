import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TextOverlay } from '../components/TextOverlay';
import { StepCard } from '../components/StepCard';
import { BrowserFrame } from '../components/BrowserFrame';
import { Annotation } from '../components/Annotation';
import { Cursor } from '../components/Cursor';
import { BRAND, FONT_FAMILY, seconds } from '../lib/constants';

export const EmployeeManagement: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.gray50 }}>
      {/* Title */}
      <Sequence from={0} durationInFrames={seconds(3.5)}>
        <TextOverlay title="Employee Management" subtitle="Add and manage your security officers" />
      </Sequence>

      {/* Step 1: Employee list */}
      <Sequence from={seconds(3.5)} durationInFrames={seconds(5)}>
        <BrowserFrame url="/employees">
          <div style={{ padding: 32, fontFamily: FONT_FAMILY }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: BRAND.gray900 }}>Employees</div>
              <div style={{ padding: '10px 20px', borderRadius: 8, backgroundColor: BRAND.blue, color: BRAND.white, fontWeight: 600, fontSize: 14 }}>
                + Add Employee
              </div>
            </div>

            {/* Table */}
            <div style={{ backgroundColor: BRAND.white, borderRadius: 12, border: `1px solid ${BRAND.gray200}`, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', backgroundColor: BRAND.gray50, padding: '12px 20px', fontSize: 12, fontWeight: 600, color: BRAND.gray500, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
                <div>Name</div><div>PSIRA Grade</div><div>Role</div><div>Status</div><div>Site</div>
              </div>
              {[
                { name: 'Thabo Nkosi', grade: 'C', role: 'Armed', status: 'Active', site: 'Sandton Mall' },
                { name: 'Nomsa Dlamini', grade: 'D', role: 'Unarmed', status: 'Active', site: 'Rosebank Office' },
                { name: 'Welcome Ngcobo', grade: 'B', role: 'Supervisor', status: 'Active', site: 'Menlyn Park' },
                { name: 'Palesa Mokoena', grade: 'E', role: 'Unarmed', status: 'On Leave', site: 'Cresta Mall' },
              ].map((emp, i) => (
                <div key={emp.name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '14px 20px', borderTop: `1px solid ${BRAND.gray100}`, fontSize: 14, color: BRAND.gray700 }}>
                  <div style={{ fontWeight: 600, color: BRAND.gray900 }}>{emp.name}</div>
                  <div>Grade {emp.grade}</div>
                  <div>{emp.role}</div>
                  <div><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, backgroundColor: emp.status === 'Active' ? '#D1FAE5' : '#FEF3C7', color: emp.status === 'Active' ? '#065F46' : '#92400E' }}>{emp.status}</span></div>
                  <div>{emp.site}</div>
                </div>
              ))}
            </div>
          </div>
          <Annotation x={1620} y={20} width={180} height={44} label="Click to add a new employee" delay={seconds(1.5)} />
          <Cursor path={[
            { x: 960, y: 400, frame: 0 },
            { x: 1710, y: 42, frame: seconds(2) },
          ]} clickAt={[seconds(2)]} />
        </BrowserFrame>
      </Sequence>

      {/* Step 2: Form */}
      <Sequence from={seconds(8.5)} durationInFrames={seconds(6)}>
        <BrowserFrame url="/employees/new">
          <div style={{ padding: 32, fontFamily: FONT_FAMILY, display: 'flex', gap: 24 }}>
            <div style={{ flex: 1, backgroundColor: BRAND.white, borderRadius: 12, border: `1px solid ${BRAND.gray200}`, padding: 32 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.gray900, marginBottom: 24 }}>Personal Details</div>
              {['First Name', 'Last Name', 'ID Number', 'Phone', 'Email'].map((field) => (
                <div key={field} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: BRAND.gray700, marginBottom: 4 }}>{field}</div>
                  <div style={{ height: 40, borderRadius: 8, border: `1px solid ${BRAND.gray200}`, backgroundColor: BRAND.gray50 }} />
                </div>
              ))}
            </div>
            <div style={{ flex: 1, backgroundColor: BRAND.white, borderRadius: 12, border: `1px solid ${BRAND.gray200}`, padding: 32 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.gray900, marginBottom: 24 }}>PSIRA & Employment</div>
              {['PSIRA Number', 'PSIRA Grade', 'Employee Role', 'Start Date', 'Hourly Rate (ZAR)'].map((field) => (
                <div key={field} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: BRAND.gray700, marginBottom: 4 }}>{field}</div>
                  <div style={{ height: 40, borderRadius: 8, border: `1px solid ${BRAND.gray200}`, backgroundColor: BRAND.gray50 }} />
                </div>
              ))}
            </div>
          </div>
          <Annotation x={692} y={80} width={560} height={400} label="PSIRA details are required for compliance" delay={seconds(1.5)} />
        </BrowserFrame>
      </Sequence>

      {/* Outro */}
      <Sequence from={seconds(14.5)} durationInFrames={seconds(3)}>
        <TextOverlay title="Employee Added!" subtitle="Manage certifications, training, and leave from the employee profile" />
      </Sequence>
    </AbsoluteFill>
  );
};
