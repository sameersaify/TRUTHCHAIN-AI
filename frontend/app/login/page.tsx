"use client";
import { useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + "/dashboard" } });
    setMsg(error ? error.message : "Check your email for the sign-in link.");
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
      {!supabaseConfigured ? (
        <p className="card text-sm text-muted">
          Sign-in is not configured. Until you add your Supabase URL and anon key to <span className="font-mono">frontend/.env.local</span>,
          the app runs in local development mode as a single test user. Do not deploy it that way.
        </p>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <label htmlFor="email" className="text-sm">Email</label>
          <input id="email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn-primary" type="submit">Send sign-in link</button>
          {msg && <p role="status" className="text-sm text-muted">{msg}</p>}
        </form>
      )}
      <p className="text-sm text-muted">
        Your scans are private to your account. You can delete a scan at any time from History. A hash that
        was already registered on the blockchain cannot be removed.
      </p>
    </div>
  );
}
