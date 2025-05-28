"""
MongoDB Database Manager for Hypertrader
Handles database connections, operations, and data models
"""

import os
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict
from typing_extensions import Annotated
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Database configuration"""
    def __init__(self):
        self.mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        self.database_name = os.getenv("DATABASE_NAME", "hypertrader")
        self.connection_timeout = int(os.getenv("DB_CONNECTION_TIMEOUT", "5000"))
        self.server_selection_timeout = int(os.getenv("DB_SERVER_SELECTION_TIMEOUT", "5000"))

class PyObjectId(ObjectId):
    """Custom ObjectId for Pydantic models"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
        return field_schema

class BaseDocument(BaseModel):
    """Base document model"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserDocument(BaseDocument):
    """User document model"""
    username: str
    email: str
    password_hash: str
    role: str
    full_name: Optional[str] = None
    is_active: bool = True
    last_login: Optional[datetime] = None
    login_attempts: int = 0
    locked_until: Optional[datetime] = None

class StrategyDocument(BaseDocument):
    """Strategy document model"""
    user_id: PyObjectId
    name: str
    description: Optional[str] = None
    strategy_type: str
    parameters: Dict[str, Any] = {}
    is_active: bool = False
    performance_metrics: Dict[str, Any] = {}

class PositionDocument(BaseDocument):
    """Position document model"""
    user_id: PyObjectId
    strategy_id: Optional[PyObjectId] = None
    symbol: str
    side: str  # "long" or "short"
    size: float
    entry_price: float
    current_price: float
    unrealized_pnl: float
    realized_pnl: float = 0.0
    status: str = "open"  # "open", "closed"

class TradeDocument(BaseDocument):
    """Trade document model"""
    user_id: PyObjectId
    strategy_id: Optional[PyObjectId] = None
    position_id: Optional[PyObjectId] = None
    symbol: str
    side: str  # "buy" or "sell"
    size: float
    price: float
    fee: float = 0.0
    trade_type: str = "market"  # "market", "limit", "stop"
    status: str = "pending"  # "pending", "filled", "cancelled"

class AlertDocument(BaseDocument):
    """Alert document model"""
    user_id: PyObjectId
    symbol: str
    condition: str  # "above", "below"
    target_price: float
    message: str
    is_active: bool = True
    triggered_at: Optional[datetime] = None

class CredentialDocument(BaseDocument):
    """Credential document model"""
    user_id: PyObjectId
    exchange: str
    api_key: str
    api_secret: str  # Should be encrypted
    passphrase: Optional[str] = None  # For some exchanges
    is_testnet: bool = True

class DatabaseManager:
    """MongoDB database manager"""
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        self.config = config or DatabaseConfig()
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None
        self.is_connected = False
        
        # Collection references
        self.users: Optional[AsyncIOMotorCollection] = None
        self.strategies: Optional[AsyncIOMotorCollection] = None
        self.positions: Optional[AsyncIOMotorCollection] = None
        self.trades: Optional[AsyncIOMotorCollection] = None
        self.alerts: Optional[AsyncIOMotorCollection] = None
        self.credentials: Optional[AsyncIOMotorCollection] = None
        self.status_checks: Optional[AsyncIOMotorCollection] = None
    
    async def connect(self) -> bool:
        """Connect to MongoDB"""
        try:
            logger.info(f"Connecting to MongoDB at {self.config.mongodb_url}")
            
            self.client = AsyncIOMotorClient(
                self.config.mongodb_url,
                serverSelectionTimeoutMS=self.config.server_selection_timeout,
                connectTimeoutMS=self.config.connection_timeout,
                maxPoolSize=10,
                minPoolSize=1
            )
            
            # Test connection
            await self.client.admin.command('ping')
            
            self.db = self.client[self.config.database_name]
            
            # Initialize collections
            self.users = self.db.users
            self.strategies = self.db.strategies
            self.positions = self.db.positions
            self.trades = self.db.trades
            self.alerts = self.db.alerts
            self.credentials = self.db.credentials
            self.status_checks = self.db.status_checks
            
            # Create indexes
            await self._create_indexes()
            
            self.is_connected = True
            logger.info("Successfully connected to MongoDB")
            return True
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            self.is_connected = False
            return False
        except Exception as e:
            logger.error(f"Unexpected error connecting to MongoDB: {e}")
            self.is_connected = False
            return False
    
    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("Disconnected from MongoDB")
    
    async def _create_indexes(self):
        """Create database indexes for performance"""
        try:
            # User indexes
            await self.users.create_index("username", unique=True)
            await self.users.create_index("email", unique=True)
            await self.users.create_index("role")
            
            # Strategy indexes
            await self.strategies.create_index("user_id")
            await self.strategies.create_index("name")
            await self.strategies.create_index("is_active")
            
            # Position indexes
            await self.positions.create_index("user_id")
            await self.positions.create_index("strategy_id")
            await self.positions.create_index("symbol")
            await self.positions.create_index("status")
            
            # Trade indexes
            await self.trades.create_index("user_id")
            await self.trades.create_index("strategy_id")
            await self.trades.create_index("position_id")
            await self.trades.create_index("symbol")
            await self.trades.create_index("created_at")
            
            # Alert indexes
            await self.alerts.create_index("user_id")
            await self.alerts.create_index("symbol")
            await self.alerts.create_index("is_active")
            
            # Credential indexes
            await self.credentials.create_index("user_id")
            await self.credentials.create_index("exchange")
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Check database health"""
        try:
            if not self.is_connected:
                return {"status": "disconnected", "error": "Not connected to database"}
            
            # Ping database
            await self.client.admin.command('ping')
            
            # Get database stats
            stats = await self.db.command("dbStats")
            
            return {
                "status": "healthy",
                "database": self.config.database_name,
                "collections": stats.get("collections", 0),
                "data_size": stats.get("dataSize", 0),
                "storage_size": stats.get("storageSize", 0),
                "indexes": stats.get("indexes", 0)
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {"status": "unhealthy", "error": str(e)}
    
    async def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics for all collections"""
        try:
            stats = {}
            collections = ["users", "strategies", "positions", "trades", "alerts", "credentials"]
            
            for collection_name in collections:
                collection = getattr(self, collection_name)
                count = await collection.count_documents({})
                stats[collection_name] = {"count": count}
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            return {}
    
    # User operations
    async def create_user(self, user_data: Dict[str, Any]) -> str:
        """Create a new user"""
        result = await self.users.insert_one(user_data)
        return str(result.inserted_id)
    
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        return await self.users.find_one({"username": username})
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        return await self.users.find_one({"_id": ObjectId(user_id)})
    
    async def update_user(self, user_id: str, update_data: Dict[str, Any]) -> bool:
        """Update user"""
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    # Strategy operations
    async def create_strategy(self, strategy_data: Dict[str, Any]) -> str:
        """Create a new strategy"""
        result = await self.strategies.insert_one(strategy_data)
        return str(result.inserted_id)
    
    async def get_user_strategies(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all strategies for a user"""
        cursor = self.strategies.find({"user_id": ObjectId(user_id)})
        return await cursor.to_list(length=None)
    
    async def get_strategy_by_id(self, strategy_id: str) -> Optional[Dict[str, Any]]:
        """Get strategy by ID"""
        return await self.strategies.find_one({"_id": ObjectId(strategy_id)})
    
    async def update_strategy(self, strategy_id: str, update_data: Dict[str, Any]) -> bool:
        """Update strategy"""
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.strategies.update_one(
            {"_id": ObjectId(strategy_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    async def delete_strategy(self, strategy_id: str) -> bool:
        """Delete strategy"""
        result = await self.strategies.delete_one({"_id": ObjectId(strategy_id)})
        return result.deleted_count > 0
    
    # Position operations
    async def create_position(self, position_data: Dict[str, Any]) -> str:
        """Create a new position"""
        result = await self.positions.insert_one(position_data)
        return str(result.inserted_id)
    
    async def get_user_positions(self, user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get positions for a user"""
        query = {"user_id": ObjectId(user_id)}
        if status:
            query["status"] = status
        
        cursor = self.positions.find(query)
        return await cursor.to_list(length=None)
    
    async def update_position(self, position_id: str, update_data: Dict[str, Any]) -> bool:
        """Update position"""
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.positions.update_one(
            {"_id": ObjectId(position_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    # Trade operations
    async def create_trade(self, trade_data: Dict[str, Any]) -> str:
        """Create a new trade"""
        result = await self.trades.insert_one(trade_data)
        return str(result.inserted_id)
    
    async def get_user_trades(self, user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get trades for a user"""
        cursor = self.trades.find({"user_id": ObjectId(user_id)}).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=None)
    
    # Alert operations
    async def create_alert(self, alert_data: Dict[str, Any]) -> str:
        """Create a new alert"""
        result = await self.alerts.insert_one(alert_data)
        return str(result.inserted_id)
    
    async def get_user_alerts(self, user_id: str, active_only: bool = False) -> List[Dict[str, Any]]:
        """Get alerts for a user"""
        query = {"user_id": ObjectId(user_id)}
        if active_only:
            query["is_active"] = True
        
        cursor = self.alerts.find(query)
        return await cursor.to_list(length=None)
    
    async def update_alert(self, alert_id: str, update_data: Dict[str, Any]) -> bool:
        """Update alert"""
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.alerts.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    async def delete_alert(self, alert_id: str) -> bool:
        """Delete alert"""
        result = await self.alerts.delete_one({"_id": ObjectId(alert_id)})
        return result.deleted_count > 0
    
    # Credential operations
    async def create_credential(self, credential_data: Dict[str, Any]) -> str:
        """Create new credentials"""
        result = await self.credentials.insert_one(credential_data)
        return str(result.inserted_id)
    
    async def get_user_credentials(self, user_id: str, exchange: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get credentials for a user"""
        query = {"user_id": ObjectId(user_id)}
        if exchange:
            query["exchange"] = exchange
        
        cursor = self.credentials.find(query)
        return await cursor.to_list(length=None)
    
    async def update_credential(self, credential_id: str, update_data: Dict[str, Any]) -> bool:
        """Update credentials"""
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.credentials.update_one(
            {"_id": ObjectId(credential_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    async def delete_credential(self, credential_id: str) -> bool:
        """Delete credentials"""
        result = await self.credentials.delete_one({"_id": ObjectId(credential_id)})
        return result.deleted_count > 0

# Global database manager instance
db_manager = DatabaseManager()

async def get_database() -> DatabaseManager:
    """Dependency to get database manager"""
    if not db_manager.is_connected:
        await db_manager.connect()
    return db_manager

async def init_database():
    """Initialize database connection"""
    success = await db_manager.connect()
    if not success:
        logger.error("Failed to initialize database connection")
        raise Exception("Database connection failed")
    return db_manager

async def close_database():
    """Close database connection"""
    await db_manager.disconnect()