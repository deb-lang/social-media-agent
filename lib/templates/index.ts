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
import { renderStaticEditorial, type StaticEditorialProps } from "./static-editorial";
import { renderStaticTicker, type StaticTickerProps } from "./static-ticker";
import { renderStaticDiptych, type StaticDiptychProps } from "./static-diptych";
import {
  renderCarouselA1, type CAProps1,
  renderCarouselA2, type CAProps2,
  renderCarouselA3, type CAProps3,
  renderCarouselA4, type CAProps4,
  renderCarouselA5, type CAProps5,
} from "./carousel-a";
import {
  renderCarouselD1, type CDProps1,
  renderCarouselD2, type CDProps2,
  renderCarouselD3, type CDProps3,
  renderCarouselD4, type CDProps4,
  renderCarouselD5, type CDProps5,
} from "./carousel-d";

// v1 templates (1080×1080 statics + 1080×1080 carousel)
// v2 templates (extracted 2026-05-20 from a second Claude Design bundle):
//   - new statics at 1080×1080: editorial, ticker, diptych
//   - new carousel sequences at 1080×1350: A ("Recovery Gap"), D ("Year in Numbers")
//
// All in rotation per the design plan; v1 carousel + v2 carousels A/D pick
// via hash(run_id) at build-post.ts call time.
export type TemplateName =
  // v1 statics
  | "static-quote"
  | "static-stat"
  | "static-insight"
  // v1 carousel slides
  | "carousel-1" | "carousel-2" | "carousel-3" | "carousel-4" | "carousel-5"
  // v2 statics
  | "static-editorial"
  | "static-ticker"
  | "static-diptych"
  // v2 carousel A slides
  | "carousel-a-1" | "carousel-a-2" | "carousel-a-3" | "carousel-a-4" | "carousel-a-5"
  // v2 carousel D slides
  | "carousel-d-1" | "carousel-d-2" | "carousel-d-3" | "carousel-d-4" | "carousel-d-5";

// Discriminated union of all possible inputs.
export type TemplateInput =
  | { template: "static-quote"; props: StaticQuoteProps }
  | { template: "static-stat"; props: StaticStatProps }
  | { template: "static-insight"; props: StaticInsightProps }
  | { template: "carousel-1"; props: Slide1Props }
  | { template: "carousel-2"; props: Slide2Props }
  | { template: "carousel-3"; props: Slide3Props }
  | { template: "carousel-4"; props: Slide4Props }
  | { template: "carousel-5"; props: Slide5Props }
  | { template: "static-editorial"; props: StaticEditorialProps }
  | { template: "static-ticker"; props: StaticTickerProps }
  | { template: "static-diptych"; props: StaticDiptychProps }
  | { template: "carousel-a-1"; props: CAProps1 }
  | { template: "carousel-a-2"; props: CAProps2 }
  | { template: "carousel-a-3"; props: CAProps3 }
  | { template: "carousel-a-4"; props: CAProps4 }
  | { template: "carousel-a-5"; props: CAProps5 }
  | { template: "carousel-d-1"; props: CDProps1 }
  | { template: "carousel-d-2"; props: CDProps2 }
  | { template: "carousel-d-3"; props: CDProps3 }
  | { template: "carousel-d-4"; props: CDProps4 }
  | { template: "carousel-d-5"; props: CDProps5 };

export function renderTemplate(input: TemplateInput): string {
  switch (input.template) {
    case "static-quote":     return renderStaticQuote(input.props);
    case "static-stat":      return renderStaticStat(input.props);
    case "static-insight":   return renderStaticInsight(input.props);
    case "carousel-1":       return renderSlide1(input.props);
    case "carousel-2":       return renderSlide2(input.props);
    case "carousel-3":       return renderSlide3(input.props);
    case "carousel-4":       return renderSlide4(input.props);
    case "carousel-5":       return renderSlide5(input.props);
    case "static-editorial": return renderStaticEditorial(input.props);
    case "static-ticker":    return renderStaticTicker(input.props);
    case "static-diptych":   return renderStaticDiptych(input.props);
    case "carousel-a-1":     return renderCarouselA1(input.props);
    case "carousel-a-2":     return renderCarouselA2(input.props);
    case "carousel-a-3":     return renderCarouselA3(input.props);
    case "carousel-a-4":     return renderCarouselA4(input.props);
    case "carousel-a-5":     return renderCarouselA5(input.props);
    case "carousel-d-1":     return renderCarouselD1(input.props);
    case "carousel-d-2":     return renderCarouselD2(input.props);
    case "carousel-d-3":     return renderCarouselD3(input.props);
    case "carousel-d-4":     return renderCarouselD4(input.props);
    case "carousel-d-5":     return renderCarouselD5(input.props);
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
  StaticEditorialProps,
  StaticTickerProps,
  StaticDiptychProps,
  CAProps1, CAProps2, CAProps3, CAProps4, CAProps5,
  CDProps1, CDProps2, CDProps3, CDProps4, CDProps5,
};
