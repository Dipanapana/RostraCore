import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { SlideTitle } from '../components/SlideTitle';
import { StatBar } from '../components/StatBar';
import { BrowserFrame } from '../components/BrowserFrame';
import { BRAND, FONT_FAMILY, VIDEO_WIDTH, VIDEO_HEIGHT, seconds } from '../lib/constants';

/* ─── helper: animated card ─── */
const Card: React.FC<{
  children: React.ReactNode;
  delay?: number;
  width?: number;
  bg?: string;
}> = ({ children, delay = 0, width, bg }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 80 } });
  return (
    <div
      style={{
        backgroundColor: bg || BRAND.white,
        borderRadius: 20,
        padding: 32,
        width: width || 'auto',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: `1px solid ${BRAND.gray200}`,
        transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
        opacity: p,
      }}
    >
      {children}
    </div>
  );
};

/* ─── helper: big stat ─── */
const BigStat: React.FC<{
  value: string;
  label: string;
  color?: string;
  delay?: number;
}> = ({ value, label, color, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 80 } });
  return (
    <div style={{ textAlign: 'center', opacity: p, transform: `scale(${interpolate(p, [0, 1], [0.8, 1])})` }}>
      <div style={{ fontSize: 56, fontWeight: 800, color: color || BRAND.blue }}>{value}</div>
      <div style={{ fontSize: 18, color: BRAND.gray500, marginTop: 8 }}>{label}</div>
    </div>
  );
};

/* ─── helper: pill badge ─── */
const Pill: React.FC<{ text: string; color?: string; delay?: number }> = ({ text, color, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 80 } });
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        backgroundColor: color || BRAND.blueLight,
        color: color ? BRAND.white : BRAND.blue,
        padding: '10px 20px',
        borderRadius: 24,
        fontSize: 16,
        fontWeight: 600,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [12, 0])}px)`,
      }}
    >
      {text}
    </div>
  );
};

/* ─── helper: section layout ─── */
const SlideLayout: React.FC<{
  title: string;
  subtitle?: string;
  dark?: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, dark, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tp = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });
  const bg = dark ? BRAND.gray900 : BRAND.gray50;
  const textColor = dark ? BRAND.white : BRAND.gray900;
  const subColor = dark ? BRAND.gray400 : BRAND.gray500;

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        backgroundColor: bg,
        fontFamily: FONT_FAMILY,
        display: 'flex',
        flexDirection: 'column',
        padding: '60px 80px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: textColor,
            opacity: tp,
            transform: `translateY(${interpolate(tp, [0, 1], [20, 0])}px)`,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 22,
              color: subColor,
              marginTop: 12,
              opacity: tp,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>{children}</div>

      {/* Bottom brand bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${BRAND.blue}, #818CF8)`,
          transform: `scaleX(${tp})`,
          transformOrigin: 'left',
        }}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PITCH DECK — 12 SLIDES (~90 seconds total)
   ═══════════════════════════════════════════════════════════════════════════ */

