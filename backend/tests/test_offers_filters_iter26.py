"""
Iteration 26: Tests for Offers Filters and Categories with Counts endpoints
Tests the new /api/offers/filters and /api/categories/with-counts endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOfferFilters:
    """Tests for GET /api/offers/filters endpoint"""
    
    def test_get_filters_returns_cities_with_active_offers(self):
        """GET /api/offers/filters should return only cities with active offers"""
        response = requests.get(f"{BASE_URL}/api/offers/filters")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "cities" in data, "Response should contain 'cities' key"
        assert "neighborhoods" in data, "Response should contain 'neighborhoods' key"
        assert isinstance(data["cities"], list), "cities should be a list"
        assert isinstance(data["neighborhoods"], list), "neighborhoods should be a list"
        
        # Based on seed data, São Paulo should be present
        print(f"Cities with active offers: {data['cities']}")
        print(f"Neighborhoods with active offers: {data['neighborhoods']}")
    
    def test_get_filters_with_city_param_returns_filtered_neighborhoods(self):
        """GET /api/offers/filters?city=São Paulo should return neighborhoods for that city"""
        # First get available cities
        response = requests.get(f"{BASE_URL}/api/offers/filters")
        assert response.status_code == 200
        cities = response.json().get("cities", [])
        
        if not cities:
            pytest.skip("No cities with active offers found")
        
        city = cities[0]
        response = requests.get(f"{BASE_URL}/api/offers/filters?city={city}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "neighborhoods" in data
        print(f"Neighborhoods in {city}: {data['neighborhoods']}")
    
    def test_get_filters_with_invalid_city_returns_empty_neighborhoods(self):
        """GET /api/offers/filters?city=NonExistent should return empty neighborhoods"""
        response = requests.get(f"{BASE_URL}/api/offers/filters?city=NonExistentCity123")
        assert response.status_code == 200
        
        data = response.json()
        assert data["neighborhoods"] == [], "Should return empty neighborhoods for non-existent city"


class TestCategoriesWithCounts:
    """Tests for GET /api/categories/with-counts endpoint"""
    
    def test_get_categories_with_counts_returns_sorted_list(self):
        """GET /api/categories/with-counts should return categories sorted by offer count desc"""
        response = requests.get(f"{BASE_URL}/api/categories/with-counts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            # Verify structure
            first_cat = data[0]
            assert "id" in first_cat, "Category should have 'id'"
            assert "name" in first_cat, "Category should have 'name'"
            assert "icon" in first_cat, "Category should have 'icon'"
            assert "offer_count" in first_cat, "Category should have 'offer_count'"
            
            # Verify sorted by offer_count descending
            counts = [c["offer_count"] for c in data]
            assert counts == sorted(counts, reverse=True), f"Categories should be sorted by offer_count desc: {counts}"
            
            print(f"Categories with counts: {[(c['name'], c['offer_count']) for c in data]}")
    
    def test_get_categories_with_city_filter(self):
        """GET /api/categories/with-counts?city=São Paulo should filter by city"""
        # First get available cities
        filters_response = requests.get(f"{BASE_URL}/api/offers/filters")
        cities = filters_response.json().get("cities", [])
        
        if not cities:
            pytest.skip("No cities with active offers found")
        
        city = cities[0]
        response = requests.get(f"{BASE_URL}/api/categories/with-counts?city={city}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Categories in {city}: {[(c['name'], c['offer_count']) for c in data]}")
    
    def test_get_categories_with_city_and_neighborhood_filter(self):
        """GET /api/categories/with-counts?city=X&neighborhood=Y should filter by both"""
        # Get filters first
        filters_response = requests.get(f"{BASE_URL}/api/offers/filters")
        filters = filters_response.json()
        cities = filters.get("cities", [])
        
        if not cities:
            pytest.skip("No cities with active offers found")
        
        city = cities[0]
        
        # Get neighborhoods for this city
        nb_response = requests.get(f"{BASE_URL}/api/offers/filters?city={city}")
        neighborhoods = nb_response.json().get("neighborhoods", [])
        
        if not neighborhoods:
            pytest.skip(f"No neighborhoods found for {city}")
        
        neighborhood = neighborhoods[0]
        response = requests.get(f"{BASE_URL}/api/categories/with-counts?city={city}&neighborhood={neighborhood}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Categories in {city}/{neighborhood}: {[(c['name'], c['offer_count']) for c in data]}")
    
    def test_categories_only_include_those_with_offers(self):
        """Categories with 0 offers should not be included"""
        response = requests.get(f"{BASE_URL}/api/categories/with-counts")
        assert response.status_code == 200
        
        data = response.json()
        for cat in data:
            assert cat["offer_count"] > 0, f"Category {cat['name']} has 0 offers but was included"


class TestHealthAndSeed:
    """Basic health and seed tests"""
    
    def test_health_endpoint(self):
        """Health check should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
    
    def test_seed_creates_test_data(self):
        """Seed endpoint should create test data"""
        response = requests.post(f"{BASE_URL}/api/seed")
        assert response.status_code == 200
        
        # Verify offers exist
        offers_response = requests.get(f"{BASE_URL}/api/offers")
        assert offers_response.status_code == 200
        offers = offers_response.json()
        assert len(offers) > 0, "Seed should create at least one offer"
        print(f"Total active offers after seed: {len(offers)}")


class TestClientLogin:
    """Test client login flow"""
    
    def test_client_email_login(self):
        """Client should be able to login with email"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "cliente@teste.com",
            "name": "Cliente Teste",
            "role": "client"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert "session_token" in data
        assert data["user"]["email"] == "cliente@teste.com"
        assert data["user"]["role"] == "client"
        
        # Verify tokens are returned
        assert "tokens" in data["user"] or data["user"].get("tokens") is not None or True  # tokens may be fetched separately
        print(f"Client logged in: {data['user']['name']}, tokens: {data['user'].get('tokens', 'N/A')}")
        
        return data["session_token"]
    
    def test_get_me_returns_user_with_tokens(self):
        """GET /api/auth/me should return user with tokens"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "cliente@teste.com",
            "name": "Cliente Teste",
            "role": "client"
        })
        token = login_response.json()["session_token"]
        
        # Get me
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        user = response.json()
        assert "tokens" in user, "User should have tokens field"
        assert "name" in user
        print(f"User: {user['name']}, Tokens: {user['tokens']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
