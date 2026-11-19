import { CheckCircle2, Clock, CircleAlert, CircleDashed } from "lucide-react";
import type { Scan } from "@/lib/types";

const COPY = {
  not_registered: { icon: CircleDashed, color: "text-muted", text: "Not registered on the blockchain." },
  pending: { icon: Clock, color: "text-warn", text: "Waiting for the network to confirm. This is not verified yet." },
  confirmed: { icon: CheckCircle2, color: "text-ok", text: "Confirmed on Polygon Amoy (test network)." },
  failed: { icon: CircleAlert, color: "text-bad", text: "Registration failed. You can try again." },
} as const;

export default function BlockchainStatus({ scan, children }: { scan: Scan; children?: React.ReactNode }) {
  const b = scan.blockchain;
  const c = COPY[b.status];
  const Icon = c.icon;
  const url = scan.certificate.blockchain.explorer_url;
  return (
    <section className="card space-y-3" aria-labelledby="chain-title">
      <h2 id="chain-title" className="text-sm text-muted">Blockchain record</h2>
      <p className={`flex items-center gap-2 ${c.color}`} role="status">
        <Icon className="h-5 w-5" aria-hidden /> {c.text}
      </p>
      {b.transaction_hash && (
        <p className="text-sm">
          Transaction{" "}
          {url ? <a className="text-cyan underline" href={url} target="_blank" rel="noreferrer">view on explorer</a> : null}
          <span className="hash block">{b.transaction_hash}</span>
          {b.block_number ? <span className="text-xs text-muted">Block {b.block_number}</span> : null}
        </p>
      )}
      {b.error && <p className="text-sm text-bad">{b.error}</p>}
      <p className="text-xs text-muted">
        The chain stores only two fingerprints (file and report). It shows the report was not changed after
        registration. 
      </p>
      {children}
    </section>
  );
}
