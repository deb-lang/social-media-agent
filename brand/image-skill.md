# PatientPartner LinkedIn Image Skill

## Confirmed Configuration
- **Image types:** Any LinkedIn image type — stats, quotes, announcements, product
- **Templates:** 2 (Dark Navy + Light Teal)
- **Output:** PNG file + post copy, always together
- **Author:** George Kramb / PatientPartner
- **Logo:** Always included
- **Topics:** All PatientPartner content (clinical trials, pharma commercial, AI Mentor/PerfectPatient, general patient engagement)

---

## Trigger
Use this skill whenever asked to generate a LinkedIn post image, social media visual, stat graphic, quote card, product announcement, or any LinkedIn content for PatientPartner. Always read this skill before writing any code or generating any image.

---

## CORE LAYOUT PRINCIPLE — READ THIS FIRST

**The image must fill the full 1200x1200 canvas. No unnecessary whitespace. Every zone must be occupied.**

### Rules that are non-negotiable:
1. **Calculate before placing.** Before placing any element, divide the 1200px height into zones. Every zone must have content.
2. **No floating islands.** Elements must not sit in the middle of empty space. Push content to fill.
3. **Cards must stretch.** Card heights should expand to fill available vertical space — not be fixed at a small size with empty space below.
4. **Text must fill cards.** If a card has empty space, increase font size, add a supporting line, or expand the card.
5. **Section gaps must be intentional.** A divider line counts as content. A 100px empty gap does not.
6. **Bottom 200px must never be empty.** The URL line alone does not count as filling the bottom — pair it with a CTA bar or a bottom stat card.
7. **Always do a mental render check before writing code.** Mentally stack every element top to bottom and verify the total height reaches ~1180px before coding.

### Zone planning method (always do this):
Before writing any SVG, plan the zones explicitly:
```
Zone 1: Header (logo + year) — ~130px
Zone 2: Divider — 1px
Zone 3: Headline block — ~120px
Zone 4: Divider — 1px
Zone 5: [Content block A] — Xpx
Zone 6: Divider or label — ~40px
Zone 7: [Content block B] — Xpx
Zone 8: CTA bar — ~100px
Zone 9: Footer URL — ~60px
TOTAL: must sum to ~1200px
```

If your zones don't add up to ~1200px, redistribute heights before coding.

---

## What This Skill Produces
Every request produces TWO things, always together:
1. A **1200x1200 PNG** image (square format, ready to upload directly to LinkedIn)
2. **LinkedIn post copy** in George's voice, output as text after the image

Never produce one without the other.

---

## Image Type Decision Tree

| Image Type | Template |
|---|---|
| Stat post (3-6 data points) | Dark Navy |
| Problem/solution (2 rows of stats) | Dark Navy |
| Case study outcomes | Dark Navy |
| Quote card | Light Teal |
| Product announcement | Light Teal |
| Feature/how-it-works | Light Teal |
| Milestone / company news | Light Teal |

When in doubt: data = dark, human/warm/product = light.

---

## Output Specs
- Format: PNG, 1200x1200px
- Method: Python via `cairosvg` (SVG → PNG)
- Logo: Always embed from `/mnt/user-data/uploads/patientpartner-logo.png` as base64
- Output path: `/mnt/user-data/outputs/[descriptive_filename].png`
- Always call `present_files` to share the PNG
- Always output post copy as text immediately after

---

## Brand Standards

### Colors
| Use | Hex |
|---|---|
| Navy background (dark template) | `#0B2D48` |
| PatientPartner teal | `#4BBFBF` |
| Light teal gradient top | `#E8F9FA` |
| Light teal gradient bottom | `#C4EDF0` |
| Card fill — dark template | `#0F2F45` |
| Card fill — light template | `#FFFFFF` |
| White text | `#FFFFFF` |
| Dark navy text (light template) | `#0B2D48` |
| Teal accent text | `#4BBFBF` |
| Blur circle accent | `#74CDD0` |