export const PitchDeck: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* ── SLIDE 1: Title (0-7s) ── */}
      <Sequence from={0} durationInFrames={seconds(7)}>
        <SlideTitle
          title="Security Management Reimagined"
          subtitle="The all-in-one platform for modern security operations"
          accent="Blaq Cooperation (Pty) Ltd"
        />
      </Sequence>

      {/* ── SLIDE 2: The Problem (7-15s) ── */}
      <Sequence from={seconds(7)} durationInFrames={seconds(8)}>
        <SlideLayout title="The Problem" subtitle="The security industry is stuck in the past">
          <div style={{ display: 'flex', gap: 32, width: '100%' }}>
            <Card delay={6} width={520}>
              <div style={{ fontSize: 72, fontWeight: 800, color: BRAND.red, marginBottom: 8 }}>90%</div>
              <div style={{ fontSize: 22, color: BRAND.gray700, fontWeight: 600 }}>
                of SA security companies still use Excel, WhatsApp, and manual calculations
              </div>
            </Card>
            <Card delay={12} width={520}>
              <div style={{ fontSize: 72, fontWeight: 800, color: BRAND.amber, marginBottom: 8 }}>R750K</div>
              <div style={{ fontSize: 22, color: BRAND.gray700, fontWeight: 600 }}>
                lost annually per average 70-guard company due to inefficiency
              </div>
            </Card>
            <Card delay={18}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['8-12 hours to create one roster', 'Month-end overtime surprises', 'PSIRA compliance gaps', 'Client reporting takes 40+ hours/month'].map(
                  (text, i) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND.red, flexShrink: 0 }} />
                      <div style={{ fontSize: 18, color: BRAND.gray700 }}>{text}</div>
                    </div>
                  )
                )}
              </div>
            </Card>
          </div>
        </SlideLayout>
      </Sequence>

      {/* ── SLIDE 3: The Math (15-23s) ── */}
      <Sequence from={seconds(15)} durationInFrames={seconds(8)}>
        <SlideLayout title="The Mathematical Challenge" subtitle="Roster generation is an NP-hard combinatorial optimisation problem" dark>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 40 }}>
            <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
              <Card delay={6} bg="#1F2937">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, fontWeight: 800, color: BRAND.blue }}>180</div>
                  <div style={{ fontSize: 18, color: BRAND.gray400 }}>Guards</div>
                </div>
              </Card>
              <div style={{ fontSize: 48, color: BRAND.gray400, fontWeight: 300 }}>&times;</div>
              <Card delay={10} bg="#1F2937">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, fontWeight: 800, color: BRAND.blue }}>800+</div>
                  <div style={{ fontSize: 18, color: BRAND.gray400 }}>Shift Slots</div>
                </div>
              </Card>
              <div style={{ fontSize: 48, color: BRAND.gray400, fontWeight: 300 }}>=</div>
              <Card delay={14} bg="#1F2937">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, fontWeight: 800, color: '#F59E0B' }}>Millions</div>
                  <div style={{ fontSize: 18, color: BRAND.gray400 }}>of Permutations</div>
                </div>
              </Card>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {['PSIRA Grade Matching', 'BCEA Hour Limits', 'Rest Periods', 'Budget Caps', 'Skill Requirements', 'Availability'].map(
                (c, i) => (
                  <Pill key={c} text={c} delay={18 + i * 3} />
                )
              )}
            </div>
          </div>
        </SlideLayout>
      </Sequence>

      {/* ── SLIDE 4: The Solution (23-31s) ── */}
      <Sequence from={seconds(23)} durationInFrames={seconds(8)}>
        <SlideLayout title="The Solution" subtitle="Google OR-Tools CP-SAT constraint-satisfaction solver">
          <div style={{ display: 'flex', gap: 48, alignItems: 'center', width: '100%' }}>
            <div style={{ flex: 1 }}>
              <Card delay={6}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {[
                    { icon: '1', title: 'Define Constraints', desc: 'PSIRA grades, hours, availability, budgets' },
                    { icon: '2', title: 'Optimise', desc: 'CP-SAT solver finds optimal assignment in seconds' },
                    { icon: '3', title: 'Deploy', desc: 'Review, adjust, and export — ready for the week' },
                  ].map((step, i) => (
                    <div key={step.icon} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: BRAND.blue,
                          color: BRAND.white,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      >
                        {step.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: BRAND.gray900 }}>{step.title}</div>
                        <div style={{ fontSize: 17, color: BRAND.gray500, marginTop: 4 }}>{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
              <BigStat value="< 60s" label="Roster Generation" delay={12} />
              <BigStat value="100%" label="Constraint Satisfaction" color={BRAND.green} delay={18} />
              <BigStat value="Optimal" label="Cost Minimisation" color="#818CF8" delay={24} />
            </div>
          </div>
        </SlideLayout>
      </Sequence>

      {/* ── SLIDE 5: Platform Overview (31-39s) ── */}
      <Sequence from={seconds(31)} durationInFrames={seconds(8)}>
        <SlideLayout title="90+ Integrated Modules" subtitle="Everything you need in one platform">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, width: '100%' }}>
            {[
              { icon: '📋', title: 'AI Roster Optimisation', desc: 'CP-SAT solver with soft constraints' },
              { icon: '🛡️', title: 'PSIRA Compliance', desc: 'Grade tracking, expiry alerts, validation' },
              { icon: '👥', title: 'Workforce Management', desc: '168+ data points per employee' },
              { icon: '💰', title: 'Financial Intelligence', desc: 'Payroll, invoicing, tax compliance' },
              { icon: '📍', title: 'Real-Time Operations', desc: 'GPS check-in, geofencing, live tracking' },
              { icon: '📊', title: 'Client Excellence', desc: 'Portals, SLA tracking, reporting' },
            ].map((mod, i) => (
              <Card key={mod.title} delay={6 + i * 4}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{mod.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.gray900, marginBottom: 6 }}>{mod.title}</div>
                <div style={{ fontSize: 16, color: BRAND.gray500, lineHeight: 1.4 }}>{mod.desc}</div>
              </Card>
            ))}
          </div>
        </SlideLayout>
      </Sequence>

      {/* ── SLIDE 6: Live Demo (39-47s) ── */}
      <Sequence from={seconds(39)} durationInFrames={seconds(8)}>
        <BrowserFrame url="/dashboard">
          <div style={{ padding: 40, fontFamily: FONT_FAMILY }}>
            {/* Mock dashboard */}
            <div style={{ fontSize: 28, fontWeight: 700, color: BRAND.gray900, marginBottom: 24 }}>Dashboard Overview</div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
              {[
                { label: 'Active Guards', val: '186', color: BRAND.blue },
                { label: 'Sites Covered', val: '42', color: BRAND.green },
                { label: 'Fill Rate', val: '97.3%', color: '#818CF8' },
                { label: 'Monthly Cost', val: 'R2.4M', color: BRAND.amber },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    padding: 24,
                    backgroundColor: BRAND.white,
                    borderRadius: 16,
                    border: `1px solid ${BRAND.gray200}`,
                  }}
                >
                  <div style={{ fontSize: 14, color: BRAND.gray500, marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
            {/* Mock roster grid */}
            <div
              style={{
                height: 400,
                backgroundColor: BRAND.white,
                borderRadius: 16,
                border: `1px solid ${BRAND.gray200}`,
                padding: 24,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 600, color: BRAND.gray900, marginBottom: 16 }}>
                Weekly Roster — 3-9 March 2026
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
                {['Guard', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div
                    key={d}
                    style={{ fontSize: 13, fontWeight: 600, color: BRAND.gray500, padding: '8px 0', textAlign: 'center' }}
                  >
                    {d}
                  </div>
                ))}
                {['T. Khumalo', 'N. Ndlovu', 'P. du Plessis', 'W. Ngcobo', 'S. Mthembu'].map((name) => (
                  <React.Fragment key={name}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: BRAND.gray700, padding: '10px 4px' }}>{name}</div>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <div
                        key={j}
                        style={{
                          height: 36,
                          borderRadius: 6,
                          backgroundColor: Math.random() > 0.3 ? BRAND.blueLight : BRAND.gray100,
                          border: `1px solid ${Math.random() > 0.3 ? '#93C5FD' : BRAND.gray200}`,
                        }}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </BrowserFrame>
      </Sequence>

      {/* ── SLIDE 7: SA Compliance (47-55s) ── */}
      <Sequence from={seconds(47)} durationInFrames={seconds(8)}>
        <SlideLayout title="Built for South Africa" subtitle="Full regulatory compliance out of the box" dark>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, width: '100%' }}>
            {[
              {
                badge: 'PSIRA',
                title: 'Private Security Industry',
                items: ['Grade A-E hierarchy validation', 'Gazetted minimum wage rates', 'Registration expiry alerts (30/60/90 days)', 'PSIRA levy auto-deduction (R22/mo)'],
              },
              {
                badge: 'BCEA',
                title: 'Basic Conditions of Employment',
                items: ['45-hour/week maximum enforcement', '10-hour overtime cap tracking', '12-hour rest period enforcement', 'Sunday & public holiday premiums'],
              },
              {
                badge: 'POPIA',
                title: 'Data Protection',
                items: ['Consent management', 'Data subject request workflows', 'Full audit trail', '72-hour breach notification'],
              },
              {
                badge: 'SARS',
                title: 'Tax Compliance',
                items: ['2025/26 tax brackets', 'PAYE with rebate tiers', 'UIF (1% + 1%) with monthly cap', 'SDL at 1%'],
              },
            ].map((reg, i) => (
              <Card key={reg.badge} delay={6 + i * 6} bg="#1F2937">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      backgroundColor: BRAND.blue,
                      color: BRAND.white,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {reg.badge}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: BRAND.white }}>{reg.title}</div>
                </div>
                {reg.items.map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ color: BRAND.green, fontSize: 16 }}>&#10003;</div>
                    <div style={{ fontSize: 15, color: BRAND.gray400 }}>{item}</div>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </SlideLayout>
      </Sequence>

      {/* ── SLIDE 8: Financial Impact (55-63s) ── */}
      <Sequence from={seconds(55)} durationInFrames={seconds(8)}>
        <SlideLayout title="Financial Impact" subtitle="For a typical 70-guard security company">
          <div style={{ display: 'flex', gap: 48, alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>
              <BigStat value="R650K" label="Annual Savings" delay={6} />
              <BigStat value="2,568%" label="Return on Investment" color={BRAND.green} delay={12} />
              <BigStat value="Month 1" label="Break-Even Point" color="#818CF8" delay={18} />
            </div>
            <div style={{ flex: 1 }}>
              <Card delay={10}>
                <div style={{ fontSize: 22, fontWeight: 700, color: BRAND.gray900, marginBottom: 24 }}>
                  Annual Cost Savings Breakdown
                </div>
                <StatBar
                  delay={16}
                  items={[
                    { label: 'Budget Overrun Reduction', value: 180000 },
                    { label: 'Roster Time Savings', value: 175000 },
                    { label: 'Client Reporting', value: 120000 },
                    { label: 'Overtime Control', value: 70000 },
                    { label: 'Payroll Automation', value: 60000 },
                    { label: 'Compliance Violations', value: 45000 },
                  ]}
                />
              </Card>
            </div>
          </div>
        </SlideLayout>
      </Sequence>

      {/* ── SLIDE 9: Pricing (63-71s) ── */}
      <Sequence from={seconds(63)} durationInFrames={seconds(8)}>
        <SlideLayout title="Simple, Per-Guard Pricing" subtitle="No hidden fees. No setup costs. Cancel anytime.">
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Card delay={6} width={600}>
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 24, color: BRAND.gray500 }}>R</span>
                  <span style={{ fontSize: 96, fontWeight: 800, color: BRAND.gray900, lineHeight: 1 }}>29</span>
                </div>
                <div style={{ fontSize: 20, color: BRAND.gray500, marginBottom: 32 }}>per guard / month (excl. VAT)</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: BRAND.green, marginBottom: 32 }}>
                  14-Day Free Trial — No credit card required
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'left' }}>
                  {[
                    'AI roster optimisation',
                    'PSIRA grade enforcement',
                    'BCEA compliance checks',
                    'Payroll calculation',
                    'Multi-site management',
                    'Shift pattern templates',
                    'Advanced reporting',
                    'Email & phone support',
                  ].map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ color: BRAND.green, fontSize: 16 }}>&#10003;</div>
                      <div style={{ fontSize: 16, color: BRAND.gray700 }}>{f}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </SlideLayout>
      </Sequence>

      {/* ── SLIDE 10: Roadmap (71-79s) ── */}
      <Sequence from={seconds(71)} durationInFrames={seconds(8)}>
        <SlideLayout title="Product Roadmap" subtitle="Continuous innovation for the security industry">
          <div style={{ display: 'flex', gap: 24, width: '100%' }}>
            {[
              {
                phase: 'Phase 1',
                label: 'Current',
                color: BRAND.blue,
                items: ['90+ modules', 'Web + Mobile', 'Full SA compliance', 'Real-time ops'],
              },
              {
                phase: 'Phase 2',
                label: 'Next',
                color: '#818CF8',
                items: ['Biometric terminals', 'IoT sensor integration', 'RFID checkpoints', 'Body cameras'],
              },
              {
                phase: 'Phase 3',
                label: 'Future',
                color: BRAND.amber,
                items: ['Predictive staffing AI', 'Anomaly detection', 'NLP incident reports', 'Computer vision'],
              },
              {
                phase: 'Phase 4',
                label: 'Vision',
                color: BRAND.green,
                items: ['PSIRA integration', 'Guard marketplace', 'Insurance data sharing', 'Blockchain SLA'],
              },
            ].map((p, i) => (
              <Card key={p.phase} delay={6 + i * 6} width={390}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div
                    style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      backgroundColor: p.color,
                      color: BRAND.white,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {p.phase}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: BRAND.gray700 }}>{p.label}</div>
                </div>
                {p.items.map((item) => (
                  <div key={item} style={{ fontSize: 16, color: BRAND.gray500, marginBottom: 6, paddingLeft: 8 }}>
                    {item}
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </SlideLayout>
      </Sequence>

      {/* ── SLIDE 11: CTA (79-90s) ── */}
      <Sequence from={seconds(79)} durationInFrames={seconds(11)}>
        <SlideTitle
          title="Start Your 14-Day Free Trial"
          subtitle="Join forward-thinking security companies across South Africa"
          accent="app.rostracore.com  |  info@rostracore.co.za  |  R29/guard/month"
          dark
        />
      </Sequence>
    </AbsoluteFill>
  );
};
