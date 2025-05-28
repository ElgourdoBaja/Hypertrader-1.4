"""
Comprehensive Test Suite for Authentication and MongoDB Integration
"""

import pytest
import asyncio
import os
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Set test environment
os.environ["MONGODB_URL"] = "mongodb://localhost:27017"
os.environ["DATABASE_NAME"] = "hypertrader_test"
os.environ["SECRET_KEY"] = "test_secret_key_for_testing_only"

from server_with_auth import app
from database import DatabaseManager, DatabaseConfig
from auth import AuthManager, UserCreate, UserRole, PasswordUtils, JWTManager

# Test client
client = TestClient(app)

class TestDatabaseIntegration:
    """Test MongoDB database integration"""
    
    @pytest.fixture
    async def db_manager(self):
        """Create test database manager"""
        config = DatabaseConfig()
        config.database_name = "hypertrader_test"
        db_manager = DatabaseManager(config)
        
        # Connect to database
        success = await db_manager.connect()
        assert success, "Failed to connect to test database"
        
        yield db_manager
        
        # Cleanup: Drop test database
        await db_manager.client.drop_database("hypertrader_test")
        await db_manager.disconnect()
    
    @pytest.mark.asyncio
    async def test_database_connection(self, db_manager):
        """Test database connection"""
        assert db_manager.is_connected
        
        # Test health check
        health = await db_manager.health_check()
        assert health["status"] == "healthy"
        assert health["database"] == "hypertrader_test"
    
    @pytest.mark.asyncio
    async def test_user_operations(self, db_manager):
        """Test user CRUD operations"""
        # Create user
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password_hash": "hashed_password",
            "role": UserRole.TRADER,
            "full_name": "Test User",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "login_attempts": 0
        }
        
        user_id = await db_manager.create_user(user_data)
        assert user_id
        
        # Get user by username
        user = await db_manager.get_user_by_username("testuser")
        assert user
        assert user["email"] == "test@example.com"
        assert user["role"] == UserRole.TRADER
        
        # Get user by ID
        user_by_id = await db_manager.get_user_by_id(user_id)
        assert user_by_id
        assert str(user_by_id["_id"]) == user_id
        
        # Update user
        update_data = {"full_name": "Updated Test User"}
        success = await db_manager.update_user(user_id, update_data)
        assert success
        
        # Verify update
        updated_user = await db_manager.get_user_by_id(user_id)
        assert updated_user["full_name"] == "Updated Test User"
    
    @pytest.mark.asyncio
    async def test_strategy_operations(self, db_manager):
        """Test strategy CRUD operations"""
        # Create user first
        user_data = {
            "username": "strategist",
            "email": "strategist@example.com",
            "password_hash": "hashed_password",
            "role": UserRole.TRADER,
            "created_at": datetime.now(timezone.utc)
        }
        user_id = await db_manager.create_user(user_data)
        
        # Create strategy
        strategy_data = {
            "user_id": ObjectId(user_id),
            "name": "Test Strategy",
            "description": "A test trading strategy",
            "strategy_type": "momentum",
            "parameters": {"rsi_period": 14, "threshold": 70},
            "is_active": False,
            "created_at": datetime.now(timezone.utc)
        }
        
        strategy_id = await db_manager.create_strategy(strategy_data)
        assert strategy_id
        
        # Get user strategies
        strategies = await db_manager.get_user_strategies(user_id)
        assert len(strategies) == 1
        assert strategies[0]["name"] == "Test Strategy"
        
        # Get strategy by ID
        strategy = await db_manager.get_strategy_by_id(strategy_id)
        assert strategy
        assert strategy["strategy_type"] == "momentum"
        
        # Update strategy
        update_data = {"is_active": True, "parameters": {"rsi_period": 21}}
        success = await db_manager.update_strategy(strategy_id, update_data)
        assert success
        
        # Verify update
        updated_strategy = await db_manager.get_strategy_by_id(strategy_id)
        assert updated_strategy["is_active"] == True
        assert updated_strategy["parameters"]["rsi_period"] == 21
        
        # Delete strategy
        success = await db_manager.delete_strategy(strategy_id)
        assert success
        
        # Verify deletion
        deleted_strategy = await db_manager.get_strategy_by_id(strategy_id)
        assert deleted_strategy is None
    
    @pytest.mark.asyncio
    async def test_alert_operations(self, db_manager):
        """Test alert CRUD operations"""
        # Create user first
        user_data = {
            "username": "alertuser",
            "email": "alert@example.com",
            "password_hash": "hashed_password",
            "role": UserRole.TRADER,
            "created_at": datetime.now(timezone.utc)
        }
        user_id = await db_manager.create_user(user_data)
        
        # Create alert
        alert_data = {
            "user_id": ObjectId(user_id),
            "symbol": "BTC-PERP",
            "condition": "above",
            "target_price": 50000.0,
            "message": "BTC above $50k",
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }
        
        alert_id = await db_manager.create_alert(alert_data)
        assert alert_id
        
        # Get user alerts
        alerts = await db_manager.get_user_alerts(user_id)
        assert len(alerts) == 1
        assert alerts[0]["symbol"] == "BTC-PERP"
        
        # Get active alerts only
        active_alerts = await db_manager.get_user_alerts(user_id, active_only=True)
        assert len(active_alerts) == 1
        
        # Update alert
        update_data = {"target_price": 55000.0, "is_active": False}
        success = await db_manager.update_alert(alert_id, update_data)
        assert success
        
        # Verify update
        updated_alerts = await db_manager.get_user_alerts(user_id, active_only=True)
        assert len(updated_alerts) == 0  # Should be empty since alert is inactive
        
        # Delete alert
        success = await db_manager.delete_alert(alert_id)
        assert success
        
        # Verify deletion
        remaining_alerts = await db_manager.get_user_alerts(user_id)
        assert len(remaining_alerts) == 0

