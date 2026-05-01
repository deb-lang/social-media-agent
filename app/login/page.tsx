"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) {
        throw new Error(payload?.error ?? "Incorrect password");
      }
      // Hard navigate so middleware re-runs with the new cookie attached.
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
      // Re-focus + select the field so the user can immediately retype.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        background:
          "radial-gradient(circle at 50% 0%, #EDF9FC 0%, #FBFFFF 60%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 26,
        }}
      >
        {/* Animated logo */}
        <div
          style={{
            position: "relative",
            width: 88,
            height: 88,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Soft pulsing ring */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              border: "1.5px solid #74CCD3",
              opacity: 0,
              animation: "pp-ring 2.4s ease-out infinite",
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: -16,
              borderRadius: "50%",
              border: "1.5px solid #74CCD3",
              opacity: 0,
              animation: "pp-ring 2.4s ease-out 0.8s infinite",
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "linear-gradient(180deg, #FBFFFF 0%, #EDF9FC 100%)",
              boxShadow:
                "0 4px 26.9px rgba(110, 110, 110, 0.10), 0 0 0 1px rgba(24, 56, 87, 0.05)",
            }}
          />
          <Image
            src="/logo.png"
            alt="PatientPartner"
            width={56}
            height={56}
            priority
            style={{
              position: "relative",
              animation: "pp-float 3.2s ease-in-out infinite",
            }}
          />
        </div>

        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--text-dim, #8A9AAD)",
              marginBottom: 8,
            }}
          >
            PatientPartner · Social Agent
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 28,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "var(--navy, #153757)",
              margin: 0,
            }}
          >
            Restricted access
          </h1>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <input
            ref={inputRef}
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            disabled={submitting}
            aria-invalid={Boolean(error)}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: error
                ? "1px solid #B54A44"
                : "1px solid var(--border, #D9E0E6)",
              background: "#fff",
              fontFamily: "var(--font-body)",
              fontSize: 15,
              color: "var(--navy, #153757)",
              outline: "none",
              transition: "border-color 150ms, box-shadow 150ms",
              boxShadow: error
                ? "0 0 0 3px rgba(181, 74, 68, 0.12)"
                : "none",
            }}
            onFocus={(e) => {
              if (!error) {
                e.currentTarget.style.borderColor = "#74CCD3";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(116, 204, 211, 0.18)";
              }
            }}
            onBlur={(e) => {
              if (!error) {
                e.currentTarget.style.borderColor = "var(--border, #D9E0E6)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          />
          <button
            type="submit"
            disabled={submitting || !password}
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: 12,
              border: "none",
              background:
                submitting || !password
                  ? "#D8E5EE"
                  : "var(--navy, #153757)",
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: ".02em",
              cursor:
                submitting || !password ? "not-allowed" : "pointer",
              transition: "background 150ms, transform 80ms",
            }}
            onMouseDown={(e) => {
              if (!submitting && password) {
                e.currentTarget.style.transform = "scale(0.99)";
              }
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
            }}
          >
            {submitting ? "Verifying…" : "Enter"}
          </button>
          <div
            style={{
              minHeight: 18,
              fontSize: 12.5,
              color: error ? "#B54A44" : "transparent",
              fontFamily: "var(--font-body)",
              textAlign: "center",
              transition: "color 150ms",
            }}
            aria-live="polite"
          >
            {error ?? "—"}
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes pp-float {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-3px) scale(1.02);
          }
        }
        @keyframes pp-ring {
          0% {
            transform: scale(0.85);
            opacity: 0.7;
          }
          80% {
            opacity: 0;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
