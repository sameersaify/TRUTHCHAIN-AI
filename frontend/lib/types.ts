export type ChainStatus = "not_registered" | "pending" | "confirmed" | "failed";

export interface Scan {
  scan_id: string;
  certificate_id: string;
  media_type: "image";
  is_demo: boolean;
  score_label: "estimated_ai_likelihood" | "uncalibrated_model_score";
  ai_likelihood: number | null; // 0-1, only when calibrated
  model_score: number;          // 0-1 raw model output
  model: { name: string; version: string; preprocessing_version: string; calibration_version: string };
  file_hash: string;
  report_hash: string;
  scanned_at: string;
  certificate: Record<string, unknown> & {
    blockchain: { explorer_url: string | null; contract_address: string | null; chain_id: number };
  };
  blockchain: { network: string; status: ChainStatus; transaction_hash: string | null; block_number: number | null; error: string | null };
}

export interface Verification {
  certificate: Scan["certificate"] & { certificate_id: string; scanned_at: string; file_hash: string; report_hash: string; is_demo: boolean };
  checks: {
    stored_report_intact: "match" | "mismatch";
    on_chain_record: "found" | "not_found" | "unavailable";
    file_hash_on_chain: "match" | "mismatch" | "unavailable";
    report_hash_on_chain: "match" | "mismatch" | "unavailable";
    transaction: ChainStatus;
  };
  chain_detail: { available: boolean; reason?: string };
  notice: string;
}
