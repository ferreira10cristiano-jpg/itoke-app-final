from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import hashlib
import math
import random
import string

from emergentintegrations.llm.chat import LlmChat, UserMessage

def generate_offer_code() -> str:
    """Generate a short, readable offer code like OFF-A1B2C3"""
    chars = string.ascii_uppercase + string.digits
    code = ''.join(random.choices(chars, k=6))
    return f"OFF-{code}"

# AI Image Generation Request
class ImageGenerationRequest(BaseModel):
    prompt: str

class ImageGenerationResponse(BaseModel):
    image_base64: str
    text_response: Optional[str] = None

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'itoke_db')]

# Create the main app
app = FastAPI(title="iToke API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# HTML Callback page for OAuth redirect
CALLBACK_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>iToke - Autenticando...</title>
    <style>
        body {
            background-color: #0F172A;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
        }
        .loader {
            border: 4px solid #1E293B;
            border-top: 4px solid #10B981;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        p { color: #94A3B8; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="loader"></div>
    <p>Autenticando...</p>
    <script>
        // Get session_id from URL hash
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const sessionId = params.get('session_id');
        
        if (sessionId) {
            // Try to redirect to app deep link
            const deepLink = 'itoke://callback?session_id=' + sessionId;
            
            // For Expo Go, use the exp:// scheme
            const expoLink = 'exp://localhost:8081/--/callback?session_id=' + sessionId;
            
            // Try deep link first
            window.location.href = deepLink;
            
            // Fallback: show the session ID for manual entry
            setTimeout(function() {
                document.body.innerHTML = '<div style="text-align: center; padding: 20px;">' +
                    '<h2 style="color: #10B981;">Login realizado!</h2>' +
                    '<p style="color: #94A3B8;">Se o app não abriu automaticamente, copie o código abaixo:</p>' +
                    '<p style="background: #1E293B; padding: 16px; border-radius: 8px; font-family: monospace; color: #10B981; word-break: break-all;">' + sessionId + '</p>' +
                    '<p style="color: #64748B; font-size: 12px;">Volte para o app iToke para continuar.</p>' +
                    '</div>';
            }, 2000);
        } else {
            document.body.innerHTML = '<div style="text-align: center; padding: 20px;">' +
                '<h2 style="color: #EF4444;">Erro no login</h2>' +
                '<p style="color: #94A3B8;">Não foi possível autenticar. Tente novamente.</p>' +
                '</div>';
        }
    </script>
</body>
</html>
"""

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class UserBase(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "client"  # client, establishment, representative, admin
    referral_code: str
    referred_by_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "client"
    referral_code_used: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None

class EstablishmentBase(BaseModel):
    establishment_id: str
    user_id: str  # FK to profiles
    business_name: str
    address: str
    category: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    token_balance: int = 0  # Available tokens for sales
    total_sales: int = 0
    total_views: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EstablishmentCreate(BaseModel):
    business_name: str
    cnpj: Optional[str] = ""
    address: Optional[str] = ""
    city: str = ""
    neighborhood: str = ""
    category: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    about: Optional[str] = None
    social_links: Optional[dict] = None
    # Structured address via ViaCEP
    structured_address: Optional[dict] = None  # {cep, city, neighborhood, street, number, complement}

class OfferBase(BaseModel):
    offer_id: str
    offer_code: str  # Short readable code like OFF-A1B2C3
    establishment_id: str
    title: str
    description: Optional[str] = None
    discount_value: float  # Percentage discount
    original_price: float
    discounted_price: float
    active: bool = True
    is_simulation: bool = False  # Indicates if created in simulation mode
    views: int = 0
    qr_generated: int = 0
    sales: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OfferCreate(BaseModel):
    title: str
    description: Optional[str] = None
    detailed_description: Optional[str] = None
    rules: Optional[str] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None  # Base64 encoded image
    discount_value: float
    original_price: float
    discounted_price: Optional[float] = None  # Auto-calculated if not provided
    valid_days: Optional[str] = None  # e.g. "Seg a Sex"
    valid_hours: Optional[str] = None  # e.g. "11h às 15h"
    delivery_allowed: bool = False
    dine_in_only: bool = False
    pickup_allowed: bool = False
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    about_establishment: Optional[str] = None
    instagram_link: Optional[str] = None
    validity_date: Optional[str] = None  # e.g. "2026-12-31"

class OfferUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    detailed_description: Optional[str] = None
    rules: Optional[str] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    discount_value: Optional[float] = None
    original_price: Optional[float] = None
    active: Optional[bool] = None
    valid_days: Optional[str] = None
    valid_hours: Optional[str] = None
    delivery_allowed: Optional[bool] = None
    dine_in_only: Optional[bool] = None
    pickup_allowed: Optional[bool] = None
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    about_establishment: Optional[str] = None
    instagram_link: Optional[str] = None
    validity_date: Optional[str] = None

class TokenPackageBase(BaseModel):
    package_id: str
    establishment_id: str
    size: int  # 50, 100, or 150
    price_per_unit: float = 2.00
    total_price: float
    tokens_remaining: int
    status: str = "active"  # active, depleted
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TokenPackagePurchase(BaseModel):
    size: int  # number of tokens

class ClientTokenPurchase(BaseModel):
    packages: int = 1  # number of packages (7 tokens each) - LEGACY
    package_config_id: Optional[str] = None  # dynamic package ID

class ClientTokens(BaseModel):
    user_id: str
    balance: int = 5  # Start with 5 free tokens

class ClientCredits(BaseModel):
    user_id: str
    balance: float = 0.0  # R$ balance

class QRCodeBase(BaseModel):
    qr_id: str
    code_hash: str
    generated_by_user_id: str
    for_offer_id: str
    establishment_id: str
    used: bool = False
    used_at: Optional[datetime] = None
    validated_by_establishment_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime

class QRCodeGenerate(BaseModel):
    offer_id: str
    use_credits: Optional[float] = 0  # Amount of credits to use (optional)

class QRCodeValidate(BaseModel):
    code_hash: str

class TransactionBase(BaseModel):
    transaction_id: str
    from_user_id: Optional[str] = None
    to_user_id: str
    amount: float
    type: str  # purchase_commission, establishment_referral, token_package_commission
    related_offer_id: Optional[str] = None
    related_package_id: Optional[str] = None
    description: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReferralNetwork(BaseModel):
    parent_user_id: str
    child_user_id: str
    level: int  # 1, 2, or 3

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
    
    # Check expiry with timezone awareness
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

def generate_referral_code(user_id: str) -> str:
    """Generate unique referral code"""
    return f"ITOKE{user_id[-6:].upper()}"

async def process_referral(new_user_id: str, referral_code: str):
    """Process referral and create network links up to 3 levels"""
    referrer = await db.users.find_one(
        {"referral_code": referral_code},
        {"_id": 0}
    )
    
    if not referrer:
        return
    
    # Guard: prevent self-referral
    if referrer["user_id"] == new_user_id:
        return
    
    # Update new user's referred_by
    await db.users.update_one(
        {"user_id": new_user_id},
        {"$set": {"referred_by_id": referrer["user_id"]}}
    )
    
    seen_parents = set()
    
    # Create level 1 link
    seen_parents.add(referrer["user_id"])
    await db.referral_network.insert_one({
        "parent_user_id": referrer["user_id"],
        "child_user_id": new_user_id,
        "level": 1
    })
    
    # Find level 2 (referrer's referrer)
    level2_id = referrer.get("referred_by_id")
    if level2_id and level2_id not in seen_parents and level2_id != new_user_id:
        seen_parents.add(level2_id)
        await db.referral_network.insert_one({
            "parent_user_id": level2_id,
            "child_user_id": new_user_id,
            "level": 2
        })
        
        # Find level 3
        level2_user = await db.users.find_one(
            {"user_id": level2_id},
            {"_id": 0}
        )
        level3_id = level2_user.get("referred_by_id") if level2_user else None
        if level3_id and level3_id not in seen_parents and level3_id != new_user_id:
            seen_parents.add(level3_id)
            await db.referral_network.insert_one({
                "parent_user_id": level3_id,
                "child_user_id": new_user_id,
                "level": 3
            })

async def distribute_commissions(purchaser_id: str, amount: float, transaction_type: str, related_id: str, packages_qty: int = 1):
    """Distribute R$1 per package commissions to 3 levels of referrers (NOT to the purchaser themselves)"""
    # Get all referrers for this user
    referrals = await db.referral_network.find(
        {"child_user_id": purchaser_id},
        {"_id": 0}
    ).sort("level", 1).to_list(3)
    
    credited_parents = set()
    
    for ref in referrals:
        parent_id = ref["parent_user_id"]
        
        # Skip: never give commission to the purchaser themselves
        if parent_id == purchaser_id:
            continue
        
        # Skip: prevent double commission to same user (deduplication)
        if parent_id in credited_parents:
            continue
        
        credited_parents.add(parent_id)
        commission = 1.00 * packages_qty  # R$1 per package per level
        
        # Add to referrer's credits
        await db.client_credits.update_one(
            {"user_id": parent_id},
            {"$inc": {"balance": commission}},
            upsert=True
        )
        
        # Record transaction
        transaction = {
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "from_user_id": purchaser_id,
            "to_user_id": parent_id,
            "amount": commission,
            "type": transaction_type,
            "related_offer_id": related_id if transaction_type == "purchase_commission" else None,
            "related_package_id": related_id if transaction_type == "token_package_commission" else None,
            "description": f"Comissão nível {ref['level']} ({packages_qty} pacote{'s' if packages_qty > 1 else ''})",
            "created_at": datetime.now(timezone.utc)
        }
        await db.transactions.insert_one(transaction)

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using Haversine formula"""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        auth_data = auth_response.json()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one(
        {"email": auth_data["email"]},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": auth_data["name"],
                "picture": auth_data.get("picture")
            }}
        )
    else:
        # Create new user
        referral_code = generate_referral_code(user_id)
        new_user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "role": "client",
            "referral_code": referral_code,
            "referred_by_id": None,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(new_user)
        
        # Initialize tokens and credits
        await db.client_tokens.insert_one({
            "user_id": user_id,
            "balance": 5  # 5 free tokens to start
        })
        await db.client_credits.insert_one({
            "user_id": user_id,
            "balance": 0.0
        })
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=180)  # 6 months session
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Get full user data
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"user": user, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info"""
    # Get tokens and credits
    tokens = await db.client_tokens.find_one({"user_id": user["user_id"]}, {"_id": 0})
    credits = await db.client_credits.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    user["tokens"] = tokens.get("balance", 0) if tokens else 0
    user["credits"] = credits.get("balance", 0.0) if credits else 0.0
    
    # Get establishment if user is establishment role
    if user.get("role") == "establishment":
        establishment = await db.establishments.find_one(
            {"user_id": user["user_id"]},
            {"_id": 0}
        )
        user["establishment"] = establishment
    
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.post("/auth/apply-referral")
async def apply_referral(request: Request, user: dict = Depends(get_current_user)):
    """Apply referral code to user"""
    body = await request.json()
    referral_code = body.get("referral_code")
    
    if not referral_code:
        raise HTTPException(status_code=400, detail="Referral code required")
    
    if user.get("referred_by_id"):
        raise HTTPException(status_code=400, detail="Referral already applied")
    
    await process_referral(user["user_id"], referral_code)
    
    return {"message": "Referral applied successfully"}

@api_router.put("/auth/role")
async def update_role(request: Request, user: dict = Depends(get_current_user)):
    """Update user role"""
    body = await request.json()
    new_role = body.get("role")
    
    if new_role not in ["client", "establishment", "representative"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"role": new_role}}
    )
    
    return {"message": "Role updated", "role": new_role}

# ===================== ESTABLISHMENT ROUTES =====================

@api_router.post("/establishments")
async def create_establishment(data: EstablishmentCreate, user: dict = Depends(get_current_user)):
    """Create establishment for user"""
    # Check if user already has establishment
    existing = await db.establishments.find_one({"user_id": user["user_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="User already has an establishment")
    
    # Check CNPJ uniqueness
    if data.cnpj:
        cleaned_cnpj = data.cnpj.replace(".", "").replace("/", "").replace("-", "").strip()
        if cleaned_cnpj:
            existing_cnpj = await db.establishments.find_one({"cnpj": cleaned_cnpj}, {"_id": 0, "establishment_id": 1, "user_id": 1, "business_name": 1})
            if existing_cnpj:
                # Find the user email associated with this establishment
                owner = await db.users.find_one({"user_id": existing_cnpj["user_id"]}, {"_id": 0, "email": 1})
                owner_email = owner.get("email", "") if owner else ""
                # Mask the email for privacy
                if owner_email and "@" in owner_email:
                    parts = owner_email.split("@")
                    masked = parts[0][:2] + "***@" + parts[1]
                else:
                    masked = "***"
                raise HTTPException(
                    status_code=409,
                    detail=f"CNPJ_ALREADY_EXISTS|{masked}"
                )
    
    establishment_id = f"est_{uuid.uuid4().hex[:12]}"
    
    # Build structured address if provided
    addr = data.structured_address or {}
    address_obj = {
        "cep": addr.get("cep", ""),
        "city": addr.get("city", data.city or ""),
        "neighborhood": addr.get("neighborhood", data.neighborhood or ""),
        "street": addr.get("street", ""),
        "number": addr.get("number", ""),
        "complement": addr.get("complement", ""),
    }
    # For backward compat, also store flat city/neighborhood
    flat_city = address_obj["city"]
    flat_neighborhood = address_obj["neighborhood"]
    
    establishment = {
        "establishment_id": establishment_id,
        "user_id": user["user_id"],
        "business_name": data.business_name,
        "cnpj": data.cnpj.replace(".", "").replace("/", "").replace("-", "").strip() if data.cnpj else "",
        "address": data.address or f"{address_obj['street']}, {address_obj['number']}".strip(", "),
        "structured_address": address_obj,
        "city": flat_city,
        "neighborhood": flat_neighborhood,
        "category": data.category,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "about": data.about,
        "social_links": data.social_links,
        "token_balance": 0,
        "total_sales": 0,
        "total_views": 0,
        "first_offer_free": True,  # First offer is free
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.establishments.insert_one(establishment)
    
    # Update user role
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"role": "establishment"}}
    )
    
    # Process establishment referral if user was referred
    if user.get("referred_by_id"):
        # Record that this establishment was referred
        await db.establishment_referrals.insert_one({
            "referral_id": f"estref_{uuid.uuid4().hex[:12]}",
            "referrer_user_id": user["referred_by_id"],
            "establishment_id": establishment_id,
            "active_until": datetime.now(timezone.utc) + timedelta(days=365),  # 12 months
            "created_at": datetime.now(timezone.utc)
        })
    
    return {**establishment, "_id": None}

@api_router.get("/establishments/me")
async def get_my_establishment(user: dict = Depends(get_current_user)):
    """Get current user's establishment"""
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not establishment:
        raise HTTPException(status_code=404, detail="No establishment found")
    
    return establishment

