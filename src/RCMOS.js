import { useState } from "react";

const TABS = ["Claim QA", "Auth Tracker", "Eligibility Tracker", "Payer Rules", "Recovery Queue", "Automation"];

const QA_RULES = {
  "Colorado Medicaid": [
    { id: 1, category: "Authorization", check: "Prior auth obtained for 97151 (required every 6 months)", critical: true },
    { id: 2, category: "Authorization", check: "Auth number documented on claim / in system before submission", critical: true },
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
    { id: 3, category: "Eligibility", check: "Plan type confirmed — self-funded vs. fully insured (affects auth rules)", critical: true },
    { id: 4, category: "Authorization", check: "Auth obtained — Aetna limits 90791 to once per 6 months per member", critical: true },
    { id: 5, category: "Coding", check: "Modifier 95 present for telehealth if applicable", critical: false },
    { id: 6, category: "Coding", check: "Diagnosis supports ABA coverage under plan benefit", critical: true },
  ],
  "BCBS Texas": [
    { id: 1, category: "Eligibility", check: "BlueCard routing confirmed — verify alpha prefix before submission", critical: true },
    { id: 2, category: "Authorization", check: "Auth obtained through home plan (not local plan)", critical: true },
    { id: 3, category: "ERA", check: "ERA enrollment active in Candid for this payer ID (CO-B11 risk)", critical: true },
    { id: 4, category: "Coding", check: "Modifier HO on 97151/97153 per BCBS TX policy", critical: true },
    { id: 5, category: "Deductible", check: "Patient deductible status checked — PR-1 risk on HDHP plans", critical: false },
    { id: 6, category: "Billing", check: "Group number on file matches BCBS TX records", critical: false },
  ],
  "Pennsylvania Blue Shield": [
    { id: 1, category: "Network", check: "Rendering provider credentialed and in-network with PA Blue Shield", critical: true },
    { id: 2, category: "Coverage", check: "ABA therapy confirmed as covered benefit under member plan", critical: true },
    { id: 3, category: "Authorization", check: "Prior auth obtained and attached — PR-204 may indicate OON or plan exclusion", critical: true },
    { id: 4, category: "Eligibility", check: "Confirm secondary payer coordination if dual coverage", critical: false },
  ],
};

const AUTH_DATA = [
  { id: "AUTH-001", patient: "Patient A", payer: "CO Medicaid", plan: "Medicaid BH - HH", cpt: "97151", auth_num: "PENDING", units_auth: 24, units_used: 18, dos_start: "10/01/2025", expiry: "03/31/2026", status: "active", alert: null },
  { id: "AUTH-002", patient: "Patient B", payer: "CO Medicaid", plan: "HCBS Ext Support", cpt: "97151", auth_num: "MISSING", units_auth: 0, units_used: 4, dos_start: "10/01/2025", expiry: "—", status: "missing", alert: "PI-15 denial risk — no auth on file" },
  { id: "AUTH-003", patient: "Patient C", payer: "CO Medicaid", plan: "Medicaid State Plan", cpt: "97153", auth_num: "CO-2025-9912", units_auth: 40, units_used: 38, dos_start: "10/01/2025", expiry: "11/15/2025", status: "expiring", alert: "Units nearly exhausted — request renewal now" },
  { id: "AUTH-004", patient: "Patient D", payer: "TRICARE West", plan: "PLAN 311 Prime", cpt: "97151", auth_num: "BLOCKED", units_auth: 0, units_used: 7, dos_start: "10/01/2025", expiry: "—", status: "blocked", alert: "Provider not credentialed — stop submitting" },
  { id: "AUTH-005", patient: "Patient E", payer: "Aetna", plan: "Choice POS II", cpt: "97151", auth_num: "AET-44821", units_auth: 16, units_used: 6, dos_start: "10/07/2025", expiry: "04/06/2026", status: "active", alert: null },
  { id: "AUTH-006", patient: "Patient F", payer: "CO Medicaid", plan: "Medicaid BH - MH", cpt: "97151", auth_num: "MISSING", units_auth: 0, units_used: 8, dos_start: "10/01/2025", expiry: "—", status: "missing", alert: "PI-15 denial risk — obtain auth retroactively or appeal" },
];

