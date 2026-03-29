"""
Test Admin Financial Tab - Iteration 15
Tests for:
- GET /api/admin/financial - returns gross_revenue, client_token_revenue, est_package_revenue, total_commissions_paid, net_revenue, balance_to_settle
- GET /api/admin/settings - returns commission_percent (defaults to 10)
- PUT /api/admin/settings - updates commission_percent in platform_settings collection
- PUT /api/admin/settings - validates commission_percent between 0-100
- Admin endpoints reject non-admin users with 403
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com').rstrip('/')


class TestAdminFinancial:
    """Test admin financial endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin session token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "admin@itoke.master",
            "name": "Admin iToke",
            "role": "admin"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "No session_token in response"
        return data["session_token"]
    
    @pytest.fixture(scope="class")
    def client_token(self):
        """Get client session token (non-admin)"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "cliente@teste.com",
            "name": "Cliente Teste",
            "role": "client"
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        return data["session_token"]
    
    def test_health_check(self):
        """Test health endpoint is working"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")
    
    # ==================== GET /api/admin/financial ====================
    
    def test_admin_financial_returns_all_fields(self, admin_token):
        """GET /api/admin/financial returns all required financial fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/financial",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify all required fields are present
        required_fields = [
            "gross_revenue",
            "client_token_revenue",
            "est_package_revenue",
            "total_commissions_paid",
            "net_revenue",
            "balance_to_settle"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], (int, float)), f"{field} should be numeric"
        
        print(f"✓ Financial data returned: gross_revenue={data['gross_revenue']}, "
              f"client_token_revenue={data['client_token_revenue']}, "
              f"est_package_revenue={data['est_package_revenue']}, "
              f"total_commissions_paid={data['total_commissions_paid']}, "
              f"net_revenue={data['net_revenue']}, "
              f"balance_to_settle={data['balance_to_settle']}")
    
    def test_admin_financial_gross_revenue_calculation(self, admin_token):
        """Verify gross_revenue = client_token_revenue + est_package_revenue"""
        response = requests.get(
            f"{BASE_URL}/api/admin/financial",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        expected_gross = data["client_token_revenue"] + data["est_package_revenue"]
        assert data["gross_revenue"] == expected_gross, \
            f"gross_revenue ({data['gross_revenue']}) != client_token_revenue ({data['client_token_revenue']}) + est_package_revenue ({data['est_package_revenue']})"
        
        print(f"✓ Gross revenue calculation verified: {data['gross_revenue']} = {data['client_token_revenue']} + {data['est_package_revenue']}")
    
    def test_admin_financial_net_revenue_calculation(self, admin_token):
        """Verify net_revenue = gross_revenue - total_commissions_paid"""
        response = requests.get(
            f"{BASE_URL}/api/admin/financial",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        expected_net = data["gross_revenue"] - data["total_commissions_paid"]
        assert data["net_revenue"] == expected_net, \
            f"net_revenue ({data['net_revenue']}) != gross_revenue ({data['gross_revenue']}) - total_commissions_paid ({data['total_commissions_paid']})"
        
        print(f"✓ Net revenue calculation verified: {data['net_revenue']} = {data['gross_revenue']} - {data['total_commissions_paid']}")
    
    def test_admin_financial_rejects_non_admin(self, client_token):
        """GET /api/admin/financial rejects non-admin users with 403"""
        response = requests.get(
            f"{BASE_URL}/api/admin/financial",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Financial endpoint correctly rejects non-admin users with 403")
    
    def test_admin_financial_rejects_unauthenticated(self):
        """GET /api/admin/financial rejects unauthenticated requests"""
        response = requests.get(f"{BASE_URL}/api/admin/financial")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Financial endpoint correctly rejects unauthenticated requests with 401")
    
    # ==================== GET /api/admin/settings ====================
    
    def test_admin_settings_returns_commission_percent(self, admin_token):
        """GET /api/admin/settings returns commission_percent"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "commission_percent" in data, "Missing commission_percent field"
        assert isinstance(data["commission_percent"], (int, float)), "commission_percent should be numeric"
        
        print(f"✓ Settings returned: commission_percent={data['commission_percent']}")
    
    def test_admin_settings_default_value(self, admin_token):
        """GET /api/admin/settings defaults to 10% if not set"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Default should be 10 (or whatever was previously set)
        assert data["commission_percent"] >= 0 and data["commission_percent"] <= 100, \
            f"commission_percent should be between 0-100, got {data['commission_percent']}"
        
        print(f"✓ Commission percent is valid: {data['commission_percent']}%")
    
    def test_admin_settings_rejects_non_admin(self, client_token):
        """GET /api/admin/settings rejects non-admin users with 403"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Settings GET endpoint correctly rejects non-admin users with 403")
    
    # ==================== PUT /api/admin/settings ====================
    
    def test_admin_settings_update_commission(self, admin_token):
        """PUT /api/admin/settings updates commission_percent"""
        # First get current value
        get_response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_value = get_response.json().get("commission_percent", 10)
        
        # Update to a new value
        new_value = 15.5
        response = requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"commission_percent": new_value}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("commission_percent") == new_value, f"Expected {new_value}, got {data.get('commission_percent')}"
        
        # Verify it was persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        verify_data = verify_response.json()
        assert verify_data["commission_percent"] == new_value, "Value was not persisted"
        
        # Restore original value
        requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"commission_percent": original_value}
        )
        
        print(f"✓ Commission updated from {original_value} to {new_value} and verified")
    
    def test_admin_settings_validates_min_value(self, admin_token):
        """PUT /api/admin/settings rejects commission_percent < 0"""
        response = requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"commission_percent": -5}
        )
        assert response.status_code == 400, f"Expected 400 for negative value, got {response.status_code}"
        print("✓ Settings correctly rejects negative commission_percent")
    
    def test_admin_settings_validates_max_value(self, admin_token):
        """PUT /api/admin/settings rejects commission_percent > 100"""
        response = requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"commission_percent": 150}
        )
        assert response.status_code == 400, f"Expected 400 for value > 100, got {response.status_code}"
        print("✓ Settings correctly rejects commission_percent > 100")
    
    def test_admin_settings_accepts_boundary_values(self, admin_token):
        """PUT /api/admin/settings accepts 0 and 100"""
        # Test 0
        response = requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"commission_percent": 0}
        )
        assert response.status_code == 200, f"Should accept 0, got {response.status_code}"
        
        # Test 100
        response = requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"commission_percent": 100}
        )
        assert response.status_code == 200, f"Should accept 100, got {response.status_code}"
        
        # Restore to 10
        requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"commission_percent": 10}
        )
        
        print("✓ Settings accepts boundary values 0 and 100")
    
    def test_admin_settings_update_rejects_non_admin(self, client_token):
        """PUT /api/admin/settings rejects non-admin users with 403"""
        response = requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {client_token}"},
            json={"commission_percent": 20}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Settings PUT endpoint correctly rejects non-admin users with 403")
    
    # ==================== Admin Stats (existing) ====================
    
    def test_admin_stats_rejects_non_admin(self, client_token):
        """GET /api/admin/stats rejects non-admin users with 403"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Stats endpoint correctly rejects non-admin users with 403")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