@api_router.put("/establishments/me")
async def update_my_establishment(data: dict, user: dict = Depends(get_current_user)):
    """Update current user's establishment"""
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not establishment:
        raise HTTPException(status_code=404, detail="No establishment found")
    
    update_data = {}
    if "business_name" in data and data["business_name"]:
        update_data["business_name"] = data["business_name"]
    if "cnpj" in data and data["cnpj"]:
        cleaned_cnpj = data["cnpj"].replace(".", "").replace("/", "").replace("-", "").strip()
        # Check uniqueness (if changing CNPJ)
        if cleaned_cnpj != establishment.get("cnpj", ""):
            existing_cnpj = await db.establishments.find_one(
                {"cnpj": cleaned_cnpj, "establishment_id": {"$ne": establishment["establishment_id"]}},
                {"_id": 0}
            )
            if existing_cnpj:
                raise HTTPException(status_code=409, detail="CNPJ já cadastrado por outro estabelecimento")
        update_data["cnpj"] = cleaned_cnpj
    if "history" in data:
        update_data["history"] = data["history"]
    if "instagram" in data:
        update_data["instagram"] = data["instagram"]
    if "category" in data and data["category"]:
        update_data["category"] = data["category"]
    
    # Handle structured address from ViaCEP
    if "structured_address" in data and data["structured_address"]:
        addr = data["structured_address"]
        update_data["structured_address"] = {
            "cep": addr.get("cep", ""),
            "city": addr.get("city", ""),
            "neighborhood": addr.get("neighborhood", ""),
            "street": addr.get("street", ""),
            "number": addr.get("number", ""),
            "complement": addr.get("complement", ""),
        }
        # Keep flat city/neighborhood in sync
        update_data["city"] = addr.get("city", "")
        update_data["neighborhood"] = addr.get("neighborhood", "")
        update_data["address"] = f"{addr.get('street', '')}, {addr.get('number', '')}".strip(", ")
    elif "address" in data and data["address"]:
        update_data["address"] = data["address"]
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.establishments.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data}
        )
    
    updated = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    return updated

@api_router.get("/establishments/{establishment_id}")
async def get_establishment(establishment_id: str):
    """Get establishment by ID"""
    establishment = await db.establishments.find_one(
        {"establishment_id": establishment_id},
        {"_id": 0}
    )
    
    if not establishment:
        raise HTTPException(status_code=404, detail="Establishment not found")
    
    return establishment

@api_router.get("/establishments/{establishment_id}/stats")
async def get_establishment_stats(establishment_id: str, user: dict = Depends(get_current_user)):
    """Get establishment performance stats"""
    establishment = await db.establishments.find_one(
        {"establishment_id": establishment_id},
        {"_id": 0}
    )
    
    if not establishment:
        raise HTTPException(status_code=404, detail="Establishment not found")
    
    # Get offers stats
    offers = await db.offers.find(
        {"establishment_id": establishment_id},
        {"_id": 0}
    ).to_list(100)
    
    total_views = sum(o.get("views", 0) for o in offers)
    total_qr_generated = sum(o.get("qr_generated", 0) for o in offers)
    total_sales = sum(o.get("sales", 0) for o in offers)
    
    return {
        "establishment": establishment,
        "stats": {
            "total_offers": len(offers),
            "active_offers": len([o for o in offers if o.get("active")]),
            "total_views": total_views,
            "total_qr_generated": total_qr_generated,
            "total_sales": total_sales,
            "token_balance": establishment.get("token_balance", 0)
        }
    }

# ===================== OFFER ROUTES =====================

@api_router.post("/offers")
async def create_offer(data: OfferCreate, user: dict = Depends(get_current_user)):
    """Create new offer for establishment"""
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not establishment:
        raise HTTPException(status_code=403, detail="User is not an establishment")
    
    # Check if first offer is free - SIMULATION MODE: Skip token check for testing
    existing_offers = await db.offers.count_documents({"establishment_id": establishment["establishment_id"]})
    
    # Determine if this is a simulation (no token verification)
    has_tokens = establishment.get("token_balance", 0) >= 1
    is_simulation = existing_offers > 0 and not has_tokens
    
    # Token check disabled for simulation/testing purposes
    # if existing_offers > 0 and not has_tokens:
    #     raise HTTPException(status_code=400, detail="Insufficient token balance. Purchase a package.")
    
    offer_id = f"offer_{uuid.uuid4().hex[:12]}"
    offer_code = generate_offer_code()
    
    # Ensure offer_code is unique
    while await db.offers.find_one({"offer_code": offer_code}):
        offer_code = generate_offer_code()
    
    discounted_price = data.discounted_price if data.discounted_price else round(data.original_price * (1 - data.discount_value / 100), 2)
    
    # Use base64 image if provided, otherwise use URL
    image = data.image_base64 if data.image_base64 else data.image_url
    
    offer = {
        "offer_id": offer_id,
        "offer_code": offer_code,
        "establishment_id": establishment["establishment_id"],
        "title": data.title,
        "description": data.description,
        "detailed_description": data.detailed_description,
        "rules": data.rules,
        "image_url": image,
        "discount_value": data.discount_value,
        "original_price": data.original_price,
        "discounted_price": discounted_price,
        "valid_days": data.valid_days,
        "valid_hours": data.valid_hours,
        "delivery_allowed": data.delivery_allowed,
        "dine_in_only": data.dine_in_only,
        "pickup_allowed": data.pickup_allowed,
        "city": data.city or establishment.get("city", ""),
        "neighborhood": data.neighborhood or establishment.get("neighborhood", ""),
        "about_establishment": data.about_establishment or establishment.get("about", ""),
        "instagram_link": data.instagram_link or (establishment.get("social_links") or {}).get("instagram", ""),
        "validity_date": data.validity_date,
        "active": True,
        "is_simulation": is_simulation,
        "views": 0,
        "qr_generated": 0,
        "sales": 0,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.offers.insert_one(offer)
    
    # Mark first offer as used
    if existing_offers == 0:
        await db.establishments.update_one(
            {"establishment_id": establishment["establishment_id"]},
            {"$set": {"first_offer_free": False}}
        )
    
    return {**offer, "_id": None}

@api_router.get("/offers")
async def get_offers(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    category: Optional[str] = None,
    city: Optional[str] = None,
    neighborhood: Optional[str] = None,
    sort_by: Optional[str] = "discount",  # discount or sales
    limit: int = 50
):
    """Get all active offers, sorted by discount and proximity"""
    query = {"active": True}
    
    offers = await db.offers.find(query, {"_id": 0}).to_list(limit)
    
    # Enrich with establishment data
    enriched_offers = []
    for offer in offers:
        establishment = await db.establishments.find_one(
            {"establishment_id": offer["establishment_id"]},
            {"_id": 0}
        )
        
        if establishment:
            # Filter by city/neighborhood (check structured_address first, then fallback)
            est_sa = establishment.get("structured_address", {}) or {}
            est_city = est_sa.get("city", "") or establishment.get("city", "")
            est_neighborhood = est_sa.get("neighborhood", "") or establishment.get("neighborhood", "")
            
            if city and est_city.lower() != city.lower():
                continue
            if neighborhood and est_neighborhood.lower() != neighborhood.lower():
                continue
            
            # Increment view count
            await db.offers.update_one(
                {"offer_id": offer["offer_id"]},
                {"$inc": {"views": 1}}
            )
            
            offer["establishment"] = establishment
            
            # Calculate distance if coordinates provided
            if lat and lon and establishment.get("latitude") and establishment.get("longitude"):
                offer["distance_km"] = calculate_distance(
                    lat, lon,
                    establishment["latitude"],
                    establishment["longitude"]
                )
            else:
                offer["distance_km"] = None
            
            if not category or establishment.get("category") == category:
                enriched_offers.append(offer)
    
    # Sort by discount (desc) and distance (asc) if available
    if sort_by == "sales":
        enriched_offers.sort(key=lambda o: -o.get("sales", 0))
    else:
        def sort_key(o):
            discount = -o.get("discount_value", 0)
            distance = o.get("distance_km") or 9999
            return (discount, distance)
        enriched_offers.sort(key=sort_key)
    
    return enriched_offers

# ===================== OFFERS FILTER ENDPOINT =====================

@api_router.get("/offers/filters")
async def get_offer_filters(city: Optional[str] = None):
    """Get available filter options - only cities/neighborhoods with active offers"""
    # Get all active offers
    active_offers = await db.offers.find({"active": True}, {"_id": 0, "establishment_id": 1}).to_list(1000)
    active_est_ids = set(o["establishment_id"] for o in active_offers)
    
    # Get establishments that have active offers
    establishments = await db.establishments.find(
        {"establishment_id": {"$in": list(active_est_ids)}},
        {"_id": 0, "city": 1, "neighborhood": 1, "structured_address": 1}
    ).to_list(500)
    
    # Extract city/neighborhood, preferring structured_address
    def get_city(e):
        sa = e.get("structured_address", {}) or {}
        return sa.get("city", "") or e.get("city", "")
    
    def get_neighborhood(e):
        sa = e.get("structured_address", {}) or {}
        return sa.get("neighborhood", "") or e.get("neighborhood", "")
    
    cities = sorted(list(set(get_city(e) for e in establishments if get_city(e))))
    
    # If city filter provided, only return neighborhoods from that city
    if city:
        neighborhoods = sorted(list(set(
            get_neighborhood(e) for e in establishments 
            if get_neighborhood(e) and get_city(e).lower() == city.lower()
        )))
    else:
        neighborhoods = sorted(list(set(get_neighborhood(e) for e in establishments if get_neighborhood(e))))
    
    return {
        "cities": cities,
        "neighborhoods": neighborhoods
    }

@api_router.get("/categories/with-counts")
async def get_categories_with_counts(city: Optional[str] = None, neighborhood: Optional[str] = None):
    """Get categories sorted by number of active offers (desc)"""
    all_categories = [
        {"id": "food", "name": "Alimentação", "icon": "restaurant"},
        {"id": "beauty", "name": "Beleza", "icon": "spa"},
        {"id": "health", "name": "Saúde", "icon": "medical-services"},
        {"id": "entertainment", "name": "Entretenimento", "icon": "celebration"},
        {"id": "fitness", "name": "Fitness", "icon": "fitness-center"},
        {"id": "inn", "name": "Pousada", "icon": "hotel"},
        {"id": "hotel", "name": "Hotel", "icon": "apartment"},
        {"id": "petshop", "name": "Petshop", "icon": "pets"},
        {"id": "vet", "name": "Veterinário", "icon": "healing"},
        {"id": "services", "name": "Serviços", "icon": "build"},
        {"id": "retail", "name": "Varejo", "icon": "store"},
        {"id": "education", "name": "Educação", "icon": "school"},
        {"id": "auto", "name": "Automotivo", "icon": "directions-car"},
        {"id": "other", "name": "Outros", "icon": "category"},
    ]
    
    # Get active offers with their establishment data
    active_offers = await db.offers.find({"active": True}, {"_id": 0, "establishment_id": 1}).to_list(1000)
    active_est_ids = [o["establishment_id"] for o in active_offers]
    
    # Get establishments for active offers
    establishments = await db.establishments.find(
        {"establishment_id": {"$in": active_est_ids}},
        {"_id": 0, "establishment_id": 1, "category": 1, "city": 1, "neighborhood": 1, "structured_address": 1}
    ).to_list(500)
    
    def _get_city(e):
        sa = e.get("structured_address", {}) or {}
        return sa.get("city", "") or e.get("city", "")
    
    def _get_neighborhood(e):
        sa = e.get("structured_address", {}) or {}
        return sa.get("neighborhood", "") or e.get("neighborhood", "")
    
    # Apply city/neighborhood filter
    if city:
        establishments = [e for e in establishments if _get_city(e).lower() == city.lower()]
    if neighborhood:
        establishments = [e for e in establishments if _get_neighborhood(e).lower() == neighborhood.lower()]
    
    filtered_est_ids = set(e["establishment_id"] for e in establishments)
    est_categories = {e["establishment_id"]: e.get("category", "") for e in establishments}
    
    # Count offers per category
    cat_counts = {}
    for o in active_offers:
        if o["establishment_id"] in filtered_est_ids:
            cat = est_categories.get(o["establishment_id"], "")
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
    
    # Build result with counts, only include categories that have offers
    result = []
    for cat in all_categories:
        count = cat_counts.get(cat["id"], 0)
        if count > 0:
            result.append({**cat, "offer_count": count})
    
    # Sort by offer count descending
    result.sort(key=lambda c: -c["offer_count"])
    
    return result

@api_router.get("/offers/code/{offer_code}")
async def get_offer_by_code(offer_code: str, user: dict = Depends(get_current_user)):
    """Get offer by short code (for establishment to lookup quickly)"""
    # Normalize code to uppercase
    offer_code = offer_code.upper()
    
    offer = await db.offers.find_one({"offer_code": offer_code}, {"_id": 0})
    
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta não encontrada com este código")
    
    establishment = await db.establishments.find_one(
        {"establishment_id": offer["establishment_id"]},
        {"_id": 0}
    )
    offer["establishment"] = establishment
    
    return offer

@api_router.get("/offers/search")
async def search_offers_by_code(code: str, user: dict = Depends(get_current_user)):
    """Search offers by partial code (for establishment dashboard)"""
    # Get user's establishment
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not establishment:
        raise HTTPException(status_code=403, detail="User is not an establishment")
    
    # Search by partial code (case insensitive)
    code_upper = code.upper()
    offers = await db.offers.find({
        "establishment_id": establishment["establishment_id"],
        "offer_code": {"$regex": code_upper, "$options": "i"}
    }, {"_id": 0}).to_list(20)
    
    return offers

@api_router.get("/offers/{offer_id}")
async def get_offer(offer_id: str):
    """Get single offer"""
    offer = await db.offers.find_one({"offer_id": offer_id}, {"_id": 0})
    
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    establishment = await db.establishments.find_one(
        {"establishment_id": offer["establishment_id"]},
        {"_id": 0}
    )
    offer["establishment"] = establishment
    
    return offer

@api_router.put("/offers/{offer_id}")
async def update_offer(offer_id: str, data: OfferUpdate, user: dict = Depends(get_current_user)):
    """Update offer"""
    offer = await db.offers.find_one({"offer_id": offer_id}, {"_id": 0})
    
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not establishment or establishment["establishment_id"] != offer["establishment_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    
    if "discount_value" in update_data or "original_price" in update_data:
        discount = update_data.get("discount_value", offer["discount_value"])
        price = update_data.get("original_price", offer["original_price"])
        update_data["discounted_price"] = round(price * (1 - discount / 100), 2)
    
    await db.offers.update_one({"offer_id": offer_id}, {"$set": update_data})
    
    return {"message": "Offer updated"}

@api_router.get("/establishments/me/offers")
async def get_my_offers(user: dict = Depends(get_current_user)):
    """Get all offers for current user's establishment"""
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not establishment:
        raise HTTPException(status_code=404, detail="No establishment found")
    
    offers = await db.offers.find(
        {"establishment_id": establishment["establishment_id"]},
        {"_id": 0}
    ).to_list(100)
    
    return offers

# ===================== TOKEN PACKAGE ROUTES =====================

@api_router.post("/packages")
async def purchase_package(data: TokenPackagePurchase, user: dict = Depends(get_current_user)):
    """Purchase token package for establishment"""
    if data.size not in [50, 100, 150]:
        raise HTTPException(status_code=400, detail="Invalid package size. Choose 50, 100, or 150")
    
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not establishment:
        raise HTTPException(status_code=403, detail="User is not an establishment")
    
    package_id = f"pkg_{uuid.uuid4().hex[:12]}"
    price_per_unit = 2.00
    total_price = data.size * price_per_unit
    
    package = {
        "package_id": package_id,
        "establishment_id": establishment["establishment_id"],
        "size": data.size,
        "price_per_unit": price_per_unit,
        "total_price": total_price,
        "tokens_remaining": data.size,
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.token_packages.insert_one(package)
    
    # Add tokens to establishment balance
    await db.establishments.update_one(
        {"establishment_id": establishment["establishment_id"]},
        {"$inc": {"token_balance": data.size}}
    )
    
    # Distribute commissions to referral network (3 levels, R$1 each)
    await distribute_commissions(
        user["user_id"],
        total_price,
        "token_package_commission",
        package_id
    )
    
    return {**package, "_id": None}

@api_router.get("/packages")
async def get_my_packages(user: dict = Depends(get_current_user)):
    """Get all packages for establishment"""
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not establishment:
        raise HTTPException(status_code=404, detail="No establishment found")
    
    packages = await db.token_packages.find(
        {"establishment_id": establishment["establishment_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return packages

# ===================== QR CODE ROUTES =====================

@api_router.post("/qr/generate")
async def generate_qr_code(data: QRCodeGenerate, user: dict = Depends(get_current_user)):
    """Generate QR code for offer redemption - REQUIRES 1 TOKEN"""
    # Get user tokens - REQUIRED
    tokens = await db.client_tokens.find_one({"user_id": user["user_id"]}, {"_id": 0})
    token_balance = tokens.get("balance", 0) if tokens else 0
    
    # MUST have at least 1 token
    if token_balance < 1:
        raise HTTPException(status_code=400, detail="Tokens insuficientes. Você precisa de pelo menos 1 token para gerar o QR Code. Compre um pacote de tokens.")
    
    # Get user credits (optional - for use at establishment)
    credits = await db.client_credits.find_one({"user_id": user["user_id"]}, {"_id": 0})
    credit_balance = credits.get("balance", 0) if credits else 0
    
    # Get offer
    offer = await db.offers.find_one({"offer_id": data.offer_id}, {"_id": 0})
    if not offer or not offer.get("active"):
        raise HTTPException(status_code=404, detail="Offer not found or inactive")
    
    # Calculate credits to reserve (capped at offer price and available balance)
    max_credits = min(credit_balance, offer.get("discounted_price", 0))
    credits_to_reserve = min(data.use_credits or 0, max_credits)
    
    # Generate unique code
    qr_id = f"qr_{uuid.uuid4().hex[:12]}"
    code_hash = hashlib.sha256(f"{qr_id}{user['user_id']}{data.offer_id}{datetime.now().isoformat()}".encode()).hexdigest()[:16]
    
    # Generate backup code (6 characters: ITK-XXX)
    backup_code = f"ITK-{''.join(random.choices(string.ascii_uppercase + string.digits, k=3))}"
    # Ensure backup code is unique
    while await db.vouchers.find_one({"backup_code": backup_code}):
        backup_code = f"ITK-{''.join(random.choices(string.ascii_uppercase + string.digits, k=3))}"
    
    # Get offer code for display
    offer_code = offer.get("offer_code", "N/A")
    
    # Calculate final price to pay at establishment
    final_price_to_pay = max(0, offer.get("discounted_price", 0) - credits_to_reserve)
    
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=180)
    
    voucher = {
        "voucher_id": qr_id,
        "qr_id": qr_id,
        "code_hash": code_hash,
        "backup_code": backup_code,
        "offer_code": offer_code,
        "generated_by_user_id": user["user_id"],
        "customer_name": user.get("name", "Cliente"),
        "for_offer_id": data.offer_id,
        "offer_title": offer.get("title", ""),
        "offer_discount": offer.get("discount_value", 0),
        "original_price": offer.get("original_price", 0),
        "discounted_price": offer.get("discounted_price", 0),
        "establishment_id": offer["establishment_id"],
        "credits_used": credits_to_reserve,
        "credits_reserved": credits_to_reserve,
        "final_price_to_pay": final_price_to_pay,
        "status": "active",
        "used": False,
        "used_at": None,
        "validated_by_establishment_id": None,
        "created_at": now,
        "expires_at": expires
    }
    
    await db.vouchers.insert_one(voucher)
    voucher.pop("_id", None)
    
    # Also save to qr_codes for backward compatibility
    qr_code = {
        "qr_id": qr_id,
        "code_hash": code_hash,
        "backup_code": backup_code,
        "offer_code": offer_code,
        "generated_by_user_id": user["user_id"],
        "for_offer_id": data.offer_id,
        "establishment_id": offer["establishment_id"],
        "credits_used": credits_to_reserve,
        "credits_reserved": credits_to_reserve,
        "final_price_to_pay": final_price_to_pay,
        "used": False,
        "used_at": None,
        "validated_by_establishment_id": None,
        "created_at": now,
        "expires_at": expires
    }
    await db.qr_codes.insert_one(qr_code)
    
    # ALWAYS deduct 1 token from customer
    await db.client_tokens.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"balance": -1}}
    )
    
    # Deduct credits IMMEDIATELY from customer wallet
    if credits_to_reserve > 0:
        await db.client_credits.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"balance": -credits_to_reserve}}
        )
        # Log the credit deduction as a transaction for wallet history
        await db.transactions.insert_one({
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "from_user_id": user["user_id"],
            "to_user_id": user["user_id"],
            "amount": -credits_to_reserve,
            "type": "credit_used_qr",
            "related_offer_id": data.offer_id,
            "voucher_id": qr_id,
            "description": f"Créditos usados no QR - {offer.get('title', '')}",
            "created_at": now
        })
    
    # Increment QR generated count on offer
    await db.offers.update_one(
        {"offer_id": data.offer_id},
        {"$inc": {"qr_generated": 1}}
    )
    
    return {
        **voucher,
        "created_at": now.isoformat(),
        "expires_at": expires.isoformat()
    }

