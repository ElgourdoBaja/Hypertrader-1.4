"""
Authentication and Authorization Module for Hypertrader
Implements JWT-based authentication with role-based access control
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
import logging

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token scheme
security = HTTPBearer()

# Logger
logger = logging.getLogger(__name__)

class UserRole:
    """User roles with hierarchical permissions"""
    ADMIN = "admin"
    TRADER = "trader"
    VIEWER = "viewer"
    
    @classmethod
    def get_permissions(cls, role: str) -> List[str]:
        """Get permissions for a role"""
        permissions = {
            cls.ADMIN: [
                "read:all", "write:all", "delete:all", "manage:users",
                "manage:strategies", "execute:trades", "view:analytics"
            ],
            cls.TRADER: [
                "read:own", "write:own", "manage:strategies", 
                "execute:trades", "view:analytics"
            ],
            cls.VIEWER: [
                "read:own", "view:analytics"
            ]
        }
        return permissions.get(role, [])

class UserCreate(BaseModel):
    """User creation model"""
    username: str
    email: EmailStr
    password: str
    role: str = UserRole.TRADER
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    """User login model"""
    username: str
    password: str

class UserResponse(BaseModel):
    """User response model (without password)"""
    id: str
    username: str
    email: str
    role: str
    full_name: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    last_login: Optional[datetime] = None

class Token(BaseModel):
    """Token response model"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenData(BaseModel):
    """Token data model"""
    username: Optional[str] = None
    user_id: Optional[str] = None
    role: Optional[str] = None
    permissions: List[str] = []

class PasswordUtils:
    """Password utility functions"""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def validate_password_strength(password: str) -> bool:
        """Validate password strength"""
        if len(password) < 8:
            return False
        if not any(c.isupper() for c in password):
            return False
        if not any(c.islower() for c in password):
            return False
        if not any(c.isdigit() for c in password):
            return False
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            return False
        return True

class JWTManager:
    """JWT token management"""
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create an access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: Dict[str, Any]) -> str:
        """Create a refresh token"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """Verify and decode a token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != token_type:
                return None
            return payload
        except JWTError as e:
            logger.error(f"JWT verification error: {e}")
            return None

class AuthManager:
    """Authentication manager"""
    
    def __init__(self, db_manager):
        self.db = db_manager
        self.jwt_manager = JWTManager()
        self.password_utils = PasswordUtils()
    
    async def create_user(self, user_data: UserCreate) -> UserResponse:
        """Create a new user"""
        # Validate password strength
        if not self.password_utils.validate_password_strength(user_data.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password does not meet security requirements"
            )
        
        # Check if user exists
        existing_user = await self.db.users.find_one({
            "$or": [
                {"username": user_data.username},
                {"email": user_data.email}
            ]
        })
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already registered"
            )
        
        # Validate role
        if user_data.role not in [UserRole.ADMIN, UserRole.TRADER, UserRole.VIEWER]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role specified"
            )
        
        # Create user document
        user_doc = {
            "username": user_data.username,
            "email": user_data.email,
            "password_hash": self.password_utils.get_password_hash(user_data.password),
            "role": user_data.role,
            "full_name": user_data.full_name,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "last_login": None,
            "login_attempts": 0,
            "locked_until": None
        }
        
        result = await self.db.users.insert_one(user_doc)
        user_doc["id"] = str(result.inserted_id)
        
        return UserResponse(**user_doc)
    
    async def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate a user"""
        user = await self.db.users.find_one({"username": username})
        
        if not user:
            return None
        
        # Check if account is locked
        if user.get("locked_until") and user["locked_until"] > datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account is temporarily locked due to too many failed login attempts"
            )
        
        # Check if account is active
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated"
            )
        
        # Verify password
        if not self.password_utils.verify_password(password, user["password_hash"]):
            # Increment login attempts
            await self.db.users.update_one(
                {"_id": user["_id"]},
                {
                    "$inc": {"login_attempts": 1},
                    "$set": {
                        "locked_until": datetime.now(timezone.utc) + timedelta(minutes=15)
                        if user.get("login_attempts", 0) >= 4 else None
                    }
                }
            )
            return None
        
        # Reset login attempts and update last login
        await self.db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "last_login": datetime.now(timezone.utc),
                    "login_attempts": 0,
                    "locked_until": None
                }
            }
        )
        
        return user
    
    async def create_tokens(self, user: Dict[str, Any]) -> Token:
        """Create access and refresh tokens for a user"""
        token_data = {
            "sub": user["username"],
            "user_id": str(user["_id"]),
            "role": user["role"],
            "permissions": UserRole.get_permissions(user["role"])
        }
        
        access_token = self.jwt_manager.create_access_token(token_data)
        refresh_token = self.jwt_manager.create_refresh_token({"sub": user["username"]})
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    async def refresh_access_token(self, refresh_token: str) -> Token:
        """Refresh an access token using a refresh token"""
        payload = self.jwt_manager.verify_token(refresh_token, "refresh")
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        username = payload.get("sub")
        user = await self.db.users.find_one({"username": username})
        
        if not user or not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        return await self.create_tokens(user)
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
        """Get current authenticated user"""
        token = credentials.credentials
        payload = self.jwt_manager.verify_token(token)
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        username = payload.get("sub")
        user = await self.db.users.find_one({"username": username})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated"
            )
        
        # Add token data to user
        user["token_data"] = TokenData(
            username=username,
            user_id=str(user["_id"]),
            role=user["role"],
            permissions=UserRole.get_permissions(user["role"])
        )
        
        return user

def require_permission(permission: str):
    """Decorator to require specific permission"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Get current user from kwargs
            current_user = None
            for arg in args:
                if isinstance(arg, dict) and "token_data" in arg:
                    current_user = arg
                    break
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            token_data = current_user.get("token_data")
            if not token_data or permission not in token_data.permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission '{permission}' required"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_role(role: str):
    """Decorator to require specific role"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Get current user from kwargs
            current_user = None
            for arg in args:
                if isinstance(arg, dict) and "token_data" in arg:
                    current_user = arg
                    break
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if current_user.get("role") != role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role '{role}' required"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Rate limiting for authentication endpoints
class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self.attempts = {}
    
    def is_allowed(self, key: str, max_attempts: int = 5, window_minutes: int = 15) -> bool:
        """Check if request is allowed based on rate limiting"""
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=window_minutes)
        
        if key not in self.attempts:
            self.attempts[key] = []
        
        # Remove old attempts
        self.attempts[key] = [
            attempt for attempt in self.attempts[key] 
            if attempt > window_start
        ]
        
        # Check if under limit
        if len(self.attempts[key]) >= max_attempts:
            return False
        
        # Add current attempt
        self.attempts[key].append(now)
        return True

# Global rate limiter instance
rate_limiter = RateLimiter()