"use client";

import Image from "next/image";
import { useState } from "react";

export default function CarouselViewer({
  slides,
  pdfUrl,
  alt = "Carousel slide",
}: {
  slides: string[];
  pdfUrl?: string | null;
  alt?: string;
}) {
  const [idx, setIdx] = useState(0);

  if (!slides || slides.length === 0) {
    return (
      <div className="w-full aspect-[1080/1350] rounded-lg bg-[#F6F7F9] border border-[#E8ECEF] flex items-center justify-center text-sm text-[#8A9AAD]">
        No slides
      </div>
    );
  }

  const prev = () => setIdx((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIdx((i) => (i + 1) % slides.length);

  return (
    <div className="w-full">
      <div className="relative w-full aspect-[1080/1350] rounded-lg overflow-hidden bg-[#0B2D48] border border-[#E8ECEF]">
        <Image
          src={slides[idx]}
          alt={`${alt} ${idx + 1}`}
          fill
          unoptimized
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 320px"
        />
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#153757] flex items-center justify-center shadow-md text-lg"
            >
              ←
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#153757] flex items-center justify-center shadow-md text-lg"
            >
              →
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-6 bg-[#153757]" : "w-1.5 bg-[#D4DBE1]"
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-[#8A9AAD]">
            {idx + 1} / {slides.length}
            {pdfUrl && (
              <>
                {" · "}
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#188F8B] hover:underline"
                >
                  PDF
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
