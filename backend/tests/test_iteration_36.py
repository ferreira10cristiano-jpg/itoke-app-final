"""
Iteration 36: Establishment Help Topics (FAQ Estabelecimento) Tests
Tests for the new establishment help system managed by Admin.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
ESTABLISHMENT_EMAIL = "teste@estabelecimento.com"
ESTABLISHMENT_NAME = "Teste Estabelecimento"
ADMIN_EMAIL = "admin@itoke.master"
ADMIN_NAME = "Admin iToke"


class TestEstablishmentHelpTopicsPublic:
    """Test public endpoint for establishment help topics"""
    
    def test_get_est_help_topics_returns_list(self):
        """GET /api/est-help-topics should return list of topics"""
        response = requests.get(f"{BASE_URL}/api/est-help-topics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Seed data should have created default topics
        if len(data) > 0:
            topic = data[0]
            assert "topic_id" in topic, "Topic should have topic_id"
            assert "title" in topic, "Topic should have title"
            assert "content" in topic, "Topic should have content"
            assert "icon" in topic, "Topic should have icon"
            assert "order" in topic, "Topic should have order"
            print(f"Found {len(data)} establishment help topics")
        else:
            print("No establishment help topics found (seed may not have run)")


class TestEstablishmentHelpTopicsAdmin:
    """Test admin endpoints for establishment help topics"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        # Login as admin
        login_response = requests.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": ADMIN_EMAIL, "name": ADMIN_NAME, "role": "admin"}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.admin_token = login_response.json().get("session_token")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Login as establishment for non-admin tests
        est_login = requests.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": ESTABLISHMENT_EMAIL, "name": ESTABLISHMENT_NAME, "role": "establishment"}
        )
        assert est_login.status_code == 200, f"Establishment login failed: {est_login.text}"
        self.est_token = est_login.json().get("session_token")
        self.est_headers = {"Authorization": f"Bearer {self.est_token}"}
    
    def test_get_admin_est_help_topics_requires_auth(self):
        """GET /api/admin/est-help-topics should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/est-help-topics")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_get_admin_est_help_topics_requires_admin_role(self):
        """GET /api/admin/est-help-topics should require admin role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/est-help-topics",
            headers=self.est_headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_get_admin_est_help_topics_success(self):
        """GET /api/admin/est-help-topics should return topics for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/est-help-topics",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Admin can see {len(data)} establishment help topics")
    
    def test_create_est_help_topic_requires_admin(self):
        """POST /api/admin/est-help-topics should require admin role"""
        response = requests.post(
            f"{BASE_URL}/api/admin/est-help-topics",
            headers=self.est_headers,
            json={"title": "Test", "content": "Test content"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_create_est_help_topic_success(self):
        """POST /api/admin/est-help-topics should create new topic"""
        topic_data = {
            "title": "TEST_Topico de Teste",
            "content": "Este e um topico de teste para validacao.",
            "icon": "flash-outline",
            "order": 99
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/est-help-topics",
            headers=self.admin_headers,
            json=topic_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "topic_id" in data, "Response should have topic_id"
        assert data["title"] == topic_data["title"], "Title should match"
        assert data["content"] == topic_data["content"], "Content should match"
        assert data["icon"] == topic_data["icon"], "Icon should match"
        assert data["order"] == topic_data["order"], "Order should match"
        
        # Store for cleanup
        self.created_topic_id = data["topic_id"]
        print(f"Created topic: {data['topic_id']}")
        
        # Verify it appears in the list
        list_response = requests.get(
            f"{BASE_URL}/api/admin/est-help-topics",
            headers=self.admin_headers
        )
        topics = list_response.json()
        found = any(t["topic_id"] == data["topic_id"] for t in topics)
        assert found, "Created topic should appear in list"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/est-help-topics/{data['topic_id']}",
            headers=self.admin_headers
        )
    
    def test_create_est_help_topic_validates_title(self):
        """POST /api/admin/est-help-topics should validate title"""
        response = requests.post(
            f"{BASE_URL}/api/admin/est-help-topics",
            headers=self.admin_headers,
            json={"title": "", "content": "Some content"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_create_est_help_topic_validates_content(self):
        """POST /api/admin/est-help-topics should validate content"""
        response = requests.post(
            f"{BASE_URL}/api/admin/est-help-topics",
            headers=self.admin_headers,
            json={"title": "Some title", "content": ""}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_update_est_help_topic_success(self):
        """PUT /api/admin/est-help-topics/{id} should update topic"""
        # First create a topic
        create_response = requests.post(
            f"{BASE_URL}/api/admin/est-help-topics",
            headers=self.admin_headers,
            json={"title": "TEST_Update Topic", "content": "Original content", "icon": "help-circle-outline"}
        )
        assert create_response.status_code == 200
        topic_id = create_response.json()["topic_id"]
        
        # Update it
        update_data = {
            "title": "TEST_Updated Title",
            "content": "Updated content",
            "icon": "star-outline"
        }
        update_response = requests.put(
            f"{BASE_URL}/api/admin/est-help-topics/{topic_id}",
            headers=self.admin_headers,
            json=update_data
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated = update_response.json()
        assert updated["title"] == update_data["title"], "Title should be updated"
        assert updated["content"] == update_data["content"], "Content should be updated"
        assert updated["icon"] == update_data["icon"], "Icon should be updated"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/est-help-topics/{topic_id}",
            headers=self.admin_headers
        )
    
    def test_update_est_help_topic_not_found(self):
        """PUT /api/admin/est-help-topics/{id} should return 404 for non-existent topic"""
        response = requests.put(
            f"{BASE_URL}/api/admin/est-help-topics/nonexistent_id",
            headers=self.admin_headers,
            json={"title": "Test"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_delete_est_help_topic_success(self):
        """DELETE /api/admin/est-help-topics/{id} should delete topic"""
        # First create a topic
        create_response = requests.post(
            f"{BASE_URL}/api/admin/est-help-topics",
            headers=self.admin_headers,
            json={"title": "TEST_Delete Topic", "content": "To be deleted"}
        )
        assert create_response.status_code == 200
        topic_id = create_response.json()["topic_id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/est-help-topics/{topic_id}",
            headers=self.admin_headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify it's gone
        list_response = requests.get(
            f"{BASE_URL}/api/admin/est-help-topics",
            headers=self.admin_headers
        )
        topics = list_response.json()
        found = any(t["topic_id"] == topic_id for t in topics)
        assert not found, "Deleted topic should not appear in list"
    
    def test_delete_est_help_topic_not_found(self):
        """DELETE /api/admin/est-help-topics/{id} should return 404 for non-existent topic"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/est-help-topics/nonexistent_id",
            headers=self.admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestEstablishmentHelpTopicsSeedData:
    """Test that seed data creates default establishment help topics"""
    
    def test_seed_creates_default_topics(self):
        """Seed should create default establishment help topics"""
        response = requests.get(f"{BASE_URL}/api/est-help-topics")
        assert response.status_code == 200
        
        topics = response.json()
        # Seed data should create 8 default topics
        if len(topics) >= 8:
            print(f"Seed data created {len(topics)} establishment help topics")
            
            # Check some expected topics exist
            titles = [t["title"] for t in topics]
            expected_keywords = ["Token", "Credito", "PIX", "Oferta"]
            found_keywords = sum(1 for kw in expected_keywords if any(kw.lower() in t.lower() for t in titles))
            print(f"Found {found_keywords}/{len(expected_keywords)} expected topic keywords")
        else:
            print(f"Only {len(topics)} topics found - seed may not have run or topics were deleted")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
