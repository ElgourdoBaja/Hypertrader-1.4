"""
Hypertrader Backend Server with MongoDB Integration and Authentication
"""

from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Depends, status
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone
import json
import time
import asyncio
from bson import ObjectId

# Import our custom modules
from auth import (
    AuthManager, UserCreate, UserLogin, UserResponse, Token,
    UserRole, rate_limiter, require_permission, require_role
)
from database import DatabaseManager, init_database, close_database, get_database

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()

# Global variables
auth_manager: Optional[AuthManager] = None
db_manager: Optional[DatabaseManager] = None

# Pydantic models
class StrategyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    strategy_type: str = "momentum"
    parameters: Dict[str, Any] = {}

class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class PositionResponse(BaseModel):
    id: str
    symbol: str
    side: str
    size: float
    entry_price: float
    current_price: float
    unrealized_pnl: float
    status: str

class TradeResponse(BaseModel):
    id: str
    symbol: str
    side: str
    size: float
    price: float
    fee: float
    trade_type: str
    status: str
    created_at: datetime

class AlertCreate(BaseModel):
    symbol: str
    condition: str
    target_price: float
    message: str

class AlertUpdate(BaseModel):
    condition: Optional[str] = None
    target_price: Optional[float] = None
    message: Optional[str] = None
    is_active: Optional[bool] = None

class CredentialCreate(BaseModel):
    exchange: str
    api_key: str
    api_secret: str
    passphrase: Optional[str] = None
    is_testnet: bool = True

# Create FastAPI app
app = FastAPI(
    title="Hypertrader API",
    description="High-frequency trading platform for Hyperliquid exchange",
    version="1.4.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize database and authentication on startup"""
    global auth_manager, db_manager
    
    try:
        # Initialize database
        db_manager = await init_database()
        logger.info("Database initialized successfully")
        
        # Initialize authentication manager
        auth_manager = AuthManager(db_manager)
        logger.info("Authentication manager initialized")
        
        # Create default admin user if none exists
        admin_user = await db_manager.users.find_one({"role": UserRole.ADMIN})
        if not admin_user:
            admin_data = {
                "username": "admin",
                "email": "admin@hypertrader.com",
                "password_hash": auth_manager.password_utils.get_password_hash("Admin123!"),
                "role": UserRole.ADMIN,
                "full_name": "System Administrator",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "last_login": None,
                "login_attempts": 0,
                "locked_until": None
            }
            await db_manager.users.insert_one(admin_data)
            logger.info("Default admin user created: admin/Admin123!")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
        # Fall back to mock mode if database fails
        logger.warning("Falling back to mock mode due to database connection failure")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown"""
    global db_manager
    if db_manager:
        await close_database()
        logger.info("Database connection closed")

# Dependency to get current user
async def get_current_user(credentials = Depends(security)):
    """Get current authenticated user"""
    if not auth_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not available"
        )
    return await auth_manager.get_current_user(credentials)

# Authentication endpoints
@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate):
    """Register a new user"""
    if not auth_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not available"
        )
    
    # Rate limiting
    if not rate_limiter.is_allowed("register", max_attempts=5, window_minutes=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Please try again later."
        )
    
    try:
        user = await auth_manager.create_user(user_data)
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@app.post("/auth/login", response_model=Token)
async def login_user(user_data: UserLogin):
    """Login user and return tokens"""
    if not auth_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not available"
        )
    
    # Rate limiting
    if not rate_limiter.is_allowed(f"login_{user_data.username}", max_attempts=5, window_minutes=15):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later."
        )
    
    try:
        user = await auth_manager.authenticate_user(user_data.username, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        tokens = await auth_manager.create_tokens(user)
        return tokens
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

class RefreshTokenRequest(BaseModel):
    refresh_token: str

@app.post("/auth/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token"""
    if not auth_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not available"
        )
    
    try:
        tokens = await auth_manager.refresh_access_token(request.refresh_token)
        return tokens
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )

