import React, { useState } from 'react';

const CATEGORIES = ["All", "Session Notes", "Treatment Plans", "Auth Requests", "Appeal Letters", "Progress Reports"];

const PROMPTS = [
  {
    id: 1, category: "Session Notes", payer: "All Payers",
    title: "ABA session note — medical necessity language",
    use_case: "Use after every direct therapy session to ensure note meets payer documentation standards for medical necessity.",
    risk: "Missing or vague session notes are a top reason ABA claims are flagged for post-payment audit or denied on appeal.",
    tags: ["97153", "97155", "TRICARE", "CO Medicaid", "Aetna", "BCBS"],
    prompt: `Write a compliant ABA therapy session note for a direct therapy session with the following details:

Patient: [NAME], [AGE], Diagnosis: [ICD-10, e.g. F84.0]
Provider: [BCBA NAME], Credential: [BCBA/RBT]
Date of service: [DATE], Duration: [X] hours
CPT code: [97153 or 97155]
Location: [home/clinic/school/telehealth]

Session details:
- Target behaviors worked on: [LIST]
- Antecedent, behavior, consequence (ABC) data: [DESCRIBE]
- Reinforcement strategies used: [DESCRIBE]
- Patient response to intervention: [DESCRIBE]
- Progress toward treatment plan goals: [DESCRIBE]
- Any behavioral incidents or safety concerns: [YES/NO — DESCRIBE IF YES]

Generate a session note that:
1. Documents medical necessity by linking behavior targets to the patient's diagnosis
2. Uses measurable, objective language (no vague terms like "good session")
3. Includes specific data points (e.g. "achieved 4/5 trials")
4. Connects session activity to the active treatment plan goals
5. Meets TRICARE, CO Medicaid, and commercial payer documentation standards for ABA
6. Is written in professional clinical language appropriate for payer audit review`,
  },
  {
    id: 2, category: "Session Notes", payer: "CO Medicaid",
    title: "CO Medicaid 97151 assessment session note",
    use_case: "Use when documenting a behavior identification assessment (97151) for Colorado Medicaid. Required to support auth requests and post-payment audits.",
    risk: "CO Medicaid PI-15 and PI-16 denials are often triggered by assessment notes that don't clearly document the clinical basis for the auth request.",
    tags: ["97151", "CO Medicaid", "authorization", "assessment"],
    prompt: `Write a compliant behavior identification assessment note for Colorado Medicaid with the following details:

Patient: [NAME], [AGE], Diagnosis: [F84.0 or other ASD/behavioral dx]
Assessing BCBA: [NAME], NPI: [NPI]
Assessment date: [DATE], Duration: [X] hours
CPT code: 97151
Auth number (if obtained): [AUTH # or PENDING]

Assessment components completed:
- Standardized tools used: [e.g. VB-MAPP, ABLLS-R, FAST, MAS]
- Scores/results: [SUMMARIZE]
- Functional behavior assessment findings: [DESCRIBE]
- Skill acquisition areas assessed: [LIST]
- Behavior reduction targets identified: [LIST with operational definitions]
- Caregiver interview findings: [SUMMARIZE]

Generate an assessment note that:
1. Clearly establishes medical necessity for ABA services under CO Medicaid criteria
2. Links assessment findings directly to the patient's diagnosis
3. Documents the specific behaviors that require ABA intervention and why
4. Supports the number of hours being requested in the auth
5. Uses operationally defined behavior language
6. Includes a clinical summary statement that a Medicaid reviewer would approve`,
  },
  {
    id: 3, category: "Auth Requests", payer: "CO Medicaid",
    title: "CO Medicaid prior auth request — 97151/97153",
    use_case: "Use when submitting or re-requesting prior authorization for ABA services through Colorado Medicaid. Directly addresses the PI-15 denial pattern.",
    risk: "PI-15 (auth required/missing) is the single largest denial category in this dataset. A strong auth request letter reduces the chance of denial or additional documentation requests.",
    tags: ["97151", "97153", "CO Medicaid", "prior auth", "PI-15"],
    prompt: `Write a prior authorization request letter for ABA services for Colorado Medicaid with the following information:

Patient: [NAME], DOB: [DOB], Medicaid ID: [ID]
Diagnosis: [ICD-10], Date of diagnosis: [DATE]
Requesting BCBA: [NAME], NPI: [NPI], Credential: [BCBA]
Billing provider: [ENTITY NAME], TIN: [TIN]
Services requested: [CPT codes — 97151, 97153, 97155, etc.]
Hours requested per week: [X hours]
Auth period requested: [START DATE] to [END DATE]
Current auth (if renewing): [AUTH # and expiry]

Clinical justification:
- Assessment findings summary: [KEY FINDINGS]
- Current functional level: [DESCRIBE]
- Target behaviors and goals: [LIST]
- Why ABA is medically necessary: [DESCRIBE]
- What will happen without ABA services: [DESCRIBE]

Write a prior authorization letter that:
1. Opens with a clear medical necessity statement
2. Cites the patient's diagnosis and how it meets CO Medicaid ABA coverage criteria
3. Summarizes assessment findings that support the requested service intensity
4. Specifies each CPT code requested with clinical rationale for each
5. References any applicable CO Medicaid ABA coverage policies
6. Closes with a request for expedited review if clinically urgent
7. Is formatted for submission to CO Medicaid managed care or state plan`,
  },
  {
    id: 4, category: "Auth Requests", payer: "TRICARE West",
    title: "TRICARE West ABA auth request",
    use_case: "Use when submitting initial or renewal authorization for ABA services through TRICARE West. TRICARE requires auth for all ABA — no auth means automatic denial.",
    risk: "TRICARE denials in this dataset include both credentialing blocks (PR-170) and potential auth gaps. This prompt addresses the auth component once credentialing is confirmed.",
    tags: ["TRICARE", "97151", "97153", "prior auth", "PR-170", "HO modifier"],
    prompt: `Write a prior authorization request for ABA services for TRICARE West with the following details:

Beneficiary: [NAME], DOB: [DOB], Sponsor SSN/ID: [ID], TRICARE plan: [PRIME/SELECT]
Diagnosis: [ICD-10 — must be autism spectrum disorder for ABA coverage]
Requesting BCBA: [NAME], NPI: [NPI], TRICARE provider ID: [ID]
Services requested: [CPT — 97151, 97153, 97155, 97156, 97158]
Supervision model: [direct/indirect], Modifier: HO
Requested hours/week: [X], Auth period: [DATES]

Clinical documentation:
- DSM-5 autism diagnosis confirmed: [YES/NO, source]
- Standardized assessment used: [TOOL + SCORES]
- Current behavior targets: [LIST]
- Parent/caregiver training component: [YES/NO, describe]
- Safety concerns: [LIST or NONE]

Write a TRICARE West prior authorization request that:
1. Confirms the beneficiary has a DSM-5 ASD diagnosis (required for TRICARE ABA coverage)
2. Documents that the requesting provider is a BCBA (required provider type)
3. Specifies modifier HO on all applicable CPT codes
4. Provides clinical rationale for each service type requested
5. Addresses TRICARE's requirement for a comprehensive treatment plan
6. References TRICARE ABA policy (32 CFR Part 199) where applicable
7. Includes parent/caregiver training component documentation (required by TRICARE)`,
  },
  {
    id: 5, category: "Appeal Letters", payer: "All Payers",
    title: "First-level denial appeal — medical necessity",
    use_case: "Use when appealing a medical necessity denial (PR-204, CO-272, or similar) for ABA services. Adaptable to any commercial or government payer.",
    risk: "Non-covered benefit and medical necessity denials are often overturned on first appeal when the letter clearly ties clinical evidence to the patient's specific diagnosis and payer policy language.",
    tags: ["appeal", "medical necessity", "PR-204", "all payers"],
    prompt: `Write a first-level appeal letter for a denied ABA claim with the following details:

Patient: [NAME], DOB: [DOB], Member ID: [ID]
Payer: [PAYER NAME], Plan: [PLAN NAME]
Claim number: [CLAIM #], Date of service: [DATE]
CPT code denied: [CODE], Denial reason: [DENIAL CODE + REASON]
Billed amount: $[AMOUNT]
Rendering provider: [NAME], NPI: [NPI]

Clinical background:
- Diagnosis: [ICD-10 + description]
- Assessment findings: [SUMMARIZE]
- Treatment goals: [LIST]
- Progress to date: [DESCRIBE]
- Consequence of denial: [CLINICAL IMPACT]

Supporting documentation being attached:
- [ ] Diagnostic evaluation
- [ ] Behavior assessment report
- [ ] Treatment plan
- [ ] Session notes for dates in question
- [ ] BCBA credentials

Write a first-level appeal letter that:
1. Opens by identifying the claim, denial reason, and specific CPT code being appealed
2. Cites the payer's own coverage policy language and how this claim meets it
3. References peer-reviewed evidence supporting ABA for autism (cite Lovaas 1987, BACB guidelines, CASP)
4. Provides a clinical narrative connecting the patient's specific presentation to the denied service
5. Explicitly rebuts the stated denial reason with clinical and policy evidence
6. Requests a clinical peer-to-peer review if the appeal is not approved at first level
7. Closes with a deadline acknowledgment and escalation notice if not resolved`,
  },
  {
    id: 6, category: "Appeal Letters", payer: "TRICARE West",
    title: "TRICARE PR-170 credentialing appeal",
    use_case: "Use once a provider's TRICARE credentialing is complete to appeal previously denied PR-170 claims. Do not use until credentialing is confirmed active.",
    risk: "PR-170 denials are not automatically reversed when credentialing is completed — you must appeal each denied claim with proof of credentialing approval.",
    tags: ["TRICARE", "PR-170", "credentialing", "appeal"],
    prompt: `Write a TRICARE West appeal letter for claims denied under PR-170 (provider type not approved) with the following details:

Provider: [NAME], NPI: [NPI], TRICARE provider ID: [ID]
Credential: BCBA, License #: [STATE LICENSE #]
Credentialing approval date: [DATE], Effective date: [DATE]
Claims being appealed:
- Claim #[X], DOS [DATE], CPT [CODE], Amount $[X]
- Claim #[X], DOS [DATE], CPT [CODE], Amount $[X]
(list all PR-170 denied claims for this provider)

Patient: [NAME], Beneficiary ID: [ID]

Write a TRICARE West PR-170 appeal letter that:
1. States that the provider has completed TRICARE credentialing and is now an approved provider
2. Attaches credentialing approval documentation as exhibit A
3. Argues that the services rendered were clinically appropriate and medically necessary at the time of service
4. Requests retroactive processing of all listed claims to the original date of service
5. Cites TRICARE policy on provider credentialing retroactive effective dates
6. Lists every denied claim with DOS, CPT, and amount in a clear table format
7. Requests response within 30 days per TRICARE appeals timeline requirements`,
  },
  {
    id: 7, category: "Treatment Plans", payer: "All Payers",
    title: "ABA treatment plan — payer audit ready",
    use_case: "Use when creating or updating a treatment plan that will be submitted with an auth request or used to support claims during a payer audit.",
    risk: "Vague or incomplete treatment plans are a primary reason auth requests are denied or claims are recouped during retrospective audits.",
    tags: ["treatment plan", "all payers", "authorization", "audit"],
    prompt: `Write a comprehensive ABA treatment plan for payer submission with the following details:

Patient: [NAME], DOB: [DOB], Diagnosis: [ICD-10]
BCBA of record: [NAME], NPI: [NPI]
Plan period: [START DATE] to [END DATE]
Payer: [PAYER], Auth #: [AUTH #]
Service intensity: [X hours/week direct, Y hours/week supervision, Z hours/week caregiver training]

Assessment baseline:
- Standardized assessment results: [TOOL + SCORES]
- Current skill levels: [DESCRIBE by domain]
- Current challenging behaviors: [LIST with frequency/intensity/duration baseline data]

Goals (list for each):
Goal 1: [SKILL/BEHAVIOR TARGET]
- Baseline: [CURRENT LEVEL]
- Objective: [MEASURABLE TARGET]
- Timeline: [X weeks/months]
- Teaching procedure: [METHOD]
- Measurement: [HOW DATA WILL BE COLLECTED]

Write a treatment plan that:
1. Opens with a medical necessity statement linking diagnosis to all proposed services
2. Includes operationally defined, measurable goals in SMART format
3. Specifies the teaching procedures and prompting hierarchy for each goal
4. Documents caregiver/parent training goals separately (required by most payers)
5. Addresses any safety or crisis protocols if challenging behaviors are present
6. Justifies the requested service intensity with clinical rationale
7. Is formatted to meet TRICARE, CO Medicaid, Aetna, and BCBS documentation requirements`,
  },
  {
    id: 8, category: "Progress Reports", payer: "All Payers",
    title: "ABA progress report — auth renewal support",
    use_case: "Use when writing a progress report to support an authorization renewal request. Demonstrates medical necessity for continued services.",
    risk: "Auth renewals are denied when progress reports don't show measurable gains or don't justify continued service intensity.",
    tags: ["progress report", "auth renewal", "all payers", "medical necessity"],
    prompt: `Write an ABA progress report to support an authorization renewal with the following details:

Patient: [NAME], DOB: [DOB], Diagnosis: [ICD-10]
BCBA: [NAME], NPI: [NPI]
Report period: [START DATE] to [END DATE]
Payer: [PAYER], Current auth #: [AUTH #], Auth expiry: [DATE]
Renewal requested: [CPT codes, hours/week, period]

Progress data for each active goal:
Goal 1: [GOAL DESCRIPTION]
- Baseline (at start of auth period): [DATA]
- Current performance: [DATA]
- Trend: [improving/plateaued/emerging]
- Mastered: [YES/NO]

Behavior data (for each reduction target):
Behavior 1: [BEHAVIOR]
- Baseline rate: [FREQUENCY/INTENSITY]
- Current rate: [FREQUENCY/INTENSITY]
- Trend: [decreasing/stable/increasing]

Write a progress report that:
1. Opens with a summary of overall progress during the auth period
2. Presents goal-by-goal data with clear comparison of baseline vs. current performance
3. Explains why continued services are medically necessary even if progress is being made
4. Addresses any goals that have not progressed and provides clinical rationale
5. Justifies the requested service intensity for the renewal period
6. Includes a clinical statement on what would happen if services were discontinued
7. Closes with updated treatment priorities for the next auth period`,
  },
  {
    id: 9, category: "Session Notes", payer: "All Payers",
    title: "Caregiver training session note — 97156",
    use_case: "Use when documenting a caregiver training session (97156). Required by TRICARE and most commercial payers as part of a complete ABA program.",
    risk: "97156 claims are sometimes denied when notes don't clearly distinguish caregiver training from direct therapy.",
    tags: ["97156", "caregiver training", "TRICARE", "all payers"],
    prompt: `Write a compliant caregiver training session note for CPT 97156 with the following details:

Patient: [NAME], DOB: [DOB], Diagnosis: [ICD-10]
Caregiver present: [RELATIONSHIP, e.g. mother, father, guardian]
Supervising BCBA: [NAME], NPI: [NPI]
Date: [DATE], Duration: [X] hours
Location: [home/clinic/telehealth]

Training content:
- Skills trained during this session: [LIST — e.g. prompting hierarchy, reinforcement delivery, data collection]
- Caregiver performance baseline: [DESCRIBE]
- Training procedures used: [e.g. behavioral skills training — instruction, modeling, rehearsal, feedback]
- Caregiver performance during session: [DESCRIBE with data if available]
- Homework/practice assigned: [DESCRIBE]
- Next training session focus: [DESCRIBE]

Write a session note that:
1. Clearly identifies this as a caregiver training session (not direct therapy)
2. Documents that the caregiver — not the patient — was the primary recipient of services
3. Describes specific skills trained using behavioral skills training methodology
4. Includes measurable caregiver performance data where possible
5. Connects caregiver training goals to the patient's active treatment plan
6. Meets TRICARE's requirement for caregiver training as part of ABA program
7. Is distinct in language and structure from a direct therapy (97153) note`,
  },
];

