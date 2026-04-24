# Reference Asset Index — PatientPartner Master

## Last Updated
2026-02-26

## Overview

This project contains 23 PDF assets organized by category. **All PDFs have been converted to Markdown** in `./reference-extracted/` for optimal AI context. **Cursor and Claude agents: read the .md files, not the PDFs.** Markdown is fully searchable, token-efficient, and preserves structure.

| Source | Format | Use for AI |
|--------|--------|------------|
| `./Branding/`, `./Positioning/`, etc. | PDF (original) | Archive only |
| `./reference-extracted/` | **Markdown** | **Primary—read these** |

---

## Asset Directory Map

| Folder | Path | Contents | Use for |
|--------|------|----------|---------|
| **Branding** | `./Branding/` | Brand Guidelines 2021 | Voice, visual identity, creative kit |
| **Clinical Trials** | `./Clinical Trials/` | Mentor program overview, capabilities deck, transforming trials | Positioning, clinical trial angle |
| **Commercial Pharma** | `./Commercial Pharma/` | 2026 Capabilities Deck (Pharma-Commercial) | Primary sales deck, positioning |
| **Competitor Analysis** | `./Competitor Analysis/` | Executive summary, comparison matrix, differentiator | competitors.md, positioning |
| **Ideal Customer Profiles** | `./Ideal Customer Profiles (ICP)/` | ICP overview, role list, roles outline | audience.md |
| **Medical Device** | `./Medical Device/` | GEN CAP 25 (1) | Med-tech positioning |
| **PerfectPatient** | `./PerfectPatient/` | AI mentor FAQ, one-pager, AI-powered engagement | Product positioning, PerfectPatient |
| **Positioning** | `./Positioning/` | PP Re-Positioning Document | positioning.md |
| **Research Reports & Case Studies** | `./Research Reports & Case Studies/` | Benchmark report, case studies, Edelman report, trend analysis, white paper | Proof points, learnings |

---

## File Inventory

### Branding
- `PatientPartner Brand Guidelines 2021 (2).pdf`

### Clinical Trials
- `What is the PatientPartner Mentor Program Clinical Trials.pdf`
- `PatientPartner_ClinicalTrials_CapabilitiesDeck(02_2026).pdf`
- `PatientPartner Transforming Clinical Trials through Peer Engagement.pdf`

### Commercial Pharma
- `2026_PatientPartner-Capabilities Deck (Pharma-Commercial).pdf`

### Competitor Analysis
- `Competitive Analysis Executive Summary (External).pdf`
- `Competitor Comparison Matrix.pdf`
- `COMPETITOR DIFFERENATITOR .pdf`

### Ideal Customer Profiles (ICP)
- `ICP Roles Outline & Overview .pdf`
- `ICP ROLE LIST .pdf`
- `ICP OVERVIEW_ .pdf`

### Medical Device
- `GEN CAP 25 (1).pdf`

### PerfectPatient
- `Perfect Patient Ai Mentor Media FAQ .pdf`
- `PerfectPatient AI-Powered Patient Engagement for Healthcare.pdf`
- `One Pager PDF draft 10-14.pdf`

### Positioning
- `PP Re-Positioning Document .pdf`

### Research Reports & Case Studies
- `2025 Patient Support Benchmark Report.pdf`
- `PatientPartner Case Study A Comprehensive Study of Its Impact on Patient Treatment Decisions.pdf`
- `PP Case Study - Supporting Retention.pdf`
- `PatientPartner Edleman Report .pdf`
- `2025 Direct To Patient Marketing Trend Analysis Report .pdf`
- `White Paper Report - Mentorship Effect On Patient Engagement.pdf`
- `PP Case Study - Patient Recruitment.pdf`

---

## Markdown Extracts (AI-Optimized)

**Path:** `./reference-extracted/` — Mirrors folder structure. Each PDF has a corresponding .md file.

| Category | Markdown path | Use for |
|----------|---------------|---------|
| Branding | `reference-extracted/Branding /` | voice-profile, creative kit |
| Clinical Trials | `reference-extracted/Clinical Trials /` | positioning, clinical angle |
| Commercial Pharma | `reference-extracted/Commercial Pharma /` | positioning, sales messaging |
| Competitor Analysis | `reference-extracted/Competitor Analysis /` | competitors.md |
| ICP | `reference-extracted/Ideal Customer Profiles (ICP) /` | audience.md |
| Medical Device | `reference-extracted/Medical Device /` | med-tech positioning |
| PerfectPatient | `reference-extracted/PerfectPatient/` | product positioning |
| Positioning | `reference-extracted/Positioning /` | positioning.md |
| Research & Case Studies | `reference-extracted/Research Reports & Case Studies /` | proof blocks, learnings |

**Re-convert PDFs:** `./scripts/convert-pdfs-to-markdown.py` (requires `pymupdf4llm`)

---

## Ingestion Workflow

1. **Read Markdown** — Load from `./reference-extracted/`. Do not read PDFs.
2. **Update voice-profile.md** — Branding, Commercial Pharma, Positioning.
3. **Update positioning.md** — Positioning, PP Re-Positioning Document, Competitor Analysis.
4. **Update audience.md** — ICP folder, Commercial Pharma.
5. **Update competitors.md** — Competitor Analysis folder.
6. **Add proof blocks** — Research Reports & Case Studies.
