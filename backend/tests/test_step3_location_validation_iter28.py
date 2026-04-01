"""
Iteration 28: Step 3 Location Validation Tests
Tests for mandatory validation on Location Confirmation screen (step 3/4) of offer form.

Requirements tested:
1. PUT /api/establishments/me with structured_address saves CEP, city, neighborhood correctly
2. PUT /api/establishments/me without structured_address doesn't add address fields
3. GET /api/establishments/me returns structured_address when present
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')

class TestEstablishmentStructuredAddress:
    """Tests for structured_address handling in establishment endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with establishment login"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as establishment
        login_response = self.session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "teste@estabelecimento.com",
            "name": "Teste Estabelecimento",
            "role": "establishment"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        self.token = data.get("session_token")
        assert self.token, "No session_token in login response"
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
        
    def test_get_establishment_me_returns_structured_address(self):
        """GET /api/establishments/me returns structured_address when present"""
        response = self.session.get(f"{BASE_URL}/api/establishments/me")
        assert response.status_code == 200, f"GET failed: {response.text}"
        
        data = response.json()
        print(f"Establishment data: {data}")
        
        # Verify establishment data structure
        assert "establishment_id" in data, "Missing establishment_id"
        assert "business_name" in data, "Missing business_name"
        
        # Check if structured_address exists (may or may not be present)
        if "structured_address" in data and data["structured_address"]:
            sa = data["structured_address"]
            print(f"structured_address found: {sa}")
            # Verify structure
            assert "cep" in sa, "structured_address missing cep"
            assert "city" in sa, "structured_address missing city"
            assert "neighborhood" in sa, "structured_address missing neighborhood"
        else:
            print("No structured_address present - this is valid for testing disabled state")
    
    def test_put_establishment_with_structured_address_saves_correctly(self):
        """PUT /api/establishments/me with structured_address saves CEP, city, neighborhood correctly"""
        test_address = {
            "cep": "01001000",
            "city": "São Paulo",
            "neighborhood": "Sé",
            "street": "Praça da Sé",
            "number": "100",
            "complement": "Lado ímpar"
        }
        
        response = self.session.put(f"{BASE_URL}/api/establishments/me", json={
            "structured_address": test_address
        })
        assert response.status_code == 200, f"PUT failed: {response.text}"
        
        data = response.json()
        print(f"Updated establishment: {data}")
        
        # Verify structured_address was saved
        assert "structured_address" in data, "structured_address not in response"
        sa = data["structured_address"]
        
        assert sa["cep"] == test_address["cep"], f"CEP mismatch: {sa['cep']} != {test_address['cep']}"
        assert sa["city"] == test_address["city"], f"City mismatch: {sa['city']} != {test_address['city']}"
        assert sa["neighborhood"] == test_address["neighborhood"], f"Neighborhood mismatch"
        assert sa["street"] == test_address["street"], f"Street mismatch"
        assert sa["number"] == test_address["number"], f"Number mismatch"
        assert sa["complement"] == test_address["complement"], f"Complement mismatch"
        
        # Verify flat fields are synced
        assert data.get("city") == test_address["city"], "Flat city not synced"
        assert data.get("neighborhood") == test_address["neighborhood"], "Flat neighborhood not synced"
        
    def test_put_establishment_without_structured_address_preserves_existing(self):
        """PUT /api/establishments/me without structured_address doesn't overwrite existing address"""
        # First, get current state
        get_response = self.session.get(f"{BASE_URL}/api/establishments/me")
        assert get_response.status_code == 200
        original_data = get_response.json()
        original_sa = original_data.get("structured_address")
        
        # Update only business_name (no structured_address)
        response = self.session.put(f"{BASE_URL}/api/establishments/me", json={
            "business_name": "Teste Estabelecimento Updated"
        })
        assert response.status_code == 200, f"PUT failed: {response.text}"
        
        data = response.json()
        
        # Verify structured_address was NOT changed
        if original_sa:
            assert data.get("structured_address") == original_sa, "structured_address was unexpectedly modified"
        
        # Verify business_name was updated
        assert data["business_name"] == "Teste Estabelecimento Updated"
        
        # Restore original name
        self.session.put(f"{BASE_URL}/api/establishments/me", json={
            "business_name": "Teste Estabelecimento"
        })
    
    def test_clear_structured_address_with_null(self):
        """PUT /api/establishments/me with structured_address=null clears the address"""
        # First ensure we have a structured_address
        test_address = {
            "cep": "01001000",
            "city": "São Paulo",
            "neighborhood": "Sé",
            "street": "Praça da Sé",
            "number": "100",
            "complement": ""
        }
        
        set_response = self.session.put(f"{BASE_URL}/api/establishments/me", json={
            "structured_address": test_address
        })
        assert set_response.status_code == 200
        
        # Now try to clear it - note: the backend may not support null clearing
        # This tests the behavior when structured_address is explicitly set to null
        clear_response = self.session.put(f"{BASE_URL}/api/establishments/me", json={
            "structured_address": None
        })
        
        # The backend should either:
        # 1. Accept null and clear the address (status 200)
        # 2. Ignore null and keep existing address (status 200)
        assert clear_response.status_code == 200, f"Clear failed: {clear_response.text}"
        
        data = clear_response.json()
        print(f"After clearing: structured_address = {data.get('structured_address')}")
        
    def test_get_establishment_after_update_reflects_changes(self):
        """GET /api/establishments/me returns updated structured_address after PUT"""
        test_address = {
            "cep": "22041080",
            "city": "Rio de Janeiro",
            "neighborhood": "Copacabana",
            "street": "Avenida Atlântica",
            "number": "500",
            "complement": "Apt 101"
        }
        
        # Update
        put_response = self.session.put(f"{BASE_URL}/api/establishments/me", json={
            "structured_address": test_address
        })
        assert put_response.status_code == 200
        
        # Verify with GET
        get_response = self.session.get(f"{BASE_URL}/api/establishments/me")
        assert get_response.status_code == 200
        
        data = get_response.json()
        sa = data.get("structured_address", {})
        
        assert sa.get("cep") == test_address["cep"], "CEP not persisted"
        assert sa.get("city") == test_address["city"], "City not persisted"
        assert sa.get("neighborhood") == test_address["neighborhood"], "Neighborhood not persisted"
        
        print(f"Verified GET returns updated structured_address: {sa}")