const PAYER_RULES = [
  {
    payer: "Colorado Medicaid",
    plan_type: "Medicaid",
    color: "#185FA5",
    rules: [
      { label: "Auth required for 97151", detail: "Every 6 months per member. Missing auth → PI-15 denial. Obtain before first claim submission.", critical: true },
      { label: "97151 override tag", detail: "Apply '97151-override' tag in Candid for approved cases. Without it, claim may route incorrectly.", critical: false },
      { label: "Rendering NPI enrollment", detail: "Each rendering provider must be individually enrolled. PI-16 + membership-eligibility tag = enrollment gap.", critical: true },
      { label: "HCBS waiver vs. State Plan", detail: "Reimbursement rates differ by plan subtype. Confirm correct plan at eligibility verification.", critical: false },
      { label: "CO-45 contractual adjustment", detail: "Standard write-off code. N381 RARC is informational — not a denial trigger.", critical: false },
    ]
  },
  {
    payer: "TRICARE West",
    plan_type: "Military / CHAMPUS",
    color: "#A32D2D",
    rules: [
      { label: "Credentialing required before ANY submission", detail: "PR-170 = provider type not approved. Submitting before credentialing is complete wastes claims and creates backlog. Full stop.", critical: true },
      { label: "ABA auth required for all services", detail: "No auth = automatic denial. Auth must route through TRICARE West regional contractor.", critical: true },
      { label: "Modifier HO on ABA codes", detail: "97151/97153 require HO modifier (master's level or above). Missing modifier → CO-272 billing error.", critical: true },
      { label: "CO-272 / CO-16 billing format", detail: "Indicates claim format issue. Check modifier combinations and billing provider credentials.", critical: false },
      { label: "Active duty vs. retired routing", detail: "Plan subtype affects benefit structure and auth pathway. Confirm at eligibility.", critical: false },
    ]
  },
  {
    payer: "Aetna",
    plan_type: "Commercial",
    color: "#533AB7",
    rules: [
      { label: "90791 limited once per 6 months", detail: "Aetna 2025 policy: 90791 limited to 1x per member per 6 months regardless of provider. PR-242 may also indicate OON.", critical: true },
      { label: "Network status — PR-242 risk", detail: "Out-of-network = PR-242 denial. Confirm in-network status for every rendering provider before submission.", critical: true },
      { label: "Self-funded vs. fully insured", detail: "Self-funded plans may override standard Aetna auth rules. Verify plan type at eligibility.", critical: false },
      { label: "Telehealth modifier 95", detail: "Required for telehealth services. Missing modifier causes claim-level rejection.", critical: false },
    ]
  },
  {
    payer: "BCBS Texas",
    plan_type: "Commercial (BlueCard)",
    color: "#0F6E56",
    rules: [
      { label: "BlueCard alpha prefix routing", detail: "Auth must route through home plan, not local plan. Verify alpha prefix before submitting auth request.", critical: true },
      { label: "ERA enrollment in Candid", detail: "CO-B11 = incomplete ERA. Ensure ERA enrollment is active for each BCBS TX payer ID in Candid.", critical: true },
      { label: "Modifier HO on ABA codes", detail: "Same requirement as TRICARE. HO on 97151/97153 per BCBS TX ABA policy.", critical: true },
      { label: "HDHP deductible risk", detail: "PR-1 denials on HDHP plans (e.g. H300 plan) are patient responsibility, not appealable. Collect at time of service.", critical: false },
    ]
  },
];

const RECOVERY_QUEUE = [
  { priority: 1, claim_id: "4d3e8a42", patient: "Patient G", payer: "CO Medicaid", denial: "PI-15", amount: 1129.54, dos: "10/15/2025", action: "Obtain retro auth or appeal with medical necessity", owner: "RCM", age: 11, appealable: true },
  { priority: 2, claim_id: "dc632038", patient: "Patient H", payer: "CO Medicaid", denial: "PI-16", amount: 1129.54, dos: "10/16/2025", action: "Audit rendering NPI enrollment — eligibility tag present", owner: "Provider Ops", age: 11, appealable: false },
  { priority: 3, claim_id: "288466e1", patient: "Patient I", payer: "TRICARE West", denial: "PR-170", amount: 800, dos: "10/11/2025", action: "Complete provider credentialing — do not resubmit until approved", owner: "Credentialing", age: 17, appealable: false },
  { priority: 4, claim_id: "6704ffd5", patient: "Patient J", payer: "TRICARE West", denial: "PR-170", amount: 800, dos: "10/14/2025", action: "Hold — same credentialing block as above", owner: "Credentialing", age: 14, appealable: false },
  { priority: 5, claim_id: "4d5f3a1a", patient: "Patient I", payer: "TRICARE West", denial: "PR-170", amount: 640, dos: "10/13/2025", action: "Hold — credentialing block", owner: "Credentialing", age: 15, appealable: false },
  { priority: 6, claim_id: "2748862b", patient: "Patient K", payer: "CO Medicaid", denial: "PI-15", amount: 1129.54, dos: "10/16/2025", action: "Obtain retro auth — same pattern as priority 1", owner: "RCM", age: 11, appealable: true },
  { priority: 7, claim_id: "bf009845", patient: "Patient L", payer: "Aetna", denial: "PR-242", amount: 240, dos: "10/16/2025", action: "Confirm network status — appeal if provider is in-network", owner: "Contracting", age: 14, appealable: true },
  { priority: 8, claim_id: "816191c9", patient: "Patient M", payer: "PA Blue Shield", denial: "PR-204", amount: 360, dos: "10/15/2025", action: "Confirm OON vs. plan exclusion — appeal with coverage determination", owner: "RCM", age: 17, appealable: true },
  { priority: 9, claim_id: "e1fedd43", patient: "Patient N", payer: "CO Medicaid", denial: "PI-16", amount: 1129.54, dos: "10/16/2025", action: "Resolve billing error — check rendering NPI enrollment", owner: "Provider Ops", age: 11, appealable: false },
  { priority: 10, claim_id: "d265ba5c", patient: "Patient O", payer: "CO Medicaid", denial: "PI-16+PI-15", amount: 1129.54, dos: "10/01/2025", action: "Dual denial — resolve enrollment first, then auth", owner: "Provider Ops", age: 25, appealable: false },
];

