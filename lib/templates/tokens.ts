// PatientPartner design tokens — extracted verbatim from the Claude Design
// bundle's tokens.css (PatientPartner Social Media Templates.html).
// These are the source of truth; every template reads from here.

export const COLORS = {
  // Brand palette
  mint: "#72CBCF",        // Fresh Mint — primary CTA
  mintDeep: "#59B6BE",    // darker teal accent
  mintLight: "#9ADDE0",   // CTA gradient top
  mintBorder: "#65C0C4",
  mintPrimary: "#419DA5", // 2nd-most-used brand color

  // Navy (text + headlines)
  navy: "#183857",        // Deep Horizon — primary headline
  navy2: "#314D69",       // body slate
  navyDeep: "#102B45",    // dark backgrounds
  navyInk: "#040E30",

  // Supporting blues
  blue: "#2885CE",
  blueDeep: "#005DA6",

  // Neutrals & light backgrounds
  white: "#FFFFFF",
  skyBreeze: "#FBFFFF",
  aquaTwilight: "#F3F8F8",
  deepLagoon: "#D8EDEE",
  mintTint: "#E3FFFF",
  mintWash: "#DCEBEA",
  mist: "#E9F9FA",

  // Greys
  grey50: "#F6F6F6",
  grey100: "#D9D9D9",
  grey300: "#CCCBCA",
  grey500: "#828282",
  grey600: "#787B8D",
  grey700: "#7B7C8F",
  grey900: "#333333",
  black: "#000000",
} as const;

// Font-family values use SINGLE quotes inside so they can be safely embedded
// in inline `style="..."` attributes without breaking the HTML parser.
export const FONTS = {
  body: "'Poppins', 'HK Grotesk', ui-sans-serif, system-ui, sans-serif",
  display: "'Poppins', 'HK Grotesk', ui-sans-serif, system-ui, sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
} as const;

// Type scale (px) — from the Figma tokens
export const FS = {
  displayXl: 90,
  displayL: 54,
  displayM: 40,
  displayS: 32,
  h1: 40,
  h2: 32,
  h3: 28,
  h4: 24,
  bodyXl: 22,
  bodyL: 18,
  bodyM: 16,
  bodyS: 14,
  caption: 12,
} as const;

export const RADII = {
  xs: 5,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 20,
  "2xl": 28,
  pill: 999,
  hero: 50,
} as const;

export const SHADOWS = {
  card: "0 4px 26.9px 0 rgba(110, 110, 110, 0.10)",
  soft: "34.854px 29.626px 48.340px 0 rgba(51, 102, 255, 0.05)",
  ring: "0 0 0 1px rgba(24, 56, 87, 0.05)",
} as const;

// Standard canvas size for every template (Claude Design bundle uses 1080×1080
// for both static posts and carousel slides).
export const CANVAS = {
  width: 1080,
  height: 1080,
} as const;

// Google Fonts URL for Poppins (loaded in template <head>; the renderer
// awaits document.fonts.ready before screenshot).
export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap";
