import { Check } from "lucide-react";

export type Stage = "selected" | "uploading" | "processing" | "registering" | "confirmed" | "failed";
const ORDER: Stage[] = ["selected", "uploading", "processing", "registering", "confirmed"];
const LABEL: Record<Stage, string> = {
  selected: "Selected", uploading: "Uploading", processing: "Analyzing",
  registering: "Registering", confirmed: "Done", failed: "Failed",
};

export default function ScanProgress({ stage, pct, register }: { stage: Stage; pct: number; register: boolean }) {
  const steps = register ? ORDER : ORDER.filter((s) => s !== "registering");
  const idx = steps.indexOf(stage === "failed" ? "selected" : stage);
  return (
    <div aria-live="polite">
      <ol className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {steps.map((s, i) => (
          <li key={s} className={`flex items-center gap-1 ${stage === "failed" ? "text-muted" : i <= idx ? "text-fg" : "text-muted"}`}>
            {i < idx && stage !== "failed" ? <Check className="h-4 w-4 text-ok" aria-hidden /> : null}
            {LABEL[s]}
          </li>
        ))}
      </ol>
      {stage === "uploading" && (
        <div className="mt-3 h-2 overflow-hidden rounded bg-raised" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-cyan transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {stage === "failed" && <p className="mt-2 text-sm text-bad">The scan did not finish.</p>}
    </div>
  );
}
