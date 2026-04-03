"""
Iteration 35: Token System & Packages Page Testing
Tests for:
- Login as Establishment via email
- Dashboard Token Balance Card
- Dashboard Créditos Recebidos Card
- Packages page (/establishment/packages)
- Token allocation in offer creation
- Token balance validation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials
ESTABLISHMENT_EMAIL = "teste@estabelecimento.com"
ESTABLISHMENT_NAME = "Teste Estabelecimento"
ESTABLISHMENT_ROLE = "establishment"


class TestEstablishmentLogin:
    """Test establishment login via email"""
    
    def test_email_login_establishment(self):
        """Test login as establishment via email"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ESTABLISHMENT_EMAIL,
            "name": ESTABLISHMENT_NAME,
            "role": ESTABLISHMENT_ROLE
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "No session_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == ESTABLISHMENT_EMAIL
        assert data["user"]["role"] == ESTABLISHMENT_ROLE
        print(f"✓ Login successful: {data['user']['email']}")


class TestTokenBalance:
    """Test token balance endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ESTABLISHMENT_EMAIL,
            "name": ESTABLISHMENT_NAME,
            "role": ESTABLISHMENT_ROLE
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Authentication failed")
    
    def test_get_token_balance_requires_auth(self):
        """Test that token balance endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/establishments/me/tokens")
        assert response.status_code == 401, "Should require authentication"
        print("✓ Token balance endpoint requires authentication")
    
    def test_get_token_balance_returns_structure(self, auth_token):
        """Test token balance returns correct structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/establishments/me/tokens", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "total_balance" in data, "Missing total_balance"
        assert "allocated" in data, "Missing allocated"
        assert "consumed" in data, "Missing consumed"
        assert "available" in data, "Missing available"
        
        # Verify types
        assert isinstance(data["total_balance"], int), "total_balance should be int"
        assert isinstance(data["allocated"], int), "allocated should be int"
        assert isinstance(data["consumed"], int), "consumed should be int"
        assert isinstance(data["available"], int), "available should be int"
        
        print(f"✓ Token balance structure correct: {data}")


class TestPackages:
    """Test token packages endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ESTABLISHMENT_EMAIL,
            "name": ESTABLISHMENT_NAME,
            "role": ESTABLISHMENT_ROLE
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Authentication failed")
    
    def test_get_packages_requires_auth(self):
        """Test that packages endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/packages")
        assert response.status_code == 401, "Should require authentication"
        print("✓ Packages endpoint requires authentication")
    
    def test_get_packages_returns_list(self, auth_token):
        """Test packages endpoint returns list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/packages", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✓ Packages endpoint returns list with {len(data)} items")
    
    def test_purchase_package_validation_min(self, auth_token):
        """Test package purchase validation - minimum 10 tokens"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/packages", 
            headers=headers,
            json={"size": 5}  # Below minimum
        )
        assert response.status_code == 400, "Should reject size < 10"
        print("✓ Package purchase rejects size < 10")
    
    def test_purchase_package_validation_max(self, auth_token):
        """Test package purchase validation - maximum 1000 tokens"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/packages", 
            headers=headers,
            json={"size": 1500}  # Above maximum
        )
        assert response.status_code == 400, "Should reject size > 1000"
        print("✓ Package purchase rejects size > 1000")
    
    def test_purchase_package_success(self, auth_token):
        """Test successful package purchase"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get initial balance
        balance_before = requests.get(f"{BASE_URL}/api/establishments/me/tokens", headers=headers).json()
        initial_total = balance_before.get("total_balance", 0)
        
        # Purchase 50 tokens
        response = requests.post(f"{BASE_URL}/api/packages", 
            headers=headers,
            json={"size": 50}
        )
        assert response.status_code == 200, f"Purchase failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "package_id" in data, "Missing package_id"
        assert data["size"] == 50, "Size should be 50"
        assert data["total_price"] == 100.0, "Total price should be 100.0 (50 * 2.00)"
        assert data["status"] == "active", "Status should be active"
        
        # Verify balance increased
        balance_after = requests.get(f"{BASE_URL}/api/establishments/me/tokens", headers=headers).json()
        assert balance_after["total_balance"] == initial_total + 50, "Balance should increase by 50"
        
        print(f"✓ Package purchase successful: {data['package_id']}, balance: {initial_total} -> {balance_after['total_balance']}")
    
    def test_purchase_custom_amount(self, auth_token):
        """Test custom amount purchase (e.g., 75 tokens)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(f"{BASE_URL}/api/packages", 
            headers=headers,
            json={"size": 75}
        )
        assert response.status_code == 200, f"Purchase failed: {response.text}"
        data = response.json()
        
        assert data["size"] == 75, "Size should be 75"
        assert data["total_price"] == 150.0, "Total price should be 150.0 (75 * 2.00)"
        
        print(f"✓ Custom amount purchase successful: 75 tokens for R$ 150.00")


