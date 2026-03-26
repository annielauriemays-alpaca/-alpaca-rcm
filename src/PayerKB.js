import React, { useState } from 'react';

const PAYERS = [
  {
    id: "co-medicaid", name: "Colorado Medicaid", type: "Medicaid", color: "#185FA5", region: "CO",
    last_updated: "March 2026", contacts: "CO Medicaid Provider Services: 1-844-235-2387",
    portal: "https://colorado.gov/hcpf",
    candid_rules: ["HO modifier not required", "97151 override tag needed in Candid", "ERA enrollment required per plan subtype", "Eligibility check must be enforced as hard gate not warning"],
    sections: [
      { title: "Authorization", rules: [
        { rule: "Prior auth required for CPT 97151", detail: "Authorization must be obtained before date of service. Frequency: every 6 months per member. Missing auth = PI-15 denial. Retroactive auth is rarely granted — front-end enforcement is critical.", candid_action: "Configure pre-submission rule: block 97151 claims without valid auth number on file.", critical: true },
        { rule: "97151 override tag required in Candid", detail: "Claims for 97151 require the '97151-override' tag applied in Candid for approved cases. Without it, claims may route incorrectly.", candid_action: "Ensure 97151-override tag is applied in Candid at claim creation for all CO Medicaid 97151 claims.", critical: true },
        { rule: "Auth must match plan subtype", detail: "Auth obtained under one CO Medicaid plan subtype may not cover services billed under a different subtype. Confirm plan subtype at eligibility verification.", candid_action: "Configure eligibility check to confirm plan subtype before claim submission.", critical: true },
      ]},
      { title: "Eligibility", rules: [
        { rule: "Re-verify eligibility monthly", detail: "CO Medicaid coverage is subject to annual redetermination and can lapse unexpectedly. Verify at intake and re-verify monthly for all active Medicaid patients.", candid_action: "Supplement Candid's eligibility check with RTE vendor (Sohar) for monthly re-verification.", critical: true },
        { rule: "Member demographics must match exactly", detail: "Member ID, date of birth, and name format must match CO Medicaid records exactly. Mismatches generate membership-eligibility flags in Candid and PI-16 denials.", candid_action: "Configure Candid eligibility check as hard gate — failed check blocks submission, not just warns.", critical: true },
        { rule: "Confirm plan subtype at verification", detail: "CO Medicaid has multiple plan subtypes: State Plan, HCBS waivers, Behavioral Health Benefits (HH/MH/BJ), Community First Choice, etc. Reimbursement rates and auth pathways differ by subtype.", candid_action: "Capture plan subtype in Candid patient record at intake.", critical: false },
      ]},
      { title: "Provider Enrollment", rules: [
        { rule: "Each rendering NPI must be individually enrolled", detail: "CO Medicaid requires individual enrollment per rendering provider NPI. A provider may be enrolled under the billing entity but not individually — this generates PI-16 + membership-eligibility flags in Candid.", candid_action: "Keep Candid provider roster current with enrollment status per NPI. Configure claim block for unenrolled rendering NPIs.", critical: true },
        { rule: "Enrollment must be active under the specific plan subtype", detail: "Provider may be enrolled under State Plan but not under HCBS waivers. Confirm enrollment covers the specific plan subtype being billed.", candid_action: "Audit provider roster enrollment status across all CO Medicaid plan subtypes.", critical: true },
      ]},
      { title: "Coding & Billing", rules: [
        { rule: "CO-45 contractual adjustment is standard", detail: "CO-45 (charges exceed contracted rate) appears on virtually all CO Medicaid claims. This is a standard Medicaid write-off — not a denial. N381 RARC is informational.", candid_action: "No action required. Confirm CO-45 adjustment is posting correctly in Candid.", critical: false },
        { rule: "PI-16 requires investigation, not just resubmission", detail: "PI-16 on CO Medicaid is almost always accompanied by a system tag (membership-eligibility) indicating the specific cause. Resubmitting without resolving the root cause will result in the same denial.", candid_action: "Configure Candid denial routing: PI-16 + membership-eligibility tag → eligibility specialist queue.", critical: true },
      ]},
      { title: "Documentation", rules: [
        { rule: "Build to CO Medicaid documentation standard", detail: "CO Medicaid has among the most stringent ABA documentation requirements. A note meeting this standard meets every commercial payer in the portfolio. Use as the universal baseline.", candid_action: "Enforce via EHR post-note compliance checker — Candid does not manage clinical documentation.", critical: true },
      ]},
    ]
  },
  {
    id: "tricare-west", name: "TRICARE West", type: "Military / CHAMPUS", color: "#A32D2D", region: "Multi-state",
    last_updated: "March 2026", contacts: "TRICARE West (Healthnet Federal Services): 1-844-866-9378",
    portal: "https://www.tricare-west.com",
    candid_rules: ["HO modifier required on 97151/97153/97155 — configure in Candid rules engine", "submitted-to-avoid-tf tag present on some claims — review before submission", "Credentialing status must be current in Candid provider roster"],
    sections: [
      { title: "Credentialing", rules: [
        { rule: "Credentialing must be complete before ANY claim submission", detail: "PR-170 (provider type not approved) is returned when a provider has not completed TRICARE credentialing. TRICARE credentialing takes several weeks to a few months. Batch credentialing all providers simultaneously is most efficient. TFL is ~1 year — time to complete properly.", candid_action: "Keep Candid provider roster current with TRICARE credentialing status. Configure hard claim block for any NPI without confirmed active TRICARE credentialing.", critical: true },
        { rule: "BCBA credential required for ABA supervision codes", detail: "TRICARE requires the rendering provider to be a Board Certified Behavior Analyst (BCBA) for supervision-level ABA codes (97155, 97156).", candid_action: "Configure Candid rule: verify provider credential type matches CPT code billed.", critical: true },
        { rule: "Geographic jurisdiction — verify TRICARE West coverage area", detail: "TRICARE West covers most of the western US. Hawaii-based beneficiaries may require specific routing verification. Confirm regional contractor jurisdiction before submitting claims for out-of-state patients.", candid_action: "Flag Hawaii and non-contiguous state claims for jurisdiction verification before submission.", critical: false },
      ]},
      { title: "Authorization", rules: [
        { rule: "Prior auth required for all ABA services", detail: "TRICARE requires prior authorization for all ABA CPT codes without exception. Auth must route through TRICARE West regional contractor. No auth = automatic denial.", candid_action: "Configure Candid pre-submission rule: block all ABA CPT claims to TRICARE without valid auth number.", critical: true },
        { rule: "DSM-5 ASD diagnosis required for ABA coverage", detail: "TRICARE only covers ABA services for beneficiaries with a confirmed DSM-5 autism spectrum disorder diagnosis. Other behavioral diagnoses do not qualify.", candid_action: "Configure Candid rule to flag TRICARE ABA claims without F84.x diagnosis.", critical: true },
      ]},
      { title: "Coding & Modifiers", rules: [
        { rule: "Modifier HO required on 97151, 97153, 97155", detail: "TRICARE West requires modifier HO (master's level or above) on ABA supervision and assessment codes. Missing HO = CO-272 denial. This is a Candid rules engine configuration item.", candid_action: "Configure Candid rules engine: auto-apply modifier HO to 97151, 97153, 97155 on all TRICARE claims.", critical: true },
        { rule: "CO-272 / CO-16 indicate modifier or format issue", detail: "CO-272 paired with CO-16 and RARCs N280/N362 almost always indicates a modifier combination error. Check HO modifier presence and provider type approval.", candid_action: "Configure Candid alert: CO-272 + CO-16 combination on TRICARE claims triggers immediate review.", critical: true },
      ]},
      { title: "Documentation", rules: [
        { rule: "One-year TFL for retroactive appeals", detail: "TRICARE's timely filing limit is approximately one year from date of service. PR-170 denied claims can be retroactively appealed after credentialing is confirmed — file with credentialing approval documentation attached.", candid_action: "Track PR-170 denied claims in recovery queue with credentialing confirmation date for appeal timing.", critical: false },
      ]},
    ]
  },
  {
    id: "bcbs-texas", name: "BCBS Texas", type: "Commercial (BlueCard)", color: "#0F6E56", region: "TX",
    last_updated: "March 2026", contacts: "BCBS TX Provider Services: 1-800-451-0287",
    portal: "https://www.bcbstx.com/provider",
    candid_rules: ["ERA enrollment required — CO-B11 active on at least one provider", "fee-schedule-match-failure tag present on some claims — review contracted rates in Candid"],
    sections: [
      { title: "Authorization", rules: [
        { rule: "Auth must route through home plan via BlueCard", detail: "For BlueCard members, authorization must be requested through the member's home plan — not the local BCBS TX plan. Identify the alpha prefix on the member ID card to determine the home plan.", candid_action: "Capture alpha prefix at eligibility verification. Configure Candid to flag BlueCard claims where auth was obtained through wrong plan.", critical: true },
      ]},
      { title: "EDI & ERA", rules: [
        { rule: "Full EDI setup required in Candid before first claim", detail: "ERA enrollment must be active in Candid for each BCBS TX payer ID before the first claim is submitted. CO-B11 is generated when ERA enrollment is missing.", candid_action: "Audit all BCBS TX payer IDs in Candid for ERA enrollment completeness. Configure submission block for payer IDs without confirmed ERA.", critical: true },
        { rule: "fee-schedule-match-failure tag in Candid", detail: "This Candid system tag indicates the paid amount does not match the expected fee schedule in Candid's system. May indicate a contracted rate discrepancy.", candid_action: "Review fee-schedule-match-failure tagged claims. Confirm contracted rates are loaded correctly in Candid.", critical: false },
      ]},
      { title: "Coding & Modifiers", rules: [
        { rule: "Modifier HO required on ABA codes", detail: "BCBS TX requires modifier HO on 97151, 97153, and 97155 per BCBS TX ABA policy.", candid_action: "Configure Candid rules engine: auto-apply modifier HO to ABA codes on BCBS TX claims.", critical: true },
        { rule: "PR-1 deductible denials on HDHP plans are patient responsibility", detail: "PR-1 (deductible not met) denials on HDHP plans are patient responsibility and are not appealable. Collect patient cost-sharing at time of service.", candid_action: "Configure Candid to flag HDHP plan members for patient cost-sharing collection at intake.", critical: false },
      ]},
    ]
  },
  {
    id: "aetna", name: "Aetna", type: "Commercial", color: "#533AB7", region: "Multi-state",
    last_updated: "March 2026", contacts: "Aetna Provider Services: 1-800-624-0756",
    portal: "https://www.aetna.com/provider",
    candid_rules: ["NO_ACTIVE_COVERAGE rejection tag present on some claims", "eligibility-overridden tag on some claims — review before submission"],
    sections: [
      { title: "Network & Contracting", rules: [
        { rule: "Confirm in-network status before any claim submission", detail: "PR-242 with RARCs MA67, N377, N130 indicates OON or no active contract. Confirm network status for every rendering provider with Aetna TX before submission.", candid_action: "Keep Candid provider roster current with Aetna network status. Configure claim block for OON providers.", critical: true },
        { rule: "Self-funded vs. fully insured plan distinction", detail: "Aetna administers many self-funded employer plans that may override standard Aetna auth and coverage rules. Confirm plan funding type at eligibility.", candid_action: "Capture plan funding type in Candid at eligibility verification.", critical: false },
      ]},
      { title: "Authorization", rules: [
        { rule: "90791 limited to once per 6 months per member (2025 policy)", detail: "Aetna's 2025 policy limits CPT 90791 to one per member per 6-month period regardless of provider.", candid_action: "Configure Candid rule: flag 90791 claims where the member has a prior 90791 within 6 months.", critical: true },
        { rule: "NO_ACTIVE_COVERAGE rejection requires eligibility re-verification", detail: "The NO_ACTIVE_COVERAGE tag in Candid indicates the member's coverage was not confirmed active. Do not resubmit without re-verifying eligibility first.", candid_action: "Configure Candid: NO_ACTIVE_COVERAGE tag blocks resubmission until eligibility is re-verified.", critical: true },
      ]},
      { title: "Coding", rules: [
        { rule: "Modifier 95 required for telehealth", detail: "Aetna requires modifier 95 on all telehealth ABA claims. Missing modifier results in claim-level rejection.", candid_action: "Configure Candid rules engine: auto-apply modifier 95 to telehealth ABA claims billed to Aetna.", critical: true },
      ]},
    ]
  },
  {
    id: "cigna", name: "Cigna / Evernorth", type: "Commercial", color: "#BA7517", region: "Multi-state",
    last_updated: "March 2026", contacts: "Cigna Provider Services: 1-800-88CIGNA",
    portal: "https://cignaforhcp.cigna.com",
    candid_rules: ["No active denial flags in current dataset — monitor"],
    sections: [
      { title: "Authorization", rules: [
        { rule: "Prior auth required for ABA services", detail: "Cigna/Evernorth requires prior authorization for all ABA CPT codes. Auth requests route through Evernorth behavioral health.", candid_action: "Configure Candid pre-submission rule: block ABA claims to Cigna without valid auth number.", critical: true },
        { rule: "COB coordination required for dual coverage", detail: "For dual coverage cases with Cigna primary and Medicaid secondary, coordinate benefits correctly — primary pays first, secondary billed for remaining balance.", candid_action: "Configure Candid COB sequencing for dual coverage Cigna/Medicaid cases.", critical: false },
      ]},
    ]
  },
  {
    id: "pa-blue-shield", name: "Pennsylvania Blue Shield", type: "Commercial (BlueCard)", color: "#3B6D11", region: "PA",
    last_updated: "March 2026", contacts: "PA Blue Shield Provider Services: 1-800-347-8600",
    portal: "https://www.ibx.com/providers",
    candid_rules: ["skip-era-enrollment-rule tag present — review ERA setup in Candid", "no-era-enrollment-overridden tag — ERA may not be active"],
    sections: [
      { title: "Coverage", rules: [
        { rule: "Pennsylvania ABA insurance mandate applies", detail: "Pennsylvania requires commercial insurers to cover ABA therapy for ASD diagnoses. PR-204 denials on ABA claims may indicate OON rather than a true benefit exclusion.", candid_action: "When PR-204 is received, confirm OON vs. plan exclusion before writing off. Appeal with PA ABA mandate reference if OON.", critical: true },
      ]},
      { title: "EDI & ERA", rules: [
        { rule: "ERA enrollment likely not active — review in Candid", detail: "The skip-era-enrollment-rule and no-era-enrollment-overridden tags in Candid suggest ERA enrollment may not be configured for PA Blue Shield. Same CO-B11 risk as BCBS Texas.", candid_action: "Audit PA Blue Shield ERA enrollment status in Candid. Set up full EDI before submitting additional claims.", critical: true },
      ]},
      { title: "Network", rules: [
        { rule: "Confirm OON vs. plan exclusion on PR-204", detail: "PR-204 with RARCs N196 and N570 can indicate OON status or a plan-level benefit exclusion. Given Pennsylvania's ABA mandate, OON is more likely for fully insured plans.", candid_action: "Route PR-204 claims to contracting review before writing off.", critical: true },
      ]},
    ]
  },
];

