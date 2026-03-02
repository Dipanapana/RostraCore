import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { TextOverlay } from '../components/TextOverlay';
import { BrowserFrame } from '../components/BrowserFrame';
import { PermutationCounter } from '../components/PermutationCounter';
import { FlyingStat } from '../components/FlyingStat';
import { BRAND, FONT_FAMILY, VIDEO_WIDTH, VIDEO_HEIGHT, seconds } from '../lib/constants';

/* ─── helper: fade-in text ─── */
const FadeText: React.FC<{
  children: string;
  size?: number;
  color?: string;
  weight?: number;
  delay?: number;
  maxWidth?: number;
}> = ({ children, size = 28, color, weight = 600, delay = 0, maxWidth }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 80 } });
  return (
    <div
      style={{
        fontSize: size,
        fontWeight: weight,
        color: color || BRAND.gray900,
        fontFamily: FONT_FAMILY,
        maxWidth: maxWidth || 'auto',
        textAlign: 'center',
        lineHeight: 1.3,
        transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px)`,
        opacity: p,
      }}
    >
      {children}
    </div>
  );
};

/* ─── helper: pain icon ─── */
const PainIcon: React.FC<{ icon: string; text: string; delay: number }> = ({ icon, text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 80 } });
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        opacity: p,
        transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          backgroundColor: '#FEE2E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 16, color: BRAND.gray700, fontWeight: 500, textAlign: 'center', maxWidth: 140 }}>
        {text}
      </div>
    </div>
  );
};

/* ─── helper: constraint chip animation ─── */
const ConstraintChip: React.FC<{ text: string; delay: number; color?: string }> = ({ text, delay, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 100 } });
  return (
    <div
      style={{
        padding: '10px 20px',
        borderRadius: 24,
        backgroundColor: color || BRAND.blue,
        color: BRAND.white,
        fontSize: 15,
        fontWeight: 600,
        fontFamily: FONT_FAMILY,
        opacity: p,
        transform: `scale(${interpolate(p, [0, 1], [0, 1])})`,
      }}
    >
      {text}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PROMO VIDEO — 60 SECONDS
   ═══════════════════════════════════════════════════════════════════════════ */

export const PromoVideo: React.FC = () => {
  return (
    <AbsoluteFill>

      {/* ── SCENE 1: Hook (0-5s) ── */}
      <Sequence from={0} durationInFrames={seconds(5)}>
        <div
          style={{
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            backgroundColor: BRAND.gray900,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_FAMILY,
            gap: 24,
          }}
        >
          <FadeText size={52} color={BRAND.white} weight={800} maxWidth={1000}>
            What if rostering 180 guards
          </FadeText>
          <FadeText size={52} color={BRAND.blue} weight={800} delay={10}>
            took 60 seconds, not 8 hours?
          </FadeText>
        </div>
      </Sequence>

      {/* ── SCENE 2: The Pain (5-12s) ── */}
      <Sequence from={seconds(5)} durationInFrames={seconds(7)}>
        <div
          style={{
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            backgroundColor: BRAND.gray50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_FAMILY,
            gap: 48,
          }}
        >
          <FadeText size={40} weight={800} maxWidth={800}>
            The reality for 90% of SA security companies
          </FadeText>
          <div style={{ display: 'flex', gap: 48 }}>
            <PainIcon icon="📊" text="Endless Excel Spreadsheets" delay={8} />
            <PainIcon icon="📱" text="WhatsApp Chaos" delay={14} />
            <PainIcon icon="⚠️" text="Compliance Gaps" delay={20} />
            <PainIcon icon="💸" text="Overtime Surprises" delay={26} />
            <PainIcon icon="😫" text="8-12 Hours per Roster" delay={32} />
          </div>
          <FadeText size={32} color={BRAND.red} weight={700} delay={40}>
            R500,000 — R750,000 lost every year
          </FadeText>
        </div>
      </Sequence>

      {/* ── SCENE 3: The Math (12-20s) ── */}
      <Sequence from={seconds(12)} durationInFrames={seconds(8)}>
        <div
          style={{
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            backgroundColor: BRAND.gray900,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_FAMILY,
            gap: 32,
          }}
        >
          <FadeText size={36} color={BRAND.gray400} weight={600}>
            180 guards &times; 800+ shift slots =
          </FadeText>
          <PermutationCounter from={0} to={144000000} delay={10} color="#F59E0B" fontSize={96} />
          <FadeText size={24} color={BRAND.gray400} weight={500} delay={15}>
            possible combinations
          </FadeText>
          <div
            style={{
              marginTop: 16,
              padding: '12px 32px',
              borderRadius: 12,
              border: `2px solid ${BRAND.red}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <FadeText size={22} color={BRAND.red} weight={700} delay={seconds(2)}>
              This is an NP-hard optimisation problem
            </FadeText>
          </div>
        </div>
      </Sequence>

      {/* ── SCENE 4: The Solution (20-30s) ── */}
      <Sequence from={seconds(20)} durationInFrames={seconds(10)}>
        <div
          style={{
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            backgroundColor: BRAND.white,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_FAMILY,
            gap: 32,
          }}
        >
          {/* Logo reveal */}
          <FadeText size={20} color={BRAND.blue} weight={700} delay={0}>
            INTRODUCING
          </FadeText>
          <FadeText size={72} weight={800} delay={6}>
            RostraCore
          </FadeText>
          <FadeText size={24} color={BRAND.gray500} weight={500} delay={12} maxWidth={700}>
            Google OR-Tools CP-SAT constraint-satisfaction solver
          </FadeText>

          {/* Constraints clicking into place */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 900, marginTop: 16 }}>
            {[
              { text: 'PSIRA Grades', delay: seconds(1.5) },
              { text: 'BCEA Hours', delay: seconds(1.8) },
              { text: 'Rest Periods', delay: seconds(2.1) },
              { text: 'Budget Limits', delay: seconds(2.4) },
              { text: 'Skill Matching', delay: seconds(2.7) },
              { text: 'Availability', delay: seconds(3.0) },
              { text: 'Fairness', delay: seconds(3.3) },
              { text: 'Night Shift Rules', delay: seconds(3.6) },
            ].map((c) => (
              <ConstraintChip key={c.text} text={c.text} delay={c.delay} />
            ))}
          </div>

          {/* Timer */}
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <FadeText size={28} color={BRAND.green} weight={700} delay={seconds(4.5)}>
              Optimal roster generated in
            </FadeText>
            <PermutationCounter from={0} to={60} delay={seconds(4.5)} color={BRAND.green} fontSize={48} label="seconds" />
          </div>
        </div>
      </Sequence>

      {/* ── SCENE 5: Platform Walkthrough (30-40s) ── */}
      <Sequence from={seconds(30)} durationInFrames={seconds(10)}>
        <BrowserFrame url="/roster/board">
          <div style={{ padding: 32, fontFamily: FONT_FAMILY }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: BRAND.gray900, marginBottom: 20 }}>
              Roster Board — Week of 3 March 2026
            </div>
            {/* KPI row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Guards Deployed', val: '186', color: BRAND.blue },
                { label: 'Shifts Filled', val: '824 / 840', color: BRAND.green },
                { label: 'Fill Rate', val: '98.1%', color: '#818CF8' },
                { label: 'Total Cost', val: 'R489,320', color: BRAND.amber },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  style={{
                    flex: 1,
                    padding: 16,
                    backgroundColor: BRAND.white,
                    borderRadius: 12,
                    border: `1px solid ${BRAND.gray200}`,
                  }}
                >
                  <div style={{ fontSize: 12, color: BRAND.gray500, marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color }}>{kpi.val}</div>
                </div>
              ))}
            </div>
            {/* Roster grid */}
            <div style={{ backgroundColor: BRAND.white, borderRadius: 12, border: `1px solid ${BRAND.gray200}`, padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)', gap: 6 }}>
                {['Guard', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} style={{ fontSize: 12, fontWeight: 600, color: BRAND.gray500, padding: '6px 0', textAlign: 'center' }}>{d}</div>
                ))}
                {[
                  'Thabo Khumalo (A)',
                  'Nomsa Ndlovu (B)',
                  'Palesa du Plessis (A)',
                  'Welcome Ngcobo (C)',
                  'Sizwe Mthembu (B)',
                  'Lerato Mokoena (A)',
                  'John Sithole (D)',
                  'Grace Dlamini (B)',
                ].map((name) => (
                  <React.Fragment key={name}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: BRAND.gray700, padding: '8px 4px', whiteSpace: 'nowrap', overflow: 'hidden' }}>{name}</div>
                    {Array.from({ length: 7 }).map((_, j) => {
                      const isOn = Math.random() > 0.25;
                      const isNight = isOn && Math.random() > 0.7;
                      return (
                        <div
                          key={j}
                          style={{
                            height: 32,
                            borderRadius: 6,
                            backgroundColor: isNight ? '#EDE9FE' : isOn ? BRAND.blueLight : BRAND.gray100,
                            border: `1px solid ${isNight ? '#C4B5FD' : isOn ? '#93C5FD' : BRAND.gray200}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            color: isNight ? '#7C3AED' : isOn ? BRAND.blue : BRAND.gray400,
                            fontWeight: 600,
                          }}
                        >
                          {isOn ? (isNight ? '18:00' : '06:00') : 'OFF'}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <div style={{ padding: '10px 24px', borderRadius: 8, backgroundColor: BRAND.green, color: BRAND.white, fontSize: 14, fontWeight: 600 }}>
                Download Excel
              </div>
              <div style={{ padding: '10px 24px', borderRadius: 8, backgroundColor: BRAND.blue, color: BRAND.white, fontSize: 14, fontWeight: 600 }}>
                Save & Confirm
              </div>
              <div style={{ padding: '10px 24px', borderRadius: 8, border: `1px solid ${BRAND.gray200}`, color: BRAND.gray700, fontSize: 14, fontWeight: 600 }}>
                View Payroll Impact
              </div>
            </div>
          </div>
        </BrowserFrame>
      </Sequence>

      {/* ── SCENE 6: The Numbers (40-48s) ── */}
      <Sequence from={seconds(40)} durationInFrames={seconds(8)}>
        <div
          style={{
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            backgroundColor: BRAND.gray50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_FAMILY,
            gap: 48,
          }}
        >
          <FadeText size={40} weight={800}>
            The Numbers Speak for Themselves
          </FadeText>
          <div style={{ display: 'flex', gap: 40 }}>
            <FlyingStat value="R650K" label="Annual Savings" color={BRAND.blue} delay={8} direction="left" />
            <FlyingStat value="2,568%" label="ROI" color={BRAND.green} delay={14} direction="up" />
            <FlyingStat value="100%" label="PSIRA Compliant" color="#818CF8" delay={20} direction="right" />
          </div>
          <div style={{ display: 'flex', gap: 40 }}>
            <FlyingStat value="< 60s" label="Roster Generation" color={BRAND.amber} delay={26} direction="left" />
            <FlyingStat value="Month 1" label="Break-Even" color={BRAND.green} delay={32} direction="down" />
          </div>
        </div>
      </Sequence>

      {/* ── SCENE 7: Trust (48-55s) ── */}
      <Sequence from={seconds(48)} durationInFrames={seconds(7)}>
        <div
          style={{
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            backgroundColor: BRAND.gray900,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_FAMILY,
            gap: 40,
          }}
        >
          <FadeText size={44} color={BRAND.white} weight={800} maxWidth={900}>
            Built for South African Security
          </FadeText>
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { badge: 'PSIRA', text: 'Grade A-E Validated' },
              { badge: 'BCEA', text: 'Hours Enforced' },
              { badge: 'POPIA', text: 'Data Protected' },
              { badge: 'SARS', text: 'Tax Compliant' },
            ].map((item, i) => (
              <ConstraintChip key={item.badge} text={`${item.badge} — ${item.text}`} delay={10 + i * 6} color="#1F2937" />
            ))}
          </div>
          <FadeText size={24} color={BRAND.gray400} weight={500} delay={seconds(2)} maxWidth={700}>
            South African owned and operated. Designed specifically for the R90+ billion private security market.
          </FadeText>
        </div>
      </Sequence>

      {/* ── SCENE 8: CTA (55-60s) ── */}
      <Sequence from={seconds(55)} durationInFrames={seconds(5)}>
        <div
          style={{
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            background: `linear-gradient(135deg, ${BRAND.blue}, #4F46E5)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_FAMILY,
            gap: 24,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: BRAND.white,
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            RC
          </div>
          <FadeText size={56} color={BRAND.white} weight={800} delay={4}>
            Start Your Free Trial
          </FadeText>
          <FadeText size={28} color="rgba(255,255,255,0.8)" weight={500} delay={10}>
            app.rostracore.com
          </FadeText>
          <div style={{ display: 'flex', gap: 32, marginTop: 20 }}>
            <FadeText size={20} color="rgba(255,255,255,0.7)" weight={600} delay={16}>
              R29/guard/month
            </FadeText>
            <FadeText size={20} color="rgba(255,255,255,0.7)" weight={600} delay={20}>
              14-Day Free Trial
            </FadeText>
            <FadeText size={20} color="rgba(255,255,255,0.7)" weight={600} delay={24}>
              No Credit Card
            </FadeText>
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