### Never use
- Any dark green: `#0F6E56`, `#085041`, `#188F8B`, `#1D9E75` — never
- Hard-edged decorative circles in the light template (must always be blurred)
- `var(--font-sans)` — always use `Arial, sans-serif` explicitly in SVG

### Logo
- Always top-left: `x="50" y="44" width="300" height="78"`
- Source: `/mnt/user-data/uploads/patientpartner-logo.png`
- Embed as base64 `<image href="data:image/png;base64,{logo_b64}">` in SVG

---

## Template 1: DARK NAVY
**Use for:** Stat posts, problem/solution, case studies, industry data, clinical trial facts

### Zone plan (6 stats, problem + solution layout)
```
Header (logo + divider):         y=0   to y=160   = 160px
Headline block:                  y=160 to y=310   = 150px
Section label "THE PROBLEM":     y=310 to y=350   =  40px
Row 1 cards (3 stats, problem):  y=350 to y=560   = 210px  ← cards height=200
Divider + section label:         y=560 to y=620   =  60px
Row 2 cards (3 stats, solution): y=620 to y=870   = 250px  ← cards height=240
CTA bar:                         y=880 to y=990   = 110px
Footer URL:                      y=990 to y=1060  =  70px
Bottom padding:                  y=1060 to y=1200 = 140px  ← use for extra row or bigger cards
```

**Important:** If only 3 total stats (not 6), use ONE row of tall cards (height=340px) and a large headline + large CTA to fill remaining space.

### Card rules — dark template
- Problem row: `fill="#0F2F45" stroke="#4BBFBF" stroke-width="1"` — stat in white
- Solution row: `fill="#0F2F45" stroke="#4BBFBF" stroke-width="2.5"` — stat in `#4BBFBF`
- Stat font: `76px bold`
- Label font: `20px regular`, two lines if needed
- Card `rx="12"`
- 3 cards across: `x=50, x=431, x=812` each `width=338`

### Accent circles — dark template
```xml
<circle cx="1040" cy="160" r="300" fill="#4BBFBF" opacity="0.07"/>
<circle cx="160" cy="1080" r="230" fill="#4BBFBF" opacity="0.05"/>
```
Not blurred. Just opacity.

### CTA bar — dark template
```xml
<rect x="50" y="880" width="1100" height="100" rx="12"
  fill="#4BBFBF" opacity="0.12" stroke="#4BBFBF" stroke-width="1"/>
<text x="600" y="922" ... fill="#FFFFFF" font-size="26" font-weight="700" text-anchor="middle">Bold CTA line</text>
<text x="600" y="958" ... fill="#4BBFBF" font-size="20" text-anchor="middle">Supporting line</text>
```

---

## Template 2: LIGHT TEAL
**Use for:** Quote cards, product announcements, AI Mentor/PerfectPatient, milestones, warm topics

### Zone plan (2 content cards + 2 bottom stats)
```
Header (logo + divider):         y=0   to y=160   = 160px
Headline block:                  y=160 to y=310   = 150px
Section label:                   y=310 to y=360   =  50px
Content cards row 1 (2 wide):    y=360 to y=620   = 260px  ← height=250 each
Content cards row 2 (2 wide):    y=640 to y=840   = 200px  ← height=190 each
CTA bar (solid teal):            y=860 to y=970   = 110px
Footer URL:                      y=980 to y=1060  =  80px
Remaining:                       y=1060 to y=1200 = 140px  ← use for bottom stat strip
```

**If fewer content items:** Make cards taller, increase font sizes, add an extra stat strip at the bottom. Never leave 140px+ empty.

