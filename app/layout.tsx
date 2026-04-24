import type { Metadata } from "next";
import { Toaster } from "sonner";
import Navigation from "@/components/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "PatientPartner Social Agent",
  description: "Autonomous LinkedIn content agent for PatientPartner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <Navigation />
        <main>{children}</main>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-body)",
              borderRadius: "12px",
              border: "1px solid var(--border)",
            },
          }}
        />
      </body>
    </html>
  );
}