@api_router.post("/qr/validate")
async def validate_qr_preview(data: QRCodeValidate, user: dict = Depends(get_current_user)):
    """Step 1: Preview QR validation - returns billing summary WITHOUT finalizing"""
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not establishment:
        raise HTTPException(status_code=403, detail="Only establishments can validate QR codes")
    
    # Try to find by code_hash first, then by backup_code
    code = data.code_hash.strip().upper()
    voucher = await db.vouchers.find_one({"code_hash": data.code_hash}, {"_id": 0})
    
    if not voucher:
        voucher = await db.vouchers.find_one({"backup_code": code}, {"_id": 0})
    
    if not voucher:
        voucher = await db.qr_codes.find_one({"code_hash": data.code_hash}, {"_id": 0})
        if not voucher:
            voucher = await db.qr_codes.find_one({"backup_code": code}, {"_id": 0})
    
    if not voucher:
        raise HTTPException(status_code=404, detail="Codigo nao encontrado. Verifique se digitou corretamente.")
    
    if voucher.get("used") or voucher.get("status") == "used":
        raise HTTPException(status_code=400, detail="Este voucher ja foi utilizado")
    
    if voucher.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Este voucher foi cancelado")
    
    # Check expiry
    expires_at = voucher.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Este voucher expirou")
    
    if voucher["establishment_id"] != establishment["establishment_id"]:
        raise HTTPException(status_code=403, detail="Este voucher e para outro estabelecimento")
    
    # Get offer details
    offer = await db.offers.find_one({"offer_id": voucher["for_offer_id"]}, {"_id": 0})
    
    credits_used = voucher.get("credits_used", 0) or voucher.get("credits_reserved", 0)
    original_price = voucher.get("original_price") or (offer.get("original_price", 0) if offer else 0)
    discounted_price = voucher.get("discounted_price") or (offer.get("discounted_price", 0) if offer else 0)
    final_price_to_pay = voucher.get("final_price_to_pay", max(0, discounted_price - credits_used))
    
    customer_id = voucher["generated_by_user_id"]
    customer = await db.users.find_one({"user_id": customer_id}, {"_id": 0, "name": 1})
    customer_name = customer.get("name", "Cliente") if customer else voucher.get("customer_name", "Cliente")
    
    # Return preview — NOT finalized yet
    return {
        "step": "preview",
        "voucher_id": voucher.get("voucher_id", voucher.get("qr_id")),
        "backup_code": voucher.get("backup_code"),
        "customer_name": customer_name,
        "offer_title": voucher.get("offer_title") or (offer.get("title") if offer else ""),
        "offer_code": voucher.get("offer_code"),
        "original_price": original_price,
        "discounted_price": discounted_price,
        "credits_used": credits_used,
        "amount_to_pay_cash": final_price_to_pay,
    }


@api_router.post("/qr/confirm")
async def confirm_qr_validation(data: dict, user: dict = Depends(get_current_user)):
    """Step 2: Confirm payment received — finalize the sale"""
    voucher_id = data.get("voucher_id")
    if not voucher_id:
        raise HTTPException(status_code=400, detail="voucher_id obrigatorio")
    
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    if not establishment:
        raise HTTPException(status_code=403, detail="Only establishments can confirm sales")
    
    voucher = await db.vouchers.find_one(
        {"voucher_id": voucher_id},
        {"_id": 0}
    )
    if not voucher:
        voucher = await db.qr_codes.find_one({"qr_id": voucher_id}, {"_id": 0})
    
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher nao encontrado")
    
    if voucher.get("used") or voucher.get("status") == "used":
        raise HTTPException(status_code=400, detail="Este voucher ja foi utilizado")
    
    if voucher["establishment_id"] != establishment["establishment_id"]:
        raise HTTPException(status_code=403, detail="Este voucher e para outro estabelecimento")
    
    # Get offer details
    offer = await db.offers.find_one({"offer_id": voucher["for_offer_id"]}, {"_id": 0})
    
    credits_reserved = voucher.get("credits_used", 0) or voucher.get("credits_reserved", 0)
    discounted_price = voucher.get("discounted_price") or (offer.get("discounted_price", 0) if offer else 0)
    final_price_to_pay = voucher.get("final_price_to_pay", max(0, discounted_price - credits_reserved))
    
    customer_id = voucher["generated_by_user_id"]
    customer = await db.users.find_one({"user_id": customer_id}, {"_id": 0, "name": 1})
    customer_name = customer.get("name", "Cliente") if customer else voucher.get("customer_name", "Cliente")
    
    now = datetime.now(timezone.utc)
    
    # Mark voucher as used
    await db.vouchers.update_one(
        {"voucher_id": voucher_id},
        {"$set": {
            "used": True,
            "status": "used",
            "used_at": now,
            "validated_by_establishment_id": establishment["establishment_id"]
        }}
    )
    await db.qr_codes.update_one(
        {"qr_id": voucher.get("qr_id", voucher_id)},
        {"$set": {"used": True, "used_at": now, "validated_by_establishment_id": establishment["establishment_id"]}}
    )
    
    # Transfer credits to establishment
    if credits_reserved > 0:
        await db.establishments.update_one(
            {"establishment_id": establishment["establishment_id"]},
            {"$inc": {"withdrawable_balance": credits_reserved, "total_sales": 1}}
        )
    else:
        await db.establishments.update_one(
            {"establishment_id": establishment["establishment_id"]},
            {"$inc": {"total_sales": 1}}
        )
    
    # Deduct token from establishment
    if establishment.get("token_balance", 0) >= 1:
        await db.establishments.update_one(
            {"establishment_id": establishment["establishment_id"]},
            {"$inc": {"token_balance": -1}}
        )
    
    # Create sales history record
    sale_record = {
        "sale_id": f"sale_{uuid.uuid4().hex[:12]}",
        "establishment_id": establishment["establishment_id"],
        "voucher_id": voucher.get("voucher_id", voucher.get("qr_id")),
        "qr_code": voucher.get("code_hash"),
        "backup_code": voucher.get("backup_code"),
        "customer_id": customer_id,
        "customer_name": customer_name,
        "offer_id": voucher["for_offer_id"],
        "offer_title": voucher.get("offer_title") or (offer.get("title") if offer else ""),
        "offer_code": voucher.get("offer_code"),
        "original_price": voucher.get("original_price") or (offer.get("original_price", 0) if offer else 0),
        "discounted_price": discounted_price,
        "credits_used": credits_reserved,
        "amount_to_pay_cash": final_price_to_pay,
        "status": "completed",
        "validated_by": "Proprietário",
        "validated_at": now,
        "created_at": now
    }
    await db.sales_history.insert_one(sale_record)
    sale_record.pop("_id", None)
    
    # Financial log
    financial_log = {
        "log_id": f"fin_{uuid.uuid4().hex[:12]}",
        "type": "qr_validation_completed",
        "status": "totalmente_pago",
        "from_user_id": customer_id,
        "to_establishment_id": establishment["establishment_id"],
        "offer_id": voucher["for_offer_id"],
        "qr_id": voucher.get("qr_id"),
        "credits_transferred": credits_reserved,
        "amount_paid_cash": final_price_to_pay,
        "total_amount": discounted_price,
        "offer_title": voucher.get("offer_title") or (offer.get("title") if offer else None),
        "created_at": now
    }
    await db.financial_logs.insert_one(financial_log)
    financial_log.pop("_id", None)
    
    await db.offers.update_one(
        {"offer_id": voucher["for_offer_id"]},
        {"$inc": {"sales": 1}}
    )
    
    await distribute_commissions(customer_id, 2.00, "purchase_commission", voucher["for_offer_id"])
    
    # Check establishment referral
    est_referral = await db.establishment_referrals.find_one({
        "establishment_id": establishment["establishment_id"],
        "active_until": {"$gt": now}
    }, {"_id": 0})
    
    if est_referral:
        await db.client_credits.update_one(
            {"user_id": est_referral["referrer_user_id"]},
            {"$inc": {"balance": 1.00}},
            upsert=True
        )
        await db.transactions.insert_one({
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "from_user_id": establishment["user_id"],
            "to_user_id": est_referral["referrer_user_id"],
            "amount": 1.00,
            "type": "establishment_referral",
            "related_offer_id": voucher["for_offer_id"],
            "description": "Comissao por indicacao de estabelecimento",
            "created_at": now
        })
    
    for key in ["validated_at", "created_at"]:
        if key in sale_record and isinstance(sale_record[key], datetime):
            sale_record[key] = sale_record[key].isoformat()
    
    return {
        "step": "confirmed",
        "success": True,
        "message": "Venda Finalizada com Sucesso!",
        "sale": sale_record,
        "customer_name": customer_name,
        "credits_used": credits_reserved,
        "amount_to_pay_cash": final_price_to_pay,
        "discounted_price": discounted_price,
        "voucher_id": voucher_id,
        "backup_code": voucher.get("backup_code"),
    }

# ===================== VALIDATOR / COLLABORATOR SYSTEM =====================

@api_router.get("/v/{est_id}/info")
async def get_validator_establishment_info(est_id: str):
    """Public: Get establishment info for validator page"""
    est = await db.establishments.find_one(
        {"establishment_id": est_id},
        {"_id": 0, "establishment_id": 1, "business_name": 1, "category": 1}
    )
    if not est:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
    return est

@api_router.post("/v/{est_id}/register")
async def register_validator(est_id: str, data: dict):
    """Register a collaborator name for an establishment"""
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nome é obrigatório")
    
    est = await db.establishments.find_one({"establishment_id": est_id}, {"_id": 0, "establishment_id": 1})
    if not est:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
    
    validator_id = f"val_{uuid.uuid4().hex[:12]}"
    validator = {
        "validator_id": validator_id,
        "establishment_id": est_id,
        "name": name,
        "blocked": False,
        "validations_count": 0,
        "created_at": datetime.now(timezone.utc),
    }
    await db.validators.insert_one(validator)
    validator.pop("_id", None)
    for k in ["created_at"]:
        if k in validator and isinstance(validator[k], datetime):
            validator[k] = validator[k].isoformat()
    return validator