const AUTOMATIONS = [
  {
    id: "AUTO-001",
    name: "TRICARE HO modifier rule",
    trigger: "Claim created with CPT 97151 or 97153 for a TRICARE payer",
    what: "Configure a rule in Candid's rules engine that automatically applies modifier HO to 97151 and 97153 on all TRICARE claims before submission. If HO is absent, the claim is flagged and corrected before it leaves the system. This is a rules engine configuration task — not a build.",
    system: "Candid Health — Rules Engine",
    type: "Configure in Candid",
    complexity: "Low",
    complexity_note: "Candid's rules engine supports modifier rules natively. Implementation time: days, not weeks. Candid customer success team can assist.",
    denial_codes: ["CO-272", "CO-16"],
    revenue_impact: "Eliminates TRICARE modifier error denials — $780 in current claims, prevents recurrence",
    roi: "High",
    phase: 1,
    status: "Configure first",
    dependencies: "Access to Candid rules engine configuration; Candid CS support engagement",
  },
  {
    id: "AUTO-002",
    name: "Credentialing status gate at claim creation",
    trigger: "Claim generation attempted for any rendering NPI + payer combination",
    what: "Keep the provider roster current in Candid with credentialing status per NPI per payer. Configure a Candid rule that blocks claim generation when the rendering NPI's status for the target payer is not 'Active.' Routes blocked claims to the credentialing queue automatically. Candid natively supports provider roster and credentialing data as inputs to its automation.",
    system: "Candid Health — Provider Roster + Rules Engine",
    type: "Configure in Candid",
    complexity: "Low",
    complexity_note: "Requires maintaining credentialing status in Candid's provider roster — the data entry discipline is the work, not the technology.",
    denial_codes: ["PR-170"],
    revenue_impact: "$8,660 in current TRICARE denials + prevents all future PR-170 class denials",
    roi: "High",
    phase: 1,
    status: "Configure first",
    dependencies: "Provider roster in Candid kept current by credentialing team in real time",
  },
  {
    id: "AUTO-003",
    name: "ERA enrollment enforcement gate",
    trigger: "New payer activated in Candid OR first claim submitted to a payer",
    what: "Audit all active payers in Candid for ERA enrollment completeness. Configure a Candid submission rule that blocks claims for any payer without confirmed ERA enrollment active. ERA enrollment is a Candid-native function — the CO-B11 denial pattern exists because enrollment wasn't set up, not because Candid can't handle it.",
    system: "Candid Health — ERA Enrollment + Rules Engine",
    type: "Configure in Candid",
    complexity: "Low",
    complexity_note: "Candid manages ERA enrollment natively. Full EDI audit of all active payers — electronic claims, ERA, and remittance posting — should accompany this configuration.",
    denial_codes: ["CO-B11"],
    revenue_impact: "$1,080 in current stalled claims + prevents ERA gaps on all new payers",
    roi: "High",
    phase: 1,
    status: "Configure first",
    dependencies: "Full EDI audit of all active payers; Candid CS support for ERA enrollment setup",
  },
  {
    id: "AUTO-004",
    name: "Eligibility check enforcement",
    trigger: "Claim created in Candid",
    what: "Configure Candid's built-in eligibility check to run at claim creation and treat a failed or unverified eligibility result as a submission block rather than a warning. Currently the membership-eligibility flag appears on claims that are still being submitted — the check is running but not being enforced. Changing it from a warning to a hard gate closes this gap within Candid's existing capability.",
    system: "Candid Health — Eligibility + Rules Engine",
    type: "Configure in Candid",
    complexity: "Low",
    complexity_note: "Configuration change to existing Candid eligibility workflow. For deeper Medicaid managed care plan subtype verification, supplement with Sohar or comparable RTE vendor.",
    denial_codes: ["PI-16", "membership-eligibility"],
    revenue_impact: "$3,649 in current membership-eligibility denials + reduces front-end eligibility failures",
    roi: "High",
    phase: 1,
    status: "Configure first",
    dependencies: "Candid eligibility check must be active for all payers; RTE vendor (Sohar) for Medicaid depth",
  },
  {
    id: "AUTO-005",
    name: "Denial tag routing workflow",
    trigger: "Claim tagged with membership-eligibility, PI-15, PR-170, or CO-B11 in Candid",
    what: "Configure Candid workflow rules that automatically route denial-tagged claims to the correct owner queue — PI-15 to auth/Silna liaison, PR-170 to credentialing, membership-eligibility to eligibility specialist, CO-B11 to billing ops. Currently these tags appear in the data but claims are landing in a general denial pool. Candid's workflow automation can route them automatically.",
    system: "Candid Health — Workflow Automation",
    type: "Configure in Candid",
    complexity: "Low",
    complexity_note: "Candid supports workflow routing rules natively. Maps directly to the recovery queue ownership structure already defined.",
    denial_codes: ["All"],
    revenue_impact: "Reduces denial resolution time — faster routing means faster recovery and fewer TFL misses",
    roi: "Medium",
    phase: 1,
    status: "Configure first",
    dependencies: "Defined ownership structure per denial type; Candid workflow rule configuration",
  },
  {
    id: "AUTO-006",
    name: "Auth visibility tracker + Silna queue dashboard",
    trigger: "Daily — monitors all open authorization requests and active auth expiry/utilization",
    what: "Build a lightweight internal tracker showing every authorization in Silna's queue: submission date, expected response date, TAT status, and payer. Separately, track all active authorizations for unit utilization and expiry — alert at 80% utilization and 30 days to expiry with auto-drafted renewal requests routed to Silna. Candid does not manage prior authorization, so this is a genuine gap requiring a new lightweight tool or structured spreadsheet.",
    system: "Internal tracker (Notion, Sheets, or lightweight app)",
    type: "Build new",
    complexity: "Low",
    complexity_note: "Does not require engineering. A structured spreadsheet or Notion database with alert logic covers this at current volume. Automate as volume grows.",
    denial_codes: ["PI-15"],
    revenue_impact: "$9,036 in current PI-15 denials preventable + protects in-flight authorized revenue",
    roi: "High",
    phase: 2,
    status: "Build second",
    dependencies: "Silna providing queue data; auth records with unit counts and expiry dates maintained internally",
  },
  {
    id: "AUTO-007",
    name: "EHR scheduling auth gate",
    trigger: "Session scheduled for a patient requiring prior authorization",
    what: "Configure a check in the EHR scheduling workflow that blocks session confirmation when no active authorization is on file for the patient's payer and CPT code. This is an EHR-level configuration — Candid operates at the claim level and cannot block scheduling. The scheduling system must be the enforcement point for the authorization requirement.",
    system: "EHR — Scheduling module",
    type: "Build / configure in EHR",
    complexity: "Medium",
    complexity_note: "Depends on EHR flexibility. Some systems support this natively with configuration; others require a workflow build. Requires auth status to be queryable from the scheduling interface.",
    denial_codes: ["PI-15"],
    revenue_impact: "Prevents PI-15 denials at the source — eliminates the gap between scheduling and auth confirmation",
    roi: "Very High",
    phase: 2,
    status: "Build second",
    dependencies: "EHR must support auth status query at scheduling; auth tracker must feed EHR with current auth data",
  },
  {
    id: "AUTO-008",
    name: "Post-note documentation compliance checker",
    trigger: "Provider submits a session note or clinical document in EHR",
    what: "Automated QA check that runs against the Colorado Medicaid documentation standard when a provider finalizes a clinical note. Flags missing required elements — operational behavior definitions, measurable trial data, goal-linking language, supervision documentation — before the note is locked. Built to Medicaid's standard, which is the most stringent in the payer mix, ensuring all other payers' requirements are met simultaneously. Lives in the EHR or a documentation tool, not Candid.",
    system: "EHR — Clinical documentation module",
    type: "Build / configure in EHR",
    complexity: "Medium",
    complexity_note: "Requires EHR to support note validation logic or integration with a documentation compliance tool. Can start as a manual checklist embedded in the note template.",
    denial_codes: ["Audit risk — all payers"],
    revenue_impact: "Prevents retrospective audit recoupment — protects paid revenue across entire claim history",
    roi: "High",
    phase: 2,
    status: "Build second",
    dependencies: "EHR note template flexibility; Medicaid documentation standard defined and maintained",
  },
  {
    id: "AUTO-009",
    name: "AI-powered pre-submission claim QA",
    trigger: "Claim queued for submission in Candid",
    what: "An AI layer built on top of Candid's rules engine that reviews every claim against the payer rules knowledge base before submission. Catches edge cases the rules engine misses — unusual modifier combinations, diagnosis-CPT pairing issues, payer-specific policy exceptions. Provides plain-language explanations for flagged issues and suggested fixes. This is Phase 3 and should only be built after Tier 1 Candid configuration is complete. There is no ROI in adding AI on top of a misconfigured rules foundation.",
    system: "Candid Health — AI layer on rules engine",
    type: "AI-assisted build",
    complexity: "High",
    complexity_note: "Requires payer rules knowledge base (built), Candid API access, and AI integration layer. Highest build cost but highest long-term leverage on clean claim rate at scale.",
    denial_codes: ["All"],
    revenue_impact: "Estimated 15–25% improvement in clean claim rate at scale once Tier 1 gaps are closed",
    roi: "Very High",
    phase: 3,
    status: "Build third",
    dependencies: "All Tier 1 Candid configuration complete; payer rules KB maintained; Candid API access",
  },
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

const eligibilityStatusConfig = {
  verified: { label: "Verified", color: "#3B6D11", bg: "#3B6D1120" },
  flag: { label: "Action required", color: "#A32D2D", bg: "#A32D2D20" },
  overdue: { label: "Re-verify now", color: "#BA7517", bg: "#BA751720" },
};

const statusColor = { active: "#3B6D11", missing: "#A32D2D", expiring: "#BA7517", blocked: "#A32D2D" };
const statusLabel = { active: "Active", missing: "Missing", expiring: "Expiring soon", blocked: "Blocked" };

export default function RCMOps() {
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

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "var(--color-text-primary)", padding: "1rem 0" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>Alpaca Health · RCM Operating System · Oct 2025</p>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: "1.25rem", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            background: "none", border: "none", padding: "8px 14px", cursor: "pointer", fontSize: 13,
            fontWeight: tab === i ? 500 : 400,
            color: tab === i ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            borderBottom: tab === i ? "2px solid var(--color-text-primary)" : "2px solid transparent",
            marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <select value={selectedPayer} onChange={e => { setSelectedPayer(e.target.value); setChecks({}); }} style={{ fontSize: 13, minWidth: 200 }}>
              {Object.keys(QA_RULES).map(p => <option key={p}>{p}</option>)}
            </select>
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{completed}/{rules.length} checks passed</span>
            <div style={{ flex: 1, height: 4, background: "var(--color-background-secondary)", borderRadius: 2, minWidth: 80 }}>
              <div style={{ width: (completed / rules.length * 100) + "%", height: "100%", background: completed === rules.length ? "#3B6D11" : "#185FA5", borderRadius: 2, transition: "width 0.2s" }} />
            </div>
            {completed === rules.length && <span style={{ fontSize: 12, color: "#3B6D11", fontWeight: 500 }}>Ready to submit</span>}
          </div>
          <div style={{ background: "#185FA510", border: "0.5px solid #185FA530", borderRadius: 8, padding: "10px 14px", marginBottom: "1.25rem", fontSize: 12, color: "#185FA5", lineHeight: 1.6 }}>
            These checks should also be configured in Candid's rules engine — this checklist is your manual backup and staff training tool. Any rule marked "Required" is a candidate for a Candid pre-submission rule.
          </div>

          {["Authorization", "Credentialing", "Network", "Eligibility", "ERA", "Coverage", "Coding", "Provider", "Billing", "Deductible"].map(cat => {
            const catRules = rules.filter(r => r.category === cat);
            if (!catRules.length) return null;
            return (
              <div key={cat} style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{cat}</div>
                {catRules.map(r => (
                  <div key={r.id} onClick={() => toggleCheck(r.id)} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 6, cursor: "pointer", background: checks[r.id] ? "var(--color-background-secondary)" : "transparent", marginBottom: 2, border: "0.5px solid " + (checks[r.id] ? "var(--color-border-secondary)" : "transparent") }}>
                    <div style={{ width: 16, height: 16, minWidth: 16, borderRadius: 3, border: "1.5px solid " + (checks[r.id] ? "#3B6D11" : r.critical ? "#A32D2D" : "var(--color-border-secondary)"), background: checks[r.id] ? "#3B6D11" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                      {checks[r.id] && <span style={{ color: "white", fontSize: 10, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, textDecoration: checks[r.id] ? "line-through" : "none", color: checks[r.id] ? "var(--color-text-tertiary)" : "var(--color-text-primary)" }}>{r.check}</span>
                      {r.critical && !checks[r.id] && <span style={{ fontSize: 10, background: "#A32D2D20", color: "#A32D2D", padding: "1px 6px", borderRadius: 3, marginLeft: 6 }}>Required</span>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          <button onClick={() => setChecks({})} style={{ fontSize: 12, marginTop: 8 }}>Reset checklist</button>
        </div>
      )}

      {tab === 1 && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {["all", "missing", "expiring", "blocked", "active"].map(f => (
              <button key={f} onClick={() => setAuthFilter(f)} style={{ fontSize: 12, padding: "4px 12px", background: authFilter === f ? "var(--color-background-secondary)" : "none", fontWeight: authFilter === f ? 500 : 400 }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {filteredAuth.map((a, i) => (
            <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 14px", marginBottom: 8, border: a.alert ? "0.5px solid " + statusColor[a.status] + "50" : "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 4 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{a.patient}</span>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: 8 }}>{a.payer} · {a.plan} · {a.cpt}</span>
                </div>
                <span style={{ fontSize: 11, background: statusColor[a.status] + "20", color: statusColor[a.status], padding: "2px 8px", borderRadius: 4 }}>{statusLabel[a.status]}</span>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 12, color: "var(--color-text-secondary)", flexWrap: "wrap" }}>
                <span>Auth #: <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{a.auth_num}</span></span>
                <span>Units: {a.units_used} / {a.units_auth || "—"}</span>
                <span>DOS start: {a.dos_start}</span>
                <span>Expiry: {a.expiry}</span>
              </div>
              {a.alert && (
                <div style={{ marginTop: 8, fontSize: 12, color: statusColor[a.status], background: statusColor[a.status] + "10", padding: "6px 10px", borderRadius: 4 }}>
                  {a.alert}
                </div>
              )}
              {a.status === "expiring" && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 4, background: "var(--color-background-primary)", borderRadius: 2 }}>
                    <div style={{ width: Math.round((a.units_used / a.units_auth) * 100) + "%", height: "100%", background: "#BA7517", borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, color: "#BA7517" }}>{Math.round((a.units_used / a.units_auth) * 100)}% of authorized units used</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 2 && (
        <div>
          {PAYER_RULES.map((p, i) => (
            <div key={i} style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p.payer}</span>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{p.plan_type}</span>
              </div>
              {p.rules.map((r, j) => (
                <div key={j} style={{ display: "flex", gap: 10, padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)", alignItems: "flex-start" }}>
                  <div style={{ width: 6, height: 6, minWidth: 6, borderRadius: "50%", background: r.critical ? "#A32D2D" : "var(--color-border-secondary)", marginTop: 5 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2, lineHeight: 1.5 }}>{r.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div style={{ background: "#BA751710", border: "0.5px solid #BA751740", borderRadius: 8, padding: "10px 12px", marginTop: 12, fontSize: 12, color: "#BA7517", lineHeight: 1.6 }}>
            This is a quick reference summary only. For full rule detail, Candid action steps, system flags, and section-level navigation, use the standalone Payer Rules Knowledge Base.
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 8 }}>Red dot = denial-blocking rule · Gray dot = best practice</div>
        </div>
      )}

      {tab === 3 && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginBottom: "1.25rem" }}>
            {[
              { label: "Total at risk", value: "$" + totalAtRisk.toLocaleString(undefined, { maximumFractionDigits: 0 }), color: "#A32D2D" },
              { label: "Appealable claims", value: RECOVERY_QUEUE.filter(r => r.appealable).length + " claims", color: "#3B6D11" },
              { label: "Avg claim age", value: Math.round(RECOVERY_QUEUE.reduce((s, r) => s + r.age, 0) / RECOVERY_QUEUE.length) + " days", color: "#BA7517" },
            ].map((m, i) => (
              <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: m.color, marginTop: 2 }}>{m.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: "1rem", flexWrap: "wrap" }}>
            {["all", "RCM", "Credentialing", "Provider Ops", "Contracting"].map(f => (
              <button key={f} onClick={() => setQueueFilter(f)} style={{ fontSize: 12, padding: "4px 12px", background: queueFilter === f ? "var(--color-background-secondary)" : "none", fontWeight: queueFilter === f ? 500 : 400 }}>
                {f}
              </button>
            ))}
          </div>

          {filteredQueue.map((r, i) => {
            const urgColor = r.priority <= 3 ? "#A32D2D" : r.priority <= 6 ? "#BA7517" : "#185FA5";
            return (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", alignItems: "flex-start" }}>
                <div style={{ minWidth: 22, height: 22, borderRadius: "50%", background: urgColor + "20", color: urgColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, marginTop: 2 }}>{r.priority}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{r.patient} · {r.payer}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: urgColor }}>${r.amount.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    <span style={{ background: urgColor + "15", color: urgColor, padding: "1px 6px", borderRadius: 3, marginRight: 6 }}>{r.denial}</span>
                    DOS {r.dos} · {r.age} days old · Owner: {r.owner}
                    {r.appealable && <span style={{ background: "#3B6D1115", color: "#3B6D11", padding: "1px 6px", borderRadius: 3, marginLeft: 6 }}>Appealable</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 3 }}>{r.action}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab === 5 && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginBottom: "1.25rem" }}>
            {[
              { label: "Phase 1 automations", value: "3 builds", sub: "Days 1–30", color: "#A32D2D" },
              { label: "Phase 2 automations", value: "3 builds", sub: "Days 30–60", color: "#BA7517" },
              { label: "Phase 3 automation", value: "1 build", sub: "Days 60–90", color: "#185FA5" },
            ].map((m, i) => (
              <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: m.color, marginTop: 2 }}>{m.value}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 1 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 14px", marginBottom: "1.25rem", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            None of these require building new software from scratch. All are rule-based checks or lightweight AI layers on top of systems Alpaca already uses (Candid, EHR). Phase 1 can be implemented as manual checklists immediately and automated as engineering bandwidth allows.
          </div>

          {[1, 2, 3].map(phase => {
            const phaseColor = phase === 1 ? "#A32D2D" : phase === 2 ? "#BA7517" : "#185FA5";
            const phaseLabel = phase === 1 ? "Phase 1 — Build first (Days 1–30)" : phase === 2 ? "Phase 2 — Build second (Days 30–60)" : "Phase 3 — Build third (Days 60–90)";
            return (
              <div key={phase} style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: phaseColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>{phaseLabel}</div>
                {AUTOMATIONS.filter(a => a.phase === phase).map((a, i) => (
                  <div key={i} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                    <div style={{ background: "var(--color-background-secondary)", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</span>
                        <span style={{ fontSize: 10, marginLeft: 8, background: a.type === "AI-assisted" ? "#533AB720" : "#18_5FA520", color: a.type === "AI-assisted" ? "#533AB7" : "#185FA5", padding: "2px 7px", borderRadius: 3 }}>{a.type}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(() => {
                          const typeColors = {
                            "Configure in Candid": { bg: "#185FA520", color: "#185FA5" },
                            "Build new": { bg: "#BA751720", color: "#BA7517" },
                            "Build / configure in EHR": { bg: "#533AB720", color: "#533AB7" },
                            "AI-assisted build": { bg: "#A32D2D20", color: "#A32D2D" },
                          };
                          const tc = typeColors[a.type] || { bg: "#88878020", color: "#888780" };
                          return <span style={{ fontSize: 11, background: tc.bg, color: tc.color, padding: "2px 8px", borderRadius: 3 }}>{a.type}</span>;
                        })()}
                        <span style={{ fontSize: 11, background: (a.complexity === "Low" ? "#3B6D11" : a.complexity === "Medium" ? "#BA7517" : "#A32D2D") + "20", color: a.complexity === "Low" ? "#3B6D11" : a.complexity === "Medium" ? "#BA7517" : "#A32D2D", padding: "2px 8px", borderRadius: 3 }}>{a.complexity} complexity</span>
                        <span style={{ fontSize: 11, background: "#3B6D1120", color: "#3B6D11", padding: "2px 8px", borderRadius: 3 }}>ROI: {a.roi}</span>
                      </div>
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>Trigger</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{a.trigger}</div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>What it does</div>
                        <div style={{ fontSize: 12, lineHeight: 1.6 }}>{a.what}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                        <div style={{ background: "var(--color-background-secondary)", borderRadius: 6, padding: "8px 10px" }}>
                          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>Lives in</div>
                          <div style={{ fontSize: 12 }}>{a.system}</div>
                        </div>
                        <div style={{ background: "var(--color-background-secondary)", borderRadius: 6, padding: "8px 10px" }}>
                          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>Addresses</div>
                          <div style={{ fontSize: 12 }}>{a.denial_codes.join(", ")}</div>
                        </div>
                      </div>
                      <div style={{ background: phaseColor + "10", borderRadius: 6, padding: "8px 10px", marginBottom: 8, border: "0.5px solid " + phaseColor + "30" }}>
                        <div style={{ fontSize: 11, color: phaseColor, marginBottom: 2 }}>Revenue impact</div>
                        <div style={{ fontSize: 12 }}>{a.revenue_impact}</div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 8 }}>
                        Dependency: {a.dependencies}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
