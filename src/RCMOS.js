import React, { useState } from 'react';

const TABS = ["Claim QA", "Auth Tracker", "Eligibility Tracker", "Payer Rules", "Recovery Queue", "Automation"];

const QA_RULES = {
  "Colorado Medicaid": [
    { id: 1, category: "Authorization", check: "Prior auth obtained for CPT 97151 (required every 6 months)", critical: true },
    { id: 2, category: "Authorization", check: "Auth number documented on claim before submission", critical: true },
    { id: 3, category: "Eligibility", check: "Member eligibility verified within 3 days of DOS", critical: true },
    { id: 4, category: "Eligibility", check: "Medicaid plan subtype confirmed (State Plan vs. HCBS waiver)", critical: true },
    { id: 5, category: "Coding", check: "97151 override tag applied in Candid if applicable", critical: false },
    { id: 6, category: "Coding", check: "Diagnosis code supports ABA medical necessity (F84.0, F90.x, etc.)", critical: true },
    { id: 7, category: "Provider", check: "Rendering NPI active and enrolled with CO Medicaid", critical: true },
    { id: 8, category: "Provider", check: "Membership eligibility tag resolved before submission", critical: true },
    { id: 9, category: "Billing", check: "Place of service code matches service location", critical: false },
    { id: 10, category: "Billing", check: "Service line quantity matches session documentation", critical: false },
  ],
  "TRICARE West": [
    { id: 1, category: "Credentialing", check: "Rendering provider fully credentialed with TRICARE West (PR-170 blocker)", critical: true },
    { id: 2, category: "Credentialing", check: "Provider type approved for ABA services under TRICARE", critical: true },
    { id: 3, category: "Authorization", check: "Prior auth obtained — TRICARE requires auth for all ABA", critical: true },
    { id: 4, category: "Eligibility", check: "Beneficiary TRICARE eligibility confirmed (active duty vs. retired)", critical: true },
    { id: 5, category: "Coding", check: "Modifier HO present on 97151/97153 where required", critical: true },
    { id: 6, category: "Coding", check: "CO-272 / CO-16 history checked — confirm billing format", critical: false },
    { id: 7, category: "Billing", check: "submitted-to-avoid-tf tag reviewed before submission", critical: false },
  ],
  "Aetna": [
    { id: 1, category: "Network", check: "Rendering provider in-network confirmed (PR-242 risk)", critical: true },
    { id: 2, category: "Network", check: "Active contract on file for billing provider TIN", critical: true },
    { id: 3, category: "Eligibility", check: "Plan type confirmed — self-funded vs. fully insured", critical: true },
    { id: 4, category: "Authorization", check: "Auth obtained — Aetna limits 90791 to once per 6 months per member", critical: true },
    { id: 5, category: "Coding", check: "Modifier 95 present for telehealth if applicable", critical: false },
    { id: 6, category: "Coding", check: "Diagnosis supports ABA coverage under plan benefit", critical: true },
  ],
  "BCBS Texas": [
    { id: 1, category: "Eligibility", check: "BlueCard alpha prefix confirmed — verify before submission", critical: true },
    { id: 2, category: "Authorization", check: "Auth obtained through home plan (not local plan)", critical: true },
    { id: 3, category: "ERA", check: "ERA enrollment active in Candid for this payer ID (CO-B11 risk)", critical: true },
    { id: 4, category: "Coding", check: "Modifier HO on 97151/97153 per BCBS TX policy", critical: true },
    { id: 5, category: "Deductible", check: "Patient deductible status checked — PR-1 risk on HDHP plans", critical: false },
    { id: 6, category: "Billing", check: "Group number on file matches BCBS TX records", critical: false },
  ],
  "Pennsylvania Blue Shield": [
    { id: 1, category: "Network", check: "Rendering provider credentialed and in-network with PA Blue Shield", critical: true },
    { id: 2, category: "Coverage", check: "ABA therapy confirmed as covered benefit under member plan", critical: true },
    { id: 3, category: "Authorization", check: "Prior auth obtained — PR-204 may indicate OON or plan exclusion", critical: true },
    { id: 4, category: "Eligibility", check: "Confirm secondary payer coordination if dual coverage", critical: false },
  ],
};

