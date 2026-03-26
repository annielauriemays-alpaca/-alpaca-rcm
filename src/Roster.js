import React, { useState } from 'react';

const PAYERS = ["CO Medicaid", "TRICARE West", "BCBS Texas", "Aetna", "Cigna", "PA Blue Shield", "Scott & White"];

const PROVIDERS = [
  {
    npi: "1750795795", name: "Provider A", role: "BCBA", billing_entity: "Harvi Technologies, Inc.",
    flags: ["PI-15 recurring — CO Medicaid", "PI-16 billing error — CO Medicaid"],
    enrollment: {
      "CO Medicaid": { status: "enrolled", auth_required: true, issue_title: null, issue_detail: null, action: null },
      "TRICARE West": { status: "not_enrolled" }, "BCBS Texas": { status: "not_enrolled" },
      "Aetna": { status: "not_enrolled" }, "Cigna": { status: "not_enrolled" },
      "PA Blue Shield": { status: "not_enrolled" }, "Scott & White": { status: "not_enrolled" },
    }
  },
  {
    npi: "1992468177", name: "Provider B", role: "BCBA", billing_entity: "Harvi Technologies, Inc.",
    flags: ["CO-272 / CO-16 billing error — TRICARE"],
    enrollment: {
      "CO Medicaid": { status: "not_enrolled" },
      "TRICARE West": { status: "issue", auth_required: true, issue_title: "Modifier error causing billing rejections", issue_detail: "Claims for this provider are returning CO-272 (claim/service not covered) and CO-16 (claim/service lacks information) with RARCs N280 and N362. Root cause: modifier HO is missing on 97151/97153 — TRICARE West requires HO to indicate master's level or above supervision. Without it, claims are rejected at adjudication.", action: "Audit all open TRICARE claims for this NPI. Add modifier HO to 97151 and 97153 before resubmission. Configure TRICARE HO modifier rule in Candid's rules engine to prevent recurrence." },
      "BCBS Texas": { status: "not_enrolled" }, "Aetna": { status: "not_enrolled" },
      "Cigna": { status: "not_enrolled" }, "PA Blue Shield": { status: "not_enrolled" }, "Scott & White": { status: "not_enrolled" },
    }
  },
  {
    npi: "1740413632", name: "Provider C", role: "BCBA", billing_entity: "Harvi Technologies, Inc.",
    flags: ["CO-B11 incomplete ERA — BCBS TX"],
    enrollment: {
      "CO Medicaid": { status: "not_enrolled" }, "TRICARE West": { status: "not_enrolled" },
      "BCBS Texas": { status: "issue", auth_required: true, issue_title: "ERA enrollment gap in Candid", issue_detail: "Claim returned CO-B11 (incomplete ERA results) — ERA enrollment is not active for this provider/payer combination in Candid, causing remittance to not post correctly. Payment may have been issued by BCBS TX but is not reconciling in the billing system.", action: "Set up ERA enrollment for this NPI + BCBS TX payer ID in Candid immediately. Manually post the outstanding ERA or contact BCBS TX to re-send remittance. Confirm ERA posting before submitting new claims." },
      "Aetna": { status: "not_enrolled" }, "Cigna": { status: "not_enrolled" },
      "PA Blue Shield": { status: "not_enrolled" }, "Scott & White": { status: "not_enrolled" },
    }
  },
  {
    npi: "1538518626", name: "Provider D", role: "BCBA", billing_entity: "Harvi Technologies, Inc.",
    flags: [],
    enrollment: {
      "CO Medicaid": { status: "not_enrolled" }, "TRICARE West": { status: "not_enrolled" },
      "BCBS Texas": { status: "enrolled", auth_required: true, issue_title: null, issue_detail: null, action: null },
      "Aetna": { status: "not_enrolled" }, "Cigna": { status: "not_enrolled" },
      "PA Blue Shield": { status: "not_enrolled" }, "Scott & White": { status: "not_enrolled" },
    }
  },
  {
    npi: "1386132546", name: "Provider E", role: "BCBA", billing_entity: "Harvi Technologies Inc",
    flags: ["PI-16 + membership-eligibility — CO Medicaid (systemic)", "Multiple denied claims — patient eligibility/demographics issue suspected"],
    enrollment: {
      "CO Medicaid": { status: "issue", auth_required: true, issue_title: "Membership-eligibility flag — patient coverage or demographics issue", issue_detail: "Multiple claims for this NPI are returning PI-16 (billing error) paired with the system tag 'membership-eligibility' in Candid. This pattern most likely indicates a patient-side coverage issue — coverage lapse, incorrect member demographics (wrong DOB, member ID, or name mismatch), or member not found under the specific CO Medicaid plan subtype being billed. Four claims totaling $3,649 are affected across multiple dates of service in October 2025.", action: "Verify each affected patient's current CO Medicaid coverage status and confirm that demographics on file match exactly what CO Medicaid has in their system. If demographics are correct and coverage is active, audit rendering NPI enrollment as a secondary check. Hold all new claims pending verification." },
      "TRICARE West": { status: "not_enrolled" }, "BCBS Texas": { status: "not_enrolled" },
      "Aetna": { status: "not_enrolled" }, "Cigna": { status: "not_enrolled" },
      "PA Blue Shield": { status: "not_enrolled" }, "Scott & White": { status: "not_enrolled" },
    }
  },
  {
    npi: "1255829438", name: "Provider F", role: "BCBA", billing_entity: "Harvi Technologies Inc",
    flags: ["PR-170 — TRICARE West (credentialing incomplete)", "STOP: do not submit TRICARE claims"],
    enrollment: {
      "CO Medicaid": { status: "not_enrolled" },
      "TRICARE West": { status: "blocked", auth_required: true, issue_title: "Provider not credentialed — all TRICARE claims being denied", issue_detail: "Every claim submitted for this NPI to TRICARE West is returning PR-170 (payment denied when service is performed by this provider type) with RARC N95. Three claims totaling $1,260 are currently denied (DOS 10/02, 10/03, 10/04/2025). Submitting additional claims before credentialing is complete will only compound the backlog.", action: "STOP all TRICARE West claim submissions for this NPI immediately. Initiate or expedite credentialing application with TRICARE West regional contractor as part of batch credentialing initiative. Do not resubmit denied claims until credentialing is confirmed active. Once credentialed, appeal denied claims with credentialing approval documentation attached." },
      "BCBS Texas": { status: "not_enrolled" }, "Aetna": { status: "not_enrolled" },
      "Cigna": { status: "not_enrolled" }, "PA Blue Shield": { status: "not_enrolled" }, "Scott & White": { status: "not_enrolled" },
    }
  },
  {
    npi: "1295201150", name: "Provider G", role: "BCBA", billing_entity: "Harvi Technologies Inc",
    flags: ["PR-170 — TRICARE West (credentialing incomplete)", "STOP: do not submit TRICARE claims"],
    enrollment: {
      "CO Medicaid": { status: "not_enrolled" },
      "TRICARE West": { status: "blocked", auth_required: true, issue_title: "Provider not credentialed — largest TRICARE denial cluster in dataset", issue_detail: "Same credentialing block as Provider F. Eight claims totaling $5,360 are currently denied across two patients (DOS 10/02–10/16/2025) — all returning PR-170 with RARC N95. Both patients are in Hawaii, suggesting a possible geographic jurisdiction question with TRICARE West in addition to the credentialing issue. This is the largest single denial cluster in the dataset.", action: "STOP all TRICARE West claim submissions for this NPI immediately. Initiate batch credentialing with TRICARE West. Verify whether Hawaii-based patients fall under TRICARE West jurisdiction or require a different regional contractor. Once credentialed, appeal all 8 denied claims with approval documentation attached." },
      "BCBS Texas": { status: "not_enrolled" }, "Aetna": { status: "not_enrolled" },
      "Cigna": { status: "not_enrolled" }, "PA Blue Shield": { status: "not_enrolled" }, "Scott & White": { status: "not_enrolled" },
    }
  },
  {
    npi: "1194132969", name: "Provider H", role: "BCBA", billing_entity: "Harvi Technologies, Inc.",
    flags: ["PR-242 OON — Aetna TX"],
    enrollment: {
      "CO Medicaid": { status: "not_enrolled" }, "TRICARE West": { status: "not_enrolled" },
      "BCBS Texas": { status: "not_enrolled" },
      "Aetna": { status: "issue", auth_required: true, issue_title: "Out-of-network or no active contract — claims denying as OON", issue_detail: "Two claims for this NPI returned PR-242 with RARCs MA67, N377, and N130 — indicating the provider is either out-of-network or has no active contract on file with Aetna TX. One claim (10/13/2025) was paid at $194.70 against a $600 billed amount, suggesting OON payment at a reduced rate. A second claim (10/16/2025) for $240 is open with a full balance.", action: "Confirm network status for this NPI with Aetna TX immediately. If the provider should be in-network, contact Aetna to correct the contract record and reprocess affected claims. If genuinely OON, initiate contracting or notify patient of OON cost-sharing responsibility." },
      "Cigna": { status: "not_enrolled" }, "PA Blue Shield": { status: "not_enrolled" }, "Scott & White": { status: "not_enrolled" },
    }
  },
  {
    npi: "1326847278", name: "Provider I", role: "BCBA", billing_entity: "Harvi Technologies Inc",
    flags: ["PR-204 non-covered — PA Blue Shield"],
    enrollment: {
      "CO Medicaid": { status: "not_enrolled" }, "TRICARE West": { status: "not_enrolled" },
      "BCBS Texas": { status: "not_enrolled" }, "Aetna": { status: "not_enrolled" },
      "Cigna": { status: "not_enrolled" },
      "PA Blue Shield": { status: "issue", auth_required: true, issue_title: "Non-covered benefit or OON — $360 denied", issue_detail: "Claim for DOS 10/15/2025 ($360 billed, 97151, F84.0) returned PR-204 (service not covered under patient's current benefit plan) with RARCs N196 and N570. The patient has dual PA Blue Shield coverage under group PZU361. Given Pennsylvania's ABA insurance mandate, OON is more likely than a true plan exclusion for a fully insured plan.", action: "Contact PA Blue Shield to confirm whether the denial is due to OON status or a plan-level ABA exclusion. If OON: initiate contracting or appeal with in-network exception documentation. Check whether Pennsylvania ABA mandate requires coverage under this plan type." },
      "Scott & White": { status: "not_enrolled" },
    }
  },
  {
    npi: "1922457688", name: "Provider J", role: "BCBA", billing_entity: "Harvi Technologies Inc",
    flags: [],
    enrollment: {
      "CO Medicaid": { status: "not_enrolled" }, "TRICARE West": { status: "not_enrolled" },
      "BCBS Texas": { status: "not_enrolled" }, "Aetna": { status: "not_enrolled" },
      "Cigna": { status: "not_enrolled" }, "PA Blue Shield": { status: "not_enrolled" },
      "Scott & White": { status: "enrolled", auth_required: false, issue_title: null, issue_detail: null, action: null },
    }
  },
];

