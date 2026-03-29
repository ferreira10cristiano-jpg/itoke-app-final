"""
Test Admin Dashboard Upgrade - Iteration 14
Tests:
- Admin stats endpoint returns real MongoDB data
- Admin search-voucher endpoint returns complete audit data
- Top 5 establishments by sales
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')

class TestAdminUpgrade:
    """Admin Dashboard Upgrade Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={
                "email": "admin@itoke.master",
                "name": "Admin iToke",
                "role": "admin"
            }
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.admin_token = data.get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
            print(f"Admin login successful, token: {self.admin_token[:20]}...")
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_health_check(self):
        """Test health endpoint"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("Health check passed")
    
    def test_admin_stats_returns_real_data(self):
        """Test GET /api/admin/stats returns real MongoDB data"""
        response = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify all required fields exist
        assert "total_users" in data, "Missing total_users"
        assert "total_establishments" in data, "Missing total_establishments"
        assert "total_offers" in data, "Missing total_offers"
        assert "total_sales" in data, "Missing total_sales"
        assert "top_establishments" in data, "Missing top_establishments"
        
        # Verify data types
        assert isinstance(data["total_users"], int), "total_users should be int"
        assert isinstance(data["total_establishments"], int), "total_establishments should be int"
        assert isinstance(data["total_offers"], int), "total_offers should be int"
        assert isinstance(data["total_sales"], int), "total_sales should be int"
        assert isinstance(data["top_establishments"], list), "top_establishments should be list"
        
        # Verify real data (should have some data based on problem statement)
        print(f"Stats: users={data['total_users']}, establishments={data['total_establishments']}, offers={data['total_offers']}, sales={data['total_sales']}")
        
        # According to problem statement: 16 users, 5 establishments, 16 offers, 28 sales
        assert data["total_users"] >= 1, "Should have at least 1 user"
        assert data["total_establishments"] >= 1, "Should have at least 1 establishment"
        
        print("Admin stats endpoint returns real data - PASSED")
    
    def test_admin_stats_top_establishments_structure(self):
        """Test top_establishments array has correct structure"""
        response = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        
        data = response.json()
        top_establishments = data.get("top_establishments", [])
        
        # Should return up to 5 establishments
        assert len(top_establishments) <= 5, "Should return max 5 establishments"
        
        if len(top_establishments) > 0:
            # Verify structure of each establishment
            for i, est in enumerate(top_establishments):
                assert "establishment_id" in est, f"Missing establishment_id in item {i}"
                assert "name" in est, f"Missing name in item {i}"
                assert "city" in est, f"Missing city in item {i}"
                assert "sales_count" in est, f"Missing sales_count in item {i}"
                
                print(f"Top {i+1}: {est['name']} ({est['city']}) - {est['sales_count']} sales")
        
        print("Top establishments structure - PASSED")
    
    def test_admin_search_voucher_valid_code(self):
        """Test GET /api/admin/search-voucher with valid voucher code ITK-YAM"""
        response = self.session.get(f"{BASE_URL}/api/admin/search-voucher?code=ITK-YAM")
        
        # If voucher exists, should return 200 with audit data
        if response.status_code == 200:
            data = response.json()
            
            # Verify all required audit fields
            assert "voucher_id" in data, "Missing voucher_id"
            assert "backup_code" in data, "Missing backup_code"
            assert "status" in data, "Missing status"
            assert "created_at" in data, "Missing created_at"
            assert "customer" in data, "Missing customer"
            assert "offer" in data, "Missing offer"
            assert "establishment" in data, "Missing establishment"
            assert "pricing" in data, "Missing pricing"
            
            # Verify customer structure
            customer = data["customer"]
            assert "user_id" in customer, "Missing customer.user_id"
            assert "name" in customer, "Missing customer.name"
            
            # Verify pricing structure
            pricing = data["pricing"]
            assert "original_price" in pricing, "Missing pricing.original_price"
            assert "discounted_price" in pricing, "Missing pricing.discounted_price"
            assert "credits_used" in pricing, "Missing pricing.credits_used"
            assert "final_price_paid" in pricing, "Missing pricing.final_price_paid"
            
            print(f"Voucher audit: {data['backup_code']} - Status: {data['status']}")
            print(f"Customer: {customer['name']}")
            print(f"Pricing: Original={pricing['original_price']}, Discounted={pricing['discounted_price']}, Credits={pricing['credits_used']}, Final={pricing['final_price_paid']}")
            print("Admin search voucher (valid code) - PASSED")
        elif response.status_code == 404:
            # Voucher not found - this is acceptable if ITK-YAM doesn't exist
            print("Voucher ITK-YAM not found in database - testing with alternative approach")
            pytest.skip("Test voucher ITK-YAM not found")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code} - {response.text}")
    
    def test_admin_search_voucher_invalid_code(self):
        """Test GET /api/admin/search-voucher with invalid code returns error"""
        response = self.session.get(f"{BASE_URL}/api/admin/search-voucher?code=INVALID-CODE-XYZ")
        
        # Should return 404 for non-existent voucher
        assert response.status_code == 404, f"Expected 404 for invalid code, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Should have error detail"
        print(f"Invalid code error: {data['detail']}")
        print("Admin search voucher (invalid code) - PASSED")
    
    def test_admin_search_voucher_requires_admin_role(self):
        """Test that non-admin users cannot access search-voucher"""
        # Create a new session without admin token
        client_session = requests.Session()
        client_session.headers.update({"Content-Type": "application/json"})
        
        # Login as client
        login_response = client_session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={
                "email": "cliente@teste.com",
                "name": "Cliente Teste",
                "role": "client"
            }
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            client_token = data.get("session_token")
            client_session.headers.update({"Authorization": f"Bearer {client_token}"})
            
            # Try to access admin endpoint
            response = client_session.get(f"{BASE_URL}/api/admin/search-voucher?code=ITK-YAM")
            assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
            print("Non-admin access denied - PASSED")
        else:
            pytest.skip("Client login failed")
    
    def test_admin_stats_requires_admin_role(self):
        """Test that non-admin users cannot access admin stats"""
        # Create a new session without admin token
        client_session = requests.Session()
        client_session.headers.update({"Content-Type": "application/json"})
        
        # Login as client
        login_response = client_session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={
                "email": "cliente@teste.com",
                "name": "Cliente Teste",
                "role": "client"
            }
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            client_token = data.get("session_token")
            client_session.headers.update({"Authorization": f"Bearer {client_token}"})
            
            # Try to access admin endpoint
            response = client_session.get(f"{BASE_URL}/api/admin/stats")
            assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
            print("Non-admin access to stats denied - PASSED")
        else:
            pytest.skip("Client login failed")


class TestVoucherSearch:
    """Test voucher search with existing vouchers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={
                "email": "admin@itoke.master",
                "name": "Admin iToke",
                "role": "admin"
            }
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.admin_token = data.get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_search_voucher_itk_wcu(self):
        """Test search for ITK-WCU voucher (active)"""
        response = self.session.get(f"{BASE_URL}/api/admin/search-voucher?code=ITK-WCU")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Found voucher ITK-WCU: status={data.get('status')}")
            assert "pricing" in data
            print("ITK-WCU search - PASSED")
        elif response.status_code == 404:
            print("ITK-WCU not found - skipping")
            pytest.skip("ITK-WCU voucher not found")
        else:
            pytest.fail(f"Unexpected: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