const AUTH_DATA = [
  { id: "AUTH-001", patient: "Aiden M.", payer: "CO Medicaid", plan: "Medicaid BH - HH", cpt: "97151", auth_num: "PENDING", units_auth: 24, units_used: 18, dos_start: "10/01/2025", expiry: "03/31/2026", status: "active", alert: null },
  { id: "AUTH-002", patient: "Maya K.", payer: "CO Medicaid", plan: "HCBS Ext Support", cpt: "97151", auth_num: "MISSING", units_auth: 0, units_used: 4, dos_start: "10/01/2025", expiry: "—", status: "missing", alert: "PI-15 denial risk — no auth on file" },
  { id: "AUTH-003", patient: "Olivia S.", payer: "CO Medicaid", plan: "Medicaid State Plan", cpt: "97153", auth_num: "CO-2025-9912", units_auth: 40, units_used: 38, dos_start: "10/01/2025", expiry: "11/15/2025", status: "expiring", alert: "Units nearly exhausted — request renewal now" },
  { id: "AUTH-004", patient: "Noah P.", payer: "TRICARE West", plan: "PLAN 311 Prime", cpt: "97151", auth_num: "BLOCKED", units_auth: 0, units_used: 7, dos_start: "10/01/2025", expiry: "—", status: "blocked", alert: "Provider not credentialed — stop submitting" },
  { id: "AUTH-005", patient: "Liam T.", payer: "Aetna", plan: "Choice POS II", cpt: "97151", auth_num: "AET-44821", units_auth: 16, units_used: 6, dos_start: "10/07/2025", expiry: "04/06/2026", status: "active", alert: null },
  { id: "AUTH-006", patient: "Ava C.", payer: "CO Medicaid", plan: "Medicaid BH - MH", cpt: "97151", auth_num: "MISSING", units_auth: 0, units_used: 8, dos_start: "10/01/2025", expiry: "—", status: "missing", alert: "PI-15 denial risk — obtain auth retroactively or appeal" },
];

const ELIGIBILITY_DATA = [
  { id: "ELG-001", patient: "Aiden M.", dob: "03/12/2018", age: 7, payer: "CO Medicaid", plan: "Medicaid BH - HH", member_id: "CO-8812345", plan_type: "MC", aba_covered: true, auth_required: true, deductible: "N/A", copay: "N/A", oop_max: "N/A", coverage_start: "01/01/2025", last_verified: "10/01/2025", next_verify: "11/01/2025", status: "overdue", flag: "Monthly re-verification due — Medicaid coverage subject to redetermination" },
  { id: "ELG-002", patient: "Sofia R.", dob: "07/22/2019", age: 6, payer: "BCBS Texas", plan: "BCBS HDHP H300", member_id: "XCF884321", plan_type: "CI", aba_covered: true, auth_required: true, deductible: "$3,000 / $1,847 remaining", copay: "N/A", oop_max: "$6,000", coverage_start: "01/01/2025", last_verified: "10/07/2025", next_verify: "01/07/2026", status: "verified", flag: null },
  { id: "ELG-003", patient: "Liam T.", dob: "11/05/2017", age: 7, payer: "Aetna", plan: "Choice POS II", member_id: "W194830012", plan_type: "CI", aba_covered: true, auth_required: true, deductible: "$1,500 / $600 remaining", copay: "$30/visit", oop_max: "$5,000", coverage_start: "01/01/2025", last_verified: "10/14/2025", next_verify: "01/14/2026", status: "verified", flag: null },
  { id: "ELG-004", patient: "Maya K.", dob: "04/30/2020", age: 4, payer: "CO Medicaid", plan: "HCBS Ext Support Waiver", member_id: "CO-7743221", plan_type: "MC", aba_covered: true, auth_required: true, deductible: "N/A", copay: "N/A", oop_max: "N/A", coverage_start: "07/01/2025", last_verified: "09/15/2025", next_verify: "10/15/2025", status: "overdue", flag: "Re-verification overdue — membership-eligibility denials active. Verify demographics match CO Medicaid records exactly." },
  { id: "ELG-005", patient: "Noah P.", dob: "08/14/2018", age: 6, payer: "TRICARE West", plan: "PLAN 311 Prime", member_id: "TW-3301847", plan_type: "CI", aba_covered: true, auth_required: true, deductible: "N/A", copay: "$25/visit", oop_max: "$1,000", coverage_start: "01/01/2025", last_verified: "10/04/2025", next_verify: "01/04/2026", status: "flag", flag: "ABA coverage confirmed but provider not yet credentialed with TRICARE West — hold all claims until credentialing resolves" },
  { id: "ELG-006", patient: "Isabella F.", dob: "02/09/2019", age: 6, payer: "Cigna", plan: "Open Access Plus", member_id: "U48839201", plan_type: "CI", aba_covered: true, auth_required: true, deductible: "$2,000 / $2,000 remaining", copay: "20% coinsurance", oop_max: "$7,000", coverage_start: "01/01/2025", last_verified: "10/14/2025", next_verify: "01/14/2026", status: "verified", flag: null },
  { id: "ELG-007", patient: "Ethan B.", dob: "06/18/2016", age: 9, payer: "PA Blue Shield", plan: "BC PPO PZU361", member_id: "PAS-1109832", plan_type: "CI", aba_covered: null, auth_required: true, deductible: "Unknown", copay: "Unknown", oop_max: "Unknown", coverage_start: "01/01/2025", last_verified: "10/15/2025", next_verify: "01/15/2026", status: "flag", flag: "ABA benefit unconfirmed — PR-204 denial active. Contact PA Blue Shield to confirm OON vs. plan exclusion before resubmitting" },
  { id: "ELG-008", patient: "Olivia S.", dob: "09/27/2020", age: 4, payer: "CO Medicaid", plan: "Medicaid State Plan - MH", member_id: "CO-5521987", plan_type: "MC", aba_covered: true, auth_required: true, deductible: "N/A", copay: "N/A", oop_max: "N/A", coverage_start: "03/01/2025", last_verified: "10/10/2025", next_verify: "11/10/2025", status: "verified", flag: null },
  { id: "ELG-009", patient: "Lucas W.", dob: "12/03/2017", age: 7, payer: "BCBS Texas", plan: "PPO Medical Maryland", member_id: "XCF001697", plan_type: "CI", aba_covered: true, auth_required: true, deductible: "$1,000 / $0 remaining", copay: "N/A", oop_max: "$4,000", coverage_start: "01/01/2025", last_verified: "10/06/2025", next_verify: "01/06/2026", status: "verified", flag: null },
  { id: "ELG-010", patient: "Ava C.", dob: "05/11/2021", age: 3, payer: "CO Medicaid", plan: "Medicaid BH - MH", member_id: "CO-9934512", plan_type: "MC", aba_covered: true, auth_required: true, deductible: "N/A", copay: "N/A", oop_max: "N/A", coverage_start: "05/15/2025", last_verified: "10/16/2025", next_verify: "11/16/2025", status: "verified", flag: null },
];