@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=str(current_user["_id"]),
        username=current_user["username"],
        email=current_user["email"],
        role=current_user["role"],
        full_name=current_user.get("full_name"),
        is_active=current_user.get("is_active", True),
        created_at=current_user["created_at"],
        last_login=current_user.get("last_login")
    )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Hypertrader API v1.4",
        "status": "running",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "features": [
            "MongoDB Integration",
            "JWT Authentication",
            "Role-based Access Control",
            "Rate Limiting",
            "Comprehensive API"
        ]
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {}
    }
    
    # Check database
    if db_manager:
        db_health = await db_manager.health_check()
        health_status["services"]["database"] = db_health
    else:
        health_status["services"]["database"] = {"status": "unavailable"}
    
    # Check authentication
    health_status["services"]["authentication"] = {
        "status": "available" if auth_manager else "unavailable"
    }
    
    return health_status

# Strategy endpoints
@app.post("/strategies", status_code=status.HTTP_201_CREATED)
async def create_strategy(
    strategy_data: StrategyCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new trading strategy"""
    if not db_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available"
        )
    
    # Check permissions
    token_data = current_user.get("token_data")
    if "manage:strategies" not in token_data.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission 'manage:strategies' required"
        )
    
    try:
        strategy_doc = {
            "user_id": ObjectId(current_user["_id"]),
            "name": strategy_data.name,
            "description": strategy_data.description,
            "strategy_type": strategy_data.strategy_type,
            "parameters": strategy_data.parameters,
            "is_active": False,
            "performance_metrics": {},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        strategy_id = await db_manager.create_strategy(strategy_doc)
        
        return {
            "id": strategy_id,
            "message": "Strategy created successfully"
        }
        
    except Exception as e:
        logger.error(f"Strategy creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create strategy"
        )

@app.get("/strategies")
async def get_strategies(current_user: dict = Depends(get_current_user)):
    """Get user's trading strategies"""
    if not db_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available"
        )
    
    try:
        strategies = await db_manager.get_user_strategies(str(current_user["_id"]))
        
        # Convert ObjectId to string for JSON serialization
        for strategy in strategies:
            strategy["id"] = str(strategy["_id"])
            strategy["user_id"] = str(strategy["user_id"])
            del strategy["_id"]
        
        return strategies
        
    except Exception as e:
        logger.error(f"Get strategies error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve strategies"
        )

@app.put("/strategies/{strategy_id}")
async def update_strategy(
    strategy_id: str,
    strategy_data: StrategyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a trading strategy"""
    if not db_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available"
        )
    
    # Check permissions
    token_data = current_user.get("token_data")
    if "manage:strategies" not in token_data.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission 'manage:strategies' required"
        )
    
    try:
        # Verify strategy ownership
        strategy = await db_manager.get_strategy_by_id(strategy_id)
        if not strategy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategy not found"
            )
        
        if str(strategy["user_id"]) != str(current_user["_id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this strategy"
            )
        
        # Update strategy
        update_data = {k: v for k, v in strategy_data.dict().items() if v is not None}
        success = await db_manager.update_strategy(strategy_id, update_data)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update strategy"
            )
        
        return {"message": "Strategy updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Strategy update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update strategy"
        )

@app.delete("/strategies/{strategy_id}")
async def delete_strategy(
    strategy_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a trading strategy"""
    if not db_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available"
        )
    
    # Check permissions
    token_data = current_user.get("token_data")
    if "manage:strategies" not in token_data.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission 'manage:strategies' required"
        )
    
    try:
        # Verify strategy ownership
        strategy = await db_manager.get_strategy_by_id(strategy_id)
        if not strategy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategy not found"
            )
        
        if str(strategy["user_id"]) != str(current_user["_id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this strategy"
            )
        
        # Delete strategy
        success = await db_manager.delete_strategy(strategy_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete strategy"
            )
        
        return {"message": "Strategy deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Strategy deletion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete strategy"
        )

# Position endpoints
@app.get("/positions", response_model=List[PositionResponse])
async def get_positions(current_user: dict = Depends(get_current_user)):
    """Get user's positions"""
    if not db_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available"
        )
    
    try:
        positions = await db_manager.get_user_positions(str(current_user["_id"]))
        
        # Convert to response format
        position_responses = []
        for pos in positions:
            position_responses.append(PositionResponse(
                id=str(pos["_id"]),
                symbol=pos["symbol"],
                side=pos["side"],
                size=pos["size"],
                entry_price=pos["entry_price"],
                current_price=pos["current_price"],
                unrealized_pnl=pos["unrealized_pnl"],
                status=pos["status"]
            ))
        
        return position_responses
        
    except Exception as e:
        logger.error(f"Get positions error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve positions"
        )

