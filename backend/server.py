from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import aiohttp

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Stripe settings
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# Security
security = HTTPBearer()

# Simple cache for CoinGecko API
crypto_cache = {}
CACHE_TTL = 60  # 60 seconds

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    full_name: str
    created_at: datetime

class AuthResponse(BaseModel):
    token: str
    user: User

class Portfolio(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    holdings: Dict[str, float] = Field(default_factory=dict)
    usd_balance: float = 0.0
    total_value: float = 0.0
    updated_at: datetime

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    coin_id: str
    coin_symbol: str
    transaction_type: str
    amount: float
    price_usd: float
    total_usd: float
    status: str
    timestamp: datetime

class BuySellRequest(BaseModel):
    coin_id: str
    coin_symbol: str
    amount: float
    transaction_type: str
    host_url: str

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    session_id: str
    amount: float
    currency: str
    payment_status: str
    status: str
    metadata: Dict
    created_at: datetime
    updated_at: datetime

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def fetch_crypto_prices(coin_ids: List[str]) -> Dict:
    """Fetch current prices from CoinGecko API with caching"""
    cache_key = ",".join(sorted(coin_ids))
    
    if cache_key in crypto_cache:
        cache_entry = crypto_cache[cache_key]
        if (datetime.now(timezone.utc) - cache_entry['timestamp']).seconds < CACHE_TTL:
            return cache_entry['data']
    
    ids_str = ",".join(coin_ids)
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={ids_str}&vs_currencies=usd&include_24hr_change=true"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    crypto_cache[cache_key] = {
                        'data': data,
                        'timestamp': datetime.now(timezone.utc)
                    }
                    return data
    except Exception as e:
        logging.error(f"CoinGecko API error: {e}")
    
    return {}

async def fetch_markets_cached():
    """Fetch markets data with caching"""
    cache_key = "markets"
    
    if cache_key in crypto_cache:
        cache_entry = crypto_cache[cache_key]
        if (datetime.now(timezone.utc) - cache_entry['timestamp']).seconds < CACHE_TTL:
            return cache_entry['data']
    
    url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    crypto_cache[cache_key] = {
                        'data': data,
                        'timestamp': datetime.now(timezone.utc)
                    }
                    return data
    except Exception as e:
        logging.error(f"CoinGecko markets API error: {e}")
    
    return []

async def fetch_coin_details_cached(coin_id: str):
    """Fetch coin details with caching"""
    cache_key = f"coin_{coin_id}"
    
    if cache_key in crypto_cache:
        cache_entry = crypto_cache[cache_key]
        if (datetime.now(timezone.utc) - cache_entry['timestamp']).seconds < CACHE_TTL:
            return cache_entry['data']
    
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}?localization=false&tickers=false&community_data=false&developer_data=false"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    crypto_cache[cache_key] = {
                        'data': data,
                        'timestamp': datetime.now(timezone.utc)
                    }
                    return data
    except Exception as e:
        logging.error(f"CoinGecko coin details API error: {e}")
    
    return None

# Auth Routes
@api_router.post("/auth/signup", response_model=AuthResponse)
async def signup(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_pw = hash_password(user_data.password)
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_pw,
        "full_name": user_data.full_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    portfolio_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "holdings": {},
        "usd_balance": 10000.0,
        "total_value": 10000.0,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.portfolios.insert_one(portfolio_doc)
    
    token = create_jwt_token(user_id, user_data.email)
    
    user_response = User(
        id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        created_at=datetime.fromisoformat(user_doc["created_at"])
    )
    
    return AuthResponse(token=token, user=user_response)

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["id"], user["email"])
    
    user_response = User(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        created_at=datetime.fromisoformat(user["created_at"])
    )
    
    return AuthResponse(token=token, user=user_response)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        created_at=datetime.fromisoformat(current_user["created_at"])
    )

# Crypto Market Routes
@api_router.get("/crypto/markets")
async def get_markets():
    """Get top cryptocurrencies with caching"""
    data = await fetch_markets_cached()
    return data

@api_router.get("/crypto/coin/{coin_id}")
async def get_coin_details(coin_id: str):
    """Get detailed coin information with caching"""
    data = await fetch_coin_details_cached(coin_id)
    if data:
        return data
    raise HTTPException(status_code=404, detail="Coin not found")

# Portfolio Routes
@api_router.get("/portfolio", response_model=Portfolio)
async def get_portfolio(current_user: dict = Depends(get_current_user)):
    portfolio = await db.portfolios.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not portfolio:
        portfolio = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "holdings": {},
            "usd_balance": 10000.0,
            "total_value": 10000.0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.portfolios.insert_one(portfolio)
    
    if portfolio["holdings"]:
        coin_ids = list(portfolio["holdings"].keys())
        prices = await fetch_crypto_prices(coin_ids)
        total_crypto_value = 0.0
        for coin_id, amount in portfolio["holdings"].items():
            if coin_id in prices:
                total_crypto_value += amount * prices[coin_id].get("usd", 0)
        portfolio["total_value"] = portfolio["usd_balance"] + total_crypto_value
    
    return Portfolio(
        id=portfolio["id"],
        user_id=portfolio["user_id"],
        holdings=portfolio["holdings"],
        usd_balance=portfolio["usd_balance"],
        total_value=portfolio["total_value"],
        updated_at=datetime.fromisoformat(portfolio["updated_at"])
    )

