"""
Test Help Topics and Help Settings API - Iteration 25
Tests the dynamic FAQ/Help system for iToke platform
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://draft-offer-mode.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "admin@itoke.master"
ADMIN_NAME = "Admin iToke"
CLIENT_EMAIL = "cliente@teste.com"
CLIENT_NAME = "Cliente Teste"


class TestPublicHelpEndpoints:
    """Test public help endpoints (no auth required)"""
    
    def test_get_public_help_topics(self):
        """GET /api/help-topics - Returns all help topics sorted by order"""
        response = requests.get(f"{BASE_URL}/api/help-topics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        topics = response.json()
        assert isinstance(topics, list), "Response should be a list"
        
        # Should have seeded topics (6 default + any admin-created)
        assert len(topics) >= 6, f"Expected at least 6 seeded topics, got {len(topics)}"
        
        # Verify topic structure
        for topic in topics:
            assert "topic_id" in topic, "Topic should have topic_id"
            assert "title" in topic, "Topic should have title"
            assert "content" in topic, "Topic should have content"
            assert "icon" in topic, "Topic should have icon"
            assert "order" in topic, "Topic should have order"
        
        # Verify sorted by order
        orders = [t["order"] for t in topics]
        assert orders == sorted(orders), "Topics should be sorted by order"
        
        print(f"✓ GET /api/help-topics - Found {len(topics)} topics, sorted correctly")
    
    def test_get_help_settings(self):
        """GET /api/help-settings - Returns support email configuration"""
        response = requests.get(f"{BASE_URL}/api/help-settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        settings = response.json()
        assert "support_email" in settings, "Settings should have support_email"
        assert "@" in settings["support_email"], "Support email should be valid email format"
        
        print(f"✓ GET /api/help-settings - Support email: {settings['support_email']}")


class TestAdminHelpEndpoints:
    """Test admin help endpoints (auth required)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ADMIN_EMAIL,
            "name": ADMIN_NAME,
            "role": "admin"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.admin_token = login_response.json().get("session_token")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Also get client token for permission tests
        client_response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        assert client_response.status_code == 200, f"Client login failed: {client_response.text}"
        self.client_token = client_response.json().get("session_token")
        self.client_headers = {"Authorization": f"Bearer {self.client_token}"}
    
    def test_get_admin_help_topics(self):
        """GET /api/admin/help-topics - Admin only, returns all topics"""
        response = requests.get(f"{BASE_URL}/api/admin/help-topics", headers=self.admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        topics = response.json()
        assert isinstance(topics, list), "Response should be a list"
        assert len(topics) >= 6, f"Expected at least 6 topics, got {len(topics)}"
        
        print(f"✓ GET /api/admin/help-topics - Admin can view {len(topics)} topics")
    
    def test_admin_help_topics_requires_admin_role(self):
        """GET /api/admin/help-topics - Should reject non-admin users"""
        response = requests.get(f"{BASE_URL}/api/admin/help-topics", headers=self.client_headers)
        assert response.status_code == 403, f"Expected 403 for client, got {response.status_code}"
        
        print("✓ GET /api/admin/help-topics - Correctly rejects non-admin users")
    
    def test_create_help_topic(self):
        """POST /api/admin/help-topics - Create new help topic"""
        new_topic = {
            "title": "TEST_Topico de Teste",
            "content": "Este e um topico de teste criado pelo pytest para validar a funcionalidade de criacao.",
            "icon": "bulb-outline",
            "order": 99
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/help-topics",
            json=new_topic,
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert "topic_id" in created, "Created topic should have topic_id"
        assert created["title"] == new_topic["title"], "Title should match"
        assert created["content"] == new_topic["content"], "Content should match"
        assert created["icon"] == new_topic["icon"], "Icon should match"
        assert created["order"] == new_topic["order"], "Order should match"
        
        # Store for cleanup
        self.created_topic_id = created["topic_id"]
        
        # Verify persistence via GET
        get_response = requests.get(f"{BASE_URL}/api/admin/help-topics", headers=self.admin_headers)
        topics = get_response.json()
        found = any(t["topic_id"] == self.created_topic_id for t in topics)
        assert found, "Created topic should be retrievable"
        
        print(f"✓ POST /api/admin/help-topics - Created topic: {self.created_topic_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/help-topics/{self.created_topic_id}", headers=self.admin_headers)
    
    def test_create_help_topic_validation(self):
        """POST /api/admin/help-topics - Validates required fields"""
        # Missing title
        response = requests.post(
            f"{BASE_URL}/api/admin/help-topics",
            json={"content": "Some content", "icon": "help-circle-outline"},
            headers=self.admin_headers
        )
        assert response.status_code == 400, f"Expected 400 for missing title, got {response.status_code}"
        
        # Missing content
        response = requests.post(
            f"{BASE_URL}/api/admin/help-topics",
            json={"title": "Some title", "icon": "help-circle-outline"},
            headers=self.admin_headers
        )
        assert response.status_code == 400, f"Expected 400 for missing content, got {response.status_code}"
        
        print("✓ POST /api/admin/help-topics - Validation working correctly")
    
    def test_update_help_topic(self):
        """PUT /api/admin/help-topics/{topic_id} - Update existing topic"""
        # First create a topic
        create_response = requests.post(
            f"{BASE_URL}/api/admin/help-topics",
            json={
                "title": "TEST_Topico para Atualizar",
                "content": "Conteudo original",
                "icon": "help-circle-outline",
                "order": 98
            },
            headers=self.admin_headers
        )
        assert create_response.status_code == 200
        topic_id = create_response.json()["topic_id"]
        
        # Update the topic
        update_data = {
            "title": "TEST_Topico Atualizado",
            "content": "Conteudo atualizado pelo teste",
            "icon": "star-outline",
            "order": 97
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/help-topics/{topic_id}",
            json=update_data,
            headers=self.admin_headers
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated = update_response.json()
        assert updated["title"] == update_data["title"], "Title should be updated"
        assert updated["content"] == update_data["content"], "Content should be updated"
        assert updated["icon"] == update_data["icon"], "Icon should be updated"
        assert updated["order"] == update_data["order"], "Order should be updated"
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/admin/help-topics", headers=self.admin_headers)
        topics = get_response.json()
        found_topic = next((t for t in topics if t["topic_id"] == topic_id), None)
        assert found_topic is not None, "Updated topic should exist"
        assert found_topic["title"] == update_data["title"], "Title should persist"
        
        print(f"✓ PUT /api/admin/help-topics/{topic_id} - Topic updated successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/help-topics/{topic_id}", headers=self.admin_headers)
    
    def test_update_nonexistent_topic(self):
        """PUT /api/admin/help-topics/{topic_id} - Returns 404 for nonexistent topic"""
        response = requests.put(
            f"{BASE_URL}/api/admin/help-topics/nonexistent_topic_id",
            json={"title": "Test"},
            headers=self.admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✓ PUT /api/admin/help-topics - Returns 404 for nonexistent topic")
    
    def test_delete_help_topic(self):
        """DELETE /api/admin/help-topics/{topic_id} - Delete a topic"""
        # First create a topic
        create_response = requests.post(
            f"{BASE_URL}/api/admin/help-topics",
            json={
                "title": "TEST_Topico para Deletar",
                "content": "Este topico sera deletado",
                "icon": "trash-outline",
                "order": 96
            },
            headers=self.admin_headers
        )
        assert create_response.status_code == 200
        topic_id = create_response.json()["topic_id"]
        
        # Delete the topic
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/help-topics/{topic_id}",
            headers=self.admin_headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/admin/help-topics", headers=self.admin_headers)
        topics = get_response.json()
        found = any(t["topic_id"] == topic_id for t in topics)
        assert not found, "Deleted topic should not exist"
        
        print(f"✓ DELETE /api/admin/help-topics/{topic_id} - Topic deleted successfully")
    
    def test_delete_nonexistent_topic(self):
        """DELETE /api/admin/help-topics/{topic_id} - Returns 404 for nonexistent topic"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/help-topics/nonexistent_topic_id",
            headers=self.admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✓ DELETE /api/admin/help-topics - Returns 404 for nonexistent topic")
    
    def test_get_admin_help_settings(self):
        """GET /api/admin/help-settings - Admin gets support email config"""
        response = requests.get(f"{BASE_URL}/api/admin/help-settings", headers=self.admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        settings = response.json()
        assert "support_email" in settings, "Settings should have support_email"
        
        print(f"✓ GET /api/admin/help-settings - Support email: {settings['support_email']}")
    
    def test_admin_help_settings_requires_admin(self):
        """GET /api/admin/help-settings - Should reject non-admin users"""
        response = requests.get(f"{BASE_URL}/api/admin/help-settings", headers=self.client_headers)
        assert response.status_code == 403, f"Expected 403 for client, got {response.status_code}"
        
        print("✓ GET /api/admin/help-settings - Correctly rejects non-admin users")
    
    def test_update_help_settings(self):
        """PUT /api/admin/help-settings - Admin updates support email"""
        # Get current email first
        get_response = requests.get(f"{BASE_URL}/api/admin/help-settings", headers=self.admin_headers)
        original_email = get_response.json().get("support_email", "suporte@itoke.com.br")
        
        # Update to test email
        test_email = "test_support@itoke.com.br"
        update_response = requests.put(
            f"{BASE_URL}/api/admin/help-settings",
            json={"support_email": test_email},
            headers=self.admin_headers
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/admin/help-settings", headers=self.admin_headers)
        assert verify_response.json()["support_email"] == test_email, "Email should be updated"
        
        # Also verify public endpoint reflects change
        public_response = requests.get(f"{BASE_URL}/api/help-settings")
        assert public_response.json()["support_email"] == test_email, "Public endpoint should show updated email"
        
        print(f"✓ PUT /api/admin/help-settings - Email updated to {test_email}")
        
        # Restore original email
        requests.put(
            f"{BASE_URL}/api/admin/help-settings",
            json={"support_email": original_email},
            headers=self.admin_headers
        )
    
    def test_update_help_settings_validation(self):
        """PUT /api/admin/help-settings - Validates email is required"""
        response = requests.put(
            f"{BASE_URL}/api/admin/help-settings",
            json={"support_email": ""},
            headers=self.admin_headers
        )
        assert response.status_code == 400, f"Expected 400 for empty email, got {response.status_code}"
        
        print("✓ PUT /api/admin/help-settings - Validation working correctly")


class TestHelpTopicsSeed:
    """Test that help topics are seeded correctly on startup"""
    
    def test_seeded_topics_exist(self):
        """Verify 6 default topics were seeded"""
        response = requests.get(f"{BASE_URL}/api/help-topics")
        assert response.status_code == 200
        
        topics = response.json()
        
        # Check for expected seeded topic titles (in Portuguese)
        expected_titles = [
            "O que sao Tokens?",
            "O que sao Creditos?",
            "Como ganhar mais?",
            "Quanto tempo dura o QR Code?",
            "Posso usar o desconto em qualquer loja?",
            "Os creditos que eu ganho expiram?"
        ]
        
        actual_titles = [t["title"] for t in topics]
        
        for expected in expected_titles:
            assert expected in actual_titles, f"Missing seeded topic: {expected}"
        
        print(f"✓ All 6 seeded topics found: {expected_titles}")
    
    def test_seeded_topics_have_correct_icons(self):
        """Verify seeded topics have appropriate icons"""
        response = requests.get(f"{BASE_URL}/api/help-topics")
        topics = response.json()
        
        # Map of expected icons for seeded topics
        expected_icons = {
            "O que sao Tokens?": "ticket-outline",
            "O que sao Creditos?": "wallet-outline",
            "Como ganhar mais?": "trending-up-outline",
            "Quanto tempo dura o QR Code?": "time-outline",
            "Posso usar o desconto em qualquer loja?": "storefront-outline",
            "Os creditos que eu ganho expiram?": "infinite-outline"
        }
        
        for topic in topics:
            if topic["title"] in expected_icons:
                assert topic["icon"] == expected_icons[topic["title"]], \
                    f"Topic '{topic['title']}' should have icon '{expected_icons[topic['title']]}', got '{topic['icon']}'"
        
        print("✓ Seeded topics have correct icons")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
