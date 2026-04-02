"""
Iteration 29: Test PIX data and withdrawal request features
Tests:
- PUT /api/establishments/me/pix saves PIX data correctly
- POST /api/establishments/me/withdraw creates pending withdrawal request
- POST /api/establishments/me/withdraw rejects if balance <= 0
- POST /api/establishments/me/withdraw rejects if already has pending request
- GET /api/establishments/me/financial returns pix_data and withdrawal_requests
- GET /api/admin/withdrawals returns pending_requests list
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
ESTABLISHMENT_EMAIL = "teste@estabelecimento.com"
ESTABLISHMENT_NAME = "Teste Estabelecimento"
ADMIN_EMAIL = "admin@itoke.master"
ADMIN_NAME = "Admin iToke"


class TestPixAndWithdrawal:
    """Test PIX data and withdrawal request endpoints"""
    
    @pytest.fixture(scope="class")
    def establishment_session(self):
        """Login as establishment and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ESTABLISHMENT_EMAIL,
            "name": ESTABLISHMENT_NAME,
            "role": "establishment"
        })
        assert response.status_code == 200, f"Establishment login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "No session_token in response"
        return data["session_token"]
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ADMIN_EMAIL,
            "name": ADMIN_NAME,
            "role": "admin"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "No session_token in response"
        return data["session_token"]
    
    @pytest.fixture(scope="class")
    def establishment_headers(self, establishment_session):
        """Headers with establishment auth token"""
        return {
            "Authorization": f"Bearer {establishment_session}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_session):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_session}",
            "Content-Type": "application/json"
        }
    
    def test_01_put_pix_data_saves_correctly(self, establishment_headers):
        """Test PUT /api/establishments/me/pix saves PIX data correctly"""
        pix_data = {
            "key_type": "cpf_cnpj",
            "key": "12345678901",
            "holder_name": "Teste Titular",
            "bank": "Nubank"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/establishments/me/pix",
            json=pix_data,
            headers=establishment_headers
        )
        
        assert response.status_code == 200, f"PUT PIX failed: {response.text}"
        data = response.json()
        
        # Verify response contains saved PIX data
        assert "pix_data" in data, "Response should contain pix_data"
        assert data["pix_data"]["key_type"] == "cpf_cnpj"
        assert data["pix_data"]["key"] == "12345678901"
        assert data["pix_data"]["holder_name"] == "Teste Titular"
        assert data["pix_data"]["bank"] == "Nubank"
        print("✓ PUT /api/establishments/me/pix saves PIX data correctly")
    
    def test_02_get_financial_returns_pix_data(self, establishment_headers):
        """Test GET /api/establishments/me/financial returns pix_data"""
        response = requests.get(
            f"{BASE_URL}/api/establishments/me/financial",
            headers=establishment_headers
        )
        
        assert response.status_code == 200, f"GET financial failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "withdrawable_balance" in data, "Response should contain withdrawable_balance"
        assert "pix_data" in data, "Response should contain pix_data"
        assert "withdrawal_requests" in data, "Response should contain withdrawal_requests"
        
        # Verify PIX data is returned
        if data["pix_data"]:
            assert "key_type" in data["pix_data"]
            assert "key" in data["pix_data"]
            assert "holder_name" in data["pix_data"]
            assert "bank" in data["pix_data"]
        
        print(f"✓ GET /api/establishments/me/financial returns pix_data and withdrawal_requests")
        print(f"  Balance: {data['withdrawable_balance']}, PIX: {data['pix_data'] is not None}")
    
    def test_03_withdraw_rejects_if_balance_zero(self, establishment_headers):
        """Test POST /api/establishments/me/withdraw rejects if balance <= 0"""
        # First check current balance
        financial_response = requests.get(
            f"{BASE_URL}/api/establishments/me/financial",
            headers=establishment_headers
        )
        financial_data = financial_response.json()
        current_balance = financial_data.get("withdrawable_balance", 0)
        
        if current_balance <= 0:
            # Try to withdraw when balance is 0
            response = requests.post(
                f"{BASE_URL}/api/establishments/me/withdraw",
                json={"amount": 10.0},
                headers=establishment_headers
            )
            
            assert response.status_code == 400, f"Should reject with 400, got {response.status_code}"
            data = response.json()
            assert "detail" in data
            print(f"✓ POST /api/establishments/me/withdraw rejects if balance <= 0: {data['detail']}")
        else:
            # Balance > 0, skip this test
            print(f"⚠ Skipping balance=0 test - current balance is {current_balance}")
            pytest.skip(f"Balance is {current_balance}, cannot test zero balance rejection")
    
    def test_04_withdraw_rejects_invalid_amount(self, establishment_headers):
        """Test POST /api/establishments/me/withdraw rejects invalid amount"""
        response = requests.post(
            f"{BASE_URL}/api/establishments/me/withdraw",
            json={"amount": 0},
            headers=establishment_headers
        )
        
        assert response.status_code == 400, f"Should reject with 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"✓ POST /api/establishments/me/withdraw rejects amount=0: {data['detail']}")
    
    def test_05_withdraw_rejects_negative_amount(self, establishment_headers):
        """Test POST /api/establishments/me/withdraw rejects negative amount"""
        response = requests.post(
            f"{BASE_URL}/api/establishments/me/withdraw",
            json={"amount": -10},
            headers=establishment_headers
        )
        
        assert response.status_code == 400, f"Should reject with 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"✓ POST /api/establishments/me/withdraw rejects negative amount: {data['detail']}")
    
    def test_06_check_pending_withdrawal_status(self, establishment_headers):
        """Check if there's already a pending withdrawal request"""
        response = requests.get(
            f"{BASE_URL}/api/establishments/me/financial",
            headers=establishment_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        pending_requests = [r for r in data.get("withdrawal_requests", []) if r.get("status") == "pending"]
        balance = data.get("withdrawable_balance", 0)
        
        print(f"  Current balance: R$ {balance}")
        print(f"  Pending requests: {len(pending_requests)}")
        
        if pending_requests:
            print(f"  ⚠ Already has pending request: R$ {pending_requests[0].get('amount', 0)}")
        
        return {"balance": balance, "has_pending": len(pending_requests) > 0}
    
    def test_07_withdraw_creates_pending_request_or_rejects_duplicate(self, establishment_headers):
        """Test POST /api/establishments/me/withdraw creates pending request OR rejects if already pending"""
        # First check current state
        financial_response = requests.get(
            f"{BASE_URL}/api/establishments/me/financial",
            headers=establishment_headers
        )
        financial_data = financial_response.json()
        balance = financial_data.get("withdrawable_balance", 0)
        pending_requests = [r for r in financial_data.get("withdrawal_requests", []) if r.get("status") == "pending"]
        
        if balance <= 0:
            print("⚠ Skipping withdrawal test - balance is 0")
            pytest.skip("Balance is 0, cannot test withdrawal")
            return
        
        # Try to create withdrawal
        response = requests.post(
            f"{BASE_URL}/api/establishments/me/withdraw",
            json={"amount": balance},
            headers=establishment_headers
        )
        
        if len(pending_requests) > 0:
            # Should reject because already has pending request
            assert response.status_code == 400, f"Should reject duplicate pending request, got {response.status_code}"
            data = response.json()
            assert "pendente" in data.get("detail", "").lower() or "pending" in data.get("detail", "").lower()
            print(f"✓ POST /api/establishments/me/withdraw rejects duplicate pending request: {data['detail']}")
        else:
            # Should create new pending request
            assert response.status_code == 200, f"Should create withdrawal, got {response.status_code}: {response.text}"
            data = response.json()
            assert "withdrawal_id" in data, "Response should contain withdrawal_id"
            assert data.get("status") == "pending", "Status should be pending"
            print(f"✓ POST /api/establishments/me/withdraw creates pending request: {data['withdrawal_id']}")
    
    def test_08_admin_get_withdrawals_returns_pending_requests(self, admin_headers):
        """Test GET /api/admin/withdrawals returns pending_requests list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawals",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"GET admin withdrawals failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "pending_requests" in data, "Response should contain pending_requests"
        assert "establishments_with_balance" in data, "Response should contain establishments_with_balance"
        
        # pending_requests should be a list
        assert isinstance(data["pending_requests"], list), "pending_requests should be a list"
        
        print(f"✓ GET /api/admin/withdrawals returns pending_requests list")
        print(f"  Pending requests count: {len(data['pending_requests'])}")
        print(f"  Establishments with balance: {len(data['establishments_with_balance'])}")
        
        # If there are pending requests, verify structure
        if data["pending_requests"]:
            req = data["pending_requests"][0]
            assert "withdrawal_id" in req or "establishment_id" in req, "Request should have identifier"
            assert "amount" in req, "Request should have amount"
            assert "status" in req, "Request should have status"
    
    def test_09_withdraw_rejects_exceeding_balance(self, establishment_headers):
        """Test POST /api/establishments/me/withdraw rejects amount exceeding balance"""
        # Get current balance
        financial_response = requests.get(
            f"{BASE_URL}/api/establishments/me/financial",
            headers=establishment_headers
        )
        financial_data = financial_response.json()
        balance = financial_data.get("withdrawable_balance", 0)
        
        # Try to withdraw more than balance
        response = requests.post(
            f"{BASE_URL}/api/establishments/me/withdraw",
            json={"amount": balance + 1000},
            headers=establishment_headers
        )
        
        # Should reject - either because exceeds balance or already has pending
        assert response.status_code == 400, f"Should reject with 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"✓ POST /api/establishments/me/withdraw rejects exceeding balance: {data['detail']}")


class TestRegistrationSkip:
    """Test registration skip functionality (API level)"""
    
    def test_create_establishment_minimal_data(self):
        """Test creating establishment with only business_name and category (skip flow)"""
        # Create a new test user first
        test_email = f"test_skip_{os.urandom(4).hex()}@test.com"
        
        # Login as new establishment
        login_response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": test_email,
            "name": "Test Skip User",
            "role": "establishment"
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["session_token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Create establishment with minimal data (skip flow)
        create_response = requests.post(
            f"{BASE_URL}/api/establishments",
            json={
                "business_name": "Test Skip Establishment",
                "category": "restaurante",
                "address": ""  # Empty address for skip flow
            },
            headers=headers
        )
        
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        data = create_response.json()
        
        assert "establishment_id" in data, "Response should contain establishment_id"
        assert data.get("business_name") == "Test Skip Establishment"
        assert data.get("category") == "restaurante"
        
        print(f"✓ Create establishment with minimal data (skip flow) works")
        print(f"  Establishment ID: {data['establishment_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