const PAYER_RULES_SUMMARY = [
  {
    payer: "Colorado Medicaid", plan_type: "Medicaid", color: "#185FA5",
    rules: [
      { label: "Auth required for 97151", detail: "Every 6 months per member. Missing auth → PI-15 denial.", critical: true },
      { label: "97151 override tag in Candid", detail: "Apply tag in Candid for approved cases.", critical: false },
      { label: "Rendering NPI enrollment", detail: "Each rendering provider must be individually enrolled. PI-16 + membership-eligibility = enrollment or eligibility gap.", critical: true },
      { label: "CO-45 contractual adjustment", detail: "Standard Medicaid write-off. N381 RARC is informational — not a denial.", critical: false },
    ]
  },
  {
    payer: "TRICARE West", plan_type: "Military / CHAMPUS", color: "#A32D2D",
    rules: [
      { label: "Credentialing required before ANY submission", detail: "PR-170 = provider type not approved. Full stop until credentialing is confirmed.", critical: true },
      { label: "ABA auth required for all services", detail: "No auth = automatic denial.", critical: true },
      { label: "Modifier HO on ABA codes", detail: "97151/97153 require HO modifier. Missing = CO-272 billing error.", critical: true },
    ]
  },
  {
    payer: "Aetna", plan_type: "Commercial", color: "#533AB7",
    rules: [
      { label: "90791 limited once per 6 months", detail: "Aetna 2025 policy — 1x per member per 6 months regardless of provider.", critical: true },
      { label: "Network status — PR-242 risk", detail: "OON = PR-242 denial. Confirm in-network before submission.", critical: true },
      { label: "Telehealth modifier 95", detail: "Required for telehealth services.", critical: false },
    ]
  },
  {
    payer: "BCBS Texas", plan_type: "Commercial (BlueCard)", color: "#0F6E56",
    rules: [
      { label: "BlueCard alpha prefix routing", detail: "Auth must route through home plan. Verify alpha prefix first.", critical: true },
      { label: "ERA enrollment in Candid", detail: "CO-B11 = incomplete ERA. Confirm ERA enrollment active for each BCBS TX payer ID.", critical: true },
      { label: "Modifier HO on ABA codes", detail: "Same requirement as TRICARE.", critical: true },
    ]
  },
];