# Transaction Routes
@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find({"user_id": current_user["id"]}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    
    return [
        Transaction(
            id=t["id"],
            user_id=t["user_id"],
            coin_id=t["coin_id"],
            coin_symbol=t["coin_symbol"],
            transaction_type=t["transaction_type"],
            amount=t["amount"],
            price_usd=t["price_usd"],
            total_usd=t["total_usd"],
            status=t["status"],
            timestamp=datetime.fromisoformat(t["timestamp"])
        )
        for t in transactions
    ]

@api_router.post("/trade/create-checkout")
async def create_trade_checkout(trade: BuySellRequest, current_user: dict = Depends(get_current_user)):
    """Create Stripe checkout for buying crypto"""
    if trade.transaction_type == "sell":
        raise HTTPException(status_code=400, detail="Use /trade/sell for selling crypto")
    
    prices = await fetch_crypto_prices([trade.coin_id])
    if trade.coin_id not in prices:
        raise HTTPException(status_code=400, detail="Could not fetch crypto price")
    
    price_usd = prices[trade.coin_id]["usd"]
    total_usd = trade.amount * price_usd
    
    webhook_url = f"{trade.host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{trade.host_url}/trade/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{trade.host_url}/markets"
    
    metadata = {
        "user_id": current_user["id"],
        "coin_id": trade.coin_id,
        "coin_symbol": trade.coin_symbol,
        "amount": str(trade.amount),
        "price_usd": str(price_usd),
        "transaction_type": "buy"
    }
    
    checkout_request = CheckoutSessionRequest(
        amount=total_usd,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    payment_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "session_id": session.session_id,
        "amount": total_usd,
        "currency": "usd",
        "payment_status": "pending",
        "status": "initiated",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(payment_doc)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/trade/checkout-status/{session_id}")
async def get_checkout_status(session_id: str, current_user: dict = Depends(get_current_user)):
    """Check payment status and process transaction"""
    payment = await db.payment_transactions.find_one({"session_id": session_id, "user_id": current_user["id"]}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["payment_status"] == "paid" and payment["status"] == "completed":
        return {"status": "completed", "message": "Transaction already processed", "payment_status": "paid"}
    
    webhook_url = "https://placeholder.com/webhook"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    checkout_status = await stripe_checkout.get_checkout_status(session_id)
    
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "payment_status": checkout_status.payment_status,
            "status": checkout_status.status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if checkout_status.payment_status == "paid" and payment["status"] != "completed":
        metadata = payment["metadata"]
        
        portfolio = await db.portfolios.find_one({"user_id": current_user["id"]})
        holdings = portfolio.get("holdings", {})
        coin_id = metadata["coin_id"]
        amount = float(metadata["amount"])
        
        if coin_id in holdings:
            holdings[coin_id] += amount
        else:
            holdings[coin_id] = amount
        
        await db.portfolios.update_one(
            {"user_id": current_user["id"]},
            {"$set": {
                "holdings": holdings,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        transaction_doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "coin_id": metadata["coin_id"],
            "coin_symbol": metadata["coin_symbol"],
            "transaction_type": "buy",
            "amount": amount,
            "price_usd": float(metadata["price_usd"]),
            "total_usd": payment["amount"],
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.transactions.insert_one(transaction_doc)
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "completed"}}
        )
    
    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "message": "Payment successful" if checkout_status.payment_status == "paid" else "Payment pending"
    }

@api_router.post("/trade/sell")
async def sell_crypto(trade: BuySellRequest, current_user: dict = Depends(get_current_user)):
    """Sell crypto for USD"""
    portfolio = await db.portfolios.find_one({"user_id": current_user["id"]})
    holdings = portfolio.get("holdings", {})
    
    if trade.coin_id not in holdings or holdings[trade.coin_id] < trade.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    prices = await fetch_crypto_prices([trade.coin_id])
    if trade.coin_id not in prices:
        raise HTTPException(status_code=400, detail="Could not fetch crypto price")
    
    price_usd = prices[trade.coin_id]["usd"]
    total_usd = trade.amount * price_usd
    
    holdings[trade.coin_id] -= trade.amount
    if holdings[trade.coin_id] <= 0:
        del holdings[trade.coin_id]
    
    new_usd_balance = portfolio["usd_balance"] + total_usd
    
    await db.portfolios.update_one(
        {"user_id": current_user["id"]},
        {"$set": {
            "holdings": holdings,
            "usd_balance": new_usd_balance,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    transaction_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "coin_id": trade.coin_id,
        "coin_symbol": trade.coin_symbol,
        "transaction_type": "sell",
        "amount": trade.amount,
        "price_usd": price_usd,
        "total_usd": total_usd,
        "status": "completed",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(transaction_doc)
    
    return {"success": True, "message": "Crypto sold successfully", "total_usd": total_usd}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    webhook_url = "https://placeholder.com/webhook"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        return {"status": "success", "event_type": webhook_response.event_type}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()