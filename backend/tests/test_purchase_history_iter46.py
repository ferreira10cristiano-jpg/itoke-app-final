"""
Test Purchase History Feature - Iteration 46
Tests:
- GET /api/payments/purchase-history - returns completed purchases for logged in user
- GET /api/payments/receipt/{transaction_id}/pdf - generates PDF receipt
- GET /api/payments/receipt/invalid_id/pdf - returns 404 for non-existing transaction
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
CLIENT_EMAIL = "cliente@teste.com"
CLIENT_NAME = "Cliente Teste"

ESTABLISHMENT_EMAIL = "teste@estabelecimento.com"
ESTABLISHMENT_NAME = "Teste Estabelecimento"

def get_unique_ip():
    """Generate unique IP to avoid rate limiting"""
    return f"10.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}"


class TestPurchaseHistoryAPI:
    """Tests for purchase history endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as client user"""
        self.session = requests.Session()
        unique_ip = get_unique_ip()
        self.session.headers.update({
            "Content-Type": "application/json",
            "X-Forwarded-For": unique_ip
        })
        
        # Login as client
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": CLIENT_EMAIL, "name": CLIENT_NAME}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        login_data = login_response.json()
        self.token = login_data.get("session_token")
        self.user = login_data.get("user")
        assert self.token, "No session_token in login response"
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        print(f"Logged in as {CLIENT_EMAIL}, user_id: {self.user.get('user_id')}")
    
    def test_purchase_history_returns_list(self):
        """GET /api/payments/purchase-history returns list of completed purchases"""
        response = self.session.get(f"{BASE_URL}/api/payments/purchase-history")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        
        print(f"Purchase history returned {len(data)} items")
        
        # If there are purchases, validate structure
        if len(data) > 0:
            purchase = data[0]
            # Validate required fields
            assert "id" in purchase, "Missing 'id' field"
            assert "type" in purchase, "Missing 'type' field"
            assert "package_title" in purchase, "Missing 'package_title' field"
            assert "total_tokens" in purchase, "Missing 'total_tokens' field"
            assert "amount" in purchase, "Missing 'amount' field"
            assert "currency" in purchase, "Missing 'currency' field"
            assert "payment_method" in purchase, "Missing 'payment_method' field"
            assert "status" in purchase, "Missing 'status' field"
            assert "created_at" in purchase, "Missing 'created_at' field"
            
            print(f"First purchase: id={purchase['id']}, type={purchase['type']}, tokens={purchase['total_tokens']}, amount={purchase['amount']}")
            
            # Store for receipt test
            self.first_purchase_id = purchase['id']
        
        return data
    
    def test_purchase_history_requires_auth(self):
        """GET /api/payments/purchase-history requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.get(f"{BASE_URL}/api/payments/purchase-history")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"Correctly returned {response.status_code} without auth")
    
    def test_receipt_pdf_for_valid_transaction(self):
        """GET /api/payments/receipt/{transaction_id}/pdf generates PDF for valid purchase"""
        # First get purchase history to find a valid transaction ID
        history_response = self.session.get(f"{BASE_URL}/api/payments/purchase-history")
        assert history_response.status_code == 200
        
        purchases = history_response.json()
        
        if len(purchases) == 0:
            pytest.skip("No purchases found for this user - cannot test PDF receipt")
        
        transaction_id = purchases[0]['id']
        print(f"Testing PDF receipt for transaction: {transaction_id}")
        
        # Request PDF
        response = self.session.get(f"{BASE_URL}/api/payments/receipt/{transaction_id}/pdf")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Validate content type is PDF
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected PDF content type, got {content_type}"
        
        # Validate response has content
        assert len(response.content) > 0, "PDF response is empty"
        
        # Check PDF magic bytes (PDF files start with %PDF)
        assert response.content[:4] == b'%PDF', "Response does not appear to be a valid PDF"
        
        print(f"PDF receipt generated successfully, size: {len(response.content)} bytes")
    
    def test_receipt_pdf_returns_404_for_invalid_id(self):
        """GET /api/payments/receipt/invalid_id/pdf returns 404 for non-existing transaction"""
        invalid_id = "invalid_transaction_id_12345"
        
        response = self.session.get(f"{BASE_URL}/api/payments/receipt/{invalid_id}/pdf")
        
        assert response.status_code == 404, f"Expected 404 for invalid ID, got {response.status_code}: {response.text}"
        
        # Check error message
        data = response.json()
        assert "detail" in data or "message" in data, "Expected error detail in response"
        print(f"Correctly returned 404 for invalid transaction ID: {data}")
    
    def test_receipt_pdf_requires_auth(self):
        """GET /api/payments/receipt/{id}/pdf requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        # Use any transaction ID
        response = no_auth_session.get(f"{BASE_URL}/api/payments/receipt/some_id/pdf")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"Correctly returned {response.status_code} without auth for PDF endpoint")
    
    def test_receipt_pdf_user_can_only_access_own_receipts(self):
        """User cannot access receipts from other users"""
        # First get a valid transaction ID from client user
        history_response = self.session.get(f"{BASE_URL}/api/payments/purchase-history")
        assert history_response.status_code == 200
        
        purchases = history_response.json()
        
        if len(purchases) == 0:
            pytest.skip("No purchases found for client user")
        
        transaction_id = purchases[0]['id']
        
        # Now login as establishment user
        est_session = requests.Session()
        est_unique_ip = get_unique_ip()
        est_session.headers.update({
            "Content-Type": "application/json",
            "X-Forwarded-For": est_unique_ip
        })
        
        login_response = est_session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": ESTABLISHMENT_EMAIL, "name": ESTABLISHMENT_NAME}
        )
        assert login_response.status_code == 200
        
        est_token = login_response.json().get("session_token")
        est_session.headers.update({"Authorization": f"Bearer {est_token}"})
        
        # Try to access client's receipt as establishment user
        response = est_session.get(f"{BASE_URL}/api/payments/receipt/{transaction_id}/pdf")
        
        # Should return 404 (not found for this user) or 403 (forbidden)
        assert response.status_code in [404, 403], f"Expected 404/403 when accessing other user's receipt, got {response.status_code}"
        print(f"Correctly denied access to other user's receipt: {response.status_code}")


class TestPaymentHistoryEndpoint:
    """Tests for the original payment history endpoint (for comparison)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as client user"""
        self.session = requests.Session()
        unique_ip = get_unique_ip()
        self.session.headers.update({
            "Content-Type": "application/json",
            "X-Forwarded-For": unique_ip
        })
        
        # Login as client
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": CLIENT_EMAIL, "name": CLIENT_NAME}
        )
        assert login_response.status_code == 200
        
        login_data = login_response.json()
        self.token = login_data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_payment_history_endpoint_exists(self):
        """GET /api/payments/history endpoint exists and returns data"""
        response = self.session.get(f"{BASE_URL}/api/payments/history")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        
        print(f"Payment history returned {len(data)} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
