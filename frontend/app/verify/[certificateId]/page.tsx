"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import VerificationCard from "@/components/VerificationCard";
import { verifyCertificate, verifyFile } from "@/lib/api";
import type { Verification } from "@/lib/types";

export default function VerifyCertificate() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [v, setV] = useState<Verification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileResult, setFileResult] = useState<string | null>(null);

  useEffect(() => {
    verifyCertificate(certificateId).then(setV).catch((e) => setError(e.message));
  }, [certificateId]);

  async function checkFile(f?: File) {
    if (!f) return;
    setFileResult("Checking...");
    try {
      const r = await verifyFile(certificateId, f);
      setFileResult(r.matches_certificate
        ? "These exact bytes match the scanned file."
        : "This file does not match. Any edit, re-save or re-compression changes the fingerprint.");
    } catch (e) { setFileResult(e instanceof Error ? e.message : "Check failed."); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight">Certificate verification</h1>
      {error && <p role="alert" className="text-bad">{error}</p>}
      {!v && !error && <p className="text-muted">Checking...</p>}
      {v && <VerificationCard v={v} />}
      {v && (
        <section className="card space-y-2" aria-labelledby="fc">
          <h2 id="fc" className="text-sm text-muted">Check a file against this certificate</h2>
          <input type="file" accept=".jpg,.jpeg,.png,.webp" aria-label="Choose a file to compare" onChange={(e) => checkFile(e.target.files?.[0])} className="text-sm" />
          {fileResult && <p role="status" className="text-sm">{fileResult}</p>}
        </section>
      )}
    </div>
  );
}
