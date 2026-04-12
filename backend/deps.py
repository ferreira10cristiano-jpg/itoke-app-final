"""
Shared dependencies for iToke API routes.
Database connection, auth helpers, rate limiter, and utility functions.
"""
from fastapi import HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict
import time as _time
import os
import logging
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'itoke_db')]

logger = logging.getLogger(__name__)


# ===================== RATE LIMITER =====================

class RateLimiter:
    def __init__(self):
        self.attempts = defaultdict(list)

    def check(self, key: str, max_attempts: int, window_seconds: int) -> bool:
        now = _time.time()
        self.attempts[key] = [t for t in self.attempts[key] if now - t < window_seconds]
        if len(self.attempts[key]) >= max_attempts:
            return False
        self.attempts[key].append(now)
        return True

    def get_remaining(self, key: str, max_attempts: int, window_seconds: int) -> int:
        now = _time.time()
        self.attempts[key] = [t for t in self.attempts[key] if now - t < window_seconds]
        return max(0, max_attempts - len(self.attempts[key]))

rate_limiter = RateLimiter()

RATE_LIMITS = {
    "login": {"max": 5, "window": 60},
    "qr_generate": {"max": 15, "window": 86400},
    "payment": {"max": 10, "window": 3600},
}


# ===================== AUTH HELPERS =====================

async def get_current_user(request: Request) -> dict:
    """Extract and validate user from session token"""
    session_token = request.cookies.get("session_token")

    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]

    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )

    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def get_current_representative(request: Request) -> dict:
    """Authenticate representative via private access token"""
    rep_token = request.headers.get("X-Rep-Token")
    if not rep_token:
        rep_token = request.query_params.get("token")
    if not rep_token:
        raise HTTPException(status_code=401, detail="Token de representante nao fornecido")

    rep = await db.representatives.find_one(
        {"access_token": rep_token, "status": {"$in": ["active", "pending"]}},
        {"_id": 0}
    )
    if not rep:
        raise HTTPException(status_code=401, detail="Token invalido ou representante inativo")

    return rep


# ===================== UTILITY FUNCTIONS =====================

def get_client_ip(request: Request) -> str:
    """Get client IP from request headers"""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def log_suspicious_activity(activity_type: str, details: dict):
    """Log suspicious activity for admin review"""
    alert = {
        "alert_id": f"alert_{uuid.uuid4().hex[:12]}",
        "type": activity_type,
        "details": details,
        "status": "new",
        "created_at": datetime.now(timezone.utc),
        "reviewed": False,
    }
    await db.fraud_alerts.insert_one(alert)
    logger.warning(f"FRAUD ALERT [{activity_type}]: {details}")


def validate_cpf(cpf: str) -> bool:
    """Validate Brazilian CPF using check digit algorithm"""
    cpf = ''.join(c for c in cpf if c.isdigit())
    if len(cpf) != 11:
        return False
    if cpf == cpf[0] * 11:
        return False
    total = sum(int(cpf[i]) * (10 - i) for i in range(9))
    remainder = total % 11
    d1 = 0 if remainder < 2 else 11 - remainder
    if int(cpf[9]) != d1:
        return False
    total = sum(int(cpf[i]) * (11 - i) for i in range(10))
    remainder = total % 11
    d2 = 0 if remainder < 2 else 11 - remainder
    if int(cpf[10]) != d2:
        return False
    return True


def validate_cnpj(cnpj: str) -> bool:
    """Validate CNPJ using check digits algorithm"""
    cnpj = cnpj.replace(".", "").replace("/", "").replace("-", "").strip()
    if len(cnpj) != 14 or cnpj == cnpj[0] * 14:
        return False
    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    sum1 = sum(int(cnpj[i]) * weights1[i] for i in range(12))
    d1 = 11 - (sum1 % 11)
    d1 = 0 if d1 >= 10 else d1
    if int(cnpj[12]) != d1:
        return False
    sum2 = sum(int(cnpj[i]) * weights2[i] for i in range(13))
    d2 = 11 - (sum2 % 11)
    d2 = 0 if d2 >= 10 else d2
    return int(cnpj[13]) == d2
