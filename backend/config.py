"""Reads settings from environment variables (and backend/.env in local development)."""
import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


def _bool_placeholder(value: str) -> bool:
    """True when a value is empty or still an example placeholder."""
    return (not value) or "YOUR_" in value or "DO_NOT_COMMIT" in value or "PASTE_" in value


@dataclass(frozen=True)
class Settings:
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
    max_upload_bytes: int = int(float(os.getenv("MAX_UPLOAD_MB", "10")) * 1024 * 1024)
    database_path: str = os.getenv("DATABASE_PATH", "./data/truthchain.db")

    auth_mode: str = os.getenv("AUTH_MODE", "dev")
    supabase_jwt_secret: str = os.getenv("SUPABASE_JWT_SECRET", "")

    detector_mode: str = os.getenv("DETECTOR_MODE", "demo")
    model_id: str = os.getenv("MODEL_ID", "")
    model_version: str = os.getenv("MODEL_VERSION", "unversioned")
    ai_label: str = os.getenv("AI_LABEL", "")
    calibration_file: str = os.getenv("CALIBRATION_FILE", "")

    amoy_rpc_url: str = os.getenv("AMOY_RPC_URL", "")
    chain_id: int = int(os.getenv("CHAIN_ID", "80002"))
    contract_address: str = os.getenv("CONTRACT_ADDRESS", "")
    contract_abi_path: str = os.getenv("CONTRACT_ABI_PATH", "")
    explorer_base_url: str = os.getenv("EXPLORER_BASE_URL", "https://amoy.polygonscan.com")
    registrar_private_key: str = os.getenv("REGISTRAR_PRIVATE_KEY", "")
    
    admin_email: str = os.getenv("ADMIN_EMAIL", "")
    admin_password_hash: str = os.getenv("ADMIN_PASSWORD_HASH", "")
    admin_jwt_secret: str = os.getenv("ADMIN_JWT_SECRET", "")

    @property
    def chain_configured(self) -> bool:
        return not any(
            _bool_placeholder(v)
            for v in (self.amoy_rpc_url, self.contract_address, self.registrar_private_key)
        ) and bool(self.contract_abi_path)

    @property
    def admin_configured(self) -> bool:
        return not any(
            _bool_placeholder(v)
            for v in (self.admin_email, self.admin_password_hash, self.admin_jwt_secret)
        )

settings = Settings()
