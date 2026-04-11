"""
Pydantic models for iToke platform.
Extracted from server.py for better maintainability.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


class UserBase(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "client"
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
    user_id: str
    business_name: str
    address: str
    category: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    token_balance: int = 0
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
    structured_address: Optional[dict] = None

class OfferBase(BaseModel):
    offer_id: str
    offer_code: str
    establishment_id: str
    title: str
    description: Optional[str] = None
    discount_value: float
    original_price: float
    discounted_price: float
    active: bool = True
    is_simulation: bool = False
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
    image_base64: Optional[str] = None
    discount_value: float
    original_price: float
    discounted_price: Optional[float] = None
    valid_days: Optional[str] = None
    valid_hours: Optional[str] = None
    delivery_allowed: bool = False
    dine_in_only: bool = False
    pickup_allowed: bool = False
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    about_establishment: Optional[str] = None
    instagram_link: Optional[str] = None
    validity_date: Optional[str] = None
    tokens_allocated: int = 0

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
    size: int
    price_per_unit: float = 2.00
    total_price: float
    tokens_remaining: int
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TokenPackagePurchase(BaseModel):
    size: int

class ClientTokenPurchase(BaseModel):
    packages: int = 1
    package_config_id: Optional[str] = None

class ClientTokens(BaseModel):
    user_id: str
    balance: int = 5

class ClientCredits(BaseModel):
    user_id: str
    balance: float = 0.0

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
    use_credits: Optional[float] = 0

class QRCodeValidate(BaseModel):
    code_hash: str

class TransactionBase(BaseModel):
    transaction_id: str
    from_user_id: Optional[str] = None
    to_user_id: str
    amount: float
    type: str
    related_offer_id: Optional[str] = None
    related_package_id: Optional[str] = None
    description: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReferralNetwork(BaseModel):
    parent_user_id: str
    child_user_id: str
    level: int

class RepresentativeCreate(BaseModel):
    name: str
    email: str
    cnpj: str
    free_tokens: int = 0

class RepresentativeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    cnpj: Optional[str] = None
    status: Optional[str] = None
    free_tokens_to_add: Optional[int] = None
    commission_value: Optional[float] = None


# ===================== REQUEST MODELS =====================

class EmailLoginRequest(BaseModel):
    email: str
    name: str
    role: str = "client"
    referral_code_used: Optional[str] = None

class StripeCheckoutRequest(BaseModel):
    package_config_id: str
    origin_url: str

class ImageGenerationRequest(BaseModel):
    prompt: str
