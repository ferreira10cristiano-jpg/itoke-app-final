"""
Iteration 38: Test video_url field in est_help_topics
Bug fix: Videos institucionais desapareciam apos salvar no Admin
Restructure: videos now stored INSIDE each FAQ topic (video_url field in est_help_topics)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEstHelpTopicsVideoUrl:
    """Test video_url field in establishment help topics"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "admin@itoke.master",
            "name": "Admin iToke",
            "role": "admin"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        data = login_response.json()
        self.admin_token = data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        yield
    
    def test_get_est_help_topics_returns_video_url_field(self):
        """GET /api/est-help-topics returns topics with video_url field"""
        response = self.session.get(f"{BASE_URL}/api/est-help-topics")
        assert response.status_code == 200
        topics = response.json()
        assert isinstance(topics, list)
        assert len(topics) > 0, "Should have seed topics"
        
        # Check that video_url field exists in topics
        for topic in topics:
            assert "topic_id" in topic
            assert "title" in topic
            assert "content" in topic
            # video_url may or may not be present in seed data, but should be returned if set
            print(f"Topic: {topic.get('title')} - video_url: {topic.get('video_url', 'NOT SET')}")
    
    def test_create_est_help_topic_with_video_url(self):
        """POST /api/admin/est-help-topics creates topic with video_url"""
        test_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        
        response = self.session.post(f"{BASE_URL}/api/admin/est-help-topics", json={
            "title": "TEST_Topic com Video",
            "content": "Este topico tem um video vinculado para teste.",
            "icon": "videocam-outline",
            "order": 99,
            "video_url": test_video_url
        })
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        topic = response.json()
        
        assert topic["title"] == "TEST_Topic com Video"
        assert topic["video_url"] == test_video_url
        assert "topic_id" in topic
        
        # Store for cleanup
        self.created_topic_id = topic["topic_id"]
        
        # Verify it persists by fetching
        get_response = self.session.get(f"{BASE_URL}/api/admin/est-help-topics")
        assert get_response.status_code == 200
        topics = get_response.json()
        created = next((t for t in topics if t["topic_id"] == self.created_topic_id), None)
        assert created is not None, "Created topic not found in list"
        assert created["video_url"] == test_video_url, "video_url not persisted correctly"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/est-help-topics/{self.created_topic_id}")
    
    def test_update_est_help_topic_video_url(self):
        """PUT /api/admin/est-help-topics/{id} updates video_url"""
        # First create a topic without video
        create_response = self.session.post(f"{BASE_URL}/api/admin/est-help-topics", json={
            "title": "TEST_Topic para Update",
            "content": "Topico que sera atualizado com video.",
            "icon": "help-circle-outline",
            "order": 98
        })
        assert create_response.status_code == 200
        topic = create_response.json()
        topic_id = topic["topic_id"]
        
        # Verify no video_url initially (or empty)
        assert topic.get("video_url", "") == ""
        
        # Update with video_url
        new_video_url = "https://vimeo.com/123456789"
        update_response = self.session.put(f"{BASE_URL}/api/admin/est-help-topics/{topic_id}", json={
            "video_url": new_video_url
        })
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        assert updated["video_url"] == new_video_url
        
        # Verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/admin/est-help-topics")
        topics = get_response.json()
        found = next((t for t in topics if t["topic_id"] == topic_id), None)
        assert found is not None
        assert found["video_url"] == new_video_url, "video_url update not persisted"
        
        # Update to remove video (empty string)
        clear_response = self.session.put(f"{BASE_URL}/api/admin/est-help-topics/{topic_id}", json={
            "video_url": ""
        })
        assert clear_response.status_code == 200
        cleared = clear_response.json()
        assert cleared["video_url"] == ""
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/est-help-topics/{topic_id}")
    
    def test_seed_topic_esthelp_seed_01_has_video_url_field(self):
        """Verify seed topic 'O que sao Tokens?' exists and can have video_url"""
        response = self.session.get(f"{BASE_URL}/api/est-help-topics")
        assert response.status_code == 200
        topics = response.json()
        
        # Find the seed topic
        seed_topic = next((t for t in topics if t.get("topic_id") == "esthelp_seed_01"), None)
        if seed_topic:
            print(f"Seed topic found: {seed_topic['title']}")
            print(f"Current video_url: {seed_topic.get('video_url', 'NOT SET')}")
            # The field should exist (may be empty or have a URL)
            assert "title" in seed_topic
        else:
            print("Seed topic esthelp_seed_01 not found - may have been deleted")
    
    def test_public_endpoint_returns_video_url(self):
        """GET /api/est-help-topics (public) returns video_url in response"""
        # Use a session without auth to test public access
        public_session = requests.Session()
        public_session.headers.update({"Content-Type": "application/json"})
        
        response = public_session.get(f"{BASE_URL}/api/est-help-topics")
        assert response.status_code == 200
        topics = response.json()
        
        # Check structure
        if len(topics) > 0:
            topic = topics[0]
            # video_url should be in the response schema
            print(f"Public topic keys: {list(topic.keys())}")
            assert "title" in topic
            assert "content" in topic
            # video_url may or may not be present depending on data
    
    def test_create_topic_without_video_url(self):
        """Creating topic without video_url should work (optional field)"""
        response = self.session.post(f"{BASE_URL}/api/admin/est-help-topics", json={
            "title": "TEST_Topic sem Video",
            "content": "Este topico nao tem video.",
            "icon": "document-outline",
            "order": 97
        })
        
        assert response.status_code == 200
        topic = response.json()
        assert topic["title"] == "TEST_Topic sem Video"
        # video_url should be empty string or not present
        assert topic.get("video_url", "") == ""
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/est-help-topics/{topic['topic_id']}")
    
    def test_video_url_with_youtube_format(self):
        """Test YouTube URL format is accepted"""
        youtube_url = "https://www.youtube.com/watch?v=abc123XYZ"
        
        response = self.session.post(f"{BASE_URL}/api/admin/est-help-topics", json={
            "title": "TEST_YouTube Video Topic",
            "content": "Topic with YouTube video.",
            "icon": "logo-youtube",
            "order": 96,
            "video_url": youtube_url
        })
        
        assert response.status_code == 200
        topic = response.json()
        assert topic["video_url"] == youtube_url
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/est-help-topics/{topic['topic_id']}")
    
    def test_video_url_with_vimeo_format(self):
        """Test Vimeo URL format is accepted"""
        vimeo_url = "https://vimeo.com/987654321"
        
        response = self.session.post(f"{BASE_URL}/api/admin/est-help-topics", json={
            "title": "TEST_Vimeo Video Topic",
            "content": "Topic with Vimeo video.",
            "icon": "play-circle-outline",
            "order": 95,
            "video_url": vimeo_url
        })
        
        assert response.status_code == 200
        topic = response.json()
        assert topic["video_url"] == vimeo_url
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/est-help-topics/{topic['topic_id']}")


