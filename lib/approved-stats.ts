// Approved stat library — from brand/image-skill.md (George / PatientPartner).
// Claude generation MUST pull from this list. Never invent numbers.
// If a needed stat isn't here, skip the post rather than fabricate.

export type StatTopic =
  | "pharma_commercial"
  | "clinical_trials"
  | "ai_mentor"
  | "research_citation";

export interface ApprovedStat {
  id: string;
  value: string;
  context: string;
  source: string;
  topic: StatTopic;
}

export const APPROVED_STATS: ApprovedStat[] = [
  // ─── Pharma Commercial ──────────────────────────────
  {
    id: "pharma-start-intent-68",
    value: "68%",
    context: "of patients say they'd be more likely to start treatment if they could talk to someone already on it",
    source: "Accenture Life Sciences: The Patient is In Report, 2016",
    topic: "pharma_commercial",
  },
  {
    id: "pharma-rx-abandon-1in4",
    value: "1 in 4",
    context: "patients abandon new prescriptions if they don't begin treatment within 2 days of diagnosis",
    source: "IQVIA Medicine Use and Spending in the U.S., 2020",
    topic: "pharma_commercial",
  },
  {
    id: "pharma-trust-walked-shoes",
    value: "#1",
    context: "driver of patient trust is hearing from someone who's walked in my shoes when making healthcare decisions",
    source: "Edelman Trust Barometer, 2025",
    topic: "pharma_commercial",
  },
  {
    id: "pp-script-lift-18",
    value: "18%",
    context: "script lift for brands that offer PatientPartner's mentor program",
    source: "PatientPartner internal program data",
    topic: "pharma_commercial",
  },
  {
    id: "pp-adherence-22",
    value: "22%",
    context: "increase in treatment adherence when brands use PatientPartner's mentor program",
    source: "PatientPartner internal program data",
    topic: "pharma_commercial",
  },
  {
    id: "pp-next-step-68",
    value: "68%",
    context: "of patients take the next step in their journey following a mentor engagement",
    source: "PatientPartner internal program data",
    topic: "pharma_commercial",
  },
  {
    id: "pp-match-rate-100",
    value: "100%",
    context: "mentor match rate",
    source: "PatientPartner internal program data",
    topic: "pharma_commercial",
  },
  {
    id: "pp-speed-6hrs",
    value: "6 hrs / 48 hrs",
    context: "to connect with a mentor, vs. 6 weeks for standard programs",
    source: "PatientPartner internal program data",
    topic: "pharma_commercial",
  },
  {
    id: "pp-competitor-dropoff-35",
    value: "35%",
    context: "patient drop-off rate for standard mentorship programs, vs. 100% match rate for PatientPartner",
    source: "PatientPartner internal program data",
    topic: "pharma_commercial",
  },
  // ─── AI Mentor / PerfectPatient ──────────────────────
  {
    id: "pp-ai-engagement-3x",
    value: "3x",
    context: "engagement lift on brand.com with PerfectPatient AI Mentor",
    source: "PatientPartner PerfectPatient deck, 2026",
    topic: "ai_mentor",
  },
  {
    id: "pp-ai-decisions-37",
    value: "37%",
    context: "faster treatment decisions with PerfectPatient",
    source: "PatientPartner PerfectPatient deck, 2026",
    topic: "ai_mentor",
  },
  {
    id: "pp-ai-adherence-24",
    value: "24%",
    context: "lift in adherence rates with PerfectPatient",
    source: "PatientPartner PerfectPatient deck, 2026",
    topic: "ai_mentor",
  },
  {
    id: "pp-ai-reengagement-95",
    value: "95%",
    context: "patient re-engagement rate with PerfectPatient",
    source: "PatientPartner PerfectPatient deck, 2026",
    topic: "ai_mentor",
  },
  {
    id: "pp-ai-avg-convo-14min",
    value: "14 min",
    context: "average conversation length with PerfectPatient",
    source: "PatientPartner PerfectPatient deck, 2026",
    topic: "ai_mentor",
  },
  // ─── Clinical Trials ─────────────────────────────────
  {
    id: "trials-dropout-30",
    value: "30%",
    context: "average dropout rate in clinical trials",
    source: "PatientPartner Clinical Trials Capabilities Deck, 2026",
    topic: "clinical_trials",
  },
  {
    id: "trials-replacement-cost-19k",
    value: "$19k+",
    context: "to replace a single patient dropout in a clinical trial",
    source: "PatientPartner Clinical Trials Capabilities Deck, 2026",
    topic: "clinical_trials",
  },
  {
    id: "trials-nonadherence-20-40",
    value: "20-40%",
    context: "non-adherence rates in trials depending on protocol complexity",
    source: "PatientPartner Clinical Trials Capabilities Deck, 2026",
    topic: "clinical_trials",
  },
  {
    id: "trials-peer-support-demand-70",
    value: "70%",
    context: "of trial patients express interest in having peer support during their study",
    source: "PatientPartner Clinical Trials Capabilities Deck, 2026",
    topic: "clinical_trials",
  },
  {
    id: "trials-adherence-lift-22",
    value: "22%",
    context: "increase in trial adherence with peer mentorship",
    source: "PatientPartner Clinical Trials Capabilities Deck, 2026",
    topic: "clinical_trials",
  },
  {
    id: "trials-site-offload-40",
    value: "40%",
    context: "of site time spent on patient questions, expectations, and emotional support can be offloaded through mentorship",
    source: "PatientPartner Clinical Trials Capabilities Deck, 2026",
    topic: "clinical_trials",
  },
  {
    id: "trials-time-avoidance-4wk",
    value: ">4 weeks",
    context: "time avoidance from increased retention",
    source: "PatientPartner Clinical Trials Capabilities Deck, 2026",
    topic: "clinical_trials",
  },
  {
    id: "trials-cost-savings-6-8k",
    value: "$6-8k",
    context: "cost avoidance per retained patient",
    source: "PatientPartner Clinical Trials Capabilities Deck, 2026",
    topic: "clinical_trials",
  },
  {
    id: "trials-derm-next-step-72",
    value: "72%",
    context: "of mentees who connected with a mentor moved to next step (dermatology trial)",
    source: "PatientPartner Clinical Trials Case Study — Dermatology",
    topic: "clinical_trials",
  },
  {
    id: "trials-derm-consent-38",
    value: "38%",
    context: "of mentees who connected with a mentor consented for treatment (dermatology trial)",
    source: "PatientPartner Clinical Trials Case Study — Dermatology",
    topic: "clinical_trials",
  },
  {
    id: "trials-derm-confidence-81",
    value: "81%",
    context: "agreed their mentor made them feel more comfortable with the treatment decision (dermatology trial)",
    source: "PatientPartner Clinical Trials Case Study — Dermatology",
    topic: "clinical_trials",
  },
  {
    id: "trials-onc-satisfaction-94",
    value: "94%",
    context: "mentee satisfaction score (oncology program)",
    source: "PatientPartner Clinical Trials Case Study — Oncology",
    topic: "clinical_trials",
  },
  {
    id: "trials-onc-enrolled-65",
    value: "65",
    context: "participants enrolled as mentees (oncology program)",
    source: "PatientPartner Clinical Trials Case Study — Oncology",
    topic: "clinical_trials",
  },
  {
    id: "trials-onc-interactions-1300",
    value: "1,300",
    context: "mentor-mentee interactions (oncology program)",
    source: "PatientPartner Clinical Trials Case Study — Oncology",
    topic: "clinical_trials",
  },
  {
    id: "pp-members-60k",
    value: "60,000+",
    context: "members nationwide on the PatientPartner platform",
    source: "PatientPartner capabilities decks, 2026",
    topic: "clinical_trials",
  },
  {
    id: "pp-mentors-1k",
    value: "1,000+",
    context: "trained mentors in the PatientPartner network",
    source: "PatientPartner capabilities decks, 2026",
    topic: "clinical_trials",
  },
  {
    id: "pp-conditions-100",
    value: "100+",
    context: "health conditions supported",
    source: "PatientPartner capabilities decks, 2026",
    topic: "clinical_trials",
  },
  {
    id: "pp-implementation-8wk",
    value: "<8 weeks",
    context: "implementation time",
    source: "PatientPartner Clinical Trials Capabilities Deck, 2026",
    topic: "clinical_trials",
  },
  // ─── Research / Third-Party ──────────────────────────
  {
    id: "research-scout-overwhelm",
    value: "—",
    context: "Overly complicated protocols lead patients to feel overwhelmed and at risk of withdrawal",
    source: "Scout Clinical (cited in PatientPartner deck)",
    topic: "research_citation",
  },
  {
    id: "research-velocity-trust",
    value: "—",
    context: "Misinformation and lack of peer support increasingly shape negative attitudes toward trial participation",
    source: "2025 Velocity Clinical Survey",
    topic: "research_citation",
  },
  {
    id: "research-bmc-role-confusion",
    value: "—",
    context: "Patients experienced role confusion, emotional burden, and lack of support when peer support was absent",
    source: "BMC Medicine, 2024 Review of 40,000 patients",
    topic: "research_citation",
  },
];

export function statsByTopic(topic: StatTopic): ApprovedStat[] {
  return APPROVED_STATS.filter((s) => s.topic === topic);
}

export function statById(id: string): ApprovedStat | undefined {
  return APPROVED_STATS.find((s) => s.id === id);
}