const RECOVERY_QUEUE = [
  { priority: 1, claim_id: "4d3e8a42", patient: "Patient G", payer: "CO Medicaid", denial: "PI-15", amount: 1129.54, dos: "10/15/2025", action: "Obtain retro auth or appeal with medical necessity", owner: "RCM", age: 11, appealable: true },
  { priority: 2, claim_id: "dc632038", patient: "Patient H", payer: "CO Medicaid", denial: "PI-16", amount: 1129.54, dos: "10/16/2025", action: "Verify patient demographics + CO Medicaid coverage status", owner: "Eligibility", age: 11, appealable: false },
  { priority: 3, claim_id: "288466e1", patient: "Patient I", payer: "TRICARE West", denial: "PR-170", amount: 800, dos: "10/11/2025", action: "Complete provider credentialing — do not resubmit until approved", owner: "Credentialing", age: 17, appealable: false },
  { priority: 4, claim_id: "6704ffd5", patient: "Patient J", payer: "TRICARE West", denial: "PR-170", amount: 800, dos: "10/14/2025", action: "Hold — same credentialing block", owner: "Credentialing", age: 14, appealable: false },
  { priority: 5, claim_id: "2748862b", patient: "Patient K", payer: "CO Medicaid", denial: "PI-15", amount: 1129.54, dos: "10/16/2025", action: "Obtain retro auth — same pattern as priority 1", owner: "RCM", age: 11, appealable: true },
  { priority: 6, claim_id: "bf009845", patient: "Patient L", payer: "Aetna", denial: "PR-242", amount: 240, dos: "10/16/2025", action: "Confirm network status — appeal if provider is in-network", owner: "Contracting", age: 14, appealable: true },
  { priority: 7, claim_id: "816191c9", patient: "Patient M", payer: "PA Blue Shield", denial: "PR-204", amount: 360, dos: "10/15/2025", action: "Confirm OON vs. plan exclusion — appeal with coverage determination", owner: "RCM", age: 17, appealable: true },
  { priority: 8, claim_id: "e1fedd43", patient: "Patient N", payer: "CO Medicaid", denial: "PI-16", amount: 1129.54, dos: "10/16/2025", action: "Verify patient demographics + coverage — check rendering NPI enrollment", owner: "Eligibility", age: 11, appealable: false },
  { priority: 9, claim_id: "d265ba5c", patient: "Patient O", payer: "CO Medicaid", denial: "PI-16+PI-15", amount: 1129.54, dos: "10/01/2025", action: "Dual denial — verify eligibility first, then obtain auth", owner: "Eligibility", age: 25, appealable: false },
];

