import React, { useState } from 'react';

const DENIAL_CATEGORIES = [
  { label: "Authorization / PA missing", code: "PI-15", count: 8, at_risk: 9036, color: "#E24B4A", payer: "CO Medicaid", root: "Operational — auth not obtained or not attached pre-submission" },
  { label: "Credentialing (provider type)", code: "PR-170", count: 18, at_risk: 8660, color: "#D85A30", payer: "TRICARE West", root: "System design — providers submitted before TRICARE credentialing complete" },
  { label: "Billing error (PI-16 cluster)", code: "PI-16", count: 9, at_risk: 3649, color: "#BA7517", payer: "CO Medicaid", root: "Operational — eligibility/membership issue on specific rendering NPI" },
  { label: "Out-of-network / no contract", code: "PR-242", count: 3, at_risk: 1080, color: "#533AB7", payer: "Aetna TX", root: "System design — claims submitted without active contract" },
  { label: "Non-covered benefit", code: "PR-204", count: 1, at_risk: 360, color: "#0F6E56", payer: "PA Blue Shield", root: "Operational — plan exclusion not caught at eligibility" },
  { label: "Billing error (CO-272)", code: "CO-272", count: 4, at_risk: 780, color: "#185FA5", payer: "TRICARE West", root: "Operational — modifier/billing format issue" },
  { label: "ERA incomplete / pending", code: "CO-B11", count: 3, at_risk: 1080, color: "#888780", payer: "BCBS TX", root: "Operational — ERA enrollment gaps in Candid" },
];

const PAYER_DATA = [
  { payer: "Colorado Medicaid", total_billed: 142000, paid: 118000, denied: 17200, denial_rate: 12.1, plan_type: "MC" },
  { payer: "TRICARE West", total_billed: 28400, paid: 2600, denied: 24800, denial_rate: 87.3, plan_type: "CI" },
  { payer: "BCBS Texas", total_billed: 18200, paid: 15400, denied: 1500, denial_rate: 8.2, plan_type: "CI" },
  { payer: "Aetna", total_billed: 8200, paid: 6100, denied: 1680, denial_rate: 20.5, plan_type: "CI" },
  { payer: "Cigna", total_billed: 4800, paid: 4200, denied: 0, denial_rate: 0, plan_type: "CI" },
  { payer: "PA Blue Shield", total_billed: 360, paid: 0, denied: 360, denial_rate: 100, plan_type: "CI" },
];

const RCM_STAGES = [
  {
    stage: "Front-end", subtitle: "Before the claim is created", color: "#A32D2D", pct: 68, at_risk: 17696,
    issues: [
      { label: "Authorization not obtained", detail: "PI-15 on CO Medicaid — auth required for 97151 but missing at time of service scheduling", denial_code: "PI-15", at_risk: 9036, fix: "Build auth requirement check into intake workflow before first session" },
      { label: "Provider not credentialed", detail: "PR-170 on TRICARE — providers submitted before TRICARE credentialing complete", denial_code: "PR-170", at_risk: 8660, fix: "Credentialing status gate: no claims submitted until payer credentialing confirmed" },
    ],
    verdict: "The majority of revenue loss is preventable before a single claim is ever created. This is a front-end failure, not a billing failure."
  },
  {
    stage: "Mid-cycle", subtitle: "During claim creation & submission", color: "#BA7517", pct: 17, at_risk: 4429,
    issues: [
      { label: "Rendering NPI enrollment gap", detail: "PI-16 + membership-eligibility tag — specific rendering NPIs not properly enrolled in CO Medicaid", denial_code: "PI-16", at_risk: 3649, fix: "NPI enrollment audit before assigning provider to Medicaid patients" },
      { label: "Billing format errors", detail: "CO-272 / CO-16 on TRICARE — modifier issues and billing format problems at claim creation", denial_code: "CO-272", at_risk: 780, fix: "Payer-specific claim QA checklist applied before submission" },
    ],
    verdict: "Mid-cycle failures are operational — fixable with a pre-submission QA checklist and provider enrollment audit."
  },
  {
    stage: "Back-end", subtitle: "After claim submission", color: "#185FA5", pct: 15, at_risk: 2520,
    issues: [
      { label: "OON / no active contract", detail: "PR-242 on Aetna TX — claim submitted, paid as OON or denied entirely due to missing contract", denial_code: "PR-242", at_risk: 1080, fix: "Contracting audit for all active payers — confirm network status before submission" },
      { label: "Incomplete ERA processing", detail: "CO-B11 on BCBS TX — ERA enrollment gap in Candid causing stalled adjudication", denial_code: "CO-B11", at_risk: 1080, fix: "ERA enrollment setup checklist for each new payer onboarded in Candid" },
      { label: "Non-covered benefit", detail: "PR-204 on PA Blue Shield — plan exclusion not identified until post-adjudication", denial_code: "PR-204", at_risk: 360, fix: "Benefits verification at eligibility to confirm ABA coverage before DOS" },
    ],
    verdict: "Back-end issues are the smallest bucket and mostly recoverable through appeals or contracting fixes."
  },
];

