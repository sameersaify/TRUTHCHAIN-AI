"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

const links = [
  { href: "/detector", label: "Scan an image" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "History" },
  { href: "/verify", label: "Verify" },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-ink/90 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <ShieldCheck className="h-5 w-5 text-cyan" aria-hidden />
          TRUTH AI
        </Link>
        <ul className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={path.startsWith(l.href) ? "page" : undefined}
                className={path.startsWith(l.href) ? "text-fg" : "text-muted hover:text-fg"}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/login" className="text-sm text-muted hover:text-fg">Account</Link>
                <Link href="/admin" className="text-sm text-muted hover:text-fg">Admin</Link>
      </nav>
    </header>
  );
}
