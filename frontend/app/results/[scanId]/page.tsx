"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ResultCard from "@/components/ResultCard";
import BlockchainStatus from "@/components/BlockchainStatus";
import { deleteScan, downloadCertificate, getScan, registerScan } from "@/lib/api";
import type { Scan } from "@/lib/types";

export default function Results() {
  const { scanId } = useParams<{ scanId: string }>();
  const router = useRouter();
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => getScan(scanId).then(setScan).catch((e) => setError(e.message)), [scanId]);
  useEffect(() => { load(); }, [load]);

  // While the transaction is pending, ask the server again every 5 seconds.
  useEffect(() => {
    if (scan?.blockchain.status !== "pending") return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [scan?.blockchain.status, load]);

  async function register() {
    setBusy(true); setError(null);
    try { await registerScan(scanId); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Registration failed."); }
    setBusy(false);
  }

  async function remove() {
    if (!confirm("Delete this scan? A hash already on the blockchain cannot be erased.")) return;
    await deleteScan(scanId);
    router.push("/history");
  }

  if (error && !scan) return <p role="alert" className="text-bad">{error}</p>;
  if (!scan) return <p className="text-muted">Loading result...</p>;
  const canRegister = scan.blockchain.status === "not_registered" || scan.blockchain.status === "failed";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight">Scan result</h1>
      <ResultCard scan={scan} />
      <section className="card space-y-3" aria-labelledby="fp">
        <h2 id="fp" className="text-sm text-muted">Fingerprints (SHA-256)</h2>
        <div><p className="text-sm">File (exact uploaded bytes)</p><p className="hash">{scan.file_hash}</p></div>
        <div><p className="text-sm">Report</p><p className="hash">{scan.report_hash}</p></div>
      </section>
      <BlockchainStatus scan={scan}>
        {canRegister && <button className="btn-primary" onClick={register} disabled={busy}>Register on Polygon Amoy</button>}
      </BlockchainStatus>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="btn-ghost" onClick={() => downloadCertificate(scan)}>Download certificate (JSON)</button>
        <Link className="btn-ghost" href={`/verify/${scan.certificate_id}`}>Open verification page</Link>
        <button className="btn-danger" onClick={remove}>Delete scan</button>
      </div>
    </div>
  );
}
