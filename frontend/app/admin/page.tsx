"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminScan, AdminStats, adminRevoke, adminScans, adminStats, adminToken } from "@/lib/api";

const PAGE = 10;

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [items, setItems] = useState<AdminScan[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!adminToken.get()) { router.replace("/admin/login"); return; }
    try {
      const [s, list] = await Promise.all([adminStats(), adminScans(PAGE, offset)]);
      setStats(s); setItems(list.items); setTotal(list.total); setError(null);
    } catch (e) {
      if (!adminToken.get()) { router.replace("/admin/login"); return; } // session expired
      setError(e instanceof Error ? e.message : "Could not load admin data.");
    }
  }, [offset, router]);
  useEffect(() => { load(); }, [load]);

  async function revoke(id: string) {
    if (!confirm("Hide this public certificate? An on-chain record cannot be removed.")) return;
    try { await adminRevoke(id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Revoke failed."); }
  }

  function logout() { adminToken.clear(); router.push("/admin/login"); }

  const cards: [string, number | undefined][] = [
    ["Total scans", stats?.total_scans], ["Users", stats?.unique_users],
    ["Last 7 days", stats?.scans_last_7_days], ["Demo scans", stats?.demo_scans],
    ["Confirmed on-chain", stats?.chain.confirmed], ["Pending", stats?.chain.pending],
    ["Failed", stats?.chain.failed], ["Revoked", stats?.revoked_certificates],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Admin dashboard</h1>
        <button className="btn-ghost" onClick={logout}>Sign out</button>
      </div>
      {error && <p role="alert" className="text-bad">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value ?? "-"}</p>
          </div>
        ))}
      </div>

      <section aria-labelledby="all">
        <h2 id="all" className="mb-3 text-xl font-semibold">All scans</h2>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-raised text-muted">
              <tr>
                <th className="p-3 font-normal">Time</th><th className="p-3 font-normal">Certificate</th>
                <th className="p-3 font-normal">User</th><th className="p-3 font-normal">Model</th>
                <th className="p-3 font-normal">Chain</th><th className="p-3 font-normal"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td className="p-3 text-muted" colSpan={6}>No scans yet.</td></tr>}
              {items.map((s) => (
                <tr key={s.scan_id} className="border-t border-line">
                  <td className="p-3">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="p-3 font-mono text-xs">{s.certificate_id}</td>
                  <td className="p-3 font-mono text-xs">{s.user}</td>
                  <td className="p-3">{s.model}{s.is_demo ? " (DEMO)" : ""}</td>
                  <td className="p-3">{s.chain_status.replace("_", " ")}</td>
                  <td className="p-3 text-right">
                    {s.revoked ? <span className="text-muted">Revoked</span>
                      : <button className="btn-danger px-3 py-1.5" onClick={() => revoke(s.scan_id)}>Revoke</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-3 text-sm text-muted">
          <button className="btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</button>
          <span>{total === 0 ? 0 : offset + 1}-{Math.min(offset + PAGE, total)} of {total}</span>
          <button className="btn-ghost" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Next</button>
        </div>
      </section>
    </div>
  );
}