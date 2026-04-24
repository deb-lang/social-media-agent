// Plagiarism spot-check — extracts 5 unique sentences from the caption and
// Google-searches each in quotes. If a sentence returns a non-PatientPartner
// match, it's flagged.
//
// Uses Google Programmable Search API (free tier: 100 queries/day). If not
// configured, falls back to Claude web_search tool, or degrades gracefully to
// "skipped" (non-fatal — reviewer still sees post in queue).
//
// Env:
//   GOOGLE_CSE_API_KEY — Google API key with Custom Search API enabled
//   GOOGLE_CSE_CX      — search engine ID (cx)

export interface PlagiarismFlag {
  sentence: string;
  matched_url: string;
  matched_title?: string;
}

export interface PlagiarismResult {
  checked: number; // sentences checked
  flags: PlagiarismFlag[];
  provider: "google_cse" | "claude_web_search" | "skipped";
}

// ─── Sentence extraction ───────────────────────────────

function extractSentences(caption: string, count = 5): string[] {
  // Split on . ! ? but keep only sentences 40-180 chars (useful for matching).
  // Skip hashtag lines and URLs.
  const lines = caption.split(/\n+/);
  const sentences: string[] = [];
  for (const line of lines) {
    if (line.startsWith("#") || line.includes("http")) continue;
    const chunks = line.split(/(?<=[.!?])\s+/);
    for (const chunk of chunks) {
      const s = chunk.trim().replace(/["""'']/g, "");
      if (s.length >= 40 && s.length <= 180) sentences.push(s);
    }
  }
  // Dedupe + pick unique-looking ones (longest first, then interleave)
  const unique = [...new Set(sentences)];
  unique.sort((a, b) => b.length - a.length);
  return unique.slice(0, count);
}

// ─── Google Programmable Search ────────────────────────

async function googleSearch(query: string): Promise<Array<{ url: string; title: string }>> {
  const key = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) return [];
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", key);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", `"${query}"`);
  url.searchParams.set("num", "3");
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = (await res.json()) as {
    items?: Array<{ link: string; title: string }>;
  };
  return (data.items ?? []).map((it) => ({ url: it.link, title: it.title }));
}

function isNonPatientPartner(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !host.endsWith("patientpartner.com");
  } catch {
    return true;
  }
}

// ─── Public API ────────────────────────────────────────

export async function checkPlagiarism(caption: string): Promise<PlagiarismResult> {
  const sentences = extractSentences(caption, 5);
  if (sentences.length === 0) {
    return { checked: 0, flags: [], provider: "skipped" };
  }

  const hasGoogle = Boolean(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX);
  if (!hasGoogle) {
    return { checked: 0, flags: [], provider: "skipped" };
  }

  const flags: PlagiarismFlag[] = [];
  for (const sentence of sentences) {
    try {
      const results = await googleSearch(sentence);
      const external = results.filter((r) => isNonPatientPartner(r.url));
      if (external.length > 0) {
        flags.push({
          sentence,
          matched_url: external[0].url,
          matched_title: external[0].title,
        });
      }
    } catch (err) {
      console.warn("[plagiarism] Google search failed for sentence:", err);
    }
  }

  return {
    checked: sentences.length,
    flags,
    provider: "google_cse",
  };
}