const AUTOMATIONS = [
  { id: "AUTO-001", name: "TRICARE HO modifier rule", trigger: "Claim created with CPT 97151 or 97153 for a TRICARE payer", what: "Configure a rule in Candid's rules engine to auto-apply modifier HO to 97151 and 97153 on all TRICARE claims before submission.", system: "Candid Health — Rules Engine", type: "Configure in Candid", complexity: "Low", denial_codes: ["CO-272", "CO-16"], revenue_impact: "Eliminates TRICARE modifier error denials", roi: "High", phase: 1 },
  { id: "AUTO-002", name: "Credentialing status gate", trigger: "Claim generation attempted for any rendering NPI + payer combination", what: "Keep provider roster current in Candid. Configure a rule that blocks claim generation when rendering NPI credentialing status is not Active for the target payer.", system: "Candid Health — Provider Roster + Rules Engine", type: "Configure in Candid", complexity: "Low", denial_codes: ["PR-170"], revenue_impact: "$8,660 in current TRICARE denials + prevents all future PR-170 class denials", roi: "High", phase: 1 },
  { id: "AUTO-003", name: "ERA enrollment enforcement", trigger: "New payer activated in Candid OR first claim submitted to a payer", what: "Audit all active payers in Candid for ERA enrollment completeness. Configure a submission rule that blocks claims for any payer without confirmed ERA enrollment active.", system: "Candid Health — ERA Enrollment + Rules Engine", type: "Configure in Candid", complexity: "Low", denial_codes: ["CO-B11"], revenue_impact: "$1,080 in current stalled claims + prevents ERA gaps on all new payers", roi: "High", phase: 1 },
  { id: "AUTO-004", name: "Eligibility hard gate", trigger: "Claim created in Candid", what: "Configure Candid's eligibility check to treat a failed or unverified eligibility result as a submission block rather than a warning.", system: "Candid Health — Eligibility + Rules Engine", type: "Configure in Candid", complexity: "Low", denial_codes: ["PI-16", "membership-eligibility"], revenue_impact: "$3,649 in current membership-eligibility denials", roi: "High", phase: 1 },
  { id: "AUTO-005", name: "Denial tag routing workflow", trigger: "Claim tagged with membership-eligibility, PI-15, PR-170, or CO-B11 in Candid", what: "Configure Candid workflow rules to automatically route denial-tagged claims to the correct owner queue. High-value denials flagged for same-day action.", system: "Candid Health — Workflow Automation", type: "Configure in Candid", complexity: "Low", denial_codes: ["All"], revenue_impact: "Reduces denial resolution time — faster routing, fewer TFL misses", roi: "Medium", phase: 1 },
  { id: "AUTO-006", name: "Auth visibility tracker + Silna queue", trigger: "Daily — monitors all open authorization requests and active auth expiry/utilization", what: "Build a lightweight internal tracker showing every authorization in Silna's queue with TAT status. Track active auth unit utilization and expiry — alert at 80% utilization and 30 days to expiry.", system: "Internal tracker (Notion, Sheets, or lightweight app)", type: "Build new", complexity: "Low", denial_codes: ["PI-15"], revenue_impact: "$9,036 in current PI-15 denials preventable + protects in-flight authorized revenue", roi: "High", phase: 2 },
  { id: "AUTO-007", name: "EHR scheduling auth gate", trigger: "Session scheduled for a patient requiring prior authorization", what: "Configure a check in the EHR scheduling workflow that blocks session confirmation when no active authorization is on file for the patient's payer and CPT code.", system: "EHR — Scheduling module", type: "Build / configure in EHR", complexity: "Medium", denial_codes: ["PI-15"], revenue_impact: "Prevents PI-15 denials at the source", roi: "Very High", phase: 2 },
  { id: "AUTO-008", name: "Post-note documentation compliance checker", trigger: "Provider submits a session note or clinical document in EHR", what: "Automated QA check against the Colorado Medicaid documentation standard when a provider finalizes a clinical note. Flags missing required elements before the note is locked.", system: "EHR — Clinical documentation module", type: "Build / configure in EHR", complexity: "Medium", denial_codes: ["Audit risk — all payers"], revenue_impact: "Prevents retrospective audit recoupment across entire claim history", roi: "High", phase: 2 },
  { id: "AUTO-009", name: "AI-powered pre-submission claim QA", trigger: "Claim queued for submission in Candid", what: "An AI layer built on top of Candid's rules engine that reviews every claim against the payer rules knowledge base before submission. Catches edge cases the rules engine misses.", system: "Candid Health — AI layer on rules engine", type: "AI-assisted build", complexity: "High", denial_codes: ["All"], revenue_impact: "Estimated 15–25% improvement in clean claim rate at scale", roi: "Very High", phase: 3 },
];

const statusColor = { active: "#3B6D11", missing: "#A32D2D", expiring: "#BA7517", blocked: "#A32D2D" };
const statusLabel = { active: "Active", missing: "Missing", expiring: "Expiring soon", blocked: "Blocked" };
const eligibilityStatusConfig = {
  verified: { label: "Verified", color: "#3B6D11", bg: "#3B6D1120" },
  flag: { label: "Action required", color: "#A32D2D", bg: "#A32D2D20" },
  overdue: { label: "Re-verify now", color: "#BA7517", bg: "#BA751720" },
};
const typeColors = {
  "Configure in Candid": { bg: "#185FA520", color: "#185FA5" },
  "Build new": { bg: "#BA751720", color: "#BA7517" },
  "Build / configure in EHR": { bg: "#533AB720", color: "#533AB7" },
  "AI-assisted build": { bg: "#A32D2D20", color: "#A32D2D" },
};

