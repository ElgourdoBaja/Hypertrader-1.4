from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime
import json
import time
import asyncio


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client['hyperliquid_trader']

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class TradingStrategy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    parameters: Dict[str, Any]
    is_active: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TradePosition(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str
    strategy_id: str
    side: str  # "long" or "short"
    size: float
    entry_price: float
    current_price: float
    pnl: float
    pnl_percent: float
    take_profit: Optional[float] = None
    stop_loss: Optional[float] = None
    opened_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None
    status: str = "open"  # "open", "closed"

class Trade(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    position_id: Optional[str] = None
    strategy_id: str
    symbol: str
    side: str  # "buy" or "sell"
    size: float
    price: float
    fee: float
    total_value: float
    executed_at: datetime = Field(default_factory=datetime.utcnow)

class HyperliquidCredentials(BaseModel):
    api_key: str
    api_secret: str

class PerformanceMetrics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    portfolio_value: float
    daily_pnl: float
    daily_pnl_percent: float
    total_trades: int
    win_rate: float
    avg_profit_per_trade: float
    max_drawdown: float
    sharpe_ratio: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Trading engine state
trading_is_active = False
active_strategies = {}
background_tasks = set()


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hyperliquid High-Frequency Trading API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Trading endpoints
@api_router.post("/trading/start")
async def start_trading(background_tasks: BackgroundTasks):
    global trading_is_active
    if trading_is_active:
        return {"message": "Trading is already active"}
    
    trading_is_active = True
    background_tasks.add_task(trading_background_task)
    
    return {"message": "Trading started successfully"}

@api_router.post("/trading/stop")
async def stop_trading():
    global trading_is_active
    if not trading_is_active:
        return {"message": "Trading is already stopped"}
    
    trading_is_active = False
    return {"message": "Trading stopped successfully"}

@api_router.get("/trading/status")
async def get_trading_status():
    return {"is_active": trading_is_active}

# Strategy management
@api_router.post("/strategies", response_model=TradingStrategy)
async def create_strategy(strategy: TradingStrategy):
    strategy_dict = strategy.dict()
    await db.strategies.insert_one(strategy_dict)
    return strategy

@api_router.get("/strategies", response_model=List[TradingStrategy])
async def get_strategies():
    strategies = await db.strategies.find().to_list(1000)
    return [TradingStrategy(**strategy) for strategy in strategies]

@api_router.get("/strategies/{strategy_id}", response_model=TradingStrategy)
async def get_strategy(strategy_id: str):
    strategy = await db.strategies.find_one({"id": strategy_id})
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return TradingStrategy(**strategy)

@api_router.put("/strategies/{strategy_id}", response_model=TradingStrategy)
async def update_strategy(strategy_id: str, strategy_update: TradingStrategy):
    strategy = await db.strategies.find_one({"id": strategy_id})
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    strategy_dict = strategy_update.dict()
    strategy_dict["updated_at"] = datetime.utcnow()
    
    await db.strategies.update_one(
        {"id": strategy_id},
        {"$set": strategy_dict}
    )
    
    return strategy_update

@api_router.post("/strategies/{strategy_id}/activate")
async def activate_strategy(strategy_id: str):
    strategy = await db.strategies.find_one({"id": strategy_id})
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    await db.strategies.update_one(
        {"id": strategy_id},
        {"$set": {"is_active": True, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": f"Strategy {strategy_id} activated successfully"}

@api_router.post("/strategies/{strategy_id}/deactivate")
async def deactivate_strategy(strategy_id: str):
    strategy = await db.strategies.find_one({"id": strategy_id})
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    await db.strategies.update_one(
        {"id": strategy_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": f"Strategy {strategy_id} deactivated successfully"}

# Positions and trades
@api_router.get("/positions", response_model=List[TradePosition])
async def get_positions(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    
    positions = await db.positions.find(query).to_list(1000)
    return [TradePosition(**position) for position in positions]

@api_router.get("/positions/{position_id}", response_model=TradePosition)
async def get_position(position_id: str):
    position = await db.positions.find_one({"id": position_id})
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    return TradePosition(**position)

@api_router.get("/trades", response_model=List[Trade])
async def get_trades(limit: int = 100):
    trades = await db.trades.find().sort("executed_at", -1).limit(limit).to_list(limit)
    return [Trade(**trade) for trade in trades]

@api_router.get("/metrics/performance", response_model=PerformanceMetrics)
async def get_performance_metrics():
    # In a real implementation, you would calculate these metrics based on actual trading data
    # For now, we'll return mock data
    metrics = {
        "portfolio_value": 125000,
        "daily_pnl": 3750,
        "daily_pnl_percent": 3.1,
        "total_trades": 42,
        "win_rate": 68.5,
        "avg_profit_per_trade": 89.3,
        "max_drawdown": 5.2,
        "sharpe_ratio": 2.1,
        "timestamp": datetime.utcnow()
    }
    
    return PerformanceMetrics(**metrics)

# Hyperliquid API integration
@api_router.post("/credentials")
async def save_credentials(credentials: HyperliquidCredentials):
    # In a real implementation, you would store these securely
    # For demo purposes, we're just storing in MongoDB
    await db.credentials.delete_many({})  # Remove any existing credentials
    await db.credentials.insert_one(credentials.dict())
    return {"message": "API credentials saved successfully"}

@api_router.get("/market/symbols")
async def get_market_symbols():
    # In a real implementation, you would fetch this from Hyperliquid API
    # For now, returning mock data
    symbols = [
        "BTC-PERP", "ETH-PERP", "SOL-PERP", "AVAX-PERP", "NEAR-PERP",
        "ATOM-PERP", "DOT-PERP", "MATIC-PERP", "LINK-PERP", "UNI-PERP",
        "AAVE-PERP", "ADA-PERP", "DOGE-PERP", "XRP-PERP", "SHIB-PERP"
    ]
    
    return {"symbols": symbols}

# Background trading task
async def trading_background_task():
    global trading_is_active
    logger.info("Starting trading background task")
    
    try:
        while trading_is_active:
            # In a real implementation, this would contain the actual trading logic
            # For demo purposes, just sleeping
            await asyncio.sleep(1)
            
            # Log that we're still running
            logger.debug("Trading task running...")
    except Exception as e:
        logger.error(f"Error in trading background task: {e}")
        trading_is_active = False
    finally:
        logger.info("Trading background task stopped")


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    global trading_is_active
    trading_is_active = False
    client.close()
