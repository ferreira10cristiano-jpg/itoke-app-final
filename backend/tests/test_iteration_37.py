"""
Iteration 37: Onboarding Videos & Dashboard Redesign Tests
Tests for:
- GET /api/onboarding-videos?target=establishment (returns 3 seed videos)
- GET /api/onboarding-videos/all?target=establishment (returns all including inactive)
- POST /api/admin/onboarding-videos (create video)
- PUT /api/admin/onboarding-videos/{id} (update video)
- DELETE /api/admin/onboarding-videos/{id} (delete video)
- POST /api/establishments/me/onboarding-seen (mark onboarding as seen)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com').rstrip('/')


class TestOnboardingVideosPublic:
    """Test public onboarding videos endpoints"""
    
    def test_get_onboarding_videos_establishment(self):
        """GET /api/onboarding-videos?target=establishment returns active videos"""
        response = requests.get(f"{BASE_URL}/api/onboarding-videos?target=establishment")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        videos = response.json()
        assert isinstance(videos, list), "Response should be a list"
        
        # Should have at least 3 seed videos
        assert len(videos) >= 3, f"Expected at least 3 videos, got {len(videos)}"
        
        # Verify video structure
        for video in videos:
            assert "video_id" in video, "Video should have video_id"
            assert "title" in video, "Video should have title"
            assert "description" in video, "Video should have description"
            assert "video_url" in video, "Video should have video_url"
            assert "target" in video, "Video should have target"
            assert "order" in video, "Video should have order"
            assert "active" in video, "Video should have active"
            assert video["active"] == True, "Public endpoint should only return active videos"
            assert video["target"] == "establishment", "Videos should be for establishment target"
        
        # Verify seed videos are present
        titles = [v["title"] for v in videos]
        assert "O que e um Token?" in titles, "Seed video 1 should be present"
        assert "Como Comprar Tokens?" in titles, "Seed video 2 should be present"
        assert "Como Alocar Tokens em Ofertas?" in titles, "Seed video 3 should be present"
        
        print(f"✓ GET /api/onboarding-videos?target=establishment returned {len(videos)} active videos")
    
    def test_get_onboarding_videos_client(self):
        """GET /api/onboarding-videos?target=client returns client videos (may be empty)"""
        response = requests.get(f"{BASE_URL}/api/onboarding-videos?target=client")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        videos = response.json()
        assert isinstance(videos, list), "Response should be a list"
        
        # All returned videos should be for client target and active
        for video in videos:
            assert video["target"] == "client", "Videos should be for client target"
            assert video["active"] == True, "Public endpoint should only return active videos"
        
        print(f"✓ GET /api/onboarding-videos?target=client returned {len(videos)} videos")


class TestOnboardingVideosAll:
    """Test get all onboarding videos endpoint (includes inactive)"""
    
    def test_get_all_onboarding_videos_establishment(self):
        """GET /api/onboarding-videos/all?target=establishment returns all videos"""
        response = requests.get(f"{BASE_URL}/api/onboarding-videos/all?target=establishment")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        videos = response.json()
        assert isinstance(videos, list), "Response should be a list"
        assert len(videos) >= 3, f"Expected at least 3 videos, got {len(videos)}"
        
        # Verify video structure
        for video in videos:
            assert "video_id" in video, "Video should have video_id"
            assert "title" in video, "Video should have title"
            assert video["target"] == "establishment", "Videos should be for establishment target"
        
        print(f"✓ GET /api/onboarding-videos/all?target=establishment returned {len(videos)} videos")


class TestOnboardingVideosAdmin:
    """Test admin onboarding videos CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        login_response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "admin@itoke.master",
            "name": "Admin iToke",
            "role": "admin"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        data = login_response.json()
        self.admin_token = data["session_token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Store created video IDs for cleanup
        self.created_video_ids = []
        
        yield
        
        # Cleanup: delete any test videos created
        for video_id in self.created_video_ids:
            try:
                requests.delete(f"{BASE_URL}/api/admin/onboarding-videos/{video_id}", headers=self.headers)
            except:
                pass
    
    def test_create_onboarding_video(self):
        """POST /api/admin/onboarding-videos creates a new video"""
        unique_id = uuid.uuid4().hex[:8]
        video_data = {
            "title": f"TEST_Video_{unique_id}",
            "description": "Test video description",
            "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "target": "establishment",
            "order": 99,
            "active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/onboarding-videos",
            json=video_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert "video_id" in created, "Response should have video_id"
        assert created["title"] == video_data["title"], "Title should match"
        assert created["description"] == video_data["description"], "Description should match"
        assert created["video_url"] == video_data["video_url"], "URL should match"
        assert created["target"] == video_data["target"], "Target should match"
        assert created["active"] == video_data["active"], "Active should match"
        
        self.created_video_ids.append(created["video_id"])
        print(f"✓ POST /api/admin/onboarding-videos created video: {created['video_id']}")
        
        return created["video_id"]
    
    def test_create_onboarding_video_without_auth(self):
        """POST /api/admin/onboarding-videos without auth returns 401"""
        video_data = {
            "title": "Unauthorized Video",
            "description": "Should fail",
            "video_url": "",
            "target": "establishment",
            "order": 1,
            "active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/onboarding-videos", json=video_data)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/admin/onboarding-videos without auth returns 401")
    
    def test_create_onboarding_video_non_admin(self):
        """POST /api/admin/onboarding-videos with non-admin returns 403"""
        # Login as establishment
        login_response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "teste@estabelecimento.com",
            "name": "Teste Estabelecimento",
            "role": "establishment"
        })
        assert login_response.status_code == 200
        est_token = login_response.json()["session_token"]
        
        video_data = {
            "title": "Non-admin Video",
            "description": "Should fail",
            "video_url": "",
            "target": "establishment",
            "order": 1,
            "active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/onboarding-videos",
            json=video_data,
            headers={"Authorization": f"Bearer {est_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ POST /api/admin/onboarding-videos with non-admin returns 403")
    
    def test_update_onboarding_video(self):
        """PUT /api/admin/onboarding-videos/{id} updates a video"""
        # First create a video
        unique_id = uuid.uuid4().hex[:8]
        create_data = {
            "title": f"TEST_Update_{unique_id}",
            "description": "Original description",
            "video_url": "",
            "target": "establishment",
            "order": 98,
            "active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/onboarding-videos",
            json=create_data,
            headers=self.headers
        )
        assert create_response.status_code == 200
        video_id = create_response.json()["video_id"]
        self.created_video_ids.append(video_id)
        
        # Update the video
        update_data = {
            "title": f"TEST_Updated_{unique_id}",
            "description": "Updated description",
            "active": False
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/onboarding-videos/{video_id}",
            json=update_data,
            headers=self.headers
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated = update_response.json()
        assert updated["title"] == update_data["title"], "Title should be updated"
        assert updated["description"] == update_data["description"], "Description should be updated"
        assert updated["active"] == False, "Active should be updated to False"
        
        print(f"✓ PUT /api/admin/onboarding-videos/{video_id} updated successfully")
    
    def test_update_nonexistent_video(self):
        """PUT /api/admin/onboarding-videos/{id} with invalid ID returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/admin/onboarding-videos/nonexistent_video_id",
            json={"title": "Test"},
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PUT /api/admin/onboarding-videos with invalid ID returns 404")
    
    def test_delete_onboarding_video(self):
        """DELETE /api/admin/onboarding-videos/{id} deletes a video"""
        # First create a video
        unique_id = uuid.uuid4().hex[:8]
        create_data = {
            "title": f"TEST_Delete_{unique_id}",
            "description": "To be deleted",
            "video_url": "",
            "target": "establishment",
            "order": 97,
            "active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/onboarding-videos",
            json=create_data,
            headers=self.headers
        )
        assert create_response.status_code == 200
        video_id = create_response.json()["video_id"]
        
        # Delete the video
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/onboarding-videos/{video_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify deletion
        all_videos = requests.get(f"{BASE_URL}/api/onboarding-videos/all?target=establishment").json()
        video_ids = [v["video_id"] for v in all_videos]
        assert video_id not in video_ids, "Deleted video should not be in list"
        
        print(f"✓ DELETE /api/admin/onboarding-videos/{video_id} deleted successfully")
    
    def test_delete_nonexistent_video(self):
        """DELETE /api/admin/onboarding-videos/{id} with invalid ID returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/onboarding-videos/nonexistent_video_id",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ DELETE /api/admin/onboarding-videos with invalid ID returns 404")


class TestOnboardingSeen:
    """Test marking onboarding as seen for establishments"""
    
    def test_mark_onboarding_seen(self):
        """POST /api/establishments/me/onboarding-seen marks flag as true"""
        # Login as establishment
        login_response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "teste@estabelecimento.com",
            "name": "Teste Estabelecimento",
            "role": "establishment"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json()["session_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Mark onboarding as seen
        response = requests.post(
            f"{BASE_URL}/api/establishments/me/onboarding-seen",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        # API returns message confirmation
        assert "message" in result, "Response should have message"
        assert "marcado" in result["message"].lower() or "visto" in result["message"].lower(), "Message should confirm onboarding seen"
        
        # Verify by getting establishment
        est_response = requests.get(f"{BASE_URL}/api/establishments/me", headers=headers)
        assert est_response.status_code == 200
        
        establishment = est_response.json()
        assert establishment.get("has_seen_onboarding") == True, "Establishment should have has_seen_onboarding=True"
        
        print("✓ POST /api/establishments/me/onboarding-seen marked flag as True")
    
    def test_mark_onboarding_seen_without_auth(self):
        """POST /api/establishments/me/onboarding-seen without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/establishments/me/onboarding-seen")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/establishments/me/onboarding-seen without auth returns 401")


class TestSeedVideos:
    """Test that seed videos are properly created"""
    
    def test_seed_videos_exist(self):
        """Verify 3 seed videos exist with correct data"""
        response = requests.get(f"{BASE_URL}/api/onboarding-videos?target=establishment")
        assert response.status_code == 200
        
        videos = response.json()
        
        # Find seed videos
        seed_videos = [v for v in videos if v["video_id"].startswith("vid_seed_")]
        assert len(seed_videos) >= 3, f"Expected at least 3 seed videos, got {len(seed_videos)}"
        
        # Verify seed video 1
        vid1 = next((v for v in seed_videos if v["video_id"] == "vid_seed_01"), None)
        assert vid1 is not None, "Seed video 1 should exist"
        assert vid1["title"] == "O que e um Token?", "Seed video 1 title should match"
        assert vid1["video_url"] == "", "Seed video 1 should have empty URL (placeholder)"
        assert vid1["order"] == 1, "Seed video 1 should have order 1"
        
        # Verify seed video 2
        vid2 = next((v for v in seed_videos if v["video_id"] == "vid_seed_02"), None)
        assert vid2 is not None, "Seed video 2 should exist"
        assert vid2["title"] == "Como Comprar Tokens?", "Seed video 2 title should match"
        assert vid2["order"] == 2, "Seed video 2 should have order 2"
        
        # Verify seed video 3
        vid3 = next((v for v in seed_videos if v["video_id"] == "vid_seed_03"), None)
        assert vid3 is not None, "Seed video 3 should exist"
        assert vid3["title"] == "Como Alocar Tokens em Ofertas?", "Seed video 3 title should match"
        assert vid3["order"] == 3, "Seed video 3 should have order 3"
        
        print("✓ All 3 seed videos exist with correct data (empty URLs = placeholders)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
