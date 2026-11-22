import type { Metadata } from "next";

import Navbar from "@/components/Navbar";
// @ts-ignore CSS imports are handled by Next.js
import "./globals.css";



export const metadata: Metadata = {
  title: "TRUTH AI",
  
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"> 
      <body>
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted">
        </footer>
      </body>
    </html>
  );
}
