"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { health } from "@/lib/api";

const STEPS = [
  ["Upload", "Send a JPG, PNG or WEBP. The server checks it is a real, readable image."],
  ["Analyze", "A detection model on the server returns a score. Nothing is taken from your browser."],
  ["Fingerprint", "The exact file and the finished report each get a SHA-256 hash."],
  ["Register", "If you choose, the two hashes are written to a smart contract on Polygon Amoy."],
  ["Verify", "Anyone with the certificate ID can check the hashes against the chain."],
];

export default function Home() {
 
  return (
    <div className="space-y-14">
      <section className="pt-6">
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Check an image. Then anchor the result so nobody can quietly change it.
        </h1>
        <p className="mt-5 max-w-xl text-muted">
          
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/detector" className="btn-primary">Scan an image</Link>
          <Link href="/verify" className="btn-ghost">Verify a certificate</Link>
          <span className="text-sm text-muted" role="status">{status}</span>
        </div>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="mb-4 text-xl font-semibold">How it works</h2>
        <ol className="grid gap-3 sm:grid-cols-5">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="card p-4">
              <p className="text-sm text-cyan">{i + 1}. {t}</p>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

    </div>
  );
}
