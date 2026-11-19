import { CheckCircle2, CircleAlert, CircleHelp } from "lucide-react";
import type { Verification } from "@/lib/types";

function Row({ label, value }: { label: string; value: string }) {
  const good = ["match", "found", "confirmed"].includes(value);
  const bad = ["mismatch", "not_found", "failed"].includes(value);
  const Icon = good ? CheckCircle2 : bad ? CircleAlert : CircleHelp;
  const color = good ? "text-ok" : bad ? "text-bad" : "text-muted";
  const word: Record<string, string> = {
    match: "Matches", mismatch: "Does not match", found: "Found", not_found: "Not found",
    confirmed: "Confirmed", pending: "Pending", failed: "Failed",
    unavailable: "Could not be checked", not_registered: "Not registered",
  };
  return (
    <li className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <span className="text-sm">{label}</span>
      <span className={`flex items-center gap-1.5 text-sm ${color}`}><Icon className="h-4 w-4" aria-hidden />{word[value] ?? value}</span>
    </li>
  );
}

export default function VerificationCard({ v }: { v: Verification }) {
  const c = v.certificate;
  return (
    <div className="space-y-5">
      {c.is_demo && (
        <p role="note" className="rounded-lg border border-warn/50 bg-warn/10 p-3 text-sm text-warn">
          This certificate was made in DEMO mode. Its score is not a real detection.
        </p>
      )}
      <section className="card" aria-labelledby="checks">
        <h2 id="checks" className="mb-1 text-sm text-muted">Checks</h2>
        <ul>
          <Row label="Stored report is unchanged" value={v.checks.stored_report_intact} />
          <Row label="Record exists on-chain" value={v.checks.on_chain_record} />
          <Row label="File fingerprint matches the chain" value={v.checks.file_hash_on_chain} />
          <Row label="Report fingerprint matches the chain" value={v.checks.report_hash_on_chain} />
          <Row label="Transaction" value={v.checks.transaction} />
        </ul>
        {!v.chain_detail.available && v.chain_detail.reason && <p className="mt-3 text-sm text-muted">{v.chain_detail.reason}</p>}
        <p className="mt-3 text-xs text-muted">{v.notice}</p>
      </section>
      <section className="card space-y-3 text-sm" aria-labelledby="cert">
        <h2 id="cert" className="text-sm text-muted">Certificate {c.certificate_id}</h2>
        <p>Scanned {new Date(c.scanned_at).toLocaleString()}</p>
        <div><p className="text-muted">File fingerprint (SHA-256)</p><p className="hash">{c.file_hash}</p></div>
        <div><p className="text-muted">Report fingerprint (SHA-256)</p><p className="hash">{c.report_hash}</p></div>
        {c.blockchain.explorer_url && <a className="text-cyan underline" href={c.blockchain.explorer_url} target="_blank" rel="noreferrer">View transaction</a>}
      </section>
    </div>
  );
}