export default function RCMOS() {
  const [tab, setTab] = useState(0);
  const [selectedPayer, setSelectedPayer] = useState("Colorado Medicaid");
  const [checks, setChecks] = useState({});
  const [authFilter, setAuthFilter] = useState("all");
  const [queueFilter, setQueueFilter] = useState("all");

  const toggleCheck = (id) => setChecks(c => ({ ...c, [id]: !c[id] }));
  const rules = QA_RULES[selectedPayer] || [];
  const completed = rules.filter(r => checks[r.id]).length;
  const filteredAuth = authFilter === "all" ? AUTH_DATA : AUTH_DATA.filter(a => a.status === authFilter);
  const filteredQueue = queueFilter === "all" ? RECOVERY_QUEUE : RECOVERY_QUEUE.filter(r => r.owner === queueFilter);
  const totalAtRisk = RECOVERY_QUEUE.reduce((s, r) => s + r.amount, 0);
  const sortedEligibility = [...ELIGIBILITY_DATA].sort((a, b) => {
    const order = { flag: 0, overdue: 1, verified: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>RCM Operating System</h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>Alpaca Health · Oct 2025</p>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid var(--color-border-tertiary)', marginBottom: '1.25rem', overflowX: 'auto' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{ background: 'none', border: 'none', padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: tab === i ? 500 : 400, color: tab === i ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', borderBottom: tab === i ? '2px solid var(--color-text-primary)' : '2px solid transparent', borderRadius: 0, marginBottom: -1, whiteSpace: 'nowrap' }}>{t}</button>
        ))}
      </div>

      {/* TAB 0 — CLAIM QA */}
      {tab === 0 && (
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select value={selectedPayer} onChange={e => { setSelectedPayer(e.target.value); setChecks({}); }} style={{ minWidth: 200, width: 'auto' }}>
              {Object.keys(QA_RULES).map(p => <option key={p}>{p}</option>)}
            </select>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{completed}/{rules.length} checks passed</span>
            <div style={{ flex: 1, height: 4, background: 'var(--color-background-secondary)', borderRadius: 2, minWidth: 80 }}>
              <div style={{ width: (rules.length ? completed / rules.length * 100 : 0) + '%', height: '100%', background: completed === rules.length ? '#3B6D11' : '#185FA5', borderRadius: 2, transition: 'width 0.2s' }} />
            </div>
            {completed === rules.length && <span style={{ fontSize: 12, color: '#3B6D11', fontWeight: 500 }}>Ready to submit</span>}
          </div>
          <div style={{ background: '#185FA510', border: '0.5px solid #185FA530', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', fontSize: 12, color: '#185FA5', lineHeight: 1.6 }}>
            These checks should also be configured in Candid's rules engine — this checklist is your manual backup and staff training tool. Any rule marked "Required" is a candidate for a Candid pre-submission rule.
          </div>
          {["Authorization","Credentialing","Network","Eligibility","ERA","Coverage","Coding","Provider","Billing","Deductible"].map(cat => {
            const catRules = rules.filter(r => r.category === cat);
            if (!catRules.length) return null;
            return (
              <div key={cat} style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{cat}</div>
                {catRules.map(r => (
                  <div key={r.id} onClick={() => toggleCheck(r.id)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 6, cursor: 'pointer', background: checks[r.id] ? 'var(--color-background-secondary)' : 'transparent', marginBottom: 2 }}>
                    <div style={{ width: 16, height: 16, minWidth: 16, borderRadius: 3, border: '1.5px solid ' + (checks[r.id] ? '#3B6D11' : r.critical ? '#A32D2D' : 'var(--color-border-secondary)'), background: checks[r.id] ? '#3B6D11' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                      {checks[r.id] && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, textDecoration: checks[r.id] ? 'line-through' : 'none', color: checks[r.id] ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }}>{r.check}</span>
                      {r.critical && !checks[r.id] && <span style={{ fontSize: 10, background: '#A32D2D20', color: '#A32D2D', padding: '1px 6px', borderRadius: 3, marginLeft: 6 }}>Required</span>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          <button onClick={() => setChecks({})} style={{ fontSize: 12, marginTop: 8 }}>Reset checklist</button>
        </div>
      )}

      {/* TAB 1 — AUTH TRACKER */}
      {tab === 1 && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {["all","missing","expiring","blocked","active"].map(f => (
              <button key={f} onClick={() => setAuthFilter(f)} style={{ fontSize: 12, padding: '4px 12px', background: authFilter === f ? 'var(--color-background-secondary)' : 'none', fontWeight: authFilter === f ? 500 : 400 }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {filteredAuth.map((a, i) => (
            <div key={i} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '12px 14px', marginBottom: 8, border: a.alert ? '0.5px solid ' + statusColor[a.status] + '50' : '0.5px solid var(--color-border-tertiary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{a.patient}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 8 }}>{a.payer} · {a.plan} · {a.cpt}</span>
                </div>
                <span style={{ fontSize: 11, background: statusColor[a.status] + '20', color: statusColor[a.status], padding: '2px 8px', borderRadius: 4 }}>{statusLabel[a.status]}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                <span>Auth #: <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{a.auth_num}</span></span>
                <span>Units: {a.units_used} / {a.units_auth || '—'}</span>
                <span>Expiry: {a.expiry}</span>
              </div>
              {a.alert && <div style={{ marginTop: 8, fontSize: 12, color: statusColor[a.status], background: statusColor[a.status] + '10', padding: '6px 10px', borderRadius: 4 }}>{a.alert}</div>}
              {a.status === 'expiring' && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 4, background: 'var(--color-background-primary)', borderRadius: 2 }}>
                    <div style={{ width: Math.round((a.units_used / a.units_auth) * 100) + '%', height: '100%', background: '#BA7517', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#BA7517' }}>{Math.round((a.units_used / a.units_auth) * 100)}% of authorized units used</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 2 — ELIGIBILITY TRACKER */}
      {tab === 2 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8, marginBottom: '1.25rem' }}>
            {[
              { label: "Active patients", value: ELIGIBILITY_DATA.length, color: "var(--color-text-primary)" },
              { label: "Verified", value: ELIGIBILITY_DATA.filter(e => e.status === 'verified').length, color: "#3B6D11" },
              { label: "Re-verify now", value: ELIGIBILITY_DATA.filter(e => e.status === 'overdue').length, color: "#BA7517" },
              { label: "Action required", value: ELIGIBILITY_DATA.filter(e => e.status === 'flag').length, color: "#A32D2D" },
            ].map((m, i) => (
              <div key={i} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: m.color, marginTop: 2 }}>{m.value}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#185FA510', border: '0.5px solid #185FA530', borderRadius: 8, padding: '10px 12px', marginBottom: '1.25rem', fontSize: 12, color: '#185FA5', lineHeight: 1.6 }}>
            Verify eligibility at intake and re-verify monthly for all Medicaid patients. In production this tracker connects to a real-time eligibility vendor (Sohar or comparable) for automated verification and status updates.
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  {["Patient", "DOB / Age", "Payer & Plan", "Member ID", "ABA Covered", "Deductible", "Copay", "Last Verified", "Next Due", "Status"].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500, fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedEligibility.map((e, i) => {
                  const sc = eligibilityStatusConfig[e.status];
                  return (
                    <React.Fragment key={i}>
                      <tr style={{ borderBottom: e.flag ? 'none' : '0.5px solid var(--color-border-tertiary)' }}>
                        <td style={{ padding: '10px', fontWeight: 500, whiteSpace: 'nowrap' }}>{e.patient}</td>
                        <td style={{ padding: '10px', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{e.dob}<br /><span style={{ fontSize: 11 }}>Age {e.age}</span></td>
                        <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                          <div>{e.payer}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{e.plan}</div>
                        </td>
                        <td style={{ padding: '10px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>{e.member_id}</td>
                        <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: e.aba_covered === true ? '#3B6D11' : e.aba_covered === null ? '#BA7517' : '#A32D2D', fontWeight: 500 }}>
                            {e.aba_covered === true ? 'Yes' : e.aba_covered === null ? 'Unconfirmed' : 'No'}
                          </span>
                          {e.auth_required && <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Auth required</div>}
                        </td>
                        <td style={{ padding: '10px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{e.deductible}</td>
                        <td style={{ padding: '10px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{e.copay}</td>
                        <td style={{ padding: '10px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{e.last_verified}</td>
                        <td style={{ padding: '10px', fontWeight: 500, color: e.status === 'overdue' ? '#BA7517' : 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{e.next_verify}</td>
                        <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                          <span style={{ background: sc.bg, color: sc.color, fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{sc.label}</span>
                        </td>
                      </tr>
                      {e.flag && (
                        <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                          <td colSpan={10} style={{ padding: '0 10px 10px', fontSize: 12, color: sc.color }}>
                            <div style={{ background: sc.bg, borderRadius: 6, padding: '7px 10px' }}>{e.flag}</div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3 — PAYER RULES */}
      {tab === 3 && (
        <div>
          <div style={{ background: '#BA751710', border: '0.5px solid #BA751740', borderRadius: 8, padding: '10px 12px', marginBottom: '1.25rem', fontSize: 12, color: '#BA7517', lineHeight: 1.6 }}>
            Quick reference summary. For full rule detail, Candid action steps, and system flags use the Payer Rules KB tab.
          </div>
          {PAYER_RULES_SUMMARY.map((p, i) => (
            <div key={i} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p.payer}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{p.plan_type}</span>
              </div>
              {p.rules.map((r, j) => (
                <div key={j} style={{ display: 'flex', gap: 10, padding: '8px 10px', borderBottom: '0.5px solid var(--color-border-tertiary)', alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, minWidth: 6, borderRadius: '50%', background: r.critical ? '#A32D2D' : 'var(--color-border-secondary)', marginTop: 5 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{r.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8 }}>Red dot = denial-blocking rule · Gray dot = best practice</div>
        </div>
      )}

      {/* TAB 4 — RECOVERY QUEUE */}
      {tab === 4 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, marginBottom: '1.25rem' }}>
            {[
              { label: "Total at risk", value: "$" + totalAtRisk.toLocaleString(undefined, { maximumFractionDigits: 0 }), color: "#A32D2D" },
              { label: "Appealable claims", value: RECOVERY_QUEUE.filter(r => r.appealable).length + " claims", color: "#3B6D11" },
              { label: "Avg claim age", value: Math.round(RECOVERY_QUEUE.reduce((s, r) => s + r.age, 0) / RECOVERY_QUEUE.length) + " days", color: "#BA7517" },
            ].map((m, i) => (
              <div key={i} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: m.color, marginTop: 2 }}>{m.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', flexWrap: 'wrap' }}>
            {["all","RCM","Credentialing","Eligibility","Contracting"].map(f => (
              <button key={f} onClick={() => setQueueFilter(f)} style={{ fontSize: 12, padding: '4px 12px', background: queueFilter === f ? 'var(--color-background-secondary)' : 'none', fontWeight: queueFilter === f ? 500 : 400 }}>{f}</button>
            ))}
          </div>
          {filteredQueue.map((r, i) => {
            const c = r.priority <= 3 ? "#A32D2D" : r.priority <= 6 ? "#BA7517" : "#185FA5";
            return (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 22, height: 22, borderRadius: '50%', background: c + '20', color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, marginTop: 2 }}>{r.priority}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{r.patient} · {r.payer}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: c }}>${r.amount.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    <span style={{ background: c + '15', color: c, padding: '1px 6px', borderRadius: 3, marginRight: 6 }}>{r.denial}</span>
                    DOS {r.dos} · {r.age} days · {r.owner}
                    {r.appealable && <span style={{ background: '#3B6D1115', color: '#3B6D11', padding: '1px 6px', borderRadius: 3, marginLeft: 6 }}>Appealable</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 3 }}>{r.action}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 5 — AUTOMATION */}
      {tab === 5 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, marginBottom: '1.25rem' }}>
            {[
              { label: "Phase 1 — Configure Candid", value: "5 items", sub: "Days 1–30", color: "#A32D2D" },
              { label: "Phase 2 — New tooling", value: "3 items", sub: "Days 30–60", color: "#BA7517" },
              { label: "Phase 3 — AI layer", value: "1 item", sub: "Days 60–90", color: "#185FA5" },
            ].map((m, i) => (
              <div key={i} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: m.color, marginTop: 2 }}>{m.value}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{m.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px', marginBottom: '1.25rem', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Configure Candid first — Phase 1 items are all rules engine or workflow configuration tasks, not engineering builds. Buy or build only what Candid genuinely cannot do.
          </div>
          {[1, 2, 3].map(phase => {
            const phaseColor = phase === 1 ? "#A32D2D" : phase === 2 ? "#BA7517" : "#185FA5";
            const phaseLabel = phase === 1 ? "Phase 1 — Configure in Candid (Days 1–30)" : phase === 2 ? "Phase 2 — New tooling (Days 30–60)" : "Phase 3 — AI layer (Days 60–90)";
            return (
              <div key={phase} style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: phaseColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{phaseLabel}</div>
                {AUTOMATIONS.filter(a => a.phase === phase).map((a, i) => {
                  const tc = typeColors[a.type] || { bg: '#88878020', color: '#888780' };
                  return (
                    <div key={i} style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
                      <div style={{ background: 'var(--color-background-secondary)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</span>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: 3 }}>{a.type}</span>
                          <span style={{ fontSize: 11, background: (a.complexity === 'Low' ? '#3B6D11' : a.complexity === 'Medium' ? '#BA7517' : '#A32D2D') + '20', color: a.complexity === 'Low' ? '#3B6D11' : a.complexity === 'Medium' ? '#BA7517' : '#A32D2D', padding: '2px 8px', borderRadius: 3 }}>{a.complexity} complexity</span>
                          <span style={{ fontSize: 11, background: '#3B6D1120', color: '#3B6D11', padding: '2px 8px', borderRadius: 3 }}>ROI: {a.roi}</span>
                        </div>
                      </div>
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Trigger</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{a.trigger}</div>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>What it does</div>
                          <div style={{ fontSize: 12, lineHeight: 1.6 }}>{a.what}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 6, padding: '8px 10px' }}>
                            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Lives in</div>
                            <div style={{ fontSize: 12 }}>{a.system}</div>
                          </div>
                          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 6, padding: '8px 10px' }}>
                            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Addresses</div>
                            <div style={{ fontSize: 12 }}>{a.denial_codes.join(', ')}</div>
                          </div>
                        </div>
                        <div style={{ background: phaseColor + '10', borderRadius: 6, padding: '8px 10px', border: '0.5px solid ' + phaseColor + '30' }}>
                          <div style={{ fontSize: 11, color: phaseColor, marginBottom: 2 }}>Revenue impact</div>
                          <div style={{ fontSize: 12 }}>{a.revenue_impact}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
