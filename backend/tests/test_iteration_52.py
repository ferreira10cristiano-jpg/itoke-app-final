"""
Iteration 52 Tests: Media Placement Feature
- POST /api/admin/media with placement field
- GET /api/media/by-placement/{placement} endpoint
- GET /api/app-config returns videos from media_assets with correct placement
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')

# Global session to avoid rate limiting
_admin_session = None
_admin_token = None

def get_admin_session():
    """Get or create admin session (singleton to avoid rate limiting)"""
    global _admin_session, _admin_token
    
    if _admin_session is not None and _admin_token is not None:
        return _admin_session
    
    _admin_session = requests.Session()
    _admin_session.headers.update({"Content-Type": "application/json"})
    
    # Login as admin
    login_resp = _admin_session.post(f"{BASE_URL}/api/auth/email-login", json={
        "email": "admin@itoke.master",
        "name": "Admin iToke"
    })
    
    if login_resp.status_code == 429:
        # Rate limited, wait and retry
        time.sleep(65)
        login_resp = _admin_session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "admin@itoke.master",
            "name": "Admin iToke"
        })
    
    assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
    data = login_resp.json()
    _admin_token = data.get("session_token")
    assert _admin_token, "No session token returned"
    _admin_session.headers.update({"Authorization": f"Bearer {_admin_token}"})
    
    return _admin_session


class TestMediaPlacementFeature:
    """Test media placement feature for iteration 52"""
    
    def test_01_add_media_with_app_opening_placement(self):
        """Test POST /api/admin/media with placement=app_opening"""
        session = get_admin_session()
        resp = session.post(f"{BASE_URL}/api/admin/media", json={
            "url": "https://youtube.com/watch?v=test_opening_iter52",
            "title": "TEST_Opening Video Iter52",
            "type": "video",
            "target": "both",
            "placement": "app_opening"
        })
        assert resp.status_code == 200, f"Failed to add media: {resp.text}"
        data = resp.json()
        assert data.get("placement") == "app_opening", f"Placement not saved correctly: {data}"
        assert data.get("media_id"), "No media_id returned"
        print(f"Created opening video media: {data.get('media_id')}")
        
    def test_02_add_media_with_free_offers_placement(self):
        """Test POST /api/admin/media with placement=free_offers"""
        session = get_admin_session()
        resp = session.post(f"{BASE_URL}/api/admin/media", json={
            "url": "https://youtube.com/watch?v=test_free_offers_iter52",
            "title": "TEST_Free Offers Video Iter52",
            "type": "video",
            "target": "both",
            "placement": "free_offers"
        })
        assert resp.status_code == 200, f"Failed to add media: {resp.text}"
        data = resp.json()
        assert data.get("placement") == "free_offers", f"Placement not saved correctly: {data}"
        print(f"Created free offers video media: {data.get('media_id')}")
        
    def test_03_add_media_with_marketing_material_placement(self):
        """Test POST /api/admin/media with placement=marketing_material"""
        session = get_admin_session()
        resp = session.post(f"{BASE_URL}/api/admin/media", json={
            "url": "https://example.com/marketing_image.jpg",
            "title": "TEST_Marketing Material Iter52",
            "type": "image",
            "target": "client",
            "placement": "marketing_material"
        })
        assert resp.status_code == 200, f"Failed to add media: {resp.text}"
        data = resp.json()
        assert data.get("placement") == "marketing_material", f"Placement not saved correctly: {data}"
        print(f"Created marketing material media: {data.get('media_id')}")
        
    def test_04_add_media_with_banner_general_placement(self):
        """Test POST /api/admin/media with placement=banner_general (default)"""
        session = get_admin_session()
        resp = session.post(f"{BASE_URL}/api/admin/media", json={
            "url": "https://example.com/banner_image.jpg",
            "title": "TEST_Banner General Iter52",
            "type": "image",
            "target": "both",
            "placement": "banner_general"
        })
        assert resp.status_code == 200, f"Failed to add media: {resp.text}"
        data = resp.json()
        assert data.get("placement") == "banner_general", f"Placement not saved correctly: {data}"
        print(f"Created banner general media: {data.get('media_id')}")
        
    def test_05_get_media_by_placement_app_opening(self):
        """Test GET /api/media/by-placement/app_opening"""
        session = get_admin_session()
        resp = session.get(f"{BASE_URL}/api/media/by-placement/app_opening")
        assert resp.status_code == 200, f"Failed to get media by placement: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Response should be a list"
        # Check that all returned media have correct placement
        for media in data:
            assert media.get("placement") == "app_opening", f"Wrong placement in response: {media}"
        print(f"Found {len(data)} media items with app_opening placement")
        
    def test_06_get_media_by_placement_free_offers(self):
        """Test GET /api/media/by-placement/free_offers"""
        session = get_admin_session()
        resp = session.get(f"{BASE_URL}/api/media/by-placement/free_offers")
        assert resp.status_code == 200, f"Failed to get media by placement: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Response should be a list"
        for media in data:
            assert media.get("placement") == "free_offers", f"Wrong placement in response: {media}"
        print(f"Found {len(data)} media items with free_offers placement")
        
    def test_07_get_media_by_placement_marketing_material(self):
        """Test GET /api/media/by-placement/marketing_material"""
        session = get_admin_session()
        resp = session.get(f"{BASE_URL}/api/media/by-placement/marketing_material")
        assert resp.status_code == 200, f"Failed to get media by placement: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Response should be a list"
        for media in data:
            assert media.get("placement") == "marketing_material", f"Wrong placement in response: {media}"
        print(f"Found {len(data)} media items with marketing_material placement")
        
    def test_08_get_media_by_placement_banner_general(self):
        """Test GET /api/media/by-placement/banner_general"""
        session = get_admin_session()
        resp = session.get(f"{BASE_URL}/api/media/by-placement/banner_general")
        assert resp.status_code == 200, f"Failed to get media by placement: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Response should be a list"
        for media in data:
            assert media.get("placement") == "banner_general", f"Wrong placement in response: {media}"
        print(f"Found {len(data)} media items with banner_general placement")
        
    def test_09_app_config_returns_placement_based_videos(self):
        """Test GET /api/app-config returns videos from media_assets with correct placement"""
        session = get_admin_session()
        resp = session.get(f"{BASE_URL}/api/app-config")
        assert resp.status_code == 200, f"Failed to get app config: {resp.text}"
        data = resp.json()
        
        # Check that opening_video_url and free_offers_video_url are present
        assert "opening_video_url" in data, "opening_video_url not in response"
        assert "free_offers_video_url" in data, "free_offers_video_url not in response"
        
        print(f"App config opening_video_url: {data.get('opening_video_url')}")
        print(f"App config free_offers_video_url: {data.get('free_offers_video_url')}")
        
    def test_10_admin_media_list_shows_placement(self):
        """Test GET /api/admin/media returns media with placement field for new items"""
        session = get_admin_session()
        resp = session.get(f"{BASE_URL}/api/admin/media")
        assert resp.status_code == 200, f"Failed to get admin media: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Count by placement (older items may not have placement field)
        placements = {}
        items_with_placement = 0
        for media in data:
            if "placement" in media:
                items_with_placement += 1
                p = media.get("placement", "unknown")
                placements[p] = placements.get(p, 0) + 1
        
        print(f"Media by placement: {placements}")
        print(f"Items with placement field: {items_with_placement}/{len(data)}")
        
        # Verify that at least our test items have placement
        assert items_with_placement > 0, "No media items have placement field"


class TestCleanup:
    """Cleanup test data"""
            
    def test_cleanup_test_media(self):
        """Cleanup: Delete TEST_ prefixed media"""
        session = get_admin_session()
        resp = session.get(f"{BASE_URL}/api/admin/media")
        if resp.status_code == 200:
            media_list = resp.json()
            deleted = 0
            for media in media_list:
                if media.get("title", "").startswith("TEST_"):
                    del_resp = session.delete(f"{BASE_URL}/api/admin/media/{media['media_id']}")
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"Cleaned up {deleted} test media items")