const PRIORITY_ACTIONS = [
  { priority: 1, horizon: "Days 1–14", action: "Stop submitting TRICARE claims for uncredentialed providers", impact: "$8,660 at risk", urgency: "danger", type: "System design" },
  { priority: 2, horizon: "Days 1–14", action: "Audit NPI 1386132546 — membership-eligibility cluster on CO Medicaid", impact: "$3,649 in denials", urgency: "danger", type: "Operational" },
  { priority: 3, horizon: "Days 1–30", action: "Configure Candid: auth gate, credentialing gate, ERA enforcement, eligibility hard gate", impact: "Prevents all Tier 1 denials", urgency: "warning", type: "Configure Candid" },
  { priority: 4, horizon: "Days 1–30", action: "Hold Silna to TAT SLA — require live calls, launch weekly check-in", impact: "$9,036 in open PI-15 denials", urgency: "warning", type: "Operational" },
  { priority: 5, horizon: "Days 30–60", action: "Confirm Aetna TX network status for rendering providers", impact: "$1,080 at risk", urgency: "info", type: "Contracting" },
  { priority: 6, horizon: "Days 30–60", action: "Resolve ERA enrollment gaps in Candid for BCBS TX", impact: "$1,080 delayed", urgency: "info", type: "Configure Candid" },
];

const fmt = n => "$" + n.toLocaleString();

