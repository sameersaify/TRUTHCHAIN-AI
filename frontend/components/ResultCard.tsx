import { TriangleAlert } from "lucide-react";
import type { Scan } from "@/lib/types";
import ConfidenceNotice from "./ConfidenceNotice";

export default function ResultCard({ scan }: { scan: Scan }) {
  const calibrated = scan.ai_likelihood !== null;
  return (
    <section className="card space-y-5" aria-labelledby="result-title">
      {scan.is_demo && (
        <div role="note" className="flex gap-3 rounded-lg border border-warn/50 bg-warn/10 p-3 text-sm text-warn">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p><b>DEMO result.</b></p>
        </div>
      )}
      <div>
        <h2 id="result-title" className="text-sm text-muted">
          {calibrated ? "Estimated AI likelihood" : "Model score (uncalibrated)"}
        </h2>
        <p className="mt-1 text-5xl font-semibold tabular-nums text-cyan">
          {calibrated ? `${Math.round((scan.ai_likelihood as number) * 100)}%` : scan.model_score.toFixed(2)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {calibrated
            ? "A calibrated estimate of how likely the image is AI-generated. It is not a probability, but it is more reliable than the raw model score."
            : "A raw model output between 0 and 1. It has not been calibrated."
            + " Where 1.00 means 100% likely to be AI-generated, and 0.00 means 0% likely."}
        </p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Model</dt><dd>{scan.model.name} <span className="text-muted">v{scan.model.version}</span></dd></div>
        <div><dt className="text-muted">Calibration</dt><dd>{scan.model.calibration_version}</dd></div>
        <div><dt className="text-muted">Media type</dt><dd>{scan.media_type}</dd></div>
        <div><dt className="text-muted">Scanned</dt><dd>{new Date(scan.scanned_at).toLocaleString()}</dd></div>
      </dl>
      <ConfidenceNotice />
    </section>
  );
}