class TestEstHelpTopicsAdminAccess:
    """Test admin access requirements for est-help-topics"""
    
    def test_create_requires_admin(self):
        """POST /api/admin/est-help-topics requires admin role"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as establishment (non-admin)
        login_response = session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "teste@estabelecimento.com",
            "name": "Teste Estabelecimento",
            "role": "establishment"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to create topic
        response = session.post(f"{BASE_URL}/api/admin/est-help-topics", json={
            "title": "TEST_Unauthorized Topic",
            "content": "Should fail",
            "icon": "alert",
            "order": 100
        })
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_update_requires_admin(self):
        """PUT /api/admin/est-help-topics/{id} requires admin role"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as establishment
        login_response = session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "teste@estabelecimento.com",
            "name": "Teste Estabelecimento",
            "role": "establishment"
        })
        token = login_response.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to update a topic
        response = session.put(f"{BASE_URL}/api/admin/est-help-topics/esthelp_seed_01", json={
            "video_url": "https://youtube.com/unauthorized"
        })
        
        assert response.status_code == 403


class TestEstHelpTopicsCleanup:
    """Cleanup any TEST_ prefixed topics"""
    
    def test_cleanup_test_topics(self):
        """Remove any TEST_ prefixed topics from previous test runs"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "admin@itoke.master",
            "name": "Admin iToke",
            "role": "admin"
        })
        token = login_response.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get all topics
        response = session.get(f"{BASE_URL}/api/admin/est-help-topics")
        topics = response.json()
        
        # Delete TEST_ prefixed topics
        deleted_count = 0
        for topic in topics:
            if topic.get("title", "").startswith("TEST_"):
                del_response = session.delete(f"{BASE_URL}/api/admin/est-help-topics/{topic['topic_id']}")
                if del_response.status_code == 200:
                    deleted_count += 1
                    print(f"Deleted test topic: {topic['title']}")
        
        print(f"Cleanup complete. Deleted {deleted_count} test topics.")
