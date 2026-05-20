// StaticEditorial — magazine-cover style 1080×1080 post.
// Ported from the Claude Design bundle's StaticEditorial component.
//
// Layout:
//   - Top masthead: "The Partner" title + ISSUE/MAY · YEAR meta
//   - Feature-story tag with mint badge
//   - Giant "The case for someone like you." headline (mixed serif/teal accent)
//   - Dek paragraph below a thin separator
//   - Byline at bottom with author initials avatar + photographer credit + wordmark
//
// The bundle's source values are kept verbatim by default; props let callers
// swap individual lines without re-implementing the layout.

import { PP, MANROPE, lineGrid, ppWordmark } from "./atoms";
import { esc, htmlDoc } from "./shared";

export interface StaticEditorialProps {
  // Masthead
  publication?: string;     // "The Partner"
  publicationKicker?: string; // "A PatientPartner Bulletin · Vol. 04"
  issue?: string;            // "ISSUE 014"
  issueDate?: string;        // "MAY · 2024"

  // Feature tag
  featureBadge?: string;     // "F"
  featureLabel?: string;     // "Feature story · 12 min read"

  // Headline
  preHeadline?: string;      // "The case for" (in teal serif tone)
  headline: string;          // "someone like you." (giant black)
  headlineEmphasisWord?: string; // word within `headline` to render in teal italic

  // Dek
  dek: string;               // Long subtitle paragraph

  // Byline
  authorInitials?: string;   // "RP"
  authorName?: string;       // "By Dr. Reema Patel"
  photographer?: string;     // "Photography · Linh Tran"
}

export function renderStaticEditorial(p: StaticEditorialProps): string {
  const publication = p.publication ?? "The Partner";
  const kicker = p.publicationKicker ?? "A PatientPartner Bulletin · Vol. 04";
  const issue = p.issue ?? "ISSUE 014";
  const issueDate = p.issueDate ?? "MAY · 2026";
  const featureBadge = p.featureBadge ?? "F";
  const featureLabel = p.featureLabel ?? "Feature story · 12 min read";
  const preHeadline = p.preHeadline ?? "The case for";
  const headline = p.headline;
  const emphasis = p.headlineEmphasisWord;
  const dek = p.dek;
  const authorInitials = p.authorInitials ?? "PP";
  const authorName = p.authorName ?? "By the PatientPartner team";
  const photographer = p.photographer ?? "Photography · PatientPartner archive";

  // Render the headline with optional emphasis word in teal italic.
  let headlineHTML: string;
  if (emphasis && headline.includes(emphasis)) {
    const parts = headline.split(emphasis);
    headlineHTML =
      esc(parts[0]) +
      `<span style="font-family:${MANROPE};font-weight:600;color:${PP.teal}">${esc(emphasis)}</span>` +
      esc(parts.slice(1).join(emphasis));
  } else {
    headlineHTML = esc(headline);
  }

  const body = `
    ${lineGrid({ color: "rgba(16,43,69,0.06)", gap: 90 })}

    <!-- top masthead -->
    <div style="position:absolute;top:60px;left:60px;right:60px;display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid ${PP.ink}">
      <div>
        <div style="font-family:${MANROPE};font-weight:700;font-size:42px;letter-spacing:-1px;color:${PP.ink};line-height:1">${esc(publication)}</div>
        <div style="margin-top:6px;font-weight:600;font-size:11px;letter-spacing:0.3em;color:${PP.muted};text-transform:uppercase">${esc(kicker)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:${MANROPE};font-size:13px;color:${PP.ink};letter-spacing:0.15em">${esc(issue)}</div>
        <div style="margin-top:4px;font-family:${MANROPE};font-size:11px;color:${PP.muted};letter-spacing:0.18em">${esc(issueDate)}</div>
      </div>
    </div>

    <!-- corner feature tag -->
    <div style="position:absolute;top:200px;left:60px;display:flex;align-items:center;gap:12px">
      <div style="width:32px;height:32px;border-radius:16px;background:${PP.mint};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:${PP.ink}">${esc(featureBadge)}</div>
      <span style="font-weight:700;font-size:14px;letter-spacing:0.22em;color:${PP.teal};text-transform:uppercase">${esc(featureLabel)}</span>
    </div>

    <!-- Giant headline -->
    <div style="position:absolute;top:280px;left:60px;right:60px">
      <div style="font-family:${MANROPE};font-size:48px;line-height:1;color:${PP.teal};margin-bottom:18px;letter-spacing:-0.6px">${esc(preHeadline)}</div>
      <div style="font-weight:800;font-size:158px;line-height:0.94;letter-spacing:-5px;color:${PP.ink};text-wrap:balance">
        ${headlineHTML}
      </div>
    </div>

    <!-- Dek -->
    <div style="position:absolute;bottom:200px;left:60px;right:120px;padding-top:28px;border-top:1px solid ${PP.ink2}">
      <div style="font-weight:600;font-size:22px;line-height:1.45;color:${PP.ink2};letter-spacing:-0.2px;max-width:780px;text-wrap:pretty">
        ${esc(dek)}
      </div>
    </div>

    <!-- Footer byline -->
    <div style="position:absolute;bottom:60px;left:60px;right:60px;display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:36px;height:36px;border-radius:18px;background:${PP.ink};color:${PP.mint};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${esc(authorInitials)}</div>
        <div>
          <div style="font-weight:700;font-size:14px;color:${PP.ink};letter-spacing:-0.2px">${esc(authorName)}</div>
          <div style="font-weight:500;font-size:12px;color:${PP.muted}">${esc(photographer)}</div>
        </div>
      </div>
      ${ppWordmark({ size: 16 })}
    </div>
  `;

  return htmlDoc(body, {
    width: 1080,
    height: 1080,
    bgColor: PP.paper,
    fontFamily: MANROPE,
    title: "PatientPartner — Editorial",
  });
}
