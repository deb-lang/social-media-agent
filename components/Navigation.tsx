"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import GenerateButton from "./GenerateButton";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/queue", label: "Queue" },
  { href: "/new-post", label: "New post" },
  { href: "/calendar", label: "Calendar" },
  { href: "/history", label: "History" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="nav">
      <div className="container nav-in">
        <Link href="/" className="brand">
          <Image
            src="/logo-horizontal.png"
            alt="PatientPartner"
            width={140}
            height={28}
            className="brand-logo"
            priority
          />
          <span className="brand-divider" />
          <span className="brand-badge">Social Agent</span>
        </Link>
        <nav className="nav-tabs">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-tab${active ? " on" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <GenerateButton />
      </div>
    </header>
  );
}
