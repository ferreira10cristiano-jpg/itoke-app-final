"""
Test Suite for iToke Slogan Update and App Store Configuration
Tests:
1. Slogan 'Ofertas que saem de Graça' appears in API responses
2. GET /api/app-config returns correct tagline
3. GET /api/admin/app-store returns complete store config
4. PUT /api/admin/app-store allows updating store config
5. GET /api/legal returns 5 legal documents
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com').rstrip('/')

class TestAppConfig:
    """Test public app configuration endpoint"""
    
    def test_get_app_config_returns_correct_tagline(self):
        """GET /api/app-config should return tagline 'Ofertas que saem de Graça'"""
        response = requests.get(f"{BASE_URL}/api/app-config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tagline" in data, f"Response missing 'tagline' field: {data}"
        assert data["tagline"] == "Ofertas que saem de Graça", f"Expected 'Ofertas que saem de Graça', got '{data['tagline']}'"
        
        # Verify old slogan is NOT present
        assert "Descontos que valem ouro" not in str(data), "Old slogan 'Descontos que valem ouro' should not appear"
        print(f"✓ GET /api/app-config returns correct tagline: {data['tagline']}")
    
    def test_app_config_has_app_name(self):
        """GET /api/app-config should return app_name"""
        response = requests.get(f"{BASE_URL}/api/app-config")
        assert response.status_code == 200
        
        data = response.json()
        assert "app_name" in data, f"Response missing 'app_name' field: {data}"
        print(f"✓ GET /api/app-config returns app_name: {data['app_name']}")


class TestAdminAppStore:
    """Test admin app store configuration endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "admin@itoke.master",
            "name": "Admin iToke",
            "role": "admin"
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Admin authentication failed")
    
    def test_get_admin_app_store_requires_auth(self):
        """GET /api/admin/app-store should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/app-store")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ GET /api/admin/app-store requires authentication")
    
    def test_get_admin_app_store_returns_config(self, admin_token):
        """GET /api/admin/app-store should return store configuration"""
        response = requests.get(
            f"{BASE_URL}/api/admin/app-store",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response is a dict with key field
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        assert "key" in data, f"Response missing 'key' field: {data}"
        assert data["key"] == "app_store_config", f"Expected key 'app_store_config', got '{data['key']}'"
        
        # If tagline is present, verify it's correct
        if "tagline" in data:
            assert data["tagline"] == "Ofertas que saem de Graça", f"Expected 'Ofertas que saem de Graça', got '{data['tagline']}'"
        
        print(f"✓ GET /api/admin/app-store returns config with fields: {list(data.keys())}")
    
    def test_put_admin_app_store_updates_config(self, admin_token):
        """PUT /api/admin/app-store should allow updating store configuration"""
        # First get current config
        get_response = requests.get(
            f"{BASE_URL}/api/admin/app-store",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        original_config = get_response.json()
        
        # Update with test data
        test_short_desc = "Teste de descricao curta"
        update_response = requests.put(
            f"{BASE_URL}/api/admin/app-store",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "short_description": test_short_desc
            }
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify update was applied
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/app-store",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_response.status_code == 200
        updated_config = verify_response.json()
        assert updated_config.get("short_description") == test_short_desc, f"Update not applied: {updated_config}"
        
        print(f"✓ PUT /api/admin/app-store successfully updates configuration")
    
    def test_put_admin_app_store_requires_auth(self):
        """PUT /api/admin/app-store should require authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/app-store",
            json={"tagline": "test"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ PUT /api/admin/app-store requires authentication")


class TestLegalDocuments:
    """Test legal documents endpoint"""
    
    def test_get_legal_returns_5_documents(self):
        """GET /api/legal should return 5 legal documents"""
        response = requests.get(f"{BASE_URL}/api/legal")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) == 5, f"Expected 5 documents, got {len(data)}"
        
        # Verify each document has required fields
        for doc in data:
            assert "key" in doc, f"Document missing 'key': {doc}"
            assert "title" in doc, f"Document missing 'title': {doc}"
        
        print(f"✓ GET /api/legal returns {len(data)} documents: {[d['key'] for d in data]}")


class TestClientAuth:
    """Test client authentication"""
    
    def test_client_login(self):
        """POST /api/auth/email-login should work for client"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "cliente@teste.com",
            "name": "Cliente Teste",
            "role": "client"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session_token" in data, f"Response missing 'session_token': {data}"
        assert "user" in data, f"Response missing 'user': {data}"
        
        print(f"✓ Client login successful")


class TestEstablishmentAuth:
    """Test establishment authentication"""
    
    def test_establishment_login(self):
        """POST /api/auth/email-login should work for establishment"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "teste@estabelecimento.com",
            "name": "Teste Estabelecimento",
            "role": "establishment"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session_token" in data, f"Response missing 'session_token': {data}"
        
        print(f"✓ Establishment login successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