class TestAuthentication:
    """Test authentication system"""
    
    @pytest.fixture
    async def auth_manager(self):
        """Create test authentication manager"""
        config = DatabaseConfig()
        config.database_name = "hypertrader_auth_test"
        db_manager = DatabaseManager(config)
        
        success = await db_manager.connect()
        assert success
        
        auth_manager = AuthManager(db_manager)
        
        yield auth_manager
        
        # Cleanup
        await db_manager.client.drop_database("hypertrader_auth_test")
        await db_manager.disconnect()
    
    def test_password_utils(self):
        """Test password utility functions"""
        password = "TestPassword123!"
        
        # Test password strength validation
        assert PasswordUtils.validate_password_strength(password)
        assert not PasswordUtils.validate_password_strength("weak")
        assert not PasswordUtils.validate_password_strength("NoNumbers!")
        assert not PasswordUtils.validate_password_strength("nonumbers123!")
        assert not PasswordUtils.validate_password_strength("NoSpecialChars123")
        
        # Test password hashing
        hashed = PasswordUtils.get_password_hash(password)
        assert hashed != password
        assert PasswordUtils.verify_password(password, hashed)
        assert not PasswordUtils.verify_password("wrong_password", hashed)
    
    def test_jwt_manager(self):
        """Test JWT token management"""
        jwt_manager = JWTManager()
        
        # Test access token creation and verification
        token_data = {
            "sub": "testuser",
            "user_id": "123",
            "role": UserRole.TRADER
        }
        
        access_token = jwt_manager.create_access_token(token_data)
        assert access_token
        
        # Verify token
        payload = jwt_manager.verify_token(access_token, "access")
        assert payload
        assert payload["sub"] == "testuser"
        assert payload["role"] == UserRole.TRADER
        
        # Test refresh token
        refresh_token = jwt_manager.create_refresh_token(token_data)
        assert refresh_token
        
        refresh_payload = jwt_manager.verify_token(refresh_token, "refresh")
        assert refresh_payload
        assert refresh_payload["type"] == "refresh"
        
        # Test invalid token
        invalid_payload = jwt_manager.verify_token("invalid_token")
        assert invalid_payload is None
    
    @pytest.mark.asyncio
    async def test_user_registration(self, auth_manager):
        """Test user registration"""
        user_data = UserCreate(
            username="newuser",
            email="newuser@example.com",
            password="SecurePass123!",
            role=UserRole.TRADER,
            full_name="New User"
        )
        
        # Test successful registration
        user = await auth_manager.create_user(user_data)
        assert user.username == "newuser"
        assert user.email == "newuser@example.com"
        assert user.role == UserRole.TRADER
        assert user.is_active
        
        # Test duplicate username
        duplicate_user = UserCreate(
            username="newuser",
            email="different@example.com",
            password="SecurePass123!",
            role=UserRole.TRADER
        )
        
        with pytest.raises(Exception):  # Should raise HTTPException
            await auth_manager.create_user(duplicate_user)
        
        # Test weak password
        weak_password_user = UserCreate(
            username="weakuser",
            email="weak@example.com",
            password="weak",
            role=UserRole.TRADER
        )
        
        with pytest.raises(Exception):  # Should raise HTTPException
            await auth_manager.create_user(weak_password_user)
    
    @pytest.mark.asyncio
    async def test_user_authentication(self, auth_manager):
        """Test user authentication"""
        # Create user first
        user_data = UserCreate(
            username="authuser",
            email="auth@example.com",
            password="AuthPass123!",
            role=UserRole.TRADER
        )
        
        await auth_manager.create_user(user_data)
        
        # Test successful authentication
        user = await auth_manager.authenticate_user("authuser", "AuthPass123!")
        assert user
        assert user["username"] == "authuser"
        
        # Test wrong password
        wrong_user = await auth_manager.authenticate_user("authuser", "WrongPass123!")
        assert wrong_user is None
        
        # Test non-existent user
        nonexistent_user = await auth_manager.authenticate_user("nonexistent", "AnyPass123!")
        assert nonexistent_user is None
    
    @pytest.mark.asyncio
    async def test_token_creation_and_refresh(self, auth_manager):
        """Test token creation and refresh"""
        # Create user first
        user_data = UserCreate(
            username="tokenuser",
            email="token@example.com",
            password="TokenPass123!",
            role=UserRole.TRADER
        )
        
        created_user = await auth_manager.create_user(user_data)
        
        # Authenticate user
        user = await auth_manager.authenticate_user("tokenuser", "TokenPass123!")
        assert user
        
        # Create tokens
        tokens = await auth_manager.create_tokens(user)
        assert tokens.access_token
        assert tokens.refresh_token
        assert tokens.token_type == "bearer"
        assert tokens.expires_in > 0
        
        # Test token refresh
        new_tokens = await auth_manager.refresh_access_token(tokens.refresh_token)
        assert new_tokens.access_token
        assert new_tokens.access_token != tokens.access_token  # Should be different

