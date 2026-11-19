"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function FilePreview({ file, onRemove, disabled }: { file: File; onRemove: () => void; disabled?: boolean }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className="flex items-center gap-4 rounded-lg border border-line bg-raised p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="Selected file preview" className="h-20 w-20 rounded object-cover" />}
      <div className="min-w-0 flex-1 text-sm">
        <p className="truncate font-medium">{file.name}</p>
        <p className="text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
      </div>
      <button type="button" onClick={onRemove} disabled={disabled} className="btn-ghost px-2" aria-label="Remove file">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
