// Template dispatcher — single entry point for every render.
// Returns a complete HTML document (string) ready to be screenshotted by
// puppeteer-core in lib/render-html.ts.

import { renderStaticQuote, type StaticQuoteProps } from "./static-quote";
import { renderStaticStat, type StaticStatProps } from "./static-stat";
import { renderStaticInsight, type StaticInsightProps } from "./static-insight";
import {
  renderSlide1, type Slide1Props,
  renderSlide2, type Slide2Props,
  renderSlide3, type Slide3Props,
  renderSlide4, type Slide4Props,
  renderSlide5, type Slide5Props,
} from "./carousel";

export type TemplateName =
  | "static-quote"
  | "static-stat"
  | "static-insight"
  | "carousel-1"
  | "carousel-2"
  | "carousel-3"
  | "carousel-4"
  | "carousel-5";

// Discriminated union of all possible inputs.
export type TemplateInput =
  | { template: "static-quote"; props: StaticQuoteProps }
  | { template: "static-stat"; props: StaticStatProps }
  | { template: "static-insight"; props: StaticInsightProps }
  | { template: "carousel-1"; props: Slide1Props }
  | { template: "carousel-2"; props: Slide2Props }
  | { template: "carousel-3"; props: Slide3Props }
  | { template: "carousel-4"; props: Slide4Props }
  | { template: "carousel-5"; props: Slide5Props };

// Render a template to a complete HTML document. The renderer in
// lib/render-html.ts feeds this string into a headless Chromium page and
// screenshots it at the canvas size.
export function renderTemplate(input: TemplateInput): string {
  switch (input.template) {
    case "static-quote":
      return renderStaticQuote(input.props);
    case "static-stat":
      return renderStaticStat(input.props);
    case "static-insight":
      return renderStaticInsight(input.props);
    case "carousel-1":
      return renderSlide1(input.props);
    case "carousel-2":
      return renderSlide2(input.props);
    case "carousel-3":
      return renderSlide3(input.props);
    case "carousel-4":
      return renderSlide4(input.props);
    case "carousel-5":
      return renderSlide5(input.props);
  }
}

// Re-exports for direct use elsewhere
export type {
  StaticQuoteProps,
  StaticStatProps,
  StaticInsightProps,
  Slide1Props,
  Slide2Props,
  Slide3Props,
  Slide4Props,
  Slide5Props,
};