const STATUS_CONFIG = {
  enrolled:     { label: "Enrolled",  bg: "#3B6D1120", color: "#3B6D11", dot: "#3B6D11" },
  issue:        { label: "Issue",     bg: "#BA751720", color: "#BA7517", dot: "#BA7517" },
  blocked:      { label: "Blocked",   bg: "#A32D2D20", color: "#A32D2D", dot: "#A32D2D" },
  not_enrolled: { label: "—",         bg: "transparent", color: "var(--color-text-tertiary)", dot: "var(--color-border-secondary)" },
};

export default function Roster() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);

  const filtered = PROVIDERS.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.npi.includes(search);
    const matchStatus = filterStatus === "all" ||
      (filterStatus === "issues" && p.flags.length > 0) ||
      (filterStatus === "blocked" && Object.values(p.enrollment).some(e => e.status === "blocked")) ||
      (filterStatus === "clean" && p.flags.length === 0);
    return matchSearch && matchStatus;
  });

  const totalBlocked = PROVIDERS.filter(p => Object.values(p.enrollment).some(e => e.status === "blocked")).length;
  const totalIssues = PROVIDERS.filter(p => p.flags.length > 0).length;
  const totalClean = PROVIDERS.filter(p => p.flags.length === 0).length;

  return (
    <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Provider Contracting & Enrollment Roster</h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>Source of truth for NPI enrollment validator · Click any Issue or Blocked cell for detail</p>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '0.5px solid rgba(0,0,0,0.25)', borderRadius: 12, padding: '20px 22px', maxWidth: 440, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{modal.payer}</span>
                  <span style={{ fontSize: 11, background: STATUS_CONFIG[modal.status].bg, color: STATUS_CONFIG[modal.status].color, padding: '2px 8px', borderRadius: 4 }}>{STATUS_CONFIG[modal.status].label}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{modal.provider}</div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-secondary)', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>{modal.issue_title}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>{modal.issue_detail}</div>
            <div style={{ background: modal.status === 'blocked' ? '#A32D2D10' : '#BA751710', border: '0.5px solid ' + (modal.status === 'blocked' ? '#A32D2D40' : '#BA751740'), borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: modal.status === 'blocked' ? '#A32D2D' : '#BA7517', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Required action</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{modal.action}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8, marginBottom: '1.25rem' }}>
        {[
          { label: "Total providers", value: PROVIDERS.length, color: "var(--color-text-primary)" },
          { label: "Blocked", value: totalBlocked, color: "#A32D2D" },
          { label: "Active issues", value: totalIssues, color: "#BA7517" },
          { label: "Clean", value: totalClean, color: "#3B6D11" },
        ].map((m, i) => (
          <div key={i} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: m.color, marginTop: 2 }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input placeholder="Search by name or NPI..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        {["all","issues","blocked","clean"].map(f => (
          <button key={f} onClick={() => setFilterStatus(f)} style={{ fontSize: 12, padding: '4px 12px', background: filterStatus === f ? 'var(--color-background-secondary)' : 'none', fontWeight: filterStatus === f ? 500 : 400 }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Provider / NPI</th>
              {PAYERS.map(p => (
                <th key={p} style={{ textAlign: 'center', padding: '6px 6px', fontWeight: 500, color: 'var(--color-text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>{p}</th>
              ))}
              <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Flags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={i} onClick={() => setSelected(selected?.npi === p.npi ? null : p)} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', cursor: 'pointer', background: selected?.npi === p.npi ? 'var(--color-background-secondary)' : 'transparent' }}>
                <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{p.npi} · {p.role}</div>
                </td>
                {PAYERS.map(payer => {
                  const enr = p.enrollment[payer];
                  const cfg = STATUS_CONFIG[enr.status];
                  const clickable = enr.status === 'issue' || enr.status === 'blocked';
                  return (
                    <td key={payer} style={{ textAlign: 'center', padding: '10px 6px' }}>
                      <div onClick={clickable ? (e) => { e.stopPropagation(); setModal({ payer, provider: p.name + ' · ' + p.npi, status: enr.status, issue_title: enr.issue_title, issue_detail: enr.issue_detail, action: enr.action }); } : undefined}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cfg.bg, color: cfg.color, fontSize: 11, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap', cursor: clickable ? 'pointer' : 'default', textDecoration: clickable ? 'underline dotted' : 'none' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, minWidth: 5 }} />
                        {cfg.label}
                      </div>
                    </td>
                  );
                })}
                <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                  {p.flags.length > 0
                    ? <span style={{ background: '#A32D2D20', color: '#A32D2D', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{p.flags.length} flag{p.flags.length > 1 ? 's' : ''}</span>
                    : <span style={{ color: '#3B6D11', fontSize: 11 }}>✓ Clean</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ marginTop: '1.25rem', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ background: 'var(--color-background-secondary)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{selected.name}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 10 }}>NPI: {selected.npi} · {selected.role} · {selected.billing_entity}</span>
            </div>
            <button onClick={() => setSelected(null)} style={{ fontSize: 12 }}>Close</button>
          </div>
          <div style={{ padding: '14px 16px' }}>
            {selected.flags.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active flags</div>
                {selected.flags.map((f, i) => (
                  <div key={i} style={{ background: '#A32D2D10', color: '#A32D2D', fontSize: 12, padding: '6px 10px', borderRadius: 4, marginBottom: 4, border: '0.5px solid #A32D2D30' }}>{f}</div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Payer enrollment detail</div>
            {PAYERS.map(payer => {
              const enr = selected.enrollment[payer];
              const cfg = STATUS_CONFIG[enr.status];
              if (enr.status === 'not_enrolled') return null;
              return (
                <div key={payer} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'var(--color-background-secondary)', borderRadius: 6, marginBottom: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, minWidth: 120 }}>{payer}</span>
                  <span style={{ fontSize: 11, background: cfg.bg, color: cfg.color, padding: '2px 7px', borderRadius: 3 }}>{cfg.label}</span>
                  {enr.auth_required && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Auth required</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.25rem', background: 'var(--color-background-secondary)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
        This roster is the source of truth for the NPI enrollment validator automation. Issue and Blocked cells are clickable — each contains the specific denial pattern, root cause, and required action drawn from the claims dataset.
      </div>
    </div>
  );
}
