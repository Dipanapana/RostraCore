import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TextOverlay } from '../components/TextOverlay';
import { StepCard } from '../components/StepCard';
import { BrowserFrame } from '../components/BrowserFrame';
import { Annotation } from '../components/Annotation';
import { BRAND, FONT_FAMILY, seconds } from '../lib/constants';

export const PayrollProcessing: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.gray50 }}>
      {/* Title */}
      <Sequence from={0} durationInFrames={seconds(3.5)}>
        <TextOverlay title="Payroll Processing" subtitle="Generate compliant payroll with SA tax calculations" />
      </Sequence>

      {/* Step 1: Payroll overview */}
      <Sequence from={seconds(3.5)} durationInFrames={seconds(5)}>
        <BrowserFrame url="/payroll">
          <div style={{ padding: 32, fontFamily: FONT_FAMILY }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: BRAND.gray900, marginBottom: 24 }}>Payroll</div>

            {/* Period card */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Current Period', value: 'Feb 2026', color: BRAND.blue },
                { label: 'Total Gross', value: 'R 847,200', color: BRAND.gray900 },
                { label: 'Total Deductions', value: 'R 198,450', color: BRAND.red },
                { label: 'Net Payable', value: 'R 648,750', color: BRAND.green },
              ].map((m) => (
                <div key={m.label} style={{ backgroundColor: BRAND.white, borderRadius: 12, border: `1px solid ${BRAND.gray200}`, padding: 20 }}>
                  <div style={{ fontSize: 13, color: BRAND.gray500, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Deductions breakdown */}
            <div style={{ backgroundColor: BRAND.white, borderRadius: 12, border: `1px solid ${BRAND.gray200}`, padding: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: BRAND.gray900, marginBottom: 16 }}>SA Statutory Deductions</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontSize: 14 }}>
                {[
                  { label: 'PAYE (Income Tax)', value: 'R 142,800' },
                  { label: 'UIF (1%)', value: 'R 8,472' },
                  { label: 'PSIRA Levy', value: 'R 3,290' },
                  { label: 'Bargaining Council', value: 'R 2,115' },
                  { label: 'Provident Fund', value: 'R 38,124' },
                  { label: 'Medical Aid', value: 'R 3,649' },
                ].map((d) => (
                  <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BRAND.gray100}` }}>
                    <span style={{ color: BRAND.gray700 }}>{d.label}</span>
                    <span style={{ fontWeight: 600, color: BRAND.gray900 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ padding: '12px 24px', borderRadius: 8, backgroundColor: BRAND.blue, color: BRAND.white, fontWeight: 600, fontSize: 14 }}>
                Generate Payroll
              </div>
              <div style={{ padding: '12px 24px', borderRadius: 8, border: `1px solid ${BRAND.gray200}`, color: BRAND.gray700, fontWeight: 600, fontSize: 14 }}>
                Export to Excel
              </div>
            </div>
          </div>
          <Annotation x={32} y={200} width={1856} height={180} label="Automatic SA statutory deduction calculations" delay={seconds(2)} />
        </BrowserFrame>
      </Sequence>

      {/* Step 2: Generate */}
      <Sequence from={seconds(8.5)} durationInFrames={seconds(4)}>
        <StepCard
          step={2}
          title="Generate & Export"
          description="Click Generate to calculate payroll for all employees. Export payslips as PDF or send via email."
        />
      </Sequence>

      {/* Outro */}
      <Sequence from={seconds(12.5)} durationInFrames={seconds(3)}>
        <TextOverlay title="Payroll Complete" subtitle="PAYE, UIF, PSIRA levies — all calculated automatically" />
      </Sequence>
    </AbsoluteFill>
  );
};
