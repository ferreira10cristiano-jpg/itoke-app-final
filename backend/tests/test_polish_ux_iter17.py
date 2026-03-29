"""
Iteration 17: Final Polish & UX Improvements Testing
Tests for:
1. Categories endpoint - 14 categories with new ones (Pousada, Hotel, Petshop, Veterinário)
2. Categories order - Serviços, Varejo, Educação, Automotivo, Outros are last 5
3. Token purchase endpoint for client
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')

class TestCategories:
    """Test categories endpoint with new segments"""
    
    def test_categories_returns_14_items(self):
        """GET /api/categories should return exactly 14 categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        categories = response.json()
        assert len(categories) == 14, f"Expected 14 categories, got {len(categories)}"
        print(f"✓ Categories endpoint returns {len(categories)} categories")
    
    def test_categories_contains_new_segments(self):
        """Categories should include Pousada, Hotel, Petshop, Veterinário"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        categories = response.json()
        category_names = [c['name'] for c in categories]
        
        new_segments = ['Pousada', 'Hotel', 'Petshop', 'Veterinário']
        for segment in new_segments:
            assert segment in category_names, f"Missing category: {segment}"
            print(f"✓ Found new category: {segment}")
    
    def test_categories_order_last_five(self):
        """Last 5 categories should be: Serviços, Varejo, Educação, Automotivo, Outros"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        categories = response.json()
        last_five = [c['name'] for c in categories[-5:]]
        expected_last_five = ['Serviços', 'Varejo', 'Educação', 'Automotivo', 'Outros']
        
        assert last_five == expected_last_five, f"Expected last 5: {expected_last_five}, got: {last_five}"
        print(f"✓ Last 5 categories in correct order: {last_five}")
    
    def test_categories_structure(self):
        """Each category should have id, name, icon fields"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        categories = response.json()
        for cat in categories:
            assert 'id' in cat, f"Missing 'id' in category: {cat}"
            assert 'name' in cat, f"Missing 'name' in category: {cat}"
            assert 'icon' in cat, f"Missing 'icon' in category: {cat}"
        print(f"✓ All {len(categories)} categories have correct structure (id, name, icon)")


class TestClientTokenPurchase:
    """Test client token purchase flow"""
    
    @pytest.fixture
    def client_session(self):
        """Login as client and return session token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "cliente@teste.com",
            "name": "Cliente Teste",
            "role": "client"
        })
        assert response.status_code == 200
        data = response.json()
        return data.get('session_token')
    
    def test_client_can_purchase_tokens(self, client_session):
        """POST /api/tokens/purchase should work for clients"""
        headers = {"Authorization": f"Bearer {client_session}"}
        
        # Get current balance
        response = requests.get(f"{BASE_URL}/api/tokens", headers=headers)
        assert response.status_code == 200
        initial_balance = response.json().get('balance', 0)
        print(f"Initial token balance: {initial_balance}")
        
        # Purchase 1 package (7 tokens)
        response = requests.post(f"{BASE_URL}/api/tokens/purchase", 
            json={"packages": 1},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'tokens_added' in data, "Response should contain tokens_added"
        assert 'new_balance' in data, "Response should contain new_balance"
        assert data['tokens_added'] == 7, f"Expected 7 tokens added, got {data['tokens_added']}"
        print(f"✓ Token purchase successful: +{data['tokens_added']} tokens, new balance: {data['new_balance']}")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """GET /api/health should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get('status') == 'healthy'
        print("✓ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
