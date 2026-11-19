import { Info } from "lucide-react";

export default function ConfidenceNotice() {
  return (
    <div className="flex gap-3 rounded-lg border border-line bg-raised p-4 text-sm text-muted">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden />
      <p>
        Editing, compression, screenshots and
        image generators the model has not seen all reduce reliability. Do not use one score to decide
        something important about a person.
      </p>
    </div>
  );
}
