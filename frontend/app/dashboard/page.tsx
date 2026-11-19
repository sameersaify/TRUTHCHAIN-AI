"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listScans } from "@/lib/api";
import type { Scan } from "@/lib/types";

export default function Dashboard() {
  const [items, setItems] = useState<Scan[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listScans(5, 0).then((r) => { setItems(r.items); setTotal(r.total); }).catch((e) => setError(e.message));
  }, []);

  const confirmed = items.filter((s) => s.blockchain.status === "confirmed").length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      {error && <p role="alert" className="text-bad">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card"><p className="text-sm text-muted">Total scans</p><p className="text-3xl font-semibold tabular-nums">{total}</p></div>
        <div className="card"><p className="text-sm text-muted">Confirmed on-chain (last 5)</p><p className="text-3xl font-semibold tabular-nums">{confirmed}</p></div>
        <div className="card flex items-center"><Link href="/detector" className="btn-primary w-full">New scan</Link></div>
      </div>
      <section aria-labelledby="recent">
        <h2 id="recent" className="mb-3 text-xl font-semibold">Recent scans</h2>
        {items.length === 0 ? <p className="text-muted">Nothing here yet.</p> : (
          <ul className="space-y-2">
            {items.map((s) => (
              <li key={s.scan_id} className="card p-4 text-sm">
                <Link className="text-cyan underline" href={`/results/${s.scan_id}`}>{new Date(s.scanned_at).toLocaleString()}</Link>
                <span className="text-muted"> · chain: {s.blockchain.status.replace("_", " ")}{s.is_demo ? " · DEMO" : ""}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/history" className="mt-3 inline-block text-sm text-cyan underline">See all history</Link>
      </section>
    </div>
  );
}
