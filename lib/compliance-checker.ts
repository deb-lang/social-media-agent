// Compliance checker — scans caption for healthcare-content violations.
// Two-layer approach:
//   1. Fast regex pass for known-bad patterns (PHI indicators, off-label keywords)
//   2. Claude pass for nuanced issues (fabricated testimonials, unsubstantiated claims)
//
// Outcomes:
//   - block: PHI, off-label claims, fabricated testimonials → auto-reject + regenerate
//   - flag:  unsubstantiated claims, drug/device name without disclaimer, wrong cert names
//   - pass:  no violations detected

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CLAUDE_MODEL } from "./constants";

export type ComplianceStatus = "pass" | "flag" | "block";

export interface ComplianceIssue {
  severity: "block" | "flag";
  rule: string;
  evidence: string; // snippet from caption that triggered the rule
  suggestion?: string;
}

export interface ComplianceResult {
  status: ComplianceStatus;
  issues: ComplianceIssue[];
}

// ─── Fast regex pass (deterministic blocks) ────────────

const PHI_PATTERNS: Array<{ name: string; re: RegExp }> = [
  // Names followed by medical condition ("John Smith, stage 3 breast cancer")
  { name: "name + condition", re: /\b[A-Z][a-z]+ [A-Z][a-z]+\b[^.]*(?:stage \d|diagnosed|suffering|patient id|mrn|medical record)/i },
  // Medical record numbers
  { name: "mrn", re: /\b(?:mrn|medical record (?:number|#)|patient (?:id|#))\s*[:=]?\s*\d+/i },
  // Obvious PII with age + condition
  { name: "age + condition", re: /\b\d{1,3}[-\s]year[-\s]old\b[^.]*(?:diagnosed|suffering|patient|died|survived)/i },
];

const OFF_LABEL_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "cure claim", re: /\b(?:cure|cures|cured) (?:cancer|diabetes|hiv|als|alzheimer|parkinson)/i },
  { name: "treats claim", re: /\b(?:treats|is approved for) [A-Za-z -]+\b/i }, // softer, caught by Claude if relevant
  { name: "medical advice", re: /\b(?:you should (?:take|stop|switch)|we recommend (?:taking|stopping|switching)) \b/i },
];

const FABRICATED_INDICATORS: RegExp[] = [
  // Direct "patient said" without attribution or year
  /\bpatient(?: named)?\s+(?:john|jane|mary|bob|alice|tom|sarah|mike|david|emma|lisa)\s+(?:said|told|shared)/i,
];

function regexBlockScan(caption: string): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  for (const { name, re } of PHI_PATTERNS) {
    const m = caption.match(re);
    if (m) {
      issues.push({ severity: "block", rule: `PHI: ${name}`, evidence: m[0] });
    }
  }
  for (const { name, re } of OFF_LABEL_PATTERNS) {
    const m = caption.match(re);
    if (m) {
      issues.push({
        severity: "block",
        rule: `Off-label claim: ${name}`,
        evidence: m[0],
      });
    }
  }
  for (const re of FABRICATED_INDICATORS) {
    const m = caption.match(re);
    if (m) {
      issues.push({
        severity: "block",
        rule: "Fabricated testimonial indicator",
        evidence: m[0],
      });
    }
  }
  return issues;
}

// Soft flags (not blockers, just warn reviewer)
const DRUG_DEVICE_HINTS = /\b(?:humira|ozempic|keytruda|medtronic|dupixent|mounjaro|wegovy|eliquis|pradaxa|xarelto)\b/i;
const CERT_NAME_HINTS = /\b(?:hippa|hipaa compliant|soc2|iso 27001|iso27001|sox)\b/i;

function regexFlagScan(caption: string): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const drugMatch = caption.match(DRUG_DEVICE_HINTS);
  if (drugMatch) {
    issues.push({
      severity: "flag",
      rule: "Specific drug/device named",
      evidence: drugMatch[0],
      suggestion:
        "Generic references preferred. If a specific drug must be mentioned, include an informational disclaimer.",
    });
  }
  // Check that cert names are spelled correctly
  if (/hippa/i.test(caption)) {
    issues.push({
      severity: "flag",
      rule: "Misspelled compliance cert (HIPPA → HIPAA)",
      evidence: "HIPPA",
      suggestion: "Correct spelling is HIPAA.",
    });
  }
  return issues;
}

// ─── Claude pass (for nuanced patterns regex can't catch) ──

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const CLAUDE_SYSTEM = `You are a pharma compliance reviewer for LinkedIn content. Scan the caption for these issues:

BLOCK (auto-reject):
- Patient names, case IDs, or identifiable health info (PHI)
- Off-label treatment claims or specific medical advice
- Fabricated patient testimonials presented as real quotes

FLAG (warn reviewer, don't block):
- Unsubstantiated health/clinical claims without a source
- Specific drug/device brand names without an informational disclaimer
- Incorrect compliance certification names

PASS: no violations detected.

Return JSON: { status: "pass" | "flag" | "block", issues: [{severity, rule, evidence, suggestion?}] }`;

const ClaudeResultSchema = z.object({
  status: z.enum(["pass", "flag", "block"]),
  issues: z
    .array(
      z.object({
        severity: z.enum(["block", "flag"]),
        rule: z.string(),
        evidence: z.string(),
        suggestion: z.string().optional(),
      })
    )
    .max(10),
});

async function claudeScan(caption: string): Promise<ComplianceIssue[]> {
  try {
    const resp = await client().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      output_config: {
        format: {
          type: "json_schema",
          name: "compliance",
          schema: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["pass", "flag", "block"] },
              issues: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    severity: { type: "string", enum: ["block", "flag"] },
                    rule: { type: "string" },
                    evidence: { type: "string" },
                    suggestion: { type: "string" },
                  },
                  required: ["severity", "rule", "evidence"],
                  additionalProperties: false,
                },
              },
            },
            required: ["status", "issues"],
            additionalProperties: false,
          },
        },
      },
      system: CLAUDE_SYSTEM,
      messages: [{ role: "user", content: caption }],
    } as Anthropic.MessageCreateParamsNonStreaming);
    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];
    const parsed = ClaudeResultSchema.parse(JSON.parse(textBlock.text));
    return parsed.issues;
  } catch (err) {
    console.warn("[compliance] Claude scan failed (non-fatal):", err);
    return [];
  }
}

// ─── Public API ────────────────────────────────────────

export async function checkCompliance(caption: string): Promise<ComplianceResult> {
  const regexBlocks = regexBlockScan(caption);
  const regexFlags = regexFlagScan(caption);

  // If regex already found a block, skip Claude — save a call.
  if (regexBlocks.length > 0) {
    return {
      status: "block",
      issues: [...regexBlocks, ...regexFlags],
    };
  }

  const claudeIssues = await claudeScan(caption);
  const allIssues = [...regexFlags, ...claudeIssues];

  const hasBlock = allIssues.some((i) => i.severity === "block");
  const hasFlag = allIssues.some((i) => i.severity === "flag");
  const status: ComplianceStatus = hasBlock ? "block" : hasFlag ? "flag" : "pass";

  return { status, issues: allIssues };
}
