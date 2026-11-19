"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UploadBox from "@/components/UploadBox";
import FilePreview from "@/components/FilePreview";
import ScanProgress, { Stage } from "@/components/ScanProgress";
import { registerScan, uploadImage } from "@/lib/api";

export default function Detector() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [register, setRegister] = useState(false);
  const [stage, setStage] = useState<Stage>("selected");
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  async function run() {
    if (!file) return;
    setError(null); setBusy(true); setStage("uploading"); setPct(0);
    abort.current = new AbortController();
    try {
      const scan = await uploadImage(file, (p) => { setPct(p); if (p >= 100) setStage("processing"); }, abort.current.signal);
      if (register) {
        setStage("registering");
        try { await registerScan(scan.scan_id); } catch (e) { /* scan is saved; the result page shows the chain state */ }
      }
      setStage("confirmed");
      router.push(`/results/${scan.scan_id}`);
    } catch (e) {
      setStage("failed");
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Scan an image</h1>
      {!file ? (
        <UploadBox onPick={(f) => { setFile(f); setStage("selected"); setError(null); }} />
      ) : (
        <FilePreview file={file} disabled={busy} onRemove={() => { setFile(null); setStage("selected"); setBusy(false); }} />
      )}

      {file && (
        <div className="card space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={busy} />
            <span>I have the right to upload this image. The server keeps its fingerprint and the report, not the image itself.</span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={register} onChange={(e) => setRegister(e.target.checked)} disabled={busy} />
            <span>Also register the fingerprints on Polygon Amoy. This is public and cannot be deleted later.</span>
          </label>
          <ScanProgress stage={stage} pct={pct} register={register} />
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
          <div className="flex gap-3">
            <button className="btn-primary" onClick={run} disabled={!consent || busy}>{busy ? "Working..." : "Analyze image"}</button>
            {stage === "uploading" && <button className="btn-ghost" onClick={() => abort.current?.abort()}>Cancel upload</button>}
          </div>
          {stage === "processing" && <p className="text-xs text-muted">Upload finished. The server is analyzing the image and cannot be cancelled from here.</p>}
        </div>
      )}
    </div>
  );
}