export default function Dashboard() {
  const [tab, setTab] = useState("overview");
  const tabs = ["overview", "rcm stage", "by payer", "denial breakdown", "90-day plan"];
  const totalAtRisk = DENIAL_CATEGORIES.reduce((s, d) => s + d.at_risk, 0);
  const totalDenied = DENIAL_CATEGORIES.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Revenue Health Dashboard</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>Alpaca Health · Claims Oct 2025 · Sample dataset analysis</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: '1.5rem' }}>
        {[
          { label: "Revenue at risk", value: fmt(totalAtRisk), color: "#A32D2D" },
          { label: "Denial categories", value: totalDenied + " claims", color: "#BA7517" },
          { label: "Est. clean claim rate", value: "72%", color: "#185FA5" },
          { label: "Existential issue", value: "TRICARE 87%", color: "#A32D2D" },
        ].map((m, i) => (
          <div key={i} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid var(--color-border-tertiary)', marginBottom: '1.25rem' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 500 : 400, color: tab === t ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', borderBottom: tab === t ? '2px solid var(--color-text-primary)' : '2px solid transparent', borderRadius: 0, marginBottom: -1 }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 12px' }}>Revenue at risk by denial category</p>
          {DENIAL_CATEGORIES.map((d, i) => {
            const pct = Math.round((d.at_risk / totalAtRisk) * 100);
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span>{d.label} <span style={{ color: 'var(--color-text-tertiary)' }}>({d.code})</span></span>
                  <span style={{ fontWeight: 500 }}>{fmt(d.at_risk)} · {pct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--color-background-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', background: d.color, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{d.payer} · {d.count} claims · {d.root}</div>
              </div>
            );
          })}
          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '14px 16px', marginTop: '1.25rem' }}>
            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 8px' }}>Key insight</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
              Two issues account for ~73% of revenue at risk: <strong>TRICARE credentialing denials</strong> (PR-170, systemic) and <strong>CO Medicaid auth failures</strong> (PI-15, operational). Both are preventable before a claim is created. Both are fixable with Candid configuration + process gates.
            </p>
          </div>
        </div>
      )}

      {tab === "rcm stage" && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 1.25rem', lineHeight: 1.6 }}>Mapping denials to RCM stage reveals where to invest — front-end prevention vs. mid-cycle QA vs. back-end recovery.</p>
          {RCM_STAGES.map((s, i) => (
            <div key={i} style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: s.color }}>{s.stage}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginLeft: 8 }}>{s.subtitle}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>${s.at_risk.toLocaleString()} · {s.pct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--color-background-secondary)', borderRadius: 3, marginBottom: 10 }}>
                <div style={{ width: s.pct + '%', height: '100%', background: s.color, borderRadius: 3 }} />
              </div>
              {s.issues.map((iss, j) => (
                <div key={j} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{iss.label}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, background: s.color + '20', color: s.color, padding: '2px 6px', borderRadius: 3 }}>{iss.denial_code}</span>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>${iss.at_risk.toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3 }}>{iss.detail}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4, borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: 6 }}>Fix: {iss.fix}</div>
                </div>
              ))}
              <div style={{ fontSize: 12, fontStyle: 'italic', color: s.color, marginTop: 6 }}>{s.verdict}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "by payer" && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                {["Payer", "Plan type", "Est. billed", "Est. paid", "Est. denied", "Denial rate", "Status"].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500, fontSize: 12, color: 'var(--color-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PAYER_DATA.map((p, i) => {
                const uc = p.denial_rate >= 50 ? "#A32D2D" : p.denial_rate >= 15 ? "#BA7517" : "#3B6D11";
                const ul = p.denial_rate >= 50 ? "Critical" : p.denial_rate >= 15 ? "Monitor" : "Healthy";
                return (
                  <tr key={i} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                    <td style={{ padding: '10px', fontWeight: 500 }}>{p.payer}</td>
                    <td style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>{p.plan_type === "MC" ? "Medicaid" : "Commercial"}</td>
                    <td style={{ padding: '10px' }}>{fmt(p.total_billed)}</td>
                    <td style={{ padding: '10px', color: '#3B6D11' }}>{fmt(p.paid)}</td>
                    <td style={{ padding: '10px', color: '#A32D2D' }}>{fmt(p.denied)}</td>
                    <td style={{ padding: '10px', fontWeight: 500, color: uc }}>{p.denial_rate}%</td>
                    <td style={{ padding: '10px' }}><span style={{ background: uc + '20', color: uc, fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{ul}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "denial breakdown" && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 12px' }}>Operational vs. system design failures</p>
          {["Operational", "System design"].map(type => (
            <div key={type} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{type} failures</div>
              {DENIAL_CATEGORIES.filter(d => d.root.startsWith(type)).map((d, i) => (
                <div key={i} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</span>
                      <span style={{ fontSize: 11, background: d.color + '20', color: d.color, padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>{d.code}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{fmt(d.at_risk)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{d.payer} · {d.count} claims</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{d.root.split('— ')[1]}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === "90-day plan" && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 12px' }}>Priority actions — 90-day revenue recovery</p>
          {PRIORITY_ACTIONS.map((a, i) => {
            const c = { danger: "#A32D2D", warning: "#BA7517", info: "#185FA5" }[a.urgency];
            return (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 24, height: 24, borderRadius: '50%', background: c + '20', color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, marginTop: 2 }}>{a.priority}</div>
                <div style={{ flex: 1, background: 'var(--color-background-secondary)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{a.action}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: c }}>{a.impact}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{a.horizon} · <span style={{ color: c }}>{a.type}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
