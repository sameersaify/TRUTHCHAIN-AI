"use client";
import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { ACCEPT, MAX_MB } from "@/lib/api";

const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Client-side checks are for convenience only. The server validates again. */
export function checkFile(f: File): string | null {
  if (!OK_TYPES.includes(f.type)) return "Use a JPG, PNG or WEBP image.";
  if (f.size > MAX_MB * 1024 * 1024) return `The file is larger than ${MAX_MB} MB.`;
  if (f.size === 0) return "The file is empty.";
  return null;
}

export default function UploadBox({ onPick, disabled }: { onPick: (f: File) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function take(f?: File) {
    if (!f) return;
    const err = checkFile(f);
    setError(err);
    if (!err) onPick(f);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) take(e.dataTransfer.files[0]); }}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${over ? "border-cyan bg-cyan/5" : "border-line"}`}
      >
        <UploadCloud className="mx-auto h-8 w-8 text-blue" aria-hidden />
        <p className="mt-3 text-sm">Drop an image here, or</p>
        <button type="button" className="btn-primary mt-3" disabled={disabled} onClick={() => input.current?.click()}>
          Choose image
        </button>
        <input ref={input} type="file" accept={ACCEPT} className="sr-only" aria-label="Choose an image file"
          onChange={(e) => take(e.target.files?.[0])} />
        <p className="mt-3 text-xs text-muted">JPG, PNG or WEBP, up to {MAX_MB} MB.</p>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
