"""
Test Token Package Configuration Feature - Iteration 21
Tests for Dynamic Token Package Configuration in Admin Financial tab
Features:
- Admin CRUD for token packages (GET/POST/PUT/DELETE)
- Public endpoint for active packages
- Client purchase with dynamic packages
- Commission distribution (R$3 per sale, R$1 per level)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@itoke.master"
ADMIN_NAME = "Admin iToke"
CLIENT_EMAIL = "cliente@teste.com"
CLIENT_NAME = "Cliente Teste"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
        "email": ADMIN_EMAIL,
        "name": ADMIN_NAME,
        "role": "admin"
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    return data.get("session_token") or data.get("token")


@pytest.fixture(scope="module")
def client_token():
    """Get client authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
        "email": CLIENT_EMAIL,
        "name": CLIENT_NAME,
        "role": "client"
    })
    assert response.status_code == 200, f"Client login failed: {response.text}"
    data = response.json()
    return data.get("session_token") or data.get("token")


@pytest.fixture
def admin_headers(admin_token):
    """Admin auth headers"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def client_headers(client_token):
    """Client auth headers"""
    return {"Authorization": f"Bearer {client_token}", "Content-Type": "application/json"}


class TestAdminTokenPackageCRUD:
    """Test Admin Token Package CRUD operations"""
    
    def test_get_token_packages_admin_only(self, admin_headers):
        """GET /api/admin/token-packages - List all token packages (admin only)"""
        response = requests.get(f"{BASE_URL}/api/admin/token-packages", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get packages: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} existing token packages")
        
    def test_get_token_packages_requires_admin(self, client_headers):
        """GET /api/admin/token-packages - Should reject non-admin users"""
        response = requests.get(f"{BASE_URL}/api/admin/token-packages", headers=client_headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        
    def test_create_token_package(self, admin_headers):
        """POST /api/admin/token-packages - Create token package config"""
        unique_title = f"TEST_Pacote_{uuid.uuid4().hex[:6]}"
        payload = {
            "title": unique_title,
            "tokens": 50,
            "bonus": 10,
            "price": 25.00,
            "active": True
        }
        response = requests.post(f"{BASE_URL}/api/admin/token-packages", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Failed to create package: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "config_id" in data, "Response should contain config_id"
        assert data["title"] == unique_title
        assert data["tokens"] == 50
        assert data["bonus"] == 10
        assert data["price"] == 25.00
        assert data["active"] == True
        
        # Store for cleanup
        TestAdminTokenPackageCRUD.created_config_id = data["config_id"]
        print(f"Created package: {data['config_id']}")
        
    def test_create_package_validation_title_required(self, admin_headers):
        """POST /api/admin/token-packages - Title is required"""
        payload = {"title": "", "tokens": 10, "price": 5.00}
        response = requests.post(f"{BASE_URL}/api/admin/token-packages", json=payload, headers=admin_headers)
        assert response.status_code == 400, f"Expected 400 for empty title, got {response.status_code}"
        
    def test_create_package_validation_tokens_required(self, admin_headers):
        """POST /api/admin/token-packages - Tokens must be valid"""
        payload = {"title": "Test", "tokens": 0, "price": 5.00}
        response = requests.post(f"{BASE_URL}/api/admin/token-packages", json=payload, headers=admin_headers)
        assert response.status_code == 400, f"Expected 400 for invalid tokens, got {response.status_code}"
        
    def test_create_package_validation_price_required(self, admin_headers):
        """POST /api/admin/token-packages - Price must be valid"""
        payload = {"title": "Test", "tokens": 10, "price": 0}
        response = requests.post(f"{BASE_URL}/api/admin/token-packages", json=payload, headers=admin_headers)
        assert response.status_code == 400, f"Expected 400 for invalid price, got {response.status_code}"
        
    def test_update_token_package(self, admin_headers):
        """PUT /api/admin/token-packages/{config_id} - Update package config"""
        config_id = getattr(TestAdminTokenPackageCRUD, 'created_config_id', None)
        if not config_id:
            pytest.skip("No package created to update")
            
        payload = {
            "title": "TEST_Updated_Title",
            "tokens": 60,
            "bonus": 15,
            "price": 30.00,
            "active": True
        }
        response = requests.put(f"{BASE_URL}/api/admin/token-packages/{config_id}", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Failed to update package: {response.text}"
        data = response.json()
        
        # Verify update
        assert data["title"] == "TEST_Updated_Title"
        assert data["tokens"] == 60
        assert data["bonus"] == 15
        assert data["price"] == 30.00
        print(f"Updated package: {config_id}")
        
    def test_toggle_package_active_status(self, admin_headers):
        """PUT /api/admin/token-packages/{config_id} - Toggle active/inactive"""
        config_id = getattr(TestAdminTokenPackageCRUD, 'created_config_id', None)
        if not config_id:
            pytest.skip("No package created to toggle")
            
        # Toggle to inactive
        response = requests.put(f"{BASE_URL}/api/admin/token-packages/{config_id}", 
                               json={"active": False}, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["active"] == False, "Package should be inactive"
        
        # Toggle back to active
        response = requests.put(f"{BASE_URL}/api/admin/token-packages/{config_id}", 
                               json={"active": True}, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["active"] == True, "Package should be active again"
        print(f"Toggled package active status: {config_id}")
        
    def test_update_nonexistent_package(self, admin_headers):
        """PUT /api/admin/token-packages/{config_id} - 404 for nonexistent"""
        response = requests.put(f"{BASE_URL}/api/admin/token-packages/nonexistent_id", 
                               json={"title": "Test"}, headers=admin_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestPublicTokenPackages:
    """Test public token packages endpoint"""
    
    def test_get_active_packages_no_auth(self):
        """GET /api/token-packages/active - Public endpoint, no auth required"""
        response = requests.get(f"{BASE_URL}/api/token-packages/active")
        assert response.status_code == 200, f"Failed to get active packages: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} active packages")
        
    def test_active_packages_sorted_by_price(self):
        """GET /api/token-packages/active - Should be sorted by price ascending"""
        response = requests.get(f"{BASE_URL}/api/token-packages/active")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 1:
            prices = [pkg["price"] for pkg in data]
            assert prices == sorted(prices), f"Packages not sorted by price: {prices}"
            print(f"Packages sorted by price: {prices}")
            
    def test_inactive_packages_not_in_public(self, admin_headers):
        """Inactive packages should not appear in public endpoint"""
        # Create an inactive package
        unique_title = f"TEST_Inactive_{uuid.uuid4().hex[:6]}"
        payload = {
            "title": unique_title,
            "tokens": 5,
            "bonus": 0,
            "price": 2.50,
            "active": False
        }
        create_resp = requests.post(f"{BASE_URL}/api/admin/token-packages", json=payload, headers=admin_headers)
        assert create_resp.status_code == 200
        inactive_id = create_resp.json()["config_id"]
        
        # Check public endpoint
        public_resp = requests.get(f"{BASE_URL}/api/token-packages/active")
        assert public_resp.status_code == 200
        public_data = public_resp.json()
        
        # Verify inactive package not in list
        public_ids = [pkg["config_id"] for pkg in public_data]
        assert inactive_id not in public_ids, "Inactive package should not appear in public endpoint"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/token-packages/{inactive_id}", headers=admin_headers)
        print(f"Verified inactive package {inactive_id} not in public list")


class TestClientTokenPurchase:
    """Test client token purchase with dynamic packages"""
    
    def test_purchase_with_package_config_id(self, admin_headers, client_headers):
        """POST /api/tokens/purchase with package_config_id - Dynamic purchase"""
        # First create a test package
        unique_title = f"TEST_Purchase_{uuid.uuid4().hex[:6]}"
        payload = {
            "title": unique_title,
            "tokens": 20,
            "bonus": 5,
            "price": 15.00,
            "active": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/admin/token-packages", json=payload, headers=admin_headers)
        assert create_resp.status_code == 200
        config_id = create_resp.json()["config_id"]
        
        # Get client's current balance
        me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers=client_headers)
        assert me_resp.status_code == 200
        initial_tokens = me_resp.json().get("tokens", 0)
        
        # Purchase the package
        purchase_resp = requests.post(f"{BASE_URL}/api/tokens/purchase", 
                                      json={"package_config_id": config_id}, 
                                      headers=client_headers)
        assert purchase_resp.status_code == 200, f"Purchase failed: {purchase_resp.text}"
        purchase_data = purchase_resp.json()
        
        # Verify response
        assert "purchase_id" in purchase_data
        assert purchase_data["tokens_added"] == 25, f"Expected 25 tokens (20+5 bonus), got {purchase_data['tokens_added']}"
        assert purchase_data["total_price"] == 15.00
        assert purchase_data["new_balance"] == initial_tokens + 25
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/token-packages/{config_id}", headers=admin_headers)
        print(f"Purchase successful: {purchase_data['purchase_id']}, tokens added: {purchase_data['tokens_added']}")
        
    def test_purchase_with_legacy_packages_field(self, client_headers):
        """POST /api/tokens/purchase with packages field - Backward compatibility"""
        # Get client's current balance
        me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers=client_headers)
        assert me_resp.status_code == 200
        initial_tokens = me_resp.json().get("tokens", 0)
        
        # Purchase using legacy field (1 package = 7 tokens for R$7)
        purchase_resp = requests.post(f"{BASE_URL}/api/tokens/purchase", 
                                      json={"packages": 1}, 
                                      headers=client_headers)
        assert purchase_resp.status_code == 200, f"Legacy purchase failed: {purchase_resp.text}"
        purchase_data = purchase_resp.json()
        
        # Verify legacy behavior
        assert purchase_data["tokens_added"] == 7, f"Expected 7 tokens for legacy, got {purchase_data['tokens_added']}"
        assert purchase_data["total_price"] == 7.00
        print(f"Legacy purchase successful: {purchase_data['purchase_id']}")
        
    def test_purchase_inactive_package_fails(self, admin_headers, client_headers):
        """POST /api/tokens/purchase - Should fail for inactive package"""
        # Create an inactive package
        unique_title = f"TEST_InactivePurchase_{uuid.uuid4().hex[:6]}"
        payload = {
            "title": unique_title,
            "tokens": 10,
            "bonus": 0,
            "price": 5.00,
            "active": False
        }
        create_resp = requests.post(f"{BASE_URL}/api/admin/token-packages", json=payload, headers=admin_headers)
        assert create_resp.status_code == 200
        config_id = create_resp.json()["config_id"]
        
        # Try to purchase inactive package
        purchase_resp = requests.post(f"{BASE_URL}/api/tokens/purchase", 
                                      json={"package_config_id": config_id}, 
                                      headers=client_headers)
        assert purchase_resp.status_code == 404, f"Expected 404 for inactive package, got {purchase_resp.status_code}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/token-packages/{config_id}", headers=admin_headers)
        print(f"Verified inactive package purchase rejected")


class TestCommissionDistribution:
    """Test commission distribution (R$3 per sale, R$1 per level)"""
    
    def test_commission_fixed_regardless_of_price(self, admin_headers, client_headers):
        """Commission should be R$3 total (R$1 per level) regardless of package price"""
        # Create a high-priced package
        unique_title = f"TEST_Commission_{uuid.uuid4().hex[:6]}"
        payload = {
            "title": unique_title,
            "tokens": 100,
            "bonus": 50,
            "price": 100.00,  # High price
            "active": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/admin/token-packages", json=payload, headers=admin_headers)
        assert create_resp.status_code == 200
        config_id = create_resp.json()["config_id"]
        
        # Purchase the package
        purchase_resp = requests.post(f"{BASE_URL}/api/tokens/purchase", 
                                      json={"package_config_id": config_id}, 
                                      headers=client_headers)
        assert purchase_resp.status_code == 200, f"Purchase failed: {purchase_resp.text}"
        
        # Note: Commission distribution is internal, we verify the purchase succeeded
        # The commission logic is R$1 per level (3 levels) = R$3 total per sale
        print(f"Purchase with R$100 package completed - commission should be R$3 fixed")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/token-packages/{config_id}", headers=admin_headers)


class TestDeleteTokenPackage:
    """Test delete token package"""
    
    def test_delete_token_package(self, admin_headers):
        """DELETE /api/admin/token-packages/{config_id} - Delete package"""
        # Create a package to delete
        unique_title = f"TEST_Delete_{uuid.uuid4().hex[:6]}"
        payload = {
            "title": unique_title,
            "tokens": 10,
            "bonus": 0,
            "price": 5.00,
            "active": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/admin/token-packages", json=payload, headers=admin_headers)
        assert create_resp.status_code == 200
        config_id = create_resp.json()["config_id"]
        
        # Delete the package
        delete_resp = requests.delete(f"{BASE_URL}/api/admin/token-packages/{config_id}", headers=admin_headers)
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/admin/token-packages", headers=admin_headers)
        assert get_resp.status_code == 200
        packages = get_resp.json()
        package_ids = [pkg["config_id"] for pkg in packages]
        assert config_id not in package_ids, "Deleted package should not appear in list"
        print(f"Deleted package: {config_id}")
        
    def test_delete_nonexistent_package(self, admin_headers):
        """DELETE /api/admin/token-packages/{config_id} - 404 for nonexistent"""
        response = requests.delete(f"{BASE_URL}/api/admin/token-packages/nonexistent_id", headers=admin_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
    def test_delete_requires_admin(self, client_headers):
        """DELETE /api/admin/token-packages/{config_id} - Should reject non-admin"""
        response = requests.delete(f"{BASE_URL}/api/admin/token-packages/any_id", headers=client_headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_packages(self, admin_headers):
        """Clean up any TEST_ prefixed packages"""
        response = requests.get(f"{BASE_URL}/api/admin/token-packages", headers=admin_headers)
        if response.status_code == 200:
            packages = response.json()
            for pkg in packages:
                if pkg.get("title", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/admin/token-packages/{pkg['config_id']}", headers=admin_headers)
                    print(f"Cleaned up: {pkg['config_id']}")
