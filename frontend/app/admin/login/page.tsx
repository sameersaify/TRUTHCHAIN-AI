"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/lib/api";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await adminLogin(email, password);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight">Admin sign-in</h1>
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="email" className="text-sm">Email</label>
        <input id="email" type="email" required autoComplete="username" className="field"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password" className="text-sm">Password</label>
        <input id="password" type="password" required autoComplete="current-password" className="field"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        <button className="btn-primary w-full" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
    </div>
  );
}