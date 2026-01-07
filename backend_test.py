import requests
import sys
import json
from datetime import datetime

class CryptoAPITester:
    def __init__(self, base_url="https://crypto-exchange-201.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True)
                    return True, response_data
                except:
                    self.log_test(name, True, "No JSON response")
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json().get('detail', '')
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    pass
                self.log_test(name, False, error_msg)
                return False, {}

        except requests.exceptions.RequestException as e:
            self.log_test(name, False, f"Request error: {str(e)}")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Unexpected error: {str(e)}")
            return False, {}

    def test_signup(self):
        """Test user signup"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "full_name": f"Test User {timestamp}"
        }
        
        success, response = self.run_test(
            "User Signup",
            "POST",
            "auth/signup",
            200,
            data=test_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_email = test_data['email']
            return True
        return False

    def test_login(self):
        """Test user login with created account"""
        if not hasattr(self, 'user_email'):
            self.log_test("User Login", False, "No user email available from signup")
            return False
            
        login_data = {
            "email": self.user_email,
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_get_portfolio(self):
        """Test get user portfolio"""
        success, response = self.run_test(
            "Get Portfolio",
            "GET",
            "portfolio",
            200
        )
        
        if success:
            # Verify portfolio structure
            required_fields = ['id', 'user_id', 'holdings', 'usd_balance', 'total_value']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test("Portfolio Structure", False, f"Missing fields: {missing_fields}")
                return False
            else:
                self.log_test("Portfolio Structure", True)
                
            # Check if user starts with $10,000
            if response.get('usd_balance') == 10000.0:
                self.log_test("Default USD Balance", True)
            else:
                self.log_test("Default USD Balance", False, f"Expected 10000.0, got {response.get('usd_balance')}")
        
        return success

    def test_get_markets(self):
        """Test get crypto markets"""
        success, response = self.run_test(
            "Get Crypto Markets",
            "GET",
            "crypto/markets",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            # Verify market data structure
            first_coin = response[0]
            required_fields = ['id', 'name', 'symbol', 'current_price', 'market_cap']
            missing_fields = [field for field in required_fields if field not in first_coin]
            if missing_fields:
                self.log_test("Market Data Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Market Data Structure", True)
                
        return success

    def test_get_coin_details(self):
        """Test get specific coin details"""
        success, response = self.run_test(
            "Get Bitcoin Details",
            "GET",
            "crypto/coin/bitcoin",
            200
        )
        
        if success:
            required_fields = ['id', 'name', 'symbol', 'market_data']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test("Coin Details Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Coin Details Structure", True)
        
        return success

    def test_get_transactions(self):
        """Test get user transactions"""
        success, response = self.run_test(
            "Get Transactions",
            "GET",
            "transactions",
            200
        )
        
        if success and isinstance(response, list):
            self.log_test("Transactions List", True)
        
        return success

    def test_sell_crypto_insufficient_balance(self):
        """Test selling crypto with insufficient balance"""
        sell_data = {
            "coin_id": "bitcoin",
            "coin_symbol": "btc",
            "amount": 1.0,
            "transaction_type": "sell",
            "host_url": "https://crypto-exchange-201.preview.emergentagent.com"
        }
        
        success, response = self.run_test(
            "Sell Crypto (Insufficient Balance)",
            "POST",
            "trade/sell",
            400,  # Should fail with 400
            data=sell_data
        )
        
        return success

    def test_create_checkout(self):
        """Test creating Stripe checkout session"""
        checkout_data = {
            "coin_id": "bitcoin",
            "coin_symbol": "btc",
            "amount": 0.001,
            "transaction_type": "buy",
            "host_url": "https://crypto-exchange-201.preview.emergentagent.com"
        }
        
        success, response = self.run_test(
            "Create Stripe Checkout",
            "POST",
            "trade/create-checkout",
            200,
            data=checkout_data
        )
        
        if success:
            required_fields = ['url', 'session_id']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test("Checkout Response Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Checkout Response Structure", True)
                # Store session_id for later tests
                self.session_id = response.get('session_id')
        
        return success

    def test_checkout_status(self):
        """Test getting checkout status"""
        if not hasattr(self, 'session_id'):
            self.log_test("Checkout Status", False, "No session_id available")
            return False
            
        success, response = self.run_test(
            "Get Checkout Status",
            "GET",
            f"trade/checkout-status/{self.session_id}",
            200
        )
        
        if success:
            required_fields = ['status', 'payment_status']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test("Checkout Status Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Checkout Status Structure", True)
        
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Crypto Platform API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication Tests
        print("\n📝 Authentication Tests:")
        if not self.test_signup():
            print("❌ Signup failed, stopping tests")
            return False
            
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return False
            
        self.test_get_me()
        
        # Portfolio Tests
        print("\n💰 Portfolio Tests:")
        self.test_get_portfolio()
        self.test_get_transactions()
        
        # Market Data Tests
        print("\n📊 Market Data Tests:")
        self.test_get_markets()
        self.test_get_coin_details()
        
        # Trading Tests
        print("\n🔄 Trading Tests:")
        self.test_sell_crypto_insufficient_balance()
        self.test_create_checkout()
        self.test_checkout_status()
        
        # Print Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = CryptoAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())