const typeColor = (type) => {
  if (type === "Medicaid") return { bg: "#185FA520", color: "#185FA5" };
  if (type.includes("Military")) return { bg: "#A32D2D20", color: "#A32D2D" };
  if (type.includes("BlueCard")) return { bg: "#3B6D1120", color: "#3B6D11" };
  return { bg: "#533AB720", color: "#533AB7" };
};

export default function PayerKB() {
  const [selected, setSelected] = useState(PAYERS[0].id);
  const [section, setSection] = useState(null);
  const [search, setSearch] = useState("");

  const payer = PAYERS.find(p => p.id === selected);

  const filteredSections = payer.sections.map(s => ({
    ...s,
    rules: s.rules.filter(r => !search || r.rule.toLowerCase().includes(search.toLowerCase()) || r.detail.toLowerCase().includes(search.toLowerCase()))
  })).filter(s => !search || s.rules.length > 0);

  const totalRules = payer.sections.reduce((sum, s) => sum + s.rules.length, 0);
  const criticalRules = payer.sections.reduce((sum, s) => sum + s.rules.filter(r => r.critical).length, 0);

  return (
    <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Payer Rules Knowledge Base</h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>Feeds Candid rules engine configuration · Last updated March 2026</p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {PAYERS.map(p => (
          <button key={p.id} onClick={() => { setSelected(p.id); setSection(null); setSearch(''); }}
            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, background: selected === p.id ? p.color + '20' : 'none', color: selected === p.id ? p.color : 'var(--color-text-secondary)', fontWeight: selected === p.id ? 500 : 400, border: selected === p.id ? '0.5px solid ' + p.color + '50' : '0.5px solid transparent' }}>
            {p.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <div>
          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{payer.name}</span>
            </div>
            <span style={{ fontSize: 11, background: typeColor(payer.type).bg, color: typeColor(payer.type).color, padding: '2px 8px', borderRadius: 4 }}>{payer.type}</span>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
              <div>Region: <span style={{ color: 'var(--color-text-primary)' }}>{payer.region}</span></div>
              <div>Rules: <span style={{ color: 'var(--color-text-primary)' }}>{totalRules} total</span></div>
              <div>Critical: <span style={{ color: '#A32D2D', fontWeight: 500 }}>{criticalRules} denial-blocking</span></div>
              <div style={{ marginTop: 4 }}>Updated: {payer.last_updated}</div>
            </div>
            <div style={{ marginTop: 12, borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Provider portal</div>
              <div style={{ fontSize: 12, color: '#185FA5', wordBreak: 'break-all' }}>{payer.portal}</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Provider services</div>
              <div style={{ fontSize: 12 }}>{payer.contacts}</div>
            </div>
          </div>

          <div style={{ background: '#185FA510', border: '0.5px solid #185FA530', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#185FA5', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Candid system flags</div>
            {payer.candid_rules.map((r, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '3px 0', borderBottom: i < payer.candid_rules.length - 1 ? '0.5px solid #185FA520' : 'none' }}>{r}</div>
            ))}
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sections</div>
            {payer.sections.map((s, i) => (
              <div key={i} onClick={() => setSection(section === i ? null : i)}
                style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', background: section === i ? 'var(--color-background-secondary)' : 'transparent', fontSize: 13, marginBottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{s.title}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  {s.rules.filter(r => r.critical).length > 0 && <span style={{ color: '#A32D2D' }}>{s.rules.filter(r => r.critical).length} · </span>}
                  {s.rules.length} rules
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <input placeholder="Search rules for this payer..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', marginBottom: '1rem' }} />
          {filteredSections.map((s, si) => {
            const origIdx = payer.sections.findIndex(ps => ps.title === s.title);
            const isOpen = section === null || section === origIdx;
            if (!isOpen && !search) return null;
            return (
              <div key={si} style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{s.title}</div>
                {s.rules.map((r, ri) => (
                  <div key={ri} style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, padding: '12px 14px', marginBottom: 8, borderLeft: r.critical ? '3px solid #A32D2D' : '0.5px solid var(--color-border-tertiary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, flex: 1, paddingRight: 8 }}>{r.rule}</span>
                      {r.critical && <span style={{ fontSize: 10, background: '#A32D2D20', color: '#A32D2D', padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap' }}>Denial-blocking</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{r.detail}</div>
                    <div style={{ background: '#185FA510', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#185FA5' }}>
                      <span style={{ fontWeight: 500 }}>Candid action: </span>{r.candid_action}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {filteredSections.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)', fontSize: 13 }}>No rules match your search.</div>
          )}
        </div>
      </div>
    </div>
  );
}
