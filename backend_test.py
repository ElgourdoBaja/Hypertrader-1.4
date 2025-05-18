
import requests
import sys
import time
from datetime import datetime

class HyperliquidAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.api_credentials = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        if not headers:
            headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.text}")
                    return False, response.json()
                except:
                    return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )

    def test_save_credentials(self):
        """Test saving API credentials"""
        credentials = {
            "api_key": "test_api_key",
            "api_secret": "test_api_secret"
        }
        self.api_credentials = credentials
        return self.run_test(
            "Save API Credentials",
            "POST",
            "credentials",
            200,
            data=credentials
        )

    def test_get_market_symbols(self):
        """Test getting market symbols"""
        return self.run_test(
            "Get Market Symbols",
            "GET",
            "market/symbols",
            200
        )

    def test_create_strategy(self):
        """Test creating a trading strategy"""
        strategy = {
            "name": "Test Strategy",
            "description": "A test trading strategy",
            "parameters": {
                "timeframe": "1h",
                "rsi_period": 14,
                "rsi_overbought": 70,
                "rsi_oversold": 30
            },
            "is_active": False
        }
        success, response = self.run_test(
            "Create Trading Strategy",
            "POST",
            "strategies",
            200,
            data=strategy
        )
        if success:
            return success, response.get("id")
        return success, None

    def test_get_strategies(self):
        """Test getting all strategies"""
        return self.run_test(
            "Get All Strategies",
            "GET",
            "strategies",
            200
        )

    def test_get_strategy(self, strategy_id):
        """Test getting a specific strategy"""
        return self.run_test(
            f"Get Strategy {strategy_id}",
            "GET",
            f"strategies/{strategy_id}",
            200
        )

    def test_update_strategy(self, strategy_id):
        """Test updating a strategy"""
        updated_strategy = {
            "id": strategy_id,
            "name": "Updated Test Strategy",
            "description": "An updated test trading strategy",
            "parameters": {
                "timeframe": "4h",
                "rsi_period": 21,
                "rsi_overbought": 75,
                "rsi_oversold": 25
            },
            "is_active": False
        }
        return self.run_test(
            f"Update Strategy {strategy_id}",
            "PUT",
            f"strategies/{strategy_id}",
            200,
            data=updated_strategy
        )

    def test_activate_strategy(self, strategy_id):
        """Test activating a strategy"""
        return self.run_test(
            f"Activate Strategy {strategy_id}",
            "POST",
            f"strategies/{strategy_id}/activate",
            200
        )

    def test_deactivate_strategy(self, strategy_id):
        """Test deactivating a strategy"""
        return self.run_test(
            f"Deactivate Strategy {strategy_id}",
            "POST",
            f"strategies/{strategy_id}/deactivate",
            200
        )

    def test_start_trading(self):
        """Test starting trading"""
        return self.run_test(
            "Start Trading",
            "POST",
            "trading/start",
            200
        )

    def test_get_trading_status(self):
        """Test getting trading status"""
        return self.run_test(
            "Get Trading Status",
            "GET",
            "trading/status",
            200
        )

    def test_stop_trading(self):
        """Test stopping trading"""
        return self.run_test(
            "Stop Trading",
            "POST",
            "trading/stop",
            200
        )

    def test_get_positions(self):
        """Test getting positions"""
        return self.run_test(
            "Get Positions",
            "GET",
            "positions",
            200
        )

    def test_get_trades(self):
        """Test getting trades"""
        return self.run_test(
            "Get Trades",
            "GET",
            "trades",
            200
        )

    def test_get_performance_metrics(self):
        """Test getting performance metrics"""
        return self.run_test(
            "Get Performance Metrics",
            "GET",
            "metrics/performance",
            200
        )

def main():
    # Get the backend URL from the frontend .env file
    backend_url = "https://1f60ef82-8f39-47fe-a36a-8b9d402f18b9.preview.emergentagent.com"
    
    print(f"Testing Hyperliquid API at: {backend_url}")
    
    # Setup tester
    tester = HyperliquidAPITester(backend_url)
    
    # Run tests
    tester.test_root_endpoint()
    tester.test_save_credentials()
    tester.test_get_market_symbols()
    
    # Test strategy CRUD operations
    success, strategy_id = tester.test_create_strategy()
    if success and strategy_id:
        tester.test_get_strategies()
        tester.test_get_strategy(strategy_id)
        tester.test_update_strategy(strategy_id)
        tester.test_activate_strategy(strategy_id)
        tester.test_get_strategy(strategy_id)  # Check if activation worked
        tester.test_deactivate_strategy(strategy_id)
    
    # Test trading operations
    tester.test_start_trading()
    tester.test_get_trading_status()
    time.sleep(2)  # Give some time for the background task to run
    tester.test_stop_trading()
    
    # Test data retrieval
    tester.test_get_positions()
    tester.test_get_trades()
    tester.test_get_performance_metrics()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