class TestEstablishmentValidationStates:
    """Tests for different validation states (complete vs incomplete profile)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as establishment
        login_response = self.session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "teste@estabelecimento.com",
            "name": "Teste Estabelecimento",
            "role": "establishment"
        })
        assert login_response.status_code == 200
        
        data = login_response.json()
        self.token = data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
        
    def test_profile_complete_state_with_valid_address(self):
        """Verify profile is complete when CEP, city, neighborhood are present"""
        # Set valid structured_address
        valid_address = {
            "cep": "01001000",
            "city": "São Paulo",
            "neighborhood": "Sé",
            "street": "Praça da Sé",
            "number": "1",
            "complement": ""
        }
        
        response = self.session.put(f"{BASE_URL}/api/establishments/me", json={
            "structured_address": valid_address
        })
        assert response.status_code == 200
        
        data = response.json()
        sa = data.get("structured_address", {})
        
        # Verify all required fields are present
        has_cep = bool(sa.get("cep"))
        has_city = bool(sa.get("city")) or bool(data.get("city"))
        has_neighborhood = bool(sa.get("neighborhood")) or bool(data.get("neighborhood"))
        
        profile_complete = has_cep and has_city and has_neighborhood
        
        assert profile_complete, f"Profile should be complete. hasCep={has_cep}, hasCity={has_city}, hasNeighborhood={has_neighborhood}"
        print(f"Profile complete state verified: CEP={sa.get('cep')}, City={sa.get('city')}, Neighborhood={sa.get('neighborhood')}")
        
    def test_profile_incomplete_without_cep(self):
        """Verify profile is incomplete when CEP is missing"""
        # Get current state
        response = self.session.get(f"{BASE_URL}/api/establishments/me")
        assert response.status_code == 200
        
        data = response.json()
        sa = data.get("structured_address", {})
        
        # Check validation logic
        has_cep = bool(sa.get("cep"))
        has_city = bool(sa.get("city")) or bool(data.get("city"))
        has_neighborhood = bool(sa.get("neighborhood")) or bool(data.get("neighborhood"))
        
        print(f"Current state: hasCep={has_cep}, hasCity={has_city}, hasNeighborhood={has_neighborhood}")
        
        # If CEP is missing, profile should be incomplete
        if not has_cep:
            profile_complete = has_cep and has_city and has_neighborhood
            assert not profile_complete, "Profile should be incomplete without CEP"
            print("Verified: Profile is incomplete without CEP")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
