from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import repositories as db
from routes import admin, scans, verification

@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="TRUTHCHAIN AI API", version="1.0.0", lifespan=lifespan)

# CORS: only your own frontend may call this API from a browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(scans.router)
app.include_router(verification.router)
app.include_router(admin.router)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "truthchain-api",
        "version": "1.0.0",
        "detector_mode": settings.detector_mode,          # "demo" means scores are NOT real detections
        "blockchain_configured": settings.chain_configured,
        "auth_mode": settings.auth_mode,
    }
