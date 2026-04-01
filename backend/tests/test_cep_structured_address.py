"""
Test suite for CEP/ViaCEP structured_address feature
Tests:
- PUT /api/establishments/me with structured_address
- GET /api/offers/filters uses structured_address.city with fallback
- GET /api/categories/with-counts uses structured_address with fallback
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')

# Test CEP data from ViaCEP
TEST_CEP_SAO_PAULO = {
    "cep": "01001000",  # Praça da Sé, São Paulo
    "city": "São Paulo",
    "neighborhood": "Sé",
    "street": "Praça da Sé",
    "number": "100",
    "complement": "Sala 1"
}

TEST_CEP_BRASILIA = {
    "cep": "70070600",  # Brasília
    "city": "Brasília",
    "neighborhood": "Asa Norte",
    "street": "SBS Quadra 2",
    "number": "200",
    "complement": ""
}


class TestEstablishmentStructuredAddress:
    """Tests for PUT /api/establishments/me with structured_address"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as establishment user"""
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
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
        
        # Cleanup not needed for this test
    
    def test_update_establishment_with_structured_address(self):
        """Test PUT /api/establishments/me accepts structured_address and saves correctly"""
        # First get current establishment
        get_response = self.session.get(f"{BASE_URL}/api/establishments/me")
        
        if get_response.status_code == 404:
            # Create establishment first
            create_response = self.session.post(f"{BASE_URL}/api/establishments", json={
                "business_name": "Test CEP Establishment",
                "category": "food",
                "structured_address": TEST_CEP_SAO_PAULO,
                "city": TEST_CEP_SAO_PAULO["city"],
                "neighborhood": TEST_CEP_SAO_PAULO["neighborhood"]
            })
            assert create_response.status_code == 200, f"Create failed: {create_response.text}"
            print(f"Created establishment: {create_response.json()}")
        
        # Update with structured_address
        update_response = self.session.put(f"{BASE_URL}/api/establishments/me", json={
            "business_name": "Test CEP Updated",
            "structured_address": TEST_CEP_SAO_PAULO
        })
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        
        # Verify structured_address was saved
        assert "structured_address" in updated, "structured_address not in response"
        sa = updated["structured_address"]
        assert sa["cep"] == TEST_CEP_SAO_PAULO["cep"], f"CEP mismatch: {sa['cep']}"
        assert sa["city"] == TEST_CEP_SAO_PAULO["city"], f"City mismatch: {sa['city']}"
        assert sa["neighborhood"] == TEST_CEP_SAO_PAULO["neighborhood"], f"Neighborhood mismatch: {sa['neighborhood']}"
        assert sa["street"] == TEST_CEP_SAO_PAULO["street"], f"Street mismatch: {sa['street']}"
        
        print(f"✓ structured_address saved correctly: {sa}")
    
    def test_update_syncs_flat_city_neighborhood(self):
        """Test PUT /api/establishments/me syncs flat city/neighborhood from structured_address"""
        # Update with structured_address
        update_response = self.session.put(f"{BASE_URL}/api/establishments/me", json={
            "structured_address": TEST_CEP_SAO_PAULO
        })
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        
        # Verify flat fields are synced
        assert updated.get("city") == TEST_CEP_SAO_PAULO["city"], f"Flat city not synced: {updated.get('city')}"
        assert updated.get("neighborhood") == TEST_CEP_SAO_PAULO["neighborhood"], f"Flat neighborhood not synced: {updated.get('neighborhood')}"
        
        print(f"✓ Flat city/neighborhood synced: city={updated.get('city')}, neighborhood={updated.get('neighborhood')}")
    
    def test_get_establishment_returns_structured_address(self):
        """Test GET /api/establishments/me returns structured_address"""
        get_response = self.session.get(f"{BASE_URL}/api/establishments/me")
        
        assert get_response.status_code == 200, f"GET failed: {get_response.text}"
        establishment = get_response.json()
        
        # Verify structured_address is returned
        assert "structured_address" in establishment, "structured_address not in GET response"
        sa = establishment["structured_address"]
        assert "cep" in sa, "cep not in structured_address"
        assert "city" in sa, "city not in structured_address"
        assert "neighborhood" in sa, "neighborhood not in structured_address"
        assert "street" in sa, "street not in structured_address"
        
        print(f"✓ GET returns structured_address: {sa}")


