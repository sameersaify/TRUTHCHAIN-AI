import { getAccessToken } from "./supabase";
import type { Scan, Verification } from "./types";

export const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
export const MAX_MB = 10;
export const ACCEPT = ".jpg,.jpeg,.png,.webp";

async function headers(): Promise<Record<string, string>> {
  const t = await getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers: { ...(await headers()), ...(init.headers ?? {}) } });
  } catch {
    throw new Error("Cannot reach the server. Check that the backend is running.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/** Upload with real progress events (fetch cannot report upload progress). */
export async function uploadImage(file: File, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<Scan> {
  const token = await getAccessToken();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/api/v1/scans/image`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: any = {};
      try { body = JSON.parse(xhr.responseText); } catch {}
      xhr.status >= 200 && xhr.status < 300 ? resolve(body) : reject(new Error(body.detail ?? `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Cannot reach the server. Check that the backend is running."));
    signal?.addEventListener("abort", () => { xhr.abort(); reject(new Error("Upload cancelled.")); });
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export const getScan = (id: string) => request<Scan>(`/api/v1/scans/${id}`);
export const listScans = (limit = 20, offset = 0) =>
  request<{ total: number; items: Scan[] }>(`/api/v1/scans?limit=${limit}&offset=${offset}`);
export const deleteScan = (id: string) => request<{ deleted: boolean }>(`/api/v1/scans/${id}`, { method: "DELETE" });
export const registerScan = (id: string) => request<Scan["blockchain"]>(`/api/v1/scans/${id}/register`, { method: "POST" });
export const verifyCertificate = (id: string) => request<Verification>(`/api/v1/verify/${encodeURIComponent(id)}`);
export const verifyFile = (certificateId: string, file: File) => {
  const form = new FormData();
  form.append("certificate_id", certificateId);
  form.append("file", file);
  return request<{ submitted_file_hash: string; matches_certificate: boolean; matches_on_chain_record: boolean | "unavailable"; note: string }>(
    "/api/v1/verify/file", { method: "POST", body: form });
};
export const health = () => request<{ detector_mode: string; blockchain_configured: boolean; auth_mode: string }>("/health");

export function downloadCertificate(scan: Scan) {
  const blob = new Blob([JSON.stringify(scan.certificate, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `truthchain-certificate-${scan.certificate_id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}


// ---------------- Admin ----------------
export interface AdminStats {
  total_scans: number; unique_users: number; demo_scans: number;
  scans_last_7_days: number; revoked_certificates: number;
  chain: { pending: number; confirmed: number; failed: number };
}
export interface AdminScan {
  scan_id: string; certificate_id: string; user: string; media_type: string; is_demo: boolean;
  model: string; chain_status: string; tx_hash: string | null; file_hash: string;
  created_at: string; revoked: boolean;
}

const ADMIN_KEY = "truthchain_admin_token";
export const adminToken = {
  get: (): string | null => (typeof window === "undefined" ? null : sessionStorage.getItem(ADMIN_KEY)),
  set: (t: string) => sessionStorage.setItem(ADMIN_KEY, t),
  clear: () => sessionStorage.removeItem(ADMIN_KEY),
};

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = adminToken.get();
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  } catch {
    throw new Error("Cannot reach the server. Check that the backend is running.");
  }
  if (res.status === 401) adminToken.clear();
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function adminLogin(email: string, password: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API}/api/v1/admin/login`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error("Cannot reach the server. Check that the backend is running.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Sign-in failed.");
  adminToken.set(body.token);
}

export const adminStats = () => adminRequest<AdminStats>("/api/v1/admin/stats");
export const adminScans = (limit = 20, offset = 0) =>
  adminRequest<{ total: number; items: AdminScan[] }>(`/api/v1/admin/scans?limit=${limit}&offset=${offset}`);
export const adminRevoke = (id: string) =>
  adminRequest<{ revoked: boolean }>(`/api/v1/admin/scans/${id}/revoke`, { method: "POST" });