# Trade endpoints
@app.get("/trades", response_model=List[TradeResponse])
async def get_trades(
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get user's trades"""
    if not db_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available"
        )
    
    try:
        trades = await db_manager.get_user_trades(str(current_user["_id"]), limit)
        
        # Convert to response format
        trade_responses = []
        for trade in trades:
            trade_responses.append(TradeResponse(
                id=str(trade["_id"]),
                symbol=trade["symbol"],
                side=trade["side"],
                size=trade["size"],
                price=trade["price"],
                fee=trade["fee"],
                trade_type=trade["trade_type"],
                status=trade["status"],
                created_at=trade["created_at"]
            ))
        
        return trade_responses
        
    except Exception as e:
        logger.error(f"Get trades error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve trades"
        )

# Alert endpoints
@app.post("/alerts", status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_data: AlertCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new price alert"""
    if not db_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available"
        )
    
    try:
        alert_doc = {
            "user_id": ObjectId(current_user["_id"]),
            "symbol": alert_data.symbol,
            "condition": alert_data.condition,
            "target_price": alert_data.target_price,
            "message": alert_data.message,
            "is_active": True,
            "triggered_at": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        alert_id = await db_manager.create_alert(alert_doc)
        
        return {
            "id": alert_id,
            "message": "Alert created successfully"
        }
        
    except Exception as e:
        logger.error(f"Alert creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create alert"
        )

@app.get("/alerts")
async def get_alerts(
    active_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Get user's alerts"""
    if not db_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available"
        )
    
    try:
        alerts = await db_manager.get_user_alerts(str(current_user["_id"]), active_only)
        
        # Convert ObjectId to string for JSON serialization
        for alert in alerts:
            alert["id"] = str(alert["_id"])
            alert["user_id"] = str(alert["user_id"])
            del alert["_id"]
        
        return alerts
        
    except Exception as e:
        logger.error(f"Get alerts error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alerts"
        )

@app.put("/alerts/{alert_id}")
async def update_alert(
    alert_id: str,
    alert_data: AlertUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an alert"""
    if not db_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available"
        )
    
    try:
        # Verify alert ownership
        alert = await db_manager.alerts.find_one({"_id": ObjectId(alert_id)})
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        if str(alert["user_id"]) != str(current_user["_id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this alert"
            )
        
        # Update alert
        update_data = {k: v for k, v in alert_data.dict().items() if v is not None}
        success = await db_manager.update_alert(alert_id, update_data)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update alert"
            )
        
        return {"message": "Alert updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Alert update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update alert"
        )

@app.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an alert"""
    if not db_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available"
        )
    
    try:
        # Verify alert ownership
        alert = await db_manager.alerts.find_one({"_id": ObjectId(alert_id)})
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        if str(alert["user_id"]) != str(current_user["_id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this alert"
            )
        
        # Delete alert
        success = await db_manager.delete_alert(alert_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete alert"
            )
        
        return {"message": "Alert deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Alert deletion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete alert"
        )

# Admin endpoints
@app.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users (admin only)"""
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )
    
    if not db_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available"
        )
    
    try:
        cursor = db_manager.users.find({}, {"password_hash": 0})
        users = await cursor.to_list(length=None)
        
        # Convert ObjectId to string
        for user in users:
            user["id"] = str(user["_id"])
            del user["_id"]
        
        return users
        
    except Exception as e:
        logger.error(f"Get all users error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users"
        )

@app.get("/admin/stats")
async def get_system_stats(current_user: dict = Depends(get_current_user)):
    """Get system statistics (admin only)"""
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )
    
    if not db_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available"
        )
    
    try:
        stats = await db_manager.get_collection_stats()
        return {
            "database_stats": stats,
            "system_info": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "version": "1.4.0"
            }
        }
        
    except Exception as e:
        logger.error(f"Get system stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system statistics"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server_with_auth:app",
        host="0.0.0.0",
        port=12001,
        reload=True,
        log_level="info"
    )