class TestOffersFiltersWithStructuredAddress:
    """Tests for GET /api/offers/filters using structured_address"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Create session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        yield
    
    def test_offers_filters_returns_cities(self):
        """Test GET /api/offers/filters returns cities from establishments with active offers"""
        response = self.session.get(f"{BASE_URL}/api/offers/filters")
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        assert "cities" in data, "cities not in response"
        assert "neighborhoods" in data, "neighborhoods not in response"
        assert isinstance(data["cities"], list), "cities is not a list"
        assert isinstance(data["neighborhoods"], list), "neighborhoods is not a list"
        
        print(f"✓ Filters returned: cities={data['cities']}, neighborhoods={data['neighborhoods']}")
    
    def test_offers_filters_with_city_param(self):
        """Test GET /api/offers/filters?city=X returns neighborhoods for that city"""
        # First get available cities
        filters_response = self.session.get(f"{BASE_URL}/api/offers/filters")
        assert filters_response.status_code == 200
        cities = filters_response.json().get("cities", [])
        
        if cities:
            city = cities[0]
            response = self.session.get(f"{BASE_URL}/api/offers/filters?city={city}")
            
            assert response.status_code == 200, f"Request failed: {response.text}"
            data = response.json()
            
            assert "neighborhoods" in data, "neighborhoods not in response"
            print(f"✓ Neighborhoods for {city}: {data['neighborhoods']}")
        else:
            print("⚠ No cities available to test city filter")


class TestCategoriesWithStructuredAddress:
    """Tests for GET /api/categories/with-counts using structured_address"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Create session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        yield
    
    def test_categories_with_counts_returns_data(self):
        """Test GET /api/categories/with-counts returns categories with offer counts"""
        response = self.session.get(f"{BASE_URL}/api/categories/with-counts")
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response is not a list"
        
        if data:
            # Verify structure
            cat = data[0]
            assert "id" in cat, "id not in category"
            assert "name" in cat, "name not in category"
            assert "offer_count" in cat, "offer_count not in category"
            
            # Verify sorted by offer_count descending
            counts = [c["offer_count"] for c in data]
            assert counts == sorted(counts, reverse=True), "Categories not sorted by offer_count desc"
            
            print(f"✓ Categories with counts: {[(c['name'], c['offer_count']) for c in data[:5]]}")
        else:
            print("⚠ No categories with offers found")
    
    def test_categories_with_city_filter(self):
        """Test GET /api/categories/with-counts?city=X filters by city"""
        # First get available cities
        filters_response = self.session.get(f"{BASE_URL}/api/offers/filters")
        assert filters_response.status_code == 200
        cities = filters_response.json().get("cities", [])
        
        if cities:
            city = cities[0]
            response = self.session.get(f"{BASE_URL}/api/categories/with-counts?city={city}")
            
            assert response.status_code == 200, f"Request failed: {response.text}"
            data = response.json()
            
            assert isinstance(data, list), "Response is not a list"
            print(f"✓ Categories for {city}: {[(c['name'], c['offer_count']) for c in data[:5]]}")
        else:
            print("⚠ No cities available to test city filter")


class TestViaCEPIntegration:
    """Tests for ViaCEP API integration (frontend calls this directly)"""
    
    def test_viacep_valid_cep(self):
        """Test ViaCEP API returns valid data for known CEP"""
        # CEP 01001-000 = Praça da Sé, São Paulo
        response = requests.get("https://viacep.com.br/ws/01001000/json/")
        
        assert response.status_code == 200, f"ViaCEP request failed: {response.text}"
        data = response.json()
        
        assert "erro" not in data, "ViaCEP returned error for valid CEP"
        assert data.get("localidade") == "São Paulo", f"City mismatch: {data.get('localidade')}"
        assert data.get("bairro") == "Sé", f"Neighborhood mismatch: {data.get('bairro')}"
        
        print(f"✓ ViaCEP valid CEP: {data}")
    
    def test_viacep_invalid_cep(self):
        """Test ViaCEP API returns error for invalid CEP"""
        response = requests.get("https://viacep.com.br/ws/00000000/json/")
        
        assert response.status_code == 200, f"ViaCEP request failed: {response.text}"
        data = response.json()
        
        # ViaCEP returns "erro": "true" (string) for invalid CEPs
        assert "erro" in data, "ViaCEP should return error for invalid CEP"
        
        print(f"✓ ViaCEP invalid CEP returns error: {data}")


class TestEstablishmentCreationWithCEP:
    """Tests for POST /api/establishments with structured_address"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as new user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as a new user (will be client by default)
        unique_email = f"test_cep_{int(time.time())}@test.com"
        login_response = self.session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": unique_email,
            "name": "Test CEP User",
            "role": "client"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        data = login_response.json()
        self.token = data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
    
    def test_create_establishment_with_structured_address(self):
        """Test POST /api/establishments stores structured_address correctly"""
        create_response = self.session.post(f"{BASE_URL}/api/establishments", json={
            "business_name": f"Test CEP Business {int(time.time())}",
            "category": "food",
            "structured_address": TEST_CEP_SAO_PAULO,
            "city": TEST_CEP_SAO_PAULO["city"],
            "neighborhood": TEST_CEP_SAO_PAULO["neighborhood"]
        })
        
        # May fail if user already has establishment
        if create_response.status_code == 400 and "already has" in create_response.text:
            print("⚠ User already has establishment, skipping create test")
            return
        
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        establishment = create_response.json()
        
        # Verify structured_address was saved
        assert "structured_address" in establishment, "structured_address not in response"
        sa = establishment["structured_address"]
        assert sa["cep"] == TEST_CEP_SAO_PAULO["cep"], f"CEP mismatch: {sa['cep']}"
        assert sa["city"] == TEST_CEP_SAO_PAULO["city"], f"City mismatch: {sa['city']}"
        
        # Verify flat fields are also set
        assert establishment.get("city") == TEST_CEP_SAO_PAULO["city"], "Flat city not set"
        assert establishment.get("neighborhood") == TEST_CEP_SAO_PAULO["neighborhood"], "Flat neighborhood not set"
        
        print(f"✓ Establishment created with structured_address: {sa}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
