"""
Iteration 51 Backend Tests - iToke Platform
Testing new features:
1. GET /api/app-config - returns opening_video_url and free_offers_video_url
2. GET /api/admin/app-videos - returns video URLs (admin only)
3. PUT /api/admin/app-videos - updates video URLs (admin only)
4. GET /api/admin/all-offers - returns all offers with city and establishment_name
5. PUT /api/admin/offers/{offer_id} - updates title, city, description
6. POST /api/auth/session - accepts intended_role parameter
7. GET /api/account-deletion - returns HTML page
8. POST /api/admin/media - accepts target parameter (client/establishment/both)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')
if not BASE_URL.endswith('/api'):
    BASE_URL = BASE_URL.rstrip('/') + '/api'


class TestAppConfig:
    """Test public app-config endpoint returns video URLs"""
    
    def test_app_config_returns_video_fields(self):
        """GET /api/app-config should return opening_video_url and free_offers_video_url"""
        response = requests.get(f"{BASE_URL}/app-config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify required fields exist
        assert "opening_video_url" in data, "Missing opening_video_url field"
        assert "free_offers_video_url" in data, "Missing free_offers_video_url field"
        assert "app_name" in data, "Missing app_name field"
        assert "tagline" in data, "Missing tagline field"
        print(f"✓ app-config returns video fields: opening_video_url={data.get('opening_video_url', '')[:50]}, free_offers_video_url={data.get('free_offers_video_url', '')[:50]}")


class TestAccountDeletion:
    """Test account deletion page (LGPD/Google Play requirement)"""
    
    def test_account_deletion_returns_html(self):
        """GET /api/account-deletion should return HTML page"""
        response = requests.get(f"{BASE_URL}/account-deletion")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content_type = response.headers.get('content-type', '')
        assert 'text/html' in content_type, f"Expected HTML content-type, got {content_type}"
        
        html = response.text
        assert 'iToke' in html, "HTML should contain iToke branding"
        assert 'Exclusao' in html or 'exclusao' in html or 'Exclusão' in html, "HTML should mention account deletion"
        print(f"✓ account-deletion returns HTML page ({len(html)} chars)")


class TestAdminAuth:
    """Helper to get admin token"""
    
    @staticmethod
    def get_admin_token():
        """Login as admin and return session token"""
        response = requests.post(f"{BASE_URL}/auth/email-login", json={
            "email": "admin@itoke.master",
            "name": "Admin iToke",
            "role": "admin"
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        return None


class TestAdminAppVideos:
    """Test admin app videos endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token = TestAdminAuth.get_admin_token()
        if not self.admin_token:
            pytest.skip("Could not get admin token")
    
    def test_get_app_videos(self):
        """GET /api/admin/app-videos should return video URLs"""
        response = requests.get(
            f"{BASE_URL}/admin/app-videos",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "opening_video_url" in data, "Missing opening_video_url"
        assert "free_offers_video_url" in data, "Missing free_offers_video_url"
        print(f"✓ admin/app-videos returns: {data}")
    
    def test_update_app_videos(self):
        """PUT /api/admin/app-videos should update video URLs"""
        test_opening_url = "https://youtube.com/watch?v=test_opening_123"
        test_free_offers_url = "https://youtube.com/watch?v=test_free_456"
        
        response = requests.put(
            f"{BASE_URL}/admin/app-videos",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "opening_video_url": test_opening_url,
                "free_offers_video_url": test_free_offers_url
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify update persisted
        get_response = requests.get(
            f"{BASE_URL}/admin/app-videos",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        data = get_response.json()
        assert data.get("opening_video_url") == test_opening_url, "opening_video_url not updated"
        assert data.get("free_offers_video_url") == test_free_offers_url, "free_offers_video_url not updated"
        print(f"✓ admin/app-videos update works correctly")
    
    def test_app_videos_requires_admin(self):
        """GET /api/admin/app-videos should require admin role"""
        # Login as client
        client_response = requests.post(f"{BASE_URL}/auth/email-login", json={
            "email": "cliente@teste.com",
            "name": "Cliente Teste",
            "role": "client"
        })
        client_token = client_response.json().get("session_token")
        
        response = requests.get(
            f"{BASE_URL}/admin/app-videos",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print(f"✓ admin/app-videos correctly rejects non-admin users")


class TestAdminAllOffers:
    """Test admin all-offers endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token = TestAdminAuth.get_admin_token()
        if not self.admin_token:
            pytest.skip("Could not get admin token")
    
    def test_get_all_offers_returns_enriched_data(self):
        """GET /api/admin/all-offers should return offers with city and establishment_name"""
        response = requests.get(
            f"{BASE_URL}/admin/all-offers",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            offer = data[0]
            # Check enriched fields exist
            assert "establishment_name" in offer, "Missing establishment_name field"
            assert "city" in offer, "Missing city field"
            assert "offer_id" in offer, "Missing offer_id field"
            assert "title" in offer, "Missing title field"
            print(f"✓ admin/all-offers returns {len(data)} offers with enriched data")
            print(f"  Sample: {offer.get('title', 'N/A')} - {offer.get('establishment_name', 'N/A')} - {offer.get('city', 'N/A')}")
        else:
            print(f"✓ admin/all-offers returns empty list (no offers)")


class TestAdminUpdateOffer:
    """Test admin offer update endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token = TestAdminAuth.get_admin_token()
        if not self.admin_token:
            pytest.skip("Could not get admin token")
    
    def test_update_offer_title_city_description(self):
        """PUT /api/admin/offers/{offer_id} should update title, city, description"""
        # First get an offer to update
        offers_response = requests.get(
            f"{BASE_URL}/admin/all-offers",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        offers = offers_response.json()
        
        if len(offers) == 0:
            pytest.skip("No offers available to test update")
        
        offer = offers[0]
        offer_id = offer.get("offer_id")
        original_title = offer.get("title", "")
        
        # Update the offer
        test_title = f"TEST_UPDATED_{original_title[:20]}"
        test_city = "Cidade Teste"
        test_desc = "Descricao de teste atualizada"
        
        response = requests.put(
            f"{BASE_URL}/admin/offers/{offer_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "title": test_title,
                "city": test_city,
                "description": test_desc
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify update
        verify_response = requests.get(
            f"{BASE_URL}/admin/all-offers",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        updated_offers = verify_response.json()
        updated_offer = next((o for o in updated_offers if o.get("offer_id") == offer_id), None)
        
        assert updated_offer is not None, "Could not find updated offer"
        assert updated_offer.get("title") == test_title, "Title not updated"
        assert updated_offer.get("city") == test_city, "City not updated"
        assert updated_offer.get("description") == test_desc, "Description not updated"
        
        # Restore original title
        requests.put(
            f"{BASE_URL}/admin/offers/{offer_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"title": original_title}
        )
        
        print(f"✓ admin/offers/{offer_id} update works correctly")


class TestAuthSessionIntendedRole:
    """Test auth/session endpoint with intended_role parameter"""
    
    def test_session_accepts_intended_role_client(self):
        """POST /api/auth/session should accept intended_role parameter"""
        # Note: This test requires a valid session_id from Google OAuth
        # We'll test the endpoint structure by checking it doesn't crash with intended_role
        # The actual Google OAuth flow can't be tested without real session_id
        
        response = requests.post(f"{BASE_URL}/auth/session", json={
            "session_id": "invalid_test_session",
            "intended_role": "client"
        })
        # Should return 401 for invalid session, not 400 or 500
        assert response.status_code == 401, f"Expected 401 for invalid session, got {response.status_code}"
        print(f"✓ auth/session accepts intended_role parameter (returns 401 for invalid session)")
    
    def test_session_accepts_intended_role_establishment(self):
        """POST /api/auth/session should accept intended_role=establishment"""
        response = requests.post(f"{BASE_URL}/auth/session", json={
            "session_id": "invalid_test_session",
            "intended_role": "establishment"
        })
        assert response.status_code == 401, f"Expected 401 for invalid session, got {response.status_code}"
        print(f"✓ auth/session accepts intended_role=establishment parameter")


class TestAdminMediaTarget:
    """Test admin media endpoint with target parameter"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token = TestAdminAuth.get_admin_token()
        if not self.admin_token:
            pytest.skip("Could not get admin token")
    
    def test_add_media_with_target_client(self):
        """POST /api/admin/media should accept target=client"""
        response = requests.post(
            f"{BASE_URL}/admin/media",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "url": "https://example.com/test_client_media.jpg",
                "title": "TEST_Media para Clientes",
                "type": "image",
                "target": "client"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("target") == "client", f"Expected target=client, got {data.get('target')}"
        
        # Cleanup
        media_id = data.get("media_id")
        if media_id:
            requests.delete(
                f"{BASE_URL}/admin/media/{media_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
        
        print(f"✓ admin/media accepts target=client")
    
    def test_add_media_with_target_establishment(self):
        """POST /api/admin/media should accept target=establishment"""
        response = requests.post(
            f"{BASE_URL}/admin/media",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "url": "https://example.com/test_est_media.jpg",
                "title": "TEST_Media para Estabelecimentos",
                "type": "image",
                "target": "establishment"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("target") == "establishment", f"Expected target=establishment, got {data.get('target')}"
        
        # Cleanup
        media_id = data.get("media_id")
        if media_id:
            requests.delete(
                f"{BASE_URL}/admin/media/{media_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
        
        print(f"✓ admin/media accepts target=establishment")
    
    def test_add_media_with_target_both(self):
        """POST /api/admin/media should accept target=both"""
        response = requests.post(
            f"{BASE_URL}/admin/media",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "url": "https://example.com/test_both_media.jpg",
                "title": "TEST_Media para Ambos",
                "type": "image",
                "target": "both"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("target") == "both", f"Expected target=both, got {data.get('target')}"
        
        # Cleanup
        media_id = data.get("media_id")
        if media_id:
            requests.delete(
                f"{BASE_URL}/admin/media/{media_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
        
        print(f"✓ admin/media accepts target=both")
    
    def test_add_media_default_target_is_both(self):
        """POST /api/admin/media should default target to 'both'"""
        response = requests.post(
            f"{BASE_URL}/admin/media",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "url": "https://example.com/test_default_media.jpg",
                "title": "TEST_Media Default Target",
                "type": "image"
                # No target specified
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("target") == "both", f"Expected default target=both, got {data.get('target')}"
        
        # Cleanup
        media_id = data.get("media_id")
        if media_id:
            requests.delete(
                f"{BASE_URL}/admin/media/{media_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
        
        print(f"✓ admin/media defaults target to 'both'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
