// Supabase Storage wrapper — uploads post assets (images, carousel PDFs,
// per-slide PNG previews) into the public `post-assets` bucket and returns
// public URLs consumable by the dashboard + Publer.

import { supabaseAdmin } from "./supabase";

const BUCKET = "post-assets";

function safeName(prefix: string, ext: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${ts}-${rand}.${ext}`;
}

async function uploadBuffer(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const sb = supabaseAdmin();
  const { error } = await sb.storage.from(BUCKET).upload(key, body, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Storage upload ${key}: ${error.message}`);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

export async function uploadImagePng(
  buffer: Buffer,
  opts: { category: string; runId: string }
): Promise<string> {
  const key = `posts/${opts.runId}/${safeName(opts.category, "png")}`;
  return uploadBuffer(key, buffer, "image/png");
}

export async function uploadCarouselPdf(
  buffer: Buffer,
  opts: { category: string; runId: string }
): Promise<string> {
  const key = `posts/${opts.runId}/${safeName(`${opts.category}-carousel`, "pdf")}`;
  return uploadBuffer(key, buffer, "application/pdf");
}

export async function uploadSlidePreview(
  buffer: Buffer,
  opts: { category: string; runId: string; slideIndex: number }
): Promise<string> {
  const key = `posts/${opts.runId}/${safeName(
    `${opts.category}-slide-${opts.slideIndex + 1}`,
    "png"
  )}`;
  return uploadBuffer(key, buffer, "image/png");
}