class TestEstablishmentDashboard:
    """Test establishment dashboard data"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ESTABLISHMENT_EMAIL,
            "name": ESTABLISHMENT_NAME,
            "role": ESTABLISHMENT_ROLE
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Authentication failed")
    
    def test_get_establishment_me(self, auth_token):
        """Test get my establishment endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/establishments/me", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "establishment_id" in data, "Missing establishment_id"
        assert "business_name" in data, "Missing business_name"
        assert "token_balance" in data, "Missing token_balance"
        
        print(f"✓ Establishment data: {data['business_name']}, tokens: {data['token_balance']}")
    
    def test_get_establishment_stats(self, auth_token):
        """Test establishment stats endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get establishment ID
        est_response = requests.get(f"{BASE_URL}/api/establishments/me", headers=headers)
        est_id = est_response.json().get("establishment_id")
        
        response = requests.get(f"{BASE_URL}/api/establishments/{est_id}/stats", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "stats" in data, "Missing stats"
        stats = data["stats"]
        assert "total_views" in stats, "Missing total_views"
        assert "total_qr_generated" in stats, "Missing total_qr_generated"
        assert "total_sales" in stats, "Missing total_sales"
        assert "token_balance" in stats, "Missing token_balance in stats"
        
        print(f"✓ Stats: views={stats['total_views']}, QR={stats['total_qr_generated']}, sales={stats['total_sales']}")
    
    def test_get_financial_data(self, auth_token):
        """Test establishment financial endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/establishments/me/financial", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "withdrawable_balance" in data, "Missing withdrawable_balance"
        
        print(f"✓ Financial data: withdrawable_balance={data['withdrawable_balance']}")


class TestOfferTokenAllocation:
    """Test token allocation in offer creation"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ESTABLISHMENT_EMAIL,
            "name": ESTABLISHMENT_NAME,
            "role": ESTABLISHMENT_ROLE
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Authentication failed")
    
    def test_create_offer_with_tokens(self, auth_token):
        """Test creating offer with token allocation"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get available tokens first
        balance = requests.get(f"{BASE_URL}/api/establishments/me/tokens", headers=headers).json()
        available = balance.get("available", 0)
        
        if available < 10:
            # Purchase tokens first
            requests.post(f"{BASE_URL}/api/packages", headers=headers, json={"size": 50})
            balance = requests.get(f"{BASE_URL}/api/establishments/me/tokens", headers=headers).json()
            available = balance.get("available", 0)
        
        # Create offer with token allocation
        response = requests.post(f"{BASE_URL}/api/offers", 
            headers=headers,
            json={
                "title": "TEST_Oferta com Tokens",
                "description": "Teste de alocação de tokens",
                "discount_value": 20,
                "original_price": 50.0,
                "discounted_price": 40.0,
                "tokens_allocated": 10
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["tokens_allocated"] == 10, "tokens_allocated should be 10"
        assert data["tokens_consumed"] == 0, "tokens_consumed should be 0"
        
        print(f"✓ Offer created with 10 tokens allocated: {data['offer_id']}")
    
    def test_create_offer_insufficient_tokens(self, auth_token):
        """Test creating offer with more tokens than available"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get available tokens
        balance = requests.get(f"{BASE_URL}/api/establishments/me/tokens", headers=headers).json()
        available = balance.get("available", 0)
        
        # Try to allocate more than available
        response = requests.post(f"{BASE_URL}/api/offers", 
            headers=headers,
            json={
                "title": "TEST_Oferta Insuficiente",
                "description": "Teste de saldo insuficiente",
                "discount_value": 20,
                "original_price": 50.0,
                "discounted_price": 40.0,
                "tokens_allocated": available + 1000  # More than available
            }
        )
        assert response.status_code == 400, "Should reject insufficient tokens"
        assert "insuficiente" in response.text.lower() or "insufficient" in response.text.lower(), "Should mention insufficient balance"
        
        print(f"✓ Offer creation rejected due to insufficient tokens (tried {available + 1000}, available: {available})")


class TestMyOffers:
    """Test my offers endpoint with token info"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ESTABLISHMENT_EMAIL,
            "name": ESTABLISHMENT_NAME,
            "role": ESTABLISHMENT_ROLE
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Authentication failed")
    
    def test_get_my_offers_with_token_info(self, auth_token):
        """Test that offers include token allocation info"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/establishments/me/offers", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return a list"
        
        # Check if offers have token fields
        for offer in data:
            if "tokens_allocated" in offer:
                assert "tokens_consumed" in offer, "Should have tokens_consumed if tokens_allocated exists"
                print(f"  - Offer '{offer['title']}': allocated={offer['tokens_allocated']}, consumed={offer['tokens_consumed']}")
        
        print(f"✓ My offers returned {len(data)} offers with token info")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("✓ Health endpoint OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