const payerColor = (payer) => {
  if (payer === "CO Medicaid") return { bg: "#185FA520", color: "#185FA5" };
  if (payer === "TRICARE West") return { bg: "#A32D2D20", color: "#A32D2D" };
  if (payer === "All Payers") return { bg: "#3B6D1120", color: "#3B6D11" };
  return { bg: "#BA751720", color: "#BA7517" };
};

export default function Prompts() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(null);

  const filtered = PROMPTS.filter(p => {
    const matchCat = category === "All" || p.category === category;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.payer.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const copy = (prompt, id) => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Documentation Compliance Prompt Library</h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>Paste any prompt into Claude or your AI tool of choice · Replace bracketed fields with real data</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, marginBottom: '1.25rem' }}>
        {[
          { label: "Total prompts", value: PROMPTS.length, color: "var(--color-text-primary)" },
          { label: "Payers covered", value: "4 payers", color: "#185FA5" },
          { label: "Use cases", value: "5 categories", color: "#3B6D11" },
        ].map((m, i) => (
          <div key={i} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: m.color, marginTop: 2 }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input placeholder="Search by title, payer, or CPT code..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{ fontSize: 12, padding: '5px 12px', background: category === c ? 'var(--color-background-secondary)' : 'none', fontWeight: category === c ? 500 : 400, borderRadius: 6 }}>{c}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map(p => {
          const pc = payerColor(p.payer);
          const isOpen = selected === p.id;
          return (
            <div key={p.id} style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, overflow: 'hidden' }}>
              <div onClick={() => setSelected(isOpen ? null : p.id)} style={{ padding: '12px 14px', cursor: 'pointer', background: isOpen ? 'var(--color-background-secondary)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{p.title}</span>
                    <span style={{ fontSize: 11, background: pc.bg, color: pc.color, padding: '2px 7px', borderRadius: 4 }}>{p.payer}</span>
                    <span style={{ fontSize: 11, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', padding: '2px 7px', borderRadius: 4 }}>{p.category}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{p.use_case}</div>
                </div>
                <span style={{ fontSize: 16, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{isOpen ? '−' : '+'}</span>
              </div>

              {isOpen && (
                <div style={{ padding: '0 14px 14px' }}>
                  <div style={{ background: '#BA751710', border: '0.5px solid #BA751730', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#BA7517', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 500 }}>Why this matters: </span>{p.risk}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {p.tags.map(t => (
                      <span key={t} style={{ fontSize: 11, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', padding: '2px 8px', borderRadius: 4 }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prompt — replace bracketed fields with real data</div>
                    <pre style={{ fontSize: 12, lineHeight: 1.7, fontFamily: 'monospace', color: 'var(--color-text-primary)', margin: 0 }}>{p.prompt}</pre>
                  </div>
                  <button onClick={() => copy(p.prompt, p.id)} style={{ fontSize: 12, padding: '6px 16px', fontWeight: 500, background: copied === p.id ? '#3B6D1120' : 'none', color: copied === p.id ? '#3B6D11' : 'var(--color-text-primary)' }}>
                    {copied === p.id ? 'Copied!' : 'Copy prompt'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)', fontSize: 13 }}>No prompts match your search.</div>
        )}
      </div>

      <div style={{ marginTop: '1.25rem', background: 'var(--color-background-secondary)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
        These prompts are designed to be pasted into Claude, ChatGPT, or any AI tool. Replace all bracketed fields with real patient and session data before generating. Generated notes should always be reviewed by the supervising BCBA before submission.
      </div>
    </div>
  );
}
