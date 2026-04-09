"""
Stripe Payment Integration Tests for iToke Platform
Tests: checkout session creation, payment status, webhook, payment history
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')

# Test credentials
CLIENT_EMAIL = "cliente@teste.com"
CLIENT_NAME = "Cliente Teste"
ADMIN_EMAIL = "admin@itoke.master"
ADMIN_NAME = "Admin iToke"
ADMIN_KEY = "admin123"

# Known active package
ACTIVE_PACKAGE_ID = "tpkg_da93faf63d66"  # Pacote Basico, R$9.99, 10 tokens


@pytest.fixture(scope="module")
def client_session():
    """Get authenticated client session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as client
    response = session.post(f"{BASE_URL}/api/auth/email-login", json={
        "email": CLIENT_EMAIL,
        "name": CLIENT_NAME,
        "role": "client"
    })
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("session_token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    pytest.skip(f"Client login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_session():
    """Get authenticated admin session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as admin
    response = session.post(f"{BASE_URL}/api/auth/email-login", json={
        "email": ADMIN_EMAIL,
        "name": ADMIN_NAME,
        "role": "admin",
        "admin_key": ADMIN_KEY
    })
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("session_token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


class TestTokenPackagesEndpoint:
    """Test token packages public endpoint"""
    
    def test_get_active_packages(self):
        """GET /api/token-packages/active - should return active packages"""
        response = requests.get(f"{BASE_URL}/api/token-packages/active")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one active package"
        
        # Verify package structure
        pkg = data[0]
        assert "config_id" in pkg, "Package should have config_id"
        assert "title" in pkg, "Package should have title"
        assert "tokens" in pkg, "Package should have tokens"
        assert "price" in pkg, "Package should have price"
        assert "active" in pkg, "Package should have active flag"
        assert pkg["active"] == True, "Package should be active"
        
        print(f"Found {len(data)} active packages")


class TestStripeCheckoutEndpoint:
    """Test Stripe checkout session creation"""
    
    def test_checkout_requires_auth(self):
        """POST /api/payments/checkout - should require authentication"""
        response = requests.post(f"{BASE_URL}/api/payments/checkout", json={
            "package_config_id": ACTIVE_PACKAGE_ID,
            "origin_url": "https://draft-offer-mode.preview.emergentagent.com"
        })
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
    
    def test_checkout_invalid_package(self, client_session):
        """POST /api/payments/checkout - should reject invalid package"""
        response = client_session.post(f"{BASE_URL}/api/payments/checkout", json={
            "package_config_id": "invalid_package_id",
            "origin_url": "https://draft-offer-mode.preview.emergentagent.com"
        })
        
        assert response.status_code == 404, f"Expected 404 for invalid package, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Should have error detail"
        print(f"Error message: {data.get('detail')}")
    
    def test_checkout_creates_session(self, client_session):
        """POST /api/payments/checkout - should create Stripe checkout session"""
        response = client_session.post(f"{BASE_URL}/api/payments/checkout", json={
            "package_config_id": ACTIVE_PACKAGE_ID,
            "origin_url": "https://draft-offer-mode.preview.emergentagent.com"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "url" in data, "Response should have checkout URL"
        assert "session_id" in data, "Response should have session_id"
        
        # Verify URL is a valid Stripe checkout URL
        checkout_url = data["url"]
        assert checkout_url.startswith("https://checkout.stripe.com") or "stripe" in checkout_url.lower(), \
            f"URL should be Stripe checkout URL, got: {checkout_url[:100]}"
        
        # Verify session_id format
        session_id = data["session_id"]
        assert session_id.startswith("cs_"), f"Session ID should start with 'cs_', got: {session_id[:20]}"
        
        print(f"Created checkout session: {session_id}")
        print(f"Checkout URL: {checkout_url[:80]}...")
        
        # Store session_id for later tests
        pytest.checkout_session_id = session_id


class TestPaymentStatusEndpoint:
    """Test payment status checking"""
    
    def test_status_requires_auth(self):
        """GET /api/payments/status/{session_id} - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/payments/status/cs_test_123")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
    
    def test_status_invalid_session(self, client_session):
        """GET /api/payments/status/{session_id} - should return 404 for invalid session"""
        response = client_session.get(f"{BASE_URL}/api/payments/status/cs_invalid_session_id")
        
        assert response.status_code == 404, f"Expected 404 for invalid session, got {response.status_code}"
    
    def test_status_valid_session(self, client_session):
        """GET /api/payments/status/{session_id} - should return status for valid session"""
        # First create a checkout session
        checkout_response = client_session.post(f"{BASE_URL}/api/payments/checkout", json={
            "package_config_id": ACTIVE_PACKAGE_ID,
            "origin_url": "https://draft-offer-mode.preview.emergentagent.com"
        })
        
        assert checkout_response.status_code == 200, f"Checkout failed: {checkout_response.text}"
        session_id = checkout_response.json()["session_id"]
        
        # Now check status
        response = client_session.get(f"{BASE_URL}/api/payments/status/{session_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Response should have status"
        assert "payment_status" in data, "Response should have payment_status"
        assert "message" in data, "Response should have message"
        
        # For unpaid session, status should be pending/open
        print(f"Payment status: {data.get('payment_status')}")
        print(f"Session status: {data.get('status')}")
        print(f"Message: {data.get('message')}")


class TestPaymentHistoryEndpoint:
    """Test payment history retrieval"""
    
    def test_history_requires_auth(self):
        """GET /api/payments/history - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/payments/history")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
    
    def test_history_returns_list(self, client_session):
        """GET /api/payments/history - should return list of transactions"""
        response = client_session.get(f"{BASE_URL}/api/payments/history")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"Found {len(data)} payment transactions in history")
        
        # If there are transactions, verify structure
        if len(data) > 0:
            txn = data[0]
            assert "transaction_id" in txn, "Transaction should have transaction_id"
            assert "session_id" in txn, "Transaction should have session_id"
            assert "user_id" in txn, "Transaction should have user_id"
            assert "amount" in txn, "Transaction should have amount"
            assert "payment_status" in txn, "Transaction should have payment_status"
            print(f"Latest transaction: {txn.get('transaction_id')} - {txn.get('payment_status')}")


class TestWebhookEndpoint:
    """Test Stripe webhook endpoint"""
    
    def test_webhook_endpoint_exists(self):
        """POST /api/webhook/stripe - endpoint should exist"""
        # Send empty body - should not crash
        response = requests.post(f"{BASE_URL}/api/webhook/stripe", 
                                 data=b"",
                                 headers={"Content-Type": "application/json"})
        
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404, "Webhook endpoint should exist"
        
        # May return error due to invalid signature/body, but endpoint exists
        print(f"Webhook endpoint response: {response.status_code}")


class TestPaymentTransactionCreation:
    """Test that checkout creates payment_transactions record"""
    
    def test_transaction_created_on_checkout(self, client_session):
        """Verify payment_transactions record is created when checkout session is created"""
        # Create checkout session
        checkout_response = client_session.post(f"{BASE_URL}/api/payments/checkout", json={
            "package_config_id": ACTIVE_PACKAGE_ID,
            "origin_url": "https://draft-offer-mode.preview.emergentagent.com"
        })
        
        assert checkout_response.status_code == 200, f"Checkout failed: {checkout_response.text}"
        session_id = checkout_response.json()["session_id"]
        
        # Check payment history - should include the new transaction
        history_response = client_session.get(f"{BASE_URL}/api/payments/history")
        assert history_response.status_code == 200
        
        transactions = history_response.json()
        
        # Find the transaction with our session_id
        matching_txn = None
        for txn in transactions:
            if txn.get("session_id") == session_id:
                matching_txn = txn
                break
        
        assert matching_txn is not None, f"Transaction with session_id {session_id} should exist in history"
        
        # Verify transaction fields
        assert matching_txn.get("payment_status") == "pending", "New transaction should be pending"
        assert matching_txn.get("package_config_id") == ACTIVE_PACKAGE_ID, "Package ID should match"
        assert matching_txn.get("amount") == 9.99, "Amount should be 9.99 for Pacote Basico"
        assert matching_txn.get("total_tokens") == 10, "Total tokens should be 10"
        
        print(f"Transaction created: {matching_txn.get('transaction_id')}")
        print(f"Status: {matching_txn.get('payment_status')}")
        print(f"Amount: R$ {matching_txn.get('amount')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