### Required blurred background — light template
```xml
<defs>
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#E8F9FA"/>
    <stop offset="100%" stop-color="#C4EDF0"/>
  </linearGradient>
  <filter id="blur1" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="45"/>
  </filter>
</defs>
<rect width="1200" height="1200" fill="url(#bgGrad)"/>
<circle cx="1080" cy="140" r="230" fill="#4BBFBF" opacity="0.14" filter="url(#blur1)"/>
<circle cx="130" cy="1070" r="210" fill="#4BBFBF" opacity="0.11" filter="url(#blur1)"/>
<circle cx="620" cy="580" r="190" fill="#74CDD0" opacity="0.07" filter="url(#blur1)"/>
```

### Card rules — light template
- Fill: `#FFFFFF`
- Border: `stroke="#4BBFBF" stroke-width="1.5"`
- Stat numbers: `#4BBFBF`, bold
- Labels/body: `#0B2D48`, regular
- Corner radius: `rx="14"`

### CTA bar — light template
```xml
<rect x="50" y="860" width="1100" height="100" rx="14" fill="#4BBFBF"/>
<text x="600" y="902" fill="#FFFFFF" font-size="24" font-weight="700" text-anchor="middle">Bold CTA</text>
<text x="600" y="938" fill="#FFFFFF" font-size="18" text-anchor="middle">Supporting line</text>
```

---

## Content Layouts by Image Type

### Quote card (light template)
```
Header
────────────────
[Large " glyph: #4BBFBF, 160px, x=50 y=380]
[Quote text: #0B2D48, 32px italic, centered, wrapped, ~y=480-680]
[Attribution line: #4BBFBF, 22px bold, centered, y=720]
[Role/company: #0B2D48, 20px, centered, y=752]
────────────────
[2-3 supporting stat chips: small white cards, teal border, centered, y=800-880]
CTA bar
Footer
```
No empty space between the quote and the CTA. Stat chips fill the gap.

### Announcement (light template)
```
Header
────────────────
[Oversize headline: #0B2D48, 58px, x=50]
[Subhead: #4BBFBF, 24px]
────────────────
[3 feature cards: white, teal border, stacked 2+1 or 3 across]
  Card title: #4BBFBF, 20px bold
  Card body: #0B2D48, 17px regular, 2-3 lines
────────────────
[Bottom stat strip: 2 wide cards with key numbers]
CTA bar
Footer
```

### Problem/Solution (dark template)
```
Header
────────────────
[Headline white 54px + subhead teal 24px]
────────────────
[Label: "THE PROBLEM"]
[3 cards, white stats, teal labels]
────────────────
[Label: "WHAT WE DELIVER" or relevant]
[3 cards, teal stats, white labels, thicker border]
────────────────
CTA bar
Footer
```

---

## Layout Balance Checklist — Run Before Every Image
Before writing SVG code, verify:
- [ ] All zones planned and heights sum to ~1200px
- [ ] No zone is empty — every gap has a divider, label, or element
- [ ] Bottom 200px contains real content (stat strip, CTA, or footer block)
- [ ] Cards are tall enough to not float in whitespace
- [ ] Text inside cards uses available vertical space — increase font size if card feels empty
- [ ] Fonts are large enough to be legible on mobile (minimum 18px for body, 20px preferred)

---

## Post Copy Rules
Always write in **George Kramb's voice**:
- Conversational, direct — no corporate speak
- Short punchy sentences. One idea per sentence.
- No em dashes. Use a period or ellipsis instead.
- Lead with a stat, a question, or a blunt observation
- Middle: briefly explain what's behind it
- End with a low-friction CTA: "message me directly" or "drop a comment"
- 4-5 relevant hashtags at the very end
- Contractions always: "it's", "we're", "doesn't", "can't"
- Tone: peer-to-peer, warm, direct. Sounds like a CEO talking to a colleague

**Never use:** "revolutionize", "transform", "seamlessly", "empower", "leverage" (unless quoting a doc), "in the ever-evolving landscape of"

---

## Step-by-Step Workflow

1. **Read this SKILL.md** (already done)
2. **Identify image type** from the decision tree
3. **Choose template** — dark or light
4. **Plan zones** — write out the zone heights explicitly, verify they sum to ~1200px
5. **Extract content** — pull stats, headline, quote, or features from context
6. **Load logo as base64** from `/mnt/user-data/uploads/patientpartner-logo.png`
7. **Write SVG** using zone plan + template rules above
8. **Run layout balance checklist** mentally before converting
9. **Convert to PNG** via `cairosvg.svg2png()` at 1200x1200
10. **Save to** `/mnt/user-data/outputs/[descriptive_name].png`
11. **Present file** using `present_files`
12. **Output post copy** as text below the image

---

## Python Boilerplate

```python
import base64
import cairosvg

# Load logo
with open("/mnt/user-data/uploads/patientpartner-logo.png", "rb") as f:
    logo_b64 = base64.b64encode(f.read()).decode()

# Build SVG
svg = f"""<svg width="1200" height="1200" viewBox="0 0 1200 1200"
    xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">

  <!-- Background, accents, logo, content here -->
  <image href="data:image/png;base64,{logo_b64}" x="50" y="44" width="300" height="78"/>

</svg>"""

# Convert to PNG
cairosvg.svg2png(
    bytestring=svg.encode(),
    write_to="/mnt/user-data/outputs/filename.png",
    output_width=1200,
    output_height=1200
)
```

---

## Final Quality Checklist Before Presenting
- [ ] Logo visible, top-left, correct size
- [ ] No dark greens anywhere
- [ ] Teal is exactly `#4BBFBF`
- [ ] Stats are accurate — pulled from source citations below, not invented
- [ ] Light template has blurred circles, not hard circles
- [ ] PNG is 1200x1200
- [ ] **Canvas is full — no large empty whitespace areas**
- [ ] **Bottom of image has content, not just a URL line**
- [ ] **Cards are proportional — not tiny boxes floating in space**
- [ ] Post copy sounds like George, not a press release
- [ ] File presented with `present_files`

---

## Approved Stat Library with Source Citations

Only use stats from this list. Never invent numbers. If a stat is not listed here, do not use it.

---

### Pharma Commercial

| Stat | Context | Source |
|---|---|---|
| **68%** of patients say they'd be more likely to start treatment if they could talk to someone already on it | Treatment starts / new patient activation | Accenture Life Sciences: "The Patient is In" Report, 2016 |
| **1 in 4** patients abandon new prescriptions if they don't begin treatment within 2 days of diagnosis | Prescription abandonment / adherence | IQVIA Medicine Use and Spending in the U.S., 2020 |
| **#1** driver of patient trust is hearing from "someone who's walked in my shoes" when making healthcare decisions | Trust / peer influence | Edelman Trust Barometer, 2025 |
| **18%** script lift for brands that offer PatientPartner's mentor program | Script lift / commercial ROI | PatientPartner internal program data |
| **22%** increase in treatment adherence when brands use PatientPartner's mentor program | Adherence | PatientPartner internal program data |
| **68%** of patients take the next step in their journey following a mentor engagement | Conversion / next step | PatientPartner internal program data |
| **100%** mentor match rate | Platform performance | PatientPartner internal program data |
| **6 hrs / 48 hrs** to connect with a mentor (vs. 6 weeks for standard programs) | Speed / competitive differentiation | PatientPartner internal program data |
| **35%** patient drop-off rate for standard mentorship programs (vs. 100% match rate for PatientPartner) | Competitive comparison | PatientPartner internal program data |
| **3x** engagement lift on brand.com | AI Mentor / PerfectPatient | PatientPartner PerfectPatient deck, 2026 |
| **37%** faster treatment decisions | AI Mentor / PerfectPatient | PatientPartner PerfectPatient deck, 2026 |
| **24%** lift in adherence rates | AI Mentor / PerfectPatient | PatientPartner PerfectPatient deck, 2026 |
| **95%** patient re-engagement rate | AI Mentor / PerfectPatient | PatientPartner PerfectPatient deck, 2026 |
| **14 min** average conversation length | AI Mentor / PerfectPatient | PatientPartner PerfectPatient deck, 2026 |

---

### Clinical Trials

| Stat | Context | Source |
|---|---|---|
| **30%** average dropout rate in clinical trials | Trial retention problem | PatientPartner Clinical Trials Capabilities Deck, 2026 |
| **$19k+** to replace a single patient dropout | Cost of dropout | PatientPartner Clinical Trials Capabilities Deck, 2026 |
| **20-40%** non-adherence rates depending on trial complexity | Trial adherence problem | PatientPartner Clinical Trials Capabilities Deck, 2026 |
| **70%** of trial patients express interest in having peer support during their study | Patient demand for peer support | PatientPartner Clinical Trials Capabilities Deck, 2026 |
| **22%** increase in trial adherence with peer mentorship | Trial adherence solution | PatientPartner Clinical Trials Capabilities Deck, 2026 |
| **68%** of patients take the next step following a mentor engagement (trial context) | Trial enrollment conversion | PatientPartner Clinical Trials Capabilities Deck, 2026 |
| **40%** of site time spent on patient questions, expectations, and emotional support can be offloaded through mentorship | Site efficiency | PatientPartner Clinical Trials Capabilities Deck, 2026 |
| **>4 weeks** time avoidance from increased retention | Time savings | PatientPartner Clinical Trials Capabilities Deck, 2026 |
| **$6-8k** cost avoidance per retained patient | Cost savings | PatientPartner Clinical Trials Capabilities Deck, 2026 |
| **72%** of mentees who connected with a mentor moved to next step (dermatology trial) | Case study — enrollment | PatientPartner Clinical Trials Case Study (Dermatology) |
| **38%** of mentees who connected with a mentor consented for treatment (dermatology trial) | Case study — consent | PatientPartner Clinical Trials Case Study (Dermatology) |
| **81%** agreed their mentor made them feel more comfortable with the treatment decision | Case study — confidence | PatientPartner Clinical Trials Case Study (Dermatology) |
| **94%** mentee satisfaction score (oncology program) | Case study — satisfaction | PatientPartner Clinical Trials Case Study (Oncology) |
| **65** participants enrolled as mentees (oncology program) | Case study — scale | PatientPartner Clinical Trials Case Study (Oncology) |
| **1,300** mentor-mentee interactions (oncology program) | Case study — engagement | PatientPartner Clinical Trials Case Study (Oncology) |
| **60,000+** members nationwide | Platform scale | PatientPartner capabilities decks, 2026 |
| **1,000+** trained mentors | Mentor network | PatientPartner capabilities decks, 2026 |
| **100+** health conditions supported | Therapeutic coverage | PatientPartner capabilities decks, 2026 |
| Implementation in **<8 weeks** | Speed to deploy | PatientPartner Clinical Trials Capabilities Deck, 2026 |

---

### Research & Third-Party Citations

| Stat | Context | Source |
|---|---|---|
| Overly complicated protocols lead patients to feel **overwhelmed and at risk of withdrawal** | Trial design problem | Scout Clinical (cited in PatientPartner deck) |
| Misinformation and lack of peer support are increasingly shaping **negative attitudes toward trial participation** | Public trust problem | 2025 Velocity Clinical Survey (cited in PatientPartner deck) |
| Patients experienced **role confusion, emotional burden, and lack of support** when peer support was absent | Patient experience | BMC Medicine, 2024 Review of 40,000 patients |

---

### Citation Format for Post Copy
When referencing a stat in post copy, keep it natural — don't paste the full citation. Use light attribution where needed:

- "According to Edelman..." or "Per Accenture's research..." for third-party stats
- No citation needed for PatientPartner's own program data — just state the number
- Never cite a stat without knowing its source from the table above
