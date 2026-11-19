"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyLookup() {
  const router = useRouter();
  const [id, setId] = useState("");
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight">Verify a certificate</h1>
      <p className="text-muted">Enter the certificate ID printed on the certificate, for example tc_1a2b3c4d5e6f7a8b.</p>
      <form onSubmit={(e) => { e.preventDefault(); if (id.trim()) router.push(`/verify/${encodeURIComponent(id.trim())}`); }} className="space-y-3">
        <label htmlFor="cid" className="text-sm">Certificate ID</label>
        <input id="cid" className="field font-mono" value={id} onChange={(e) => setId(e.target.value)} placeholder="tc_..." />
        <button className="btn-primary" type="submit" disabled={!id.trim()}>Check certificate</button>
      </form>
    </div>
  );
}