class TestAPIEndpoints:
    """Test API endpoints with authentication"""
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Hypertrader API v1.4"
        assert "MongoDB Integration" in data["features"]
        assert "JWT Authentication" in data["features"]
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "services" in data
    
    def test_user_registration_endpoint(self):
        """Test user registration endpoint"""
        user_data = {
            "username": "apiuser",
            "email": "api@example.com",
            "password": "ApiPass123!",
            "role": "trader",
            "full_name": "API User"
        }
        
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "apiuser"
        assert data["email"] == "api@example.com"
        assert data["role"] == "trader"
    
    def test_user_login_endpoint(self):
        """Test user login endpoint"""
        # First register a user
        user_data = {
            "username": "loginuser",
            "email": "login@example.com",
            "password": "LoginPass123!",
            "role": "trader"
        }
        
        register_response = client.post("/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Then login
        login_data = {
            "username": "loginuser",
            "password": "LoginPass123!"
        }
        
        login_response = client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200
        data = login_response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    def test_protected_endpoint_without_auth(self):
        """Test protected endpoint without authentication"""
        response = client.get("/auth/me")
        assert response.status_code == 403  # Should be forbidden without auth
    
    def test_protected_endpoint_with_auth(self):
        """Test protected endpoint with authentication"""
        # Register and login user
        user_data = {
            "username": "protecteduser",
            "email": "protected@example.com",
            "password": "ProtectedPass123!",
            "role": "trader"
        }
        
        client.post("/auth/register", json=user_data)
        
        login_data = {
            "username": "protecteduser",
            "password": "ProtectedPass123!"
        }
        
        login_response = client.post("/auth/login", json=login_data)
        tokens = login_response.json()
        
        # Access protected endpoint
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "protecteduser"
    
    def test_strategy_endpoints(self):
        """Test strategy CRUD endpoints"""
        # Register and login user
        user_data = {
            "username": "strategyuser",
            "email": "strategy@example.com",
            "password": "StrategyPass123!",
            "role": "trader"
        }
        
        client.post("/auth/register", json=user_data)
        
        login_data = {
            "username": "strategyuser",
            "password": "StrategyPass123!"
        }
        
        login_response = client.post("/auth/login", json=login_data)
        tokens = login_response.json()
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        
        # Create strategy
        strategy_data = {
            "name": "Test API Strategy",
            "description": "A test strategy via API",
            "strategy_type": "momentum",
            "parameters": {"rsi_period": 14}
        }
        
        create_response = client.post("/strategies", json=strategy_data, headers=headers)
        assert create_response.status_code == 201
        
        # Get strategies
        get_response = client.get("/strategies", headers=headers)
        assert get_response.status_code == 200
        strategies = get_response.json()
        assert len(strategies) >= 1
        
        strategy_id = create_response.json()["id"]
        
        # Update strategy
        update_data = {
            "name": "Updated API Strategy",
            "is_active": True
        }
        
        update_response = client.put(f"/strategies/{strategy_id}", json=update_data, headers=headers)
        assert update_response.status_code == 200
        
        # Delete strategy
        delete_response = client.delete(f"/strategies/{strategy_id}", headers=headers)
        assert delete_response.status_code == 200

def run_tests():
    """Run all tests"""
    print("🧪 Running Authentication and MongoDB Integration Tests...")
    
    # Run pytest
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--asyncio-mode=auto"
    ])

if __name__ == "__main__":
    run_tests()