@api_router.get("/v/{est_id}/check/{validator_id}")
async def check_validator(est_id: str, validator_id: str):
    """Check if validator is active (not blocked)"""
    validator = await db.validators.find_one(
        {"validator_id": validator_id, "establishment_id": est_id},
        {"_id": 0}
    )
    if not validator:
        raise HTTPException(status_code=404, detail="Validador não encontrado")
    if validator.get("blocked"):
        raise HTTPException(status_code=403, detail="Acesso bloqueado pelo estabelecimento")
    for k in ["created_at"]:
        if k in validator and isinstance(validator[k], datetime):
            validator[k] = validator[k].isoformat()
    return validator

@api_router.post("/v/{est_id}/scan")
async def validator_scan_qr(est_id: str, data: dict):
    """Collaborator scans a QR code - preview step"""
    validator_id = data.get("validator_id")
    code_raw = data.get("code", "").strip()
    code_upper = code_raw.upper()
    
    if not validator_id or not code_raw:
        raise HTTPException(status_code=400, detail="validator_id e code são obrigatórios")
    
    # Check validator is active
    validator = await db.validators.find_one(
        {"validator_id": validator_id, "establishment_id": est_id},
        {"_id": 0}
    )
    if not validator:
        raise HTTPException(status_code=404, detail="Validador não encontrado")
    if validator.get("blocked"):
        raise HTTPException(status_code=403, detail="Acesso bloqueado pelo estabelecimento")
    
    # Find voucher - search code_hash with original case, backup_code with uppercase
    voucher = await db.vouchers.find_one({"code_hash": code_raw}, {"_id": 0})
    if not voucher:
        voucher = await db.vouchers.find_one({"backup_code": code_upper}, {"_id": 0})
    if not voucher:
        voucher = await db.qr_codes.find_one({"code_hash": code_raw}, {"_id": 0})
        if not voucher:
            voucher = await db.qr_codes.find_one({"backup_code": code_upper}, {"_id": 0})
    
    if not voucher:
        raise HTTPException(status_code=404, detail="Código não encontrado")
    
    if voucher.get("used") or voucher.get("status") == "used":
        raise HTTPException(status_code=400, detail="Este voucher já foi utilizado")
    
    if voucher.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Este voucher foi cancelado")
    
    # Check expiry
    expires_at = voucher.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Este voucher expirou")
    
    if voucher["establishment_id"] != est_id:
        raise HTTPException(status_code=403, detail="Este voucher é para outro estabelecimento")
    
    # Check if already pending
    if voucher.get("status") == "pending_cashier":
        return {
            "step": "already_pending",
            "message": f"Já pré-validado por {voucher.get('pending_validator_name', 'colaborador')}. Aguardando finalização no caixa.",
            "voucher_id": voucher.get("voucher_id", voucher.get("qr_id")),
            "pending_validator_name": voucher.get("pending_validator_name"),
        }
    
    # Get offer details
    offer = await db.offers.find_one({"offer_id": voucher["for_offer_id"]}, {"_id": 0})
    credits_used = voucher.get("credits_used", 0) or voucher.get("credits_reserved", 0)
    original_price = voucher.get("original_price") or (offer.get("original_price", 0) if offer else 0)
    discounted_price = voucher.get("discounted_price") or (offer.get("discounted_price", 0) if offer else 0)
    final_price_to_pay = voucher.get("final_price_to_pay", max(0, discounted_price - credits_used))
    
    customer_id = voucher["generated_by_user_id"]
    customer = await db.users.find_one({"user_id": customer_id}, {"_id": 0, "name": 1})
    customer_name = customer.get("name", "Cliente") if customer else "Cliente"
    
    return {
        "step": "preview",
        "voucher_id": voucher.get("voucher_id", voucher.get("qr_id")),
        "backup_code": voucher.get("backup_code"),
        "customer_name": customer_name,
        "offer_title": voucher.get("offer_title") or (offer.get("title") if offer else ""),
        "original_price": original_price,
        "discounted_price": discounted_price,
        "credits_used": credits_used,
        "amount_to_pay_cash": final_price_to_pay,
    }

@api_router.post("/v/{est_id}/finalize")
async def validator_finalize(est_id: str, data: dict):
    """Collaborator finalizes the validation (full payment received)"""
    validator_id = data.get("validator_id")
    voucher_id = data.get("voucher_id")
    
    if not validator_id or not voucher_id:
        raise HTTPException(status_code=400, detail="validator_id e voucher_id obrigatórios")
    
    validator = await db.validators.find_one(
        {"validator_id": validator_id, "establishment_id": est_id}, {"_id": 0}
    )
    if not validator or validator.get("blocked"):
        raise HTTPException(status_code=403, detail="Validador bloqueado ou inexistente")
    
    est = await db.establishments.find_one({"establishment_id": est_id}, {"_id": 0})
    if not est:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
    
    voucher = await db.vouchers.find_one({"voucher_id": voucher_id}, {"_id": 0})
    if not voucher:
        voucher = await db.qr_codes.find_one({"qr_id": voucher_id}, {"_id": 0})
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher não encontrado")
    if voucher.get("used") or voucher.get("status") == "used":
        raise HTTPException(status_code=400, detail="Voucher já utilizado")
    if voucher["establishment_id"] != est_id:
        raise HTTPException(status_code=403, detail="Voucher de outro estabelecimento")
    
    offer = await db.offers.find_one({"offer_id": voucher["for_offer_id"]}, {"_id": 0})
    credits_reserved = voucher.get("credits_used", 0) or voucher.get("credits_reserved", 0)
    discounted_price = voucher.get("discounted_price") or (offer.get("discounted_price", 0) if offer else 0)
    final_price_to_pay = voucher.get("final_price_to_pay", max(0, discounted_price - credits_reserved))
    customer_id = voucher["generated_by_user_id"]
    customer = await db.users.find_one({"user_id": customer_id}, {"_id": 0, "name": 1})
    customer_name = customer.get("name", "Cliente") if customer else "Cliente"
    
    now = datetime.now(timezone.utc)
    
    # Mark voucher as used
    update_fields = {
        "used": True, "status": "used", "used_at": now,
        "validated_by_establishment_id": est_id,
        "validated_by_name": validator["name"],
        "validated_by_validator_id": validator_id,
    }
    await db.vouchers.update_one({"voucher_id": voucher_id}, {"$set": update_fields})
    await db.qr_codes.update_one(
        {"qr_id": voucher.get("qr_id", voucher_id)},
        {"$set": {"used": True, "used_at": now, "validated_by_establishment_id": est_id}}
    )
    
    # Transfer credits
    if credits_reserved > 0:
        await db.establishments.update_one(
            {"establishment_id": est_id},
            {"$inc": {"withdrawable_balance": credits_reserved, "total_sales": 1}}
        )
    else:
        await db.establishments.update_one(
            {"establishment_id": est_id}, {"$inc": {"total_sales": 1}}
        )
    
    # Deduct token
    if est.get("token_balance", 0) >= 1:
        await db.establishments.update_one(
            {"establishment_id": est_id}, {"$inc": {"token_balance": -1}}
        )
    
    # Sales record
    sale_record = {
        "sale_id": f"sale_{uuid.uuid4().hex[:12]}",
        "establishment_id": est_id,
        "voucher_id": voucher.get("voucher_id", voucher.get("qr_id")),
        "customer_id": customer_id, "customer_name": customer_name,
        "offer_id": voucher["for_offer_id"],
        "offer_title": voucher.get("offer_title") or (offer.get("title") if offer else ""),
        "original_price": voucher.get("original_price") or (offer.get("original_price", 0) if offer else 0),
        "discounted_price": discounted_price,
        "credits_used": credits_reserved, "amount_to_pay_cash": final_price_to_pay,
        "status": "completed",
        "validated_by": validator["name"], "validated_by_validator_id": validator_id,
        "validated_at": now, "created_at": now,
    }
    await db.sales_history.insert_one(sale_record)
    sale_record.pop("_id", None)
    
    # Financial log
    await db.financial_logs.insert_one({
        "log_id": f"fin_{uuid.uuid4().hex[:12]}",
        "type": "qr_validation_completed",
        "status": "totalmente_pago",
        "from_user_id": customer_id, "to_establishment_id": est_id,
        "offer_id": voucher["for_offer_id"],
        "credits_transferred": credits_reserved, "amount_paid_cash": final_price_to_pay,
        "total_amount": discounted_price,
        "validated_by": validator["name"],
        "created_at": now,
    })
    
    await db.offers.update_one({"offer_id": voucher["for_offer_id"]}, {"$inc": {"sales": 1}})
    await distribute_commissions(customer_id, 2.00, "purchase_commission", voucher["for_offer_id"])
    
    # Increment validator count
    await db.validators.update_one(
        {"validator_id": validator_id}, {"$inc": {"validations_count": 1}}
    )
    
    for key in ["validated_at", "created_at"]:
        if key in sale_record and isinstance(sale_record[key], datetime):
            sale_record[key] = sale_record[key].isoformat()
    
    return {
        "step": "confirmed",
        "success": True,
        "message": "Venda Finalizada com Sucesso!",
        "sale": sale_record,
        "validated_by": validator["name"],
    }

@api_router.post("/v/{est_id}/pending")
async def validator_send_to_cashier(est_id: str, data: dict):
    """Mark voucher as pending (send to cashier for final confirmation)"""
    validator_id = data.get("validator_id")
    voucher_id = data.get("voucher_id")
    
    if not validator_id or not voucher_id:
        raise HTTPException(status_code=400, detail="validator_id e voucher_id obrigatórios")
    
    validator = await db.validators.find_one(
        {"validator_id": validator_id, "establishment_id": est_id}, {"_id": 0}
    )
    if not validator or validator.get("blocked"):
        raise HTTPException(status_code=403, detail="Validador bloqueado")
    
    voucher = await db.vouchers.find_one({"voucher_id": voucher_id}, {"_id": 0})
    if not voucher:
        voucher = await db.qr_codes.find_one({"qr_id": voucher_id}, {"_id": 0})
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher não encontrado")
    if voucher.get("used") or voucher.get("status") == "used":
        raise HTTPException(status_code=400, detail="Voucher já utilizado")
    
    # Mark as pending cashier
    await db.vouchers.update_one(
        {"voucher_id": voucher_id},
        {"$set": {
            "status": "pending_cashier",
            "pending_validator_name": validator["name"],
            "pending_validator_id": validator_id,
            "pending_at": datetime.now(timezone.utc),
        }}
    )
    
    return {
        "success": True,
        "message": f"Enviado ao caixa! QR Code ficará aberto até a confirmação.",
        "status": "pending_cashier",
    }

# Owner management of validators
@api_router.get("/establishments/me/validators")
async def get_my_validators(user: dict = Depends(get_current_user)):
    """Get all validators for the current establishment"""
    est = await db.establishments.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not est:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
    
    validators = await db.validators.find(
        {"establishment_id": est["establishment_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for v in validators:
        if isinstance(v.get("created_at"), datetime):
            v["created_at"] = v["created_at"].isoformat()
    
    return validators

@api_router.put("/establishments/me/validators/{validator_id}/toggle")
async def toggle_validator_block(validator_id: str, user: dict = Depends(get_current_user)):
    """Block/unblock a validator"""
    est = await db.establishments.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not est:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
    
    validator = await db.validators.find_one(
        {"validator_id": validator_id, "establishment_id": est["establishment_id"]},
        {"_id": 0}
    )
    if not validator:
        raise HTTPException(status_code=404, detail="Validador não encontrado")
    
    new_blocked = not validator.get("blocked", False)
    await db.validators.update_one(
        {"validator_id": validator_id},
        {"$set": {"blocked": new_blocked}}
    )
    
    return {"validator_id": validator_id, "blocked": new_blocked}

@api_router.delete("/establishments/me/validators/{validator_id}")
async def delete_validator(validator_id: str, user: dict = Depends(get_current_user)):
    """Delete a validator permanently"""
    est = await db.establishments.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not est:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
    
    result = await db.validators.delete_one(
        {"validator_id": validator_id, "establishment_id": est["establishment_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Validador não encontrado")
    
    return {"message": "Colaborador removido com sucesso"}



# Endpoint to get customer's active vouchers
@api_router.get("/vouchers/my")
async def get_my_vouchers(user: dict = Depends(get_current_user)):
    """Get all active vouchers for the current user (Meus QR screen)"""
    vouchers = await db.vouchers.find(
        {"generated_by_user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich with offer and establishment info, convert datetimes
    for v in vouchers:
        # Convert datetimes to ISO strings
        for key in ["created_at", "expires_at", "used_at"]:
            if key in v and isinstance(v[key], datetime):
                v[key] = v[key].isoformat()
        
        offer = await db.offers.find_one({"offer_id": v.get("for_offer_id")}, {"_id": 0})
        if offer:
            v["offer"] = offer
            establishment = await db.establishments.find_one(
                {"establishment_id": offer.get("establishment_id")}, 
                {"_id": 0, "business_name": 1, "address": 1}
            )
            if establishment:
                v["establishment"] = establishment
    
    return vouchers

@api_router.post("/vouchers/{voucher_id}/cancel")
async def cancel_voucher(voucher_id: str, user: dict = Depends(get_current_user)):
    """Cancel an active voucher and refund credits to the user"""
    voucher = await db.vouchers.find_one(
        {"voucher_id": voucher_id, "generated_by_user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher não encontrado")
    
    if voucher.get("used") or voucher.get("status") == "used":
        raise HTTPException(status_code=400, detail="Voucher já utilizado, não pode ser cancelado")
    
    if voucher.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Voucher já foi cancelado")
    
    now = datetime.now(timezone.utc)
    
    # Mark voucher as cancelled
    await db.vouchers.update_one(
        {"voucher_id": voucher_id},
        {"$set": {"status": "cancelled", "cancelled_at": now}}
    )
    await db.qr_codes.update_one(
        {"qr_id": voucher.get("qr_id", voucher_id)},
        {"$set": {"status": "cancelled", "cancelled_at": now}}
    )
    
    # Refund credits if any were reserved
    credits_to_refund = voucher.get("credits_used", 0) or voucher.get("credits_reserved", 0)
    if credits_to_refund > 0:
        await db.client_credits.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"balance": credits_to_refund}},
            upsert=True
        )
        # Log the refund transaction
        await db.transactions.insert_one({
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "from_user_id": user["user_id"],
            "to_user_id": user["user_id"],
            "amount": credits_to_refund,
            "type": "credit_refund_cancel",
            "related_offer_id": voucher.get("for_offer_id"),
            "voucher_id": voucher_id,
            "description": f"Créditos devolvidos - cancelamento do voucher {voucher.get('backup_code', '')}",
            "created_at": now
        })
    
    return {
        "success": True,
        "message": "Voucher cancelado com sucesso",
        "credits_refunded": credits_to_refund
    }

# Endpoint to get establishment sales history
@api_router.get("/establishments/me/sales-history")
async def get_sales_history(user: dict = Depends(get_current_user)):
    """Get sales history for the establishment (Histórico de Vendas)"""
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not establishment:
        raise HTTPException(status_code=404, detail="No establishment found")
    
    sales = await db.sales_history.find(
        {"establishment_id": establishment["establishment_id"]},
        {"_id": 0}
    ).sort("validated_at", -1).to_list(100)
    
    # Calculate totals
    total_credits_received = sum(s.get("credits_used", 0) for s in sales)
    total_cash_received = sum(s.get("amount_to_pay_cash", 0) for s in sales)
    total_sales = len(sales)
    
    return {
        "sales": sales,
        "summary": {
            "total_sales": total_sales,
            "total_credits_received": total_credits_received,
            "total_cash_to_receive": total_cash_received,
            "withdrawable_balance": establishment.get("withdrawable_balance", 0)
        }
    }

@api_router.get("/qr/my-codes")
async def get_my_qr_codes(user: dict = Depends(get_current_user)):
    """Get user's generated QR codes"""
    qr_codes = await db.qr_codes.find(
        {"generated_by_user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Enrich with offer data
    for qr in qr_codes:
        offer = await db.offers.find_one({"offer_id": qr["for_offer_id"]}, {"_id": 0})
        qr["offer"] = offer
    
    return qr_codes

# ===================== NETWORK & CREDITS ROUTES =====================

@api_router.get("/network")
async def get_my_network(user: dict = Depends(get_current_user)):
    """Get user's referral network and earnings"""
    # Get direct referrals (level 1)
    level1 = await db.referral_network.find(
        {"parent_user_id": user["user_id"], "level": 1},
        {"_id": 0}
    ).to_list(100)
    
    level2 = await db.referral_network.find(
        {"parent_user_id": user["user_id"], "level": 2},
        {"_id": 0}
    ).to_list(100)
    
    level3 = await db.referral_network.find(
        {"parent_user_id": user["user_id"], "level": 3},
        {"_id": 0}
    ).to_list(100)
    
    # Get user details for each referral
    async def get_referral_details(referrals):
        details = []
        for ref in referrals:
            referred_user = await db.users.find_one(
                {"user_id": ref["child_user_id"]},
                {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1, "created_at": 1}
            )
            if referred_user:
                details.append(referred_user)
        return details
    
    level1_users = await get_referral_details(level1)
    level2_users = await get_referral_details(level2)
    level3_users = await get_referral_details(level3)
    
    # Count active users per level (those who made at least 1 purchase)
    async def count_active(users_list):
        active = 0
        for u in users_list:
            has_purchase = await db.token_purchases.find_one(
                {"user_id": u["user_id"], "status": "completed"}
            )
            if has_purchase:
                active += 1
        return active
    
    level1_active = await count_active(level1_users)
    level2_active = await count_active(level2_users)
    level3_active = await count_active(level3_users)
    
    # Credits earned per level from commissions
    async def credits_by_level(level_num):
        pipeline = [
            {"$match": {
                "to_user_id": user["user_id"],
                "type": "purchase_commission",
                "level": level_num,
            }},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        result = await db.transactions.aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0
    
    l1_credits = await credits_by_level(1)
    l2_credits = await credits_by_level(2)
    l3_credits = await credits_by_level(3)
    
    # Establishment referrals
    est_referrals = await db.establishment_referrals.find(
        {"referrer_user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    est_active = 0
    for er in est_referrals:
        est = await db.establishments.find_one(
            {"establishment_id": er.get("establishment_id")},
            {"_id": 0, "total_sales": 1}
        )
        if est and est.get("total_sales", 0) > 0:
            est_active += 1
    
    est_credits_pipeline = [
        {"$match": {
            "to_user_id": user["user_id"],
            "type": "establishment_referral",
        }},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    est_credits_result = await db.transactions.aggregate(est_credits_pipeline).to_list(1)
    est_credits = est_credits_result[0]["total"] if est_credits_result else 0
    
    # Get transactions (commissions earned)
    transactions = await db.transactions.find(
        {"to_user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    total_earned = sum(t.get("amount", 0) for t in transactions)
    
    return {
        "referral_code": user.get("referral_code"),
        "network": {
            "level1": level1_users,
            "level2": level2_users,
            "level3": level3_users
        },
        "network_stats": {
            "level1": {"total": len(level1_users), "active": level1_active, "credits": l1_credits},
            "level2": {"total": len(level2_users), "active": level2_active, "credits": l2_credits},
            "level3": {"total": len(level3_users), "active": level3_active, "credits": l3_credits},
            "establishments": {"total": len(est_referrals), "active": est_active, "credits": est_credits},
        },
        "total_referrals": len(level1_users) + len(level2_users) + len(level3_users),
        "transactions": transactions[:20],
        "total_earned": total_earned
    }

# ===================== ESTABLISHMENT FINANCIAL ROUTES =====================

@api_router.get("/establishments/me/financial")
async def get_establishment_financial(user: dict = Depends(get_current_user)):
    """Get establishment financial summary (withdrawable balance and logs)"""
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not establishment:
        raise HTTPException(status_code=404, detail="No establishment found")
    
    # Get financial logs
    financial_logs = await db.financial_logs.find(
        {"to_establishment_id": establishment["establishment_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Get withdrawal requests
    withdrawal_requests = await db.withdrawal_requests.find(
        {"establishment_id": establishment["establishment_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    
    withdrawable_balance = establishment.get("withdrawable_balance", 0)
    pix_data = establishment.get("pix_data", None)
    
    return {
        "withdrawable_balance": withdrawable_balance,
        "total_sales": establishment.get("total_sales", 0),
        "financial_logs": financial_logs,
        "withdrawal_requests": withdrawal_requests,
        "pix_data": pix_data,
    }


@api_router.get("/establishments/me/reports")
async def get_establishment_reports(
    start_date: str = None,
    end_date: str = None,
    user: dict = Depends(get_current_user)
):
    """Get financial reports for establishment with date filtering"""
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]}, {"_id": 0}
    )
    if not establishment:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
    
    est_id = establishment["establishment_id"]
    
    # Parse dates
    date_filter = {}
    if start_date:
        try:
            sd = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            if sd.tzinfo is None:
                sd = sd.replace(tzinfo=timezone.utc)
            date_filter["$gte"] = sd
        except Exception:
            pass
    if end_date:
        try:
            ed = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            if ed.tzinfo is None:
                ed = ed.replace(tzinfo=timezone.utc)
            # End of day
            ed = ed.replace(hour=23, minute=59, second=59)
            date_filter["$lte"] = ed
        except Exception:
            pass
    
    # Build query
    sales_query = {"establishment_id": est_id, "status": "completed"}
    if date_filter:
        sales_query["validated_at"] = date_filter
    
    # Fetch all sales in period
    sales = await db.sales_history.find(sales_query, {"_id": 0}).sort("validated_at", -1).to_list(1000)
    
    # Serialize datetimes
    for s in sales:
        for key in ["validated_at", "created_at"]:
            if key in s and isinstance(s[key], datetime):
                s[key] = s[key].isoformat()
    
    # ABA 1: Recebimento de Créditos
    total_credits = sum(s.get("credits_used", 0) for s in sales)
    total_cash = sum(s.get("amount_to_pay_cash", 0) for s in sales)
    
    # ABA 2: QR Codes Lidos
    total_qr = len(sales)
    
    # ABA 3: Ofertas Mais Vendidas (top 5)
    offer_counts = {}
    for s in sales:
        oid = s.get("offer_id", "")
        title = s.get("offer_title", "Oferta")
        if oid not in offer_counts:
            offer_counts[oid] = {"offer_id": oid, "offer_title": title, "count": 0, "total_credits": 0, "total_cash": 0}
        offer_counts[oid]["count"] += 1
        offer_counts[oid]["total_credits"] += s.get("credits_used", 0)
        offer_counts[oid]["total_cash"] += s.get("amount_to_pay_cash", 0)
    
    top_offers = sorted(offer_counts.values(), key=lambda x: -x["count"])[:5]
    for o in top_offers:
        o["percentage"] = round((o["count"] / total_qr * 100) if total_qr > 0 else 0, 1)
    
    # ABA 4: Total de Vendas
    total_revenue = total_credits + total_cash
    ticket_medio = round(total_revenue / total_qr, 2) if total_qr > 0 else 0
    first_sale_date = sales[-1].get("validated_at") if sales else None
    last_sale_date = sales[0].get("validated_at") if sales else None
    
    return {
        "credits_received": {
            "total_credits": total_credits,
            "total_cash": total_cash,
            "sales": sales,
        },
        "qr_codes_read": {
            "total": total_qr,
            "sales": sales,
        },
        "top_offers": top_offers,
        "sales_summary": {
            "total_revenue": total_revenue,
            "total_transactions": total_qr,
            "ticket_medio": ticket_medio,
            "first_sale": first_sale_date,
            "last_sale": last_sale_date,
        },
    }


@api_router.put("/establishments/me/pix")
async def update_pix_data(data: dict, user: dict = Depends(get_current_user)):
    """Update establishment PIX data for withdrawals"""
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    if not establishment:
        raise HTTPException(status_code=404, detail="No establishment found")
    
    pix_data = {
        "key_type": data.get("key_type", ""),
        "key": data.get("key", ""),
        "holder_name": data.get("holder_name", ""),
        "bank": data.get("bank", ""),
    }
    
    await db.establishments.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"pix_data": pix_data, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Dados PIX atualizados", "pix_data": pix_data}

@api_router.post("/establishments/me/withdraw")
async def request_withdrawal(data: dict, user: dict = Depends(get_current_user)):
    """Request a withdrawal (establishment side)"""
    establishment = await db.establishments.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    if not establishment:
        raise HTTPException(status_code=404, detail="No establishment found")
    
    amount = float(data.get("amount", 0))
    balance = establishment.get("withdrawable_balance", 0)
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser maior que zero")
    if amount > balance:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")
    
    pix_data = establishment.get("pix_data")
    if not pix_data or not pix_data.get("key"):
        raise HTTPException(status_code=400, detail="Dados PIX não cadastrados. Atualize seu perfil.")
    
    # Check for pending requests
    pending = await db.withdrawal_requests.find_one({
        "establishment_id": establishment["establishment_id"],
        "status": "pending"
    })
    if pending:
        raise HTTPException(status_code=400, detail="Você já possui uma solicitação de saque pendente.")
    
    now = datetime.now(timezone.utc)
    withdrawal_id = f"wd_{uuid.uuid4().hex[:12]}"
    
    withdrawal = {
        "withdrawal_id": withdrawal_id,
        "establishment_id": establishment["establishment_id"],
        "establishment_name": establishment.get("business_name", ""),
        "user_id": user["user_id"],
        "amount": amount,
        "pix_data": pix_data,
        "status": "pending",
        "created_at": now,
    }
    await db.withdrawal_requests.insert_one(withdrawal)
    withdrawal.pop("_id", None)
    
    return {
        "message": "Solicitação de saque enviada! Aguarde a aprovação.",
        "withdrawal_id": withdrawal_id,
        "amount": amount,
        "status": "pending",
    }

@api_router.get("/referral/share-link")
async def get_referral_share_link(request: Request, user: dict = Depends(get_current_user)):
    """Get dynamic referral share link"""
    referral_code = user.get("referral_code")
    
    # Get the base URL dynamically - prioritize the known preview URL
    base_url = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "")
    
    if not base_url:
        # Fallback: try to get from request
        host = request.headers.get("host", "")
        if host:
            # Use https for preview environments
            base_url = f"https://{host}"
    
    # Clean up the URL
    base_url = base_url.replace("/api", "").rstrip("/")
    
    # Handle cluster URLs - convert to public preview URL
    if "cluster-" in base_url and "preview.emergentcf.cloud" in base_url:
        # Extract the job name (e.g., draft-offer-mode)
        import re
        match = re.search(r'(https?://)?([^.]+)\.cluster', base_url)
        if match:
            job_name = match.group(2)
            base_url = f"https://{job_name}.preview.emergentagent.com"
    
    share_link = f"{base_url}?ref={referral_code}"
    
    return {
        "referral_code": referral_code,
        "share_link": share_link,
        "message": f"🎉 Use meu código {referral_code} no iToke e ganhe bônus! {share_link}"
    }

@api_router.get("/credits")
async def get_my_credits(user: dict = Depends(get_current_user)):
    """Get user's credits balance and history"""
    credits = await db.client_credits.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    # Get credit transactions
    transactions = await db.transactions.find(
        {"to_user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {
        "balance": credits.get("balance", 0) if credits else 0,
        "transactions": transactions
    }

@api_router.get("/tokens")
async def get_my_tokens(user: dict = Depends(get_current_user)):
    """Get user's token balance"""
    tokens = await db.client_tokens.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    return {
        "balance": tokens.get("balance", 0) if tokens else 0
    }

# ===================== ADMIN ROUTES =====================

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_current_user)):
    """Get admin dashboard stats with real data"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    total_establishments = await db.establishments.count_documents({})
    total_offers = await db.offers.count_documents({})
    total_sales = await db.sales_history.count_documents({})
    total_transactions = await db.transactions.count_documents({})
    
    # Sum all commissions
    pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    commission_result = await db.transactions.aggregate(pipeline).to_list(1)
    total_commissions = commission_result[0]["total"] if commission_result else 0
    
    # Top 5 establishments by total_sales
    top_establishments_cursor = db.establishments.find(
        {},
        {"_id": 0, "establishment_id": 1, "business_name": 1, "name": 1, "city": 1, "total_sales": 1}
    ).sort("total_sales", -1).limit(5)
    top_establishments_raw = await top_establishments_cursor.to_list(5)
    
    top_establishments = []
    for est in top_establishments_raw:
        sales = est.get("total_sales", 0)
        est_name = est.get("business_name") or est.get("name") or "Sem nome"
        top_establishments.append({
            "establishment_id": est.get("establishment_id", ""),
            "name": est_name,
            "city": est.get("city", "") or "N/A",
            "sales_count": sales,
        })
    
    return {
        "total_users": total_users,
        "total_establishments": total_establishments,
        "total_offers": total_offers,
        "total_sales": total_sales,
        "total_transactions": total_transactions,
        "total_commissions_paid": total_commissions,
        "top_establishments": top_establishments,
    }

@api_router.get("/admin/search-voucher")
async def admin_search_voucher(code: str, user: dict = Depends(get_current_user)):
    """Search voucher by backup_code (ITK-XXXX) for admin audit"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    code_upper = code.strip().upper()
    
    # Search in vouchers collection
    voucher = await db.vouchers.find_one({"backup_code": code_upper}, {"_id": 0})
    if not voucher:
        # Try code_hash as fallback
        voucher = await db.vouchers.find_one({"code_hash": code.strip()}, {"_id": 0})
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher nao encontrado com esse codigo")
    
    # Get customer info
    customer = await db.users.find_one(
        {"user_id": voucher.get("generated_by_user_id")},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1}
    )
    
    # Get offer info
    offer = await db.offers.find_one(
        {"offer_id": voucher.get("for_offer_id")},
        {"_id": 0, "title": 1, "offer_id": 1, "original_price": 1, "discounted_price": 1}
    )
    
    # Get establishment info
    establishment = await db.establishments.find_one(
        {"establishment_id": voucher.get("establishment_id")},
        {"_id": 0, "business_name": 1, "name": 1, "establishment_id": 1, "city": 1}
    )
    
    # Get sale record if exists (voucher was used)
    sale = await db.sales_history.find_one(
        {"voucher_id": voucher.get("voucher_id")},
        {"_id": 0}
    )
    
    # Validated by establishment (who scanned)
    validated_est = None
    validated_est_id = voucher.get("validated_by_establishment_id") or (sale.get("establishment_id") if sale else None)
    if validated_est_id:
        validated_est = await db.establishments.find_one(
            {"establishment_id": validated_est_id},
            {"_id": 0, "business_name": 1, "name": 1, "establishment_id": 1, "city": 1}
        )
    
    credits_used = voucher.get("credits_used", 0) or voucher.get("credits_reserved", 0)
    original_price = voucher.get("original_price") or (offer.get("original_price", 0) if offer else 0)
    discounted_price = voucher.get("discounted_price") or (offer.get("discounted_price", 0) if offer else 0)
    final_price = voucher.get("final_price_to_pay", max(0, discounted_price - credits_used))
    
    return {
        "voucher_id": voucher.get("voucher_id"),
        "backup_code": voucher.get("backup_code"),
        "status": voucher.get("status", "active"),
        "created_at": voucher.get("created_at"),
        "used_at": voucher.get("used_at") or (sale.get("validated_at") if sale else None),
        "customer": {
            "user_id": customer.get("user_id") if customer else None,
            "name": customer.get("name", "Desconhecido") if customer else "Desconhecido",
            "email": customer.get("email") if customer else None,
        },
        "offer": {
            "offer_id": offer.get("offer_id") if offer else None,
            "title": voucher.get("offer_title") or (offer.get("title") if offer else "N/A"),
        },
        "establishment": {
            "name": (establishment.get("business_name") or establishment.get("name", "N/A")) if establishment else "N/A",
            "city": establishment.get("city", "N/A") if establishment else "N/A",
        },
        "validated_by": {
            "name": (validated_est.get("business_name") or validated_est.get("name", "N/A")) if validated_est else None,
            "city": validated_est.get("city", "N/A") if validated_est else None,
        } if validated_est else None,
        "pricing": {
            "original_price": original_price,
            "discounted_price": discounted_price,
            "credits_used": credits_used,
            "final_price_paid": final_price,
        },
    }

@api_router.get("/admin/transactions")
async def get_all_transactions(user: dict = Depends(get_current_user), limit: int = 100):
    """Get all transactions for admin"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    transactions = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    return transactions

@api_router.get("/admin/financial")
async def get_admin_financial(user: dict = Depends(get_current_user)):
    """Get financial summary: gross revenue, net revenue, balance to settle"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Gross Revenue = sum of all token purchases (clients + establishments)
    # Client token purchases
    client_revenue_pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_price"}}}
    ]
    client_rev = await db.token_purchases.aggregate(client_revenue_pipeline).to_list(1)
    client_token_revenue = client_rev[0]["total"] if client_rev else 0
    
    # Establishment token packages
    est_revenue_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$total_price"}}}
    ]
    est_rev = await db.token_packages.aggregate(est_revenue_pipeline).to_list(1)
    est_package_revenue = est_rev[0]["total"] if est_rev else 0
    
    gross_revenue = client_token_revenue + est_package_revenue
    
    # Commissions paid (only actual commission types, not credit usage)
    comm_pipeline = [
        {"$match": {"type": {"$in": [
            "token_package_commission",
            "establishment_referral",
            "purchase_commission"
        ]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    comm_result = await db.transactions.aggregate(comm_pipeline).to_list(1)
    total_commissions = comm_result[0]["total"] if comm_result else 0
    
    net_revenue = gross_revenue - total_commissions
    
    # Balance to settle = sum of all establishments' withdrawable_balance
    settle_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$withdrawable_balance"}}}
    ]
    settle_result = await db.establishments.aggregate(settle_pipeline).to_list(1)
    balance_to_settle = settle_result[0]["total"] if settle_result else 0
    
    return {
        "gross_revenue": gross_revenue,
        "client_token_revenue": client_token_revenue,
        "est_package_revenue": est_package_revenue,
        "total_commissions_paid": total_commissions,
        "net_revenue": net_revenue,
        "balance_to_settle": balance_to_settle,
    }

@api_router.get("/admin/settings")
async def get_admin_settings(user: dict = Depends(get_current_user)):
    """Get platform settings (global commission %, etc.)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings = await db.platform_settings.find_one({"key": "global"}, {"_id": 0})
    if not settings:
        settings = {"key": "global", "commission_percent": 10.0}
        await db.platform_settings.insert_one(settings)
        settings.pop("_id", None)
    
    return settings

@api_router.put("/admin/settings")
async def update_admin_settings(data: dict, user: dict = Depends(get_current_user)):
    """Update platform settings (global commission %)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    commission = data.get("commission_percent")
    if commission is None:
        raise HTTPException(status_code=400, detail="commission_percent obrigatorio")
    
    commission = float(commission)
    if commission < 0 or commission > 100:
        raise HTTPException(status_code=400, detail="Porcentagem deve ser entre 0 e 100")
    
    await db.platform_settings.update_one(
        {"key": "global"},
        {"$set": {
            "commission_percent": commission,
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True
    )
    
    return {"message": "Configuracoes atualizadas", "commission_percent": commission}

# ===================== BRAND SETTINGS =====================

@api_router.get("/admin/brand")
async def get_brand_settings(user: dict = Depends(get_current_user)):
    """Get brand settings (logo, tagline)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings = await db.platform_settings.find_one({"key": "brand"}, {"_id": 0})
    if not settings:
        settings = {
            "key": "brand",
            "logo_url": "",
            "tagline": "Descontos que valem ouro",
        }
        await db.platform_settings.insert_one(settings)
        settings.pop("_id", None)
    return settings

@api_router.put("/admin/brand")
async def update_brand_settings(data: dict, user: dict = Depends(get_current_user)):
    """Update brand settings (logo, tagline)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    if "logo_url" in data:
        update_fields["logo_url"] = data["logo_url"]
    if "tagline" in data:
        update_fields["tagline"] = data["tagline"]
    
    await db.platform_settings.update_one(
        {"key": "brand"},
        {"$set": update_fields},
        upsert=True
    )
    
    updated = await db.platform_settings.find_one({"key": "brand"}, {"_id": 0})
    return updated



# ===================== ADMIN TOKEN PACKAGE CONFIG =====================

@api_router.get("/admin/token-packages")
async def get_token_package_configs(user: dict = Depends(get_current_user)):
    """Get all configured token packages for admin"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    configs = await db.token_package_configs.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return configs

@api_router.post("/admin/token-packages")
async def create_token_package_config(data: dict, user: dict = Depends(get_current_user)):
    """Create a new token package configuration"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    title = data.get("title", "").strip()
    tokens = data.get("tokens")
    bonus = data.get("bonus", 0)
    price = data.get("price")
    active = data.get("active", True)
    
    if not title:
        raise HTTPException(status_code=400, detail="Titulo obrigatorio")
    if not tokens or int(tokens) < 1:
        raise HTTPException(status_code=400, detail="Quantidade de tokens invalida")
    if not price or float(price) <= 0:
        raise HTTPException(status_code=400, detail="Preco invalido")
    
    config_id = f"tpkg_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    config = {
        "config_id": config_id,
        "title": title,
        "tokens": int(tokens),
        "bonus": int(bonus) if bonus else 0,
        "price": round(float(price), 2),
        "active": bool(active),
        "created_by": user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.token_package_configs.insert_one(config)
    config.pop("_id", None)
    return config

@api_router.put("/admin/token-packages/{config_id}")
async def update_token_package_config(config_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a token package configuration"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.token_package_configs.find_one({"config_id": config_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Pacote nao encontrado")
    
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    if "title" in data and data["title"].strip():
        update_fields["title"] = data["title"].strip()
    if "tokens" in data:
        update_fields["tokens"] = int(data["tokens"])
    if "bonus" in data:
        update_fields["bonus"] = int(data["bonus"]) if data["bonus"] else 0
    if "price" in data:
        update_fields["price"] = round(float(data["price"]), 2)
    if "active" in data:
        update_fields["active"] = bool(data["active"])
    
    await db.token_package_configs.update_one(
        {"config_id": config_id},
        {"$set": update_fields}
    )
    
    updated = await db.token_package_configs.find_one({"config_id": config_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/token-packages/{config_id}")
async def delete_token_package_config(config_id: str, user: dict = Depends(get_current_user)):
    """Delete a token package configuration"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.token_package_configs.delete_one({"config_id": config_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pacote nao encontrado")
    return {"message": "Pacote removido com sucesso"}

# ===================== PUBLIC TOKEN PACKAGES =====================

@api_router.get("/token-packages/active")
async def get_active_token_packages():
    """Get all active token packages for clients (no auth required)"""
    configs = await db.token_package_configs.find(
        {"active": True}, {"_id": 0}
    ).sort("price", 1).to_list(50)
    return configs

@api_router.get("/admin/withdrawals")
async def get_pending_withdrawals(user: dict = Depends(get_current_user)):
    """List pending withdrawal requests and establishments with balance"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get pending withdrawal requests
    pending_requests = await db.withdrawal_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Also get establishments with withdrawable_balance > 0
    establishments = await db.establishments.find(
        {"withdrawable_balance": {"$gt": 0}},
        {"_id": 0, "establishment_id": 1, "business_name": 1, "name": 1,
         "withdrawable_balance": 1, "pix_data": 1, "pix_key": 1, "user_id": 1, "city": 1}
    ).to_list(100)
    
    result = []
    for est in establishments:
        est_name = est.get("business_name") or est.get("name") or "Sem nome"
        result.append({
            "establishment_id": est["establishment_id"],
            "name": est_name,
            "city": est.get("city", ""),
            "pix_key": est.get("pix_key"),
            "pix_data": est.get("pix_data"),
            "withdrawable_balance": est.get("withdrawable_balance", 0),
            "user_id": est.get("user_id"),
        })
    
    return {
        "pending_requests": pending_requests,
        "establishments_with_balance": result
    }

@api_router.post("/admin/withdrawals/approve")
async def approve_withdrawal(data: dict, user: dict = Depends(get_current_user)):
    """Approve a withdrawal: deduct balance, log audit"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    est_id = data.get("establishment_id")
    amount = data.get("amount")
    
    if not est_id or amount is None:
        raise HTTPException(status_code=400, detail="establishment_id e amount obrigatorios")
    
    amount = float(amount)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser maior que zero")
    
    establishment = await db.establishments.find_one(
        {"establishment_id": est_id},
        {"_id": 0}
    )
    if not establishment:
        raise HTTPException(status_code=404, detail="Estabelecimento nao encontrado")
    
    current_balance = establishment.get("withdrawable_balance", 0)
    if amount > current_balance:
        raise HTTPException(status_code=400, detail="Valor maior que saldo disponivel")
    
    now = datetime.now(timezone.utc)
    
    # Deduct balance
    await db.establishments.update_one(
        {"establishment_id": est_id},
        {"$inc": {"withdrawable_balance": -amount}}
    )
    
    # Create withdrawal record
    withdrawal_id = f"wd_{uuid.uuid4().hex[:12]}"
    withdrawal = {
        "withdrawal_id": withdrawal_id,
        "establishment_id": est_id,
        "establishment_name": establishment.get("business_name") or establishment.get("name", ""),
        "amount": amount,
        "pix_key": establishment.get("pix_key"),
        "status": "paid",
        "approved_by": user["user_id"],
        "approved_at": now,
        "created_at": now,
    }
    await db.withdrawal_requests.insert_one(withdrawal)
    withdrawal.pop("_id", None)
    
    # Audit log
    audit = {
        "log_id": f"audit_{uuid.uuid4().hex[:12]}",
        "type": "withdrawal_approved",
        "establishment_id": est_id,
        "amount": amount,
        "approved_by_admin": user["user_id"],
        "withdrawal_id": withdrawal_id,
        "created_at": now,
    }
    await db.financial_logs.insert_one(audit)
    
    return {
        "message": "Saque aprovado com sucesso",
        "withdrawal_id": withdrawal_id,
        "amount": amount,
        "new_balance": current_balance - amount,
    }

@api_router.get("/admin/users")
async def get_admin_users(user: dict = Depends(get_current_user)):
    """List all users for admin management"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find(
        {},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "role": 1,
         "blocked": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(500)
    
    result = []
    for u in users:
        result.append({
            "user_id": u["user_id"],
            "name": u.get("name", ""),
            "email": u.get("email", ""),
            "role": u.get("role", "client"),
            "blocked": u.get("blocked", False) or False,
            "created_at": u.get("created_at"),
        })
    
    return result

@api_router.put("/admin/users/{user_id}/block")
async def toggle_block_user(user_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Block or unblock a user"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    blocked = data.get("blocked")
    if blocked is None:
        raise HTTPException(status_code=400, detail="Campo 'blocked' obrigatorio")
    
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0, "user_id": 1, "role": 1})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Nao e possivel bloquear um admin")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"blocked": bool(blocked)}}
    )
    
    return {
        "message": f"Usuario {'bloqueado' if blocked else 'desbloqueado'}",
        "user_id": user_id,
        "blocked": bool(blocked),
    }

# ===================== MEDIA MANAGEMENT =====================

@api_router.get("/media")
async def get_public_media():
    """Get all media assets for clients to view/download"""
    media = await db.media_assets.find(
        {"active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return media

# ===================== HELP TOPICS (FAQ) =====================

@api_router.get("/help-topics")
async def get_public_help_topics():
    """Get all help topics for clients (public)"""
    topics = await db.help_topics.find(
        {}, {"_id": 0}
    ).sort("order", 1).to_list(100)
    return topics

@api_router.get("/help-settings")
async def get_help_settings():
    """Get help page settings (support email)"""
    settings = await db.platform_settings.find_one(
        {"key": "help_settings"}, {"_id": 0}
    )
    return settings or {"key": "help_settings", "support_email": "suporte@itoke.com.br"}

@api_router.get("/admin/help-topics")
async def get_admin_help_topics(user: dict = Depends(get_current_user)):
    """Get all help topics for admin management"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    topics = await db.help_topics.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return topics

@api_router.post("/admin/help-topics")
async def create_help_topic(data: dict, user: dict = Depends(get_current_user)):
    """Create a new help topic"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    title = data.get("title", "").strip()
    content = data.get("content", "").strip()
    icon = data.get("icon", "help-circle-outline").strip()
    order = data.get("order", 0)
    
    if not title:
        raise HTTPException(status_code=400, detail="Titulo obrigatorio")
    if not content:
        raise HTTPException(status_code=400, detail="Conteudo obrigatorio")
    
    topic_id = f"help_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    # If no order specified, put at end
    if not order:
        count = await db.help_topics.count_documents({})
        order = count + 1
    
    topic = {
        "topic_id": topic_id,
        "title": title,
        "content": content,
        "icon": icon,
        "order": int(order),
        "created_at": now,
        "updated_at": now,
    }
    await db.help_topics.insert_one(topic)
    topic.pop("_id", None)
    return topic

@api_router.put("/admin/help-topics/{topic_id}")
async def update_help_topic(topic_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a help topic"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.help_topics.find_one({"topic_id": topic_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Topico nao encontrado")
    
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    if "title" in data and data["title"].strip():
        update_fields["title"] = data["title"].strip()
    if "content" in data and data["content"].strip():
        update_fields["content"] = data["content"].strip()
    if "icon" in data:
        update_fields["icon"] = data["icon"].strip() or "help-circle-outline"
    if "order" in data:
        update_fields["order"] = int(data["order"])
    
    await db.help_topics.update_one({"topic_id": topic_id}, {"$set": update_fields})
    updated = await db.help_topics.find_one({"topic_id": topic_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/help-topics/{topic_id}")
async def delete_help_topic(topic_id: str, user: dict = Depends(get_current_user)):
    """Delete a help topic"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.help_topics.delete_one({"topic_id": topic_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Topico nao encontrado")
    return {"message": "Topico removido com sucesso"}

@api_router.get("/admin/help-settings")
async def get_admin_help_settings(user: dict = Depends(get_current_user)):
    """Get help settings for admin"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    settings = await db.platform_settings.find_one({"key": "help_settings"}, {"_id": 0})
    return settings or {"key": "help_settings", "support_email": "suporte@itoke.com.br"}

@api_router.put("/admin/help-settings")
async def update_admin_help_settings(data: dict, user: dict = Depends(get_current_user)):
    """Update help settings (support email)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    support_email = data.get("support_email", "").strip()
    if not support_email:
        raise HTTPException(status_code=400, detail="Email obrigatorio")
    
    await db.platform_settings.update_one(
        {"key": "help_settings"},
        {"$set": {"support_email": support_email, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Configuracoes de ajuda atualizadas", "support_email": support_email}

@api_router.get("/admin/media")
async def get_admin_media(user: dict = Depends(get_current_user)):
    """Get all media assets for admin management"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    media = await db.media_assets.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return media

@api_router.post("/admin/media")
async def add_media(data: dict, user: dict = Depends(get_current_user)):
    """Add a new media asset (URL-based or base64 upload)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    url = data.get("url", "").strip()
    base64_data = data.get("base64_data", "").strip()
    title = data.get("title", "").strip()
    media_type = data.get("type", "image")  # image or video
    
    if not url and not base64_data:
        raise HTTPException(status_code=400, detail="URL ou arquivo obrigatorio")
    
    media_id = f"media_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    # If base64 data was uploaded, store it as the URL (data URI)
    final_url = url
    if base64_data:
        # base64_data already includes the data:image/... prefix
        final_url = base64_data
    
    asset = {
        "media_id": media_id,
        "url": final_url,
        "title": title or "Midia iToke",
        "type": media_type,
        "active": True,
        "ai_generated": False,
        "created_by": user["user_id"],
        "created_at": now,
    }
    await db.media_assets.insert_one(asset)
    asset.pop("_id", None)
    
    return asset

@api_router.delete("/admin/media/{media_id}")
async def delete_media(media_id: str, user: dict = Depends(get_current_user)):
    """Delete a media asset"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.media_assets.delete_one({"media_id": media_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Midia nao encontrada")
    
    return {"message": "Midia removida", "media_id": media_id}

@api_router.post("/admin/media/generate-image")
async def generate_media_image(data: dict, user: dict = Depends(get_current_user)):
    """Generate an image using AI based on a theme/prompt"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    prompt = data.get("prompt", "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt/tema obrigatorio")
    
    import base64
    from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Chave de API nao configurada")
    
    image_gen = OpenAIImageGeneration(api_key=api_key)
    
    full_prompt = f"Create a professional marketing image for a loyalty/discount app called iToke. Theme: {prompt}. Style: modern, clean, vibrant colors, suitable for social media sharing."
    
    images = await image_gen.generate_images(
        prompt=full_prompt,
        model="gpt-image-1",
        number_of_images=1
    )
    
    if not images or len(images) == 0:
        raise HTTPException(status_code=500, detail="Falha ao gerar imagem")
    
    image_base64 = base64.b64encode(images[0]).decode('utf-8')
    
    # Save as media asset with base64 data URI
    media_id = f"media_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    data_uri = f"data:image/png;base64,{image_base64}"
    
    asset = {
        "media_id": media_id,
        "url": data_uri,
        "title": data.get("title", prompt[:50]),
        "type": "image",
        "active": True,
        "ai_generated": True,
        "prompt": prompt,
        "created_by": user["user_id"],
        "created_at": now,
    }
    await db.media_assets.insert_one(asset)
    asset.pop("_id", None)
    
    return asset

@api_router.post("/admin/media/generate-text")
async def generate_engagement_text(data: dict, user: dict = Depends(get_current_user)):
    """Generate engagement text using AI"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    theme = data.get("theme", "").strip()
    
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Chave de API nao configurada")
    
    chat = LlmChat(
        api_key=api_key,
        session_id=f"admin_text_{uuid.uuid4().hex[:8]}",
        system_message="Voce e um copywriter especialista em marketing digital para apps de fidelidade e descontos. Escreva textos curtos, persuasivos e engajadores em portugues brasileiro. Maximo 2 frases. Nao use emojis. Nao use aspas."
    )
    
    prompt_text = f"Crie um titulo de engajamento para uma midia de divulgacao do app iToke (app de fidelidade e descontos)."
    if theme:
        prompt_text += f" Tema: {theme}"
    
    user_msg = UserMessage(text=prompt_text)
    response = await chat.send_message(user_msg)
    
    return {"text": response.strip()}

class EmailLoginRequest(BaseModel):
    email: str
    name: str
    role: str = "client"  # client or establishment
    referral_code_used: Optional[str] = None

@api_router.post("/auth/email-login")
async def email_login(data: EmailLoginRequest, response: Response):
    """Login with email only (no password) for testing purposes"""
    # Check if user exists
    existing_user = await db.users.find_one(
        {"email": data.email},
        {"_id": 0}
    )
    
    is_new_user = False
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update name if changed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.name, "role": data.role}}
        )
        
        # If existing user has no referrer and a referral code is provided, apply it
        if data.referral_code_used and not existing_user.get("referred_by_id"):
            logger.info(f"Applying referral code {data.referral_code_used} to existing user {user_id}")
            await process_referral(user_id, data.referral_code_used)
    else:
        is_new_user = True
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        referral_code = generate_referral_code(user_id)
        new_user = {
            "user_id": user_id,
            "email": data.email,
            "name": data.name,
            "picture": None,
            "role": data.role,
            "referral_code": referral_code,
            "referred_by_id": None,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(new_user)
        
        # Initialize tokens and credits
        await db.client_tokens.insert_one({
            "user_id": user_id,
            "balance": 5
        })
        await db.client_credits.insert_one({
            "user_id": user_id,
            "balance": 0.0
        })
        
        # Process referral code if provided
        if data.referral_code_used:
            logger.info(f"Processing referral code {data.referral_code_used} for new user {user_id}")
            await process_referral(user_id, data.referral_code_used)
    
    # Create session
    session_token = f"email_session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=180)
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=180 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    tokens = await db.client_tokens.find_one({"user_id": user_id}, {"_id": 0})
    credits = await db.client_credits.find_one({"user_id": user_id}, {"_id": 0})
    user["tokens"] = tokens.get("balance", 0) if tokens else 5
    user["credits"] = credits.get("balance", 0.0) if credits else 0.0
    
    if user.get("role") == "establishment":
        establishment = await db.establishments.find_one(
            {"user_id": user_id}, {"_id": 0}
        )
        user["establishment"] = establishment
    
    return {"user": user, "session_token": session_token}

# ===================== SEED DATA =====================

@api_router.post("/seed")
async def seed_data(force: bool = False):
    """Seed the database with test data"""
    # Check if already seeded
    existing = await db.establishments.count_documents({})
    if existing > 0 and not force:
        return {"message": "Database already seeded", "establishments": existing}
    
    if force:
        # Clear existing data
        await db.establishments.delete_many({})
        await db.offers.delete_many({})
    
    # Create establishment users and their establishments
    establishments_data = [
        {
            "business_name": "Pizzaria Napoli",
            "address": "Rua das Flores, 123",
            "city": "São Paulo",
            "neighborhood": "Vila Madalena",
            "category": "food",
            "about": "A melhor pizza artesanal de São Paulo desde 1998. Massa feita na hora com ingredientes importados da Itália.",
            "social_links": {"instagram": "@pizzarianapoli", "whatsapp": "11999998888"},
            "latitude": -23.5505,
            "longitude": -46.6333,
            "offers": [
                {
                    "title": "Pizza Grande Margherita",
                    "description": "Pizza artesanal com molho de tomate San Marzano",
                    "detailed_description": "Pizza de 35cm feita com massa fermentada por 72h, molho de tomate San Marzano importado, mozzarella di bufala e manjericão fresco. Serve até 3 pessoas.",
                    "rules": "Válido de segunda a quinta. Não acumulável com outras promoções. Consumo no local ou retirada.",
                    "image_url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
                    "discount_value": 45,
                    "original_price": 69.90,
                    "valid_days": "Seg a Qui",
                    "valid_hours": "18h às 23h",
                    "delivery_allowed": False,
                    "dine_in_only": True,
                },
                {
                    "title": "Combo Pizza + Bebida",
                    "description": "Pizza média + refrigerante 2L",
                    "detailed_description": "Escolha qualquer pizza média do cardápio + refrigerante 2L (Coca-Cola, Guaraná ou Fanta).",
                    "rules": "Válido todos os dias. Apenas delivery pelo app.",
                    "image_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
                    "discount_value": 30,
                    "original_price": 55.90,
                    "valid_days": "Todos os dias",
                    "valid_hours": "11h às 23h",
                    "delivery_allowed": True,
                    "dine_in_only": False,
                }
            ]
        },
        {
            "business_name": "Burger House Premium",
            "address": "Av. Paulista, 1500",
            "city": "São Paulo",
            "neighborhood": "Bela Vista",
            "category": "food",
            "about": "Hambúrgueres artesanais com blend exclusivo de carnes nobres. Ambiente descolado e cerveja artesanal.",
            "social_links": {"instagram": "@burgerhousepremium", "whatsapp": "11988887777"},
            "latitude": -23.5613,
            "longitude": -46.6565,
            "offers": [
                {
                    "title": "Smash Burger Duplo",
                    "description": "Dois smash burgers 100g com cheddar",
                    "detailed_description": "2 hambúrgueres smash de 100g cada, queijo cheddar inglês derretido, cebola caramelizada, pickles artesanais e molho especial da casa no pão brioche.",
                    "rules": "Válido de terça a domingo. Consumo local ou take-away. Não inclui acompanhamentos.",
                    "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
                    "discount_value": 50,
                    "original_price": 45.90,
                    "valid_days": "Ter a Dom",
                    "valid_hours": "12h às 22h",
                    "delivery_allowed": False,
                    "dine_in_only": True,
                },
                {
                    "title": "Combo Família Burger",
                    "description": "4 burgers + batata grande + milk shakes",
                    "detailed_description": "4 classic burgers (hambúrguer, queijo, alface, tomate), 1 batata frita grande e 4 milk shakes à escolha.",
                    "rules": "Válido sexta a domingo. Pedido mínimo para delivery.",
                    "image_url": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80",
                    "discount_value": 35,
                    "original_price": 129.90,
                    "valid_days": "Sex a Dom",
                    "valid_hours": "12h às 21h",
                    "delivery_allowed": True,
                    "dine_in_only": False,
                }
            ]
        },
        {
            "business_name": "Salão Beleza Pura",
            "address": "Rua Augusta, 890",
            "city": "São Paulo",
            "neighborhood": "Consolação",
            "category": "beauty",
            "about": "Salão especializado em coloração e tratamentos capilares. Profissionais com mais de 15 anos de experiência.",
            "social_links": {"instagram": "@belezapura", "whatsapp": "11977776666"},
            "latitude": -23.5535,
            "longitude": -46.6545,
            "offers": [
                {
                    "title": "Corte + Escova Modeladora",
                    "description": "Corte profissional + escova completa",
                    "detailed_description": "Corte personalizado com profissional sênior + escova modeladora com produtos L'Oréal Professionnel. Inclui lavagem e finalização.",
                    "rules": "Válido de segunda a quarta. Necessário agendamento prévio. Sujeito a disponibilidade.",
                    "image_url": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
                    "discount_value": 40,
                    "original_price": 120.00,
                    "valid_days": "Seg a Qua",
                    "valid_hours": "9h às 18h",
                    "delivery_allowed": False,
                    "dine_in_only": True,
                }
            ]
        },
        {
            "business_name": "Academia FitLife",
            "address": "Rua Oscar Freire, 500",
            "city": "São Paulo",
            "neighborhood": "Pinheiros",
            "category": "fitness",
            "about": "Academia completa com musculação, crossfit, yoga e natação. Equipamentos de última geração importados.",
            "social_links": {"instagram": "@fitlife_sp", "whatsapp": "11966665555"},
            "latitude": -23.5620,
            "longitude": -46.6700,
            "offers": [
                {
                    "title": "Plano Mensal com 55% OFF",
                    "description": "Acesso total à academia por 1 mês",
                    "detailed_description": "Plano mensal com acesso ilimitado a todas as modalidades: musculação, crossfit, yoga, pilates e natação. Inclui avaliação física e 1 sessão com personal trainer.",
                    "rules": "Válido para novos alunos. Apenas primeira mensalidade com desconto. Necessário documento com foto.",
                    "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
                    "discount_value": 55,
                    "original_price": 199.90,
                    "valid_days": "Todos os dias",
                    "valid_hours": "6h às 23h",
                    "delivery_allowed": False,
                    "dine_in_only": True,
                }
            ]
        },
        {
            "business_name": "Sushi Express Tokyo",
            "address": "Rua Liberdade, 300",
            "city": "São Paulo",
            "neighborhood": "Liberdade",
            "category": "food",
            "about": "Sushi bar com peixes frescos selecionados diariamente no CEAGESP. Chef japonês com 20 anos de experiência.",
            "social_links": {"instagram": "@sushiexpresstokyo", "whatsapp": "11955554444"},
            "latitude": -23.5580,
            "longitude": -46.6350,
            "offers": [
                {
                    "title": "Rodízio de Sushi Premium",
                    "description": "Rodízio completo com mais de 40 opções",
                    "detailed_description": "Rodízio all-you-can-eat com sashimis, nigiris, temakis, hot rolls e pratos quentes. Inclui missoshiro e sobremesa. Mais de 40 itens no cardápio.",
                    "rules": "Válido de segunda a quinta no jantar. Permanência máxima 2h. Não inclui bebidas.",
                    "image_url": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80",
                    "discount_value": 38,
                    "original_price": 89.90,
                    "valid_days": "Seg a Qui",
                    "valid_hours": "19h às 23h",
                    "delivery_allowed": False,
                    "dine_in_only": True,
                }
            ]
        },
        {
            "business_name": "Auto Center Turbo",
            "address": "Av. Brasil, 2000",
            "city": "Rio de Janeiro",
            "neighborhood": "Centro",
            "category": "auto",
            "about": "Centro automotivo completo com mecânica, funilaria e pintura. Garantia de 6 meses em todos os serviços.",
            "social_links": {"instagram": "@autoturbo_rj", "whatsapp": "21944443333"},
            "latitude": -22.9068,
            "longitude": -43.1729,
            "offers": [
                {
                    "title": "Troca de Óleo + Filtro",
                    "description": "Óleo sintético 5W30 + filtro original",
                    "detailed_description": "Troca de óleo sintético 5W30 (4 litros) + filtro de óleo original do fabricante. Inclui verificação de 15 pontos do veículo gratuitamente.",
                    "rules": "Válido para veículos leves. Agendamento obrigatório. Não inclui veículos diesel.",
                    "image_url": "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&q=80",
                    "discount_value": 42,
                    "original_price": 189.90,
                    "valid_days": "Seg a Sáb",
                    "valid_hours": "8h às 18h",
                    "delivery_allowed": False,
                    "dine_in_only": True,
                }
            ]
        },
        {
            "business_name": "Café & Brunch Jardim",
            "address": "Rua dos Jardins, 45",
            "city": "Rio de Janeiro",
            "neighborhood": "Leblon",
            "category": "food",
            "about": "Cafeteria artesanal com grãos especiais torrados na casa. Brunch completo aos finais de semana.",
            "social_links": {"instagram": "@cafejardim_rj", "whatsapp": "21933332222"},
            "latitude": -22.9849,
            "longitude": -43.2240,
            "offers": [
                {
                    "title": "Brunch Completo para 2",
                    "description": "Brunch com panquecas, ovos, frutas e café",
                    "detailed_description": "Brunch para 2 pessoas: panquecas com maple syrup, ovos benedict, tábua de frutas frescas, torradas com manteiga artesanal, suco natural e 2 cafés especiais.",
                    "rules": "Válido sábados e domingos das 9h às 14h. Reserva recomendada. Não acumulável.",
                    "image_url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
                    "discount_value": 32,
                    "original_price": 139.90,
                    "valid_days": "Sáb e Dom",
                    "valid_hours": "9h às 14h",
                    "delivery_allowed": False,
                    "dine_in_only": True,
                }
            ]
        },
    ]
    
    created_establishments = []
    created_offers = []
    
    for est_data in establishments_data:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        referral_code = generate_referral_code(user_id)
        
        # Create user for establishment
        user = {
            "user_id": user_id,
            "email": f"{est_data['business_name'].lower().replace(' ', '.')}@itoke.demo",
            "name": est_data["business_name"],
            "picture": None,
            "role": "establishment",
            "referral_code": referral_code,
            "referred_by_id": None,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user)
        
        await db.client_tokens.insert_one({"user_id": user_id, "balance": 0})
        await db.client_credits.insert_one({"user_id": user_id, "balance": 0.0})
        
        establishment_id = f"est_{uuid.uuid4().hex[:12]}"
        establishment = {
            "establishment_id": establishment_id,
            "user_id": user_id,
            "business_name": est_data["business_name"],
            "address": est_data["address"],
            "city": est_data.get("city", ""),
            "neighborhood": est_data.get("neighborhood", ""),
            "category": est_data["category"],
            "about": est_data.get("about"),
            "social_links": est_data.get("social_links"),
            "latitude": est_data.get("latitude"),
            "longitude": est_data.get("longitude"),
            "token_balance": 50,
            "total_sales": 0,
            "total_views": 0,
            "first_offer_free": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db.establishments.insert_one(establishment)
        created_establishments.append(est_data["business_name"])
        
        # Create offers
        for offer_data in est_data.get("offers", []):
            offer_id = f"offer_{uuid.uuid4().hex[:12]}"
            discounted_price = offer_data["original_price"] * (1 - offer_data["discount_value"] / 100)
            
            offer = {
                "offer_id": offer_id,
                "establishment_id": establishment_id,
                "title": offer_data["title"],
                "description": offer_data.get("description"),
                "detailed_description": offer_data.get("detailed_description"),
                "rules": offer_data.get("rules"),
                "image_url": offer_data.get("image_url"),
                "discount_value": offer_data["discount_value"],
                "original_price": offer_data["original_price"],
                "discounted_price": round(discounted_price, 2),
                "valid_days": offer_data.get("valid_days"),
                "valid_hours": offer_data.get("valid_hours"),
                "delivery_allowed": offer_data.get("delivery_allowed", False),
                "dine_in_only": offer_data.get("dine_in_only", False),
                "validity_date": offer_data.get("validity_date"),
                "active": True,
                "views": 0,
                "qr_generated": 0,
                "sales": 0,
                "created_at": datetime.now(timezone.utc)
            }
            await db.offers.insert_one(offer)
            created_offers.append(offer_data["title"])
    
    return {
        "message": "Seed data created successfully",
        "establishments": created_establishments,
        "offers": created_offers
    }

# ===================== CLIENT TOKEN PURCHASE =====================

@api_router.post("/tokens/purchase")
async def client_purchase_tokens(data: ClientTokenPurchase, user: dict = Depends(get_current_user)):
    """Purchase token packages for client - supports dynamic packages"""
    
    # If a dynamic package_config_id is provided, use it
    if data.package_config_id:
        config = await db.token_package_configs.find_one(
            {"config_id": data.package_config_id, "active": True},
            {"_id": 0}
        )
        if not config:
            raise HTTPException(status_code=404, detail="Pacote nao encontrado ou inativo")
        
        total_tokens = config["tokens"] + config.get("bonus", 0)
        total_price = config["price"]
        package_title = config["title"]
    else:
        # Legacy fallback: fixed 7 tokens per R$7 package
        if data.packages < 1 or data.packages > 100:
            raise HTTPException(status_code=400, detail="Quantidade invalida.")
        total_tokens = data.packages * 7
        total_price = data.packages * 7.00
        package_title = f"{data.packages} pacote(s) de 7 tokens"
    
    purchase_id = f"purchase_{uuid.uuid4().hex[:12]}"
    
    # Record the purchase
    purchase = {
        "purchase_id": purchase_id,
        "user_id": user["user_id"],
        "package_config_id": data.package_config_id,
        "package_title": package_title,
        "total_tokens": total_tokens,
        "total_price": total_price,
        "status": "completed",
        "created_at": datetime.now(timezone.utc)
    }
    await db.token_purchases.insert_one(purchase)
    
    # Add tokens to client balance
    await db.client_tokens.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"balance": total_tokens}},
        upsert=True
    )
    
    # Distribute commissions: R$1 per level (3 levels) = R$3 per sale
    # This is FIXED regardless of package price
    await distribute_commissions(
        user["user_id"],
        total_price,
        "token_package_commission",
        purchase_id,
        packages_qty=1  # Always 1 package = R$3 total commission
    )
    
    # Get updated balance
    token_doc = await db.client_tokens.find_one({"user_id": user["user_id"]}, {"_id": 0})
    new_balance = token_doc.get("balance", 0) if token_doc else total_tokens
    
    return {
        "message": "Compra realizada! Seus tokens foram adicionados e as comissoes de sua rede foram distribuidas.",
        "purchase_id": purchase_id,
        "tokens_added": total_tokens,
        "total_price": total_price,
        "new_balance": new_balance,
    }

# ===================== CATEGORIES =====================

@api_router.get("/categories")
async def get_categories():
    """Get available establishment categories"""
    return [
        {"id": "food", "name": "Alimentação", "icon": "restaurant-outline"},
        {"id": "beauty", "name": "Beleza", "icon": "color-palette-outline"},
        {"id": "health", "name": "Saúde", "icon": "medkit-outline"},
        {"id": "entertainment", "name": "Entretenimento", "icon": "game-controller-outline"},
        {"id": "fitness", "name": "Fitness", "icon": "barbell-outline"},
        {"id": "inn", "name": "Pousada", "icon": "bed-outline"},
        {"id": "hotel", "name": "Hotel", "icon": "business-outline"},
        {"id": "petshop", "name": "Petshop", "icon": "paw-outline"},
        {"id": "vet", "name": "Veterinário", "icon": "heart-outline"},
        {"id": "services", "name": "Serviços", "icon": "construct-outline"},
        {"id": "retail", "name": "Varejo", "icon": "storefront-outline"},
        {"id": "education", "name": "Educação", "icon": "school-outline"},
        {"id": "auto", "name": "Automotivo", "icon": "car-outline"},
        {"id": "other", "name": "Outros", "icon": "grid-outline"}
    ]

# ===================== HEALTH CHECK =====================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.post("/admin/repair-referrals")
async def repair_referral_network(user: dict = Depends(get_current_user)):
    """Repair corrupted referral network data (self-referrals, duplicates)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    fixes = []
    
    # 1. Fix self-referrals in users
    self_refs = await db.users.find(
        {"$expr": {"$eq": ["$user_id", "$referred_by_id"]}},
        {"_id": 0, "user_id": 1, "name": 1}
    ).to_list(100)
    
    for u in self_refs:
        await db.users.update_one(
            {"user_id": u["user_id"]},
            {"$set": {"referred_by_id": None}}
        )
        fixes.append(f"Removida auto-referencia de {u.get('name', u['user_id'])}")
    
    # 2. Remove circular referral_network entries (parent == child)
    circular = await db.referral_network.delete_many(
        {"$expr": {"$eq": ["$parent_user_id", "$child_user_id"]}}
    )
    if circular.deleted_count > 0:
        fixes.append(f"Removidas {circular.deleted_count} entradas circulares na rede")
    
    # 3. Remove duplicate referral_network entries (same parent+child, different levels)
    all_refs = await db.referral_network.find({}, {"_id": 1, "parent_user_id": 1, "child_user_id": 1, "level": 1}).to_list(10000)
    seen = {}
    duplicates_removed = 0
    for ref in all_refs:
        key = f"{ref['parent_user_id']}_{ref['child_user_id']}"
        if key in seen:
            # Keep the lower level, remove the higher
            await db.referral_network.delete_one({"_id": ref["_id"]})
            duplicates_removed += 1
        else:
            seen[key] = ref["level"]
    
    if duplicates_removed > 0:
        fixes.append(f"Removidas {duplicates_removed} entradas duplicadas")
    
    # 4. Rebuild missing referral_network entries for all users with referred_by_id
    users_with_refs = await db.users.find(
        {"referred_by_id": {"$ne": None}},
        {"_id": 0, "user_id": 1, "referred_by_id": 1}
    ).to_list(10000)
    
    rebuilt = 0
    for u in users_with_refs:
        child_id = u["user_id"]
        referrer_id = u["referred_by_id"]
        
        # Skip self-referrals (already fixed above, but just in case)
        if child_id == referrer_id:
            continue
        
        # Check if level 1 exists
        existing = await db.referral_network.find_one(
            {"child_user_id": child_id, "level": 1}
        )
        if not existing:
            await db.referral_network.insert_one({
                "parent_user_id": referrer_id,
                "child_user_id": child_id,
                "level": 1
            })
            rebuilt += 1
        
        # Check level 2
        referrer = await db.users.find_one({"user_id": referrer_id}, {"_id": 0, "referred_by_id": 1})
        if referrer and referrer.get("referred_by_id") and referrer["referred_by_id"] != child_id and referrer["referred_by_id"] != referrer_id:
            level2_id = referrer["referred_by_id"]
            existing2 = await db.referral_network.find_one(
                {"child_user_id": child_id, "parent_user_id": level2_id}
            )
            if not existing2:
                await db.referral_network.insert_one({
                    "parent_user_id": level2_id,
                    "child_user_id": child_id,
                    "level": 2
                })
                rebuilt += 1
            
            # Check level 3
            level2_user = await db.users.find_one({"user_id": level2_id}, {"_id": 0, "referred_by_id": 1})
            if level2_user and level2_user.get("referred_by_id"):
                level3_id = level2_user["referred_by_id"]
                if level3_id != child_id and level3_id != referrer_id and level3_id != level2_id:
                    existing3 = await db.referral_network.find_one(
                        {"child_user_id": child_id, "parent_user_id": level3_id}
                    )
                    if not existing3:
                        await db.referral_network.insert_one({
                            "parent_user_id": level3_id,
                            "child_user_id": child_id,
                            "level": 3
                        })
                        rebuilt += 1
    
    if rebuilt > 0:
        fixes.append(f"Reconstruidas {rebuilt} entradas na rede de indicacoes")
    
    return {
        "message": "Reparo concluido",
        "fixes": fixes,
        "total_fixes": len(fixes)
    }

@api_router.post("/admin/reset-database")
async def reset_database(request: Request):
    """Reset all user data for clean testing. Requires admin_key."""
    body = await request.json()
    admin_key = body.get("admin_key", "")
    
    if admin_key != "admin123":
        raise HTTPException(status_code=403, detail="Chave de admin inválida")
    
    # Drop all user-related collections
    collections_to_clear = [
        "users",
        "sessions",
        "referral_network",
        "client_tokens",
        "client_credits",
        "transactions",
        "token_purchases",
        "qr_codes",
        "establishments",
        "establishment_referrals",
        "token_packages",
    ]
    
    results = {}
    for col_name in collections_to_clear:
        result = await db[col_name].delete_many({})
        results[col_name] = result.deleted_count
    
    logger.info(f"Database reset completed: {results}")
    
    return {
        "message": "Banco de dados limpo com sucesso!",
        "deleted_counts": results,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ==================== AI IMAGE GENERATION ====================
@api_router.post("/generate-image", response_model=ImageGenerationResponse)
async def generate_image(request: ImageGenerationRequest):
    try:
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="API key not configured")
        
        session_id = str(uuid.uuid4())
        chat = LlmChat(api_key=api_key, session_id=session_id, system_message="You are a helpful AI assistant that generates images")
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        
        msg = UserMessage(text=request.prompt)
        text, images = await chat.send_message_multimodal_response(msg)
        
        if not images or len(images) == 0:
            raise HTTPException(status_code=500, detail="Failed to generate image")
        
        return ImageGenerationResponse(
            image_base64=images[0]['data'],
            text_response=text
        )
    except Exception as e:
        logging.error(f"Image generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

# Include the router
app.include_router(api_router)

# Callback route for OAuth (outside /api prefix)
@app.get("/callback")
async def oauth_callback():
    """Serve the OAuth callback HTML page"""
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=CALLBACK_HTML)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


@app.on_event("startup")
async def startup_seed_help():
    """Seed help topics if collection is empty"""
    count = await db.help_topics.count_documents({})
    if count == 0:
        default_topics = [
            {
                "topic_id": "help_seed_01",
                "title": "O que sao Tokens?",
                "content": "Tokens sao a moeda do iToke! Eles sao comprados em pacotes e com eles voce gera QR Codes de desconto para usar nos estabelecimentos parceiros. Cada QR Code gerado consome 1 token.\n\nQuanto mais tokens voce tiver, mais descontos podera aproveitar!",
                "icon": "ticket-outline",
                "order": 1,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
            {
                "topic_id": "help_seed_02",
                "title": "O que sao Creditos?",
                "content": "Creditos sao ganhos quando seus amigos e indicados compram tokens no iToke. E dinheiro real no seu saldo!\n\nVoce ganha R$ 1,00 por pacote comprado em ate 3 niveis de indicacao:\n- Nivel 1 (indicacao direta): R$ 1,00/pacote\n- Nivel 2 (amigo do amigo): R$ 1,00/pacote\n- Nivel 3: R$ 1,00/pacote",
                "icon": "wallet-outline",
                "order": 2,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
            {
                "topic_id": "help_seed_03",
                "title": "Como ganhar mais?",
                "content": "Existem duas formas principais:\n\n1. Indicar Amigos: Compartilhe seu codigo de indicacao. Cada vez que eles comprarem tokens, voce ganha comissao em 3 niveis!\n\n2. Indicar Estabelecimentos: Indique lojas e restaurantes. Quando comecarem a vender no iToke, voce ganha R$ 1,00 por venda durante 12 meses!",
                "icon": "trending-up-outline",
                "order": 3,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
            {
                "topic_id": "help_seed_04",
                "title": "Quanto tempo dura o QR Code?",
                "content": "Cada QR Code gerado tem validade configurada pelo estabelecimento (geralmente meses). Apos o prazo, ele expira automaticamente. Gere o QR Code e apresente no estabelecimento dentro do prazo.",
                "icon": "time-outline",
                "order": 4,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
            {
                "topic_id": "help_seed_05",
                "title": "Posso usar o desconto em qualquer loja?",
                "content": "Os descontos sao validos apenas nos estabelecimentos parceiros cadastrados no iToke. Cada oferta esta vinculada a um estabelecimento especifico. Verifique na aba de Ofertas quais estao disponiveis na sua regiao.",
                "icon": "storefront-outline",
                "order": 5,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
            {
                "topic_id": "help_seed_06",
                "title": "Os creditos que eu ganho expiram?",
                "content": "Nao! Seus creditos nao expiram e ficam acumulados na sua carteira. Eles podem ser usados para abater o valor de ofertas ao gerar QR Codes de desconto.",
                "icon": "infinite-outline",
                "order": 6,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
        ]
        await db.help_topics.insert_many(default_topics)
    
    # Seed help settings if not exists
    help_settings = await db.platform_settings.find_one({"key": "help_settings"})
    if not help_settings:
        await db.platform_settings.insert_one({
            "key": "help_settings",
            "support_email": "suporte@itoke.com.br",
            "created_at": datetime.now(timezone.utc),
        })
