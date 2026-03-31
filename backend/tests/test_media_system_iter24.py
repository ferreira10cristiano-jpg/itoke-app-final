"""
Test Media System - Iteration 24
Tests for Admin media upload (base64 and URL) and public media endpoint
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@itoke.master"
ADMIN_NAME = "Admin iToke"
CLIENT_EMAIL = "cliente@teste.com"
CLIENT_NAME = "Cliente Teste"


class TestMediaSystem:
    """Media system endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session and authenticate as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ADMIN_EMAIL,
            "name": ADMIN_NAME,
            "role": "admin"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.admin_token = data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        yield
        
        # Cleanup: delete test media created during tests
        # (handled in individual tests)
    
    def test_get_public_media(self):
        """Test GET /api/media - public endpoint returns media list"""
        # Public endpoint - no auth needed
        response = requests.get(f"{BASE_URL}/api/media")
        assert response.status_code == 200, f"Public media endpoint failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are media items, verify structure
        if len(data) > 0:
            media = data[0]
            assert "media_id" in media, "Media should have media_id"
            assert "url" in media, "Media should have url"
            assert "title" in media, "Media should have title"
            assert "type" in media, "Media should have type"
            print(f"Found {len(data)} media items in public endpoint")
        else:
            print("No media items found (empty list)")
    
    def test_get_admin_media(self):
        """Test GET /api/admin/media - admin endpoint returns media list"""
        response = self.session.get(f"{BASE_URL}/api/admin/media")
        assert response.status_code == 200, f"Admin media endpoint failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Admin media endpoint returned {len(data)} items")
    
    def test_add_media_with_url(self):
        """Test POST /api/admin/media with URL field only"""
        test_url = "https://picsum.photos/400/300"
        test_title = "TEST_URL_Media_Iter24"
        
        response = self.session.post(f"{BASE_URL}/api/admin/media", json={
            "url": test_url,
            "title": test_title,
            "type": "image"
        })
        assert response.status_code == 200, f"Add media with URL failed: {response.text}"
        
        data = response.json()
        assert "media_id" in data, "Response should have media_id"
        assert data["url"] == test_url, "URL should match"
        assert data["title"] == test_title, "Title should match"
        assert data["type"] == "image", "Type should be image"
        
        # Cleanup
        media_id = data["media_id"]
        delete_response = self.session.delete(f"{BASE_URL}/api/admin/media/{media_id}")
        assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.text}"
        print(f"Successfully created and deleted URL-based media: {media_id}")
    
    def test_add_media_with_base64(self):
        """Test POST /api/admin/media with base64_data field"""
        # Create a small test image (1x1 red pixel PNG)
        # This is a valid base64 encoded 1x1 red PNG
        test_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        test_title = "TEST_Base64_Media_Iter24"
        
        response = self.session.post(f"{BASE_URL}/api/admin/media", json={
            "base64_data": test_base64,
            "title": test_title,
            "type": "image"
        })
        assert response.status_code == 200, f"Add media with base64 failed: {response.text}"
        
        data = response.json()
        assert "media_id" in data, "Response should have media_id"
        assert data["url"].startswith("data:image/"), "URL should be data URI"
        assert data["title"] == test_title, "Title should match"
        assert data["type"] == "image", "Type should be image"
        
        # Verify the media appears in the list
        list_response = self.session.get(f"{BASE_URL}/api/admin/media")
        assert list_response.status_code == 200
        media_list = list_response.json()
        found = any(m["media_id"] == data["media_id"] for m in media_list)
        assert found, "Created media should appear in admin list"
        
        # Cleanup
        media_id = data["media_id"]
        delete_response = self.session.delete(f"{BASE_URL}/api/admin/media/{media_id}")
        assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.text}"
        print(f"Successfully created and deleted base64 media: {media_id}")
    
    def test_add_media_requires_url_or_base64(self):
        """Test POST /api/admin/media fails without URL or base64"""
        response = self.session.post(f"{BASE_URL}/api/admin/media", json={
            "title": "TEST_NoMedia",
            "type": "image"
        })
        assert response.status_code == 400, f"Should fail without URL or base64: {response.text}"
        print("Correctly rejected media without URL or base64")
    
    def test_delete_media(self):
        """Test DELETE /api/admin/media/{media_id}"""
        # First create a media item
        response = self.session.post(f"{BASE_URL}/api/admin/media", json={
            "url": "https://picsum.photos/200/200",
            "title": "TEST_Delete_Media_Iter24",
            "type": "image"
        })
        assert response.status_code == 200
        media_id = response.json()["media_id"]
        
        # Delete it
        delete_response = self.session.delete(f"{BASE_URL}/api/admin/media/{media_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify it's gone
        list_response = self.session.get(f"{BASE_URL}/api/admin/media")
        media_list = list_response.json()
        found = any(m["media_id"] == media_id for m in media_list)
        assert not found, "Deleted media should not appear in list"
        print(f"Successfully deleted media: {media_id}")
    
    def test_delete_nonexistent_media(self):
        """Test DELETE /api/admin/media/{media_id} with invalid ID"""
        response = self.session.delete(f"{BASE_URL}/api/admin/media/nonexistent_id_12345")
        assert response.status_code == 404, f"Should return 404 for nonexistent media: {response.text}"
        print("Correctly returned 404 for nonexistent media")


class TestMediaAccessControl:
    """Test media access control"""
    
    def test_admin_media_requires_auth(self):
        """Test that admin media endpoints require authentication"""
        # No auth header
        response = requests.get(f"{BASE_URL}/api/admin/media")
        assert response.status_code == 401, f"Should require auth: {response.text}"
        print("Admin media endpoint correctly requires authentication")
    
    def test_admin_media_requires_admin_role(self):
        """Test that admin media endpoints require admin role"""
        # Login as client
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to access admin media
        response = session.get(f"{BASE_URL}/api/admin/media")
        assert response.status_code == 403, f"Should require admin role: {response.text}"
        
        # Try to add media
        add_response = session.post(f"{BASE_URL}/api/admin/media", json={
            "url": "https://example.com/test.jpg",
            "title": "Test",
            "type": "image"
        })
        assert add_response.status_code == 403, f"Should require admin role for add: {add_response.text}"
        print("Admin media endpoints correctly require admin role")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
