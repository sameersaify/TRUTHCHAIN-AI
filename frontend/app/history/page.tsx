"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { deleteScan, listScans } from "@/lib/api";
import type { Scan } from "@/lib/types";

const PAGE = 10;

export default function History() {
  const [items, setItems] = useState<Scan[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listScans(PAGE, offset).then((r) => { setItems(r.items); setTotal(r.total); setError(null); })
      .catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [offset]);
  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this scan? A hash already on the blockchain cannot be erased.")) return;
    await deleteScan(id); load();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight">History</h1>
      {error && <p role="alert" className="text-bad">{error}</p>}
      {loading ? <p className="text-muted">Loading...</p> : items.length === 0 ? (
        <p className="text-muted">No scans yet. <Link className="text-cyan underline" href="/detector">Scan your first image.</Link></p>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.scan_id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm">
                <Link className="text-cyan underline" href={`/results/${s.scan_id}`}>{new Date(s.scanned_at).toLocaleString()}</Link>
                <p className="text-muted">
                  {s.is_demo ? "DEMO" : s.score_label === "estimated_ai_likelihood" ? `${Math.round((s.ai_likelihood ?? 0) * 100)}% estimated` : `score ${s.model_score.toFixed(2)} (uncalibrated)`}
                  {" · "}chain: {s.blockchain.status.replace("_", " ")}
                </p>
              </div>
              <button className="btn-danger" onClick={() => remove(s.scan_id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3 text-sm text-muted">
        <button className="btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</button>
        <span>{total === 0 ? 0 : offset + 1}-{Math.min(offset + PAGE, total)} of {total}</span>
        <button className="btn-ghost" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Next</button>
      </div>
    </div>
  );
}
