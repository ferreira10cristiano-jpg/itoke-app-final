"""
Test Legal Documents API - iToke Platform
Tests for GET /api/legal, GET /api/legal/{doc_key}, GET /api/admin/legal, PUT /api/admin/legal/{doc_key}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')

# Legal document keys
LEGAL_DOC_KEYS = ["terms_client", "terms_establishment", "terms_general", "privacy_lgpd", "legal_compliance"]


class TestPublicLegalEndpoints:
    """Test public legal document endpoints (no auth required)"""
    
    def test_get_all_legal_documents(self):
        """GET /api/legal - Returns all 5 legal documents"""
        response = requests.get(f"{BASE_URL}/api/legal")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        docs = response.json()
        assert isinstance(docs, list), "Response should be a list"
        assert len(docs) == 5, f"Expected 5 documents, got {len(docs)}"
        
        # Verify all expected keys are present
        doc_keys = [doc.get("key") for doc in docs]
        for key in LEGAL_DOC_KEYS:
            assert key in doc_keys, f"Missing document key: {key}"
        
        print(f"SUCCESS: GET /api/legal returned {len(docs)} documents")
    
    def test_get_terms_client_document(self):
        """GET /api/legal/terms_client - Returns client terms with title and content"""
        response = requests.get(f"{BASE_URL}/api/legal/terms_client")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        doc = response.json()
        assert "key" in doc, "Document should have 'key' field"
        assert doc["key"] == "terms_client", f"Expected key 'terms_client', got {doc.get('key')}"
        assert "title" in doc, "Document should have 'title' field"
        assert "content" in doc, "Document should have 'content' field"
        assert "version" in doc, "Document should have 'version' field"
        
        # Verify content is not empty
        assert len(doc["title"]) > 0, "Title should not be empty"
        assert len(doc["content"]) > 0, "Content should not be empty"
        assert "Termos de Uso - Cliente" in doc["title"], f"Title should contain 'Termos de Uso - Cliente', got {doc['title']}"
        
        print(f"SUCCESS: GET /api/legal/terms_client returned document with title: {doc['title']}")
    
    def test_get_terms_establishment_document(self):
        """GET /api/legal/terms_establishment - Returns establishment terms"""
        response = requests.get(f"{BASE_URL}/api/legal/terms_establishment")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        doc = response.json()
        assert doc["key"] == "terms_establishment"
        assert "Termos de Uso - Estabelecimento" in doc["title"]
        assert len(doc["content"]) > 100, "Content should be substantial"
        
        print(f"SUCCESS: GET /api/legal/terms_establishment returned document")
    
    def test_get_terms_general_document(self):
        """GET /api/legal/terms_general - Returns general terms"""
        response = requests.get(f"{BASE_URL}/api/legal/terms_general")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        doc = response.json()
        assert doc["key"] == "terms_general"
        assert "title" in doc and "content" in doc
        
        print(f"SUCCESS: GET /api/legal/terms_general returned document")
    
    def test_get_privacy_lgpd_document(self):
        """GET /api/legal/privacy_lgpd - Returns LGPD privacy policy"""
        response = requests.get(f"{BASE_URL}/api/legal/privacy_lgpd")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        doc = response.json()
        assert doc["key"] == "privacy_lgpd"
        assert "Privacidade" in doc["title"] or "LGPD" in doc["title"], f"Title should mention privacy/LGPD, got {doc['title']}"
        assert "LGPD" in doc["content"] or "privacidade" in doc["content"].lower(), "Content should mention LGPD or privacy"
        
        print(f"SUCCESS: GET /api/legal/privacy_lgpd returned document with title: {doc['title']}")
    
    def test_get_legal_compliance_document(self):
        """GET /api/legal/legal_compliance - Returns legal compliance declaration"""
        response = requests.get(f"{BASE_URL}/api/legal/legal_compliance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        doc = response.json()
        assert doc["key"] == "legal_compliance"
        assert "title" in doc and "content" in doc
        
        print(f"SUCCESS: GET /api/legal/legal_compliance returned document")
    
    def test_get_invalid_document_returns_404(self):
        """GET /api/legal/invalid_key - Returns 404 for non-existent document"""
        response = requests.get(f"{BASE_URL}/api/legal/invalid_key")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print(f"SUCCESS: GET /api/legal/invalid_key returned 404 as expected")
    
    def test_document_structure_complete(self):
        """Verify all documents have required fields"""
        response = requests.get(f"{BASE_URL}/api/legal")
        assert response.status_code == 200
        
        docs = response.json()
        required_fields = ["key", "title", "content", "version", "order"]
        
        for doc in docs:
            for field in required_fields:
                assert field in doc, f"Document {doc.get('key', 'unknown')} missing field: {field}"
        
        print(f"SUCCESS: All {len(docs)} documents have complete structure")


class TestAdminLegalEndpoints:
    """Test admin legal document endpoints (requires admin auth)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "admin@itoke.master",
            "name": "Admin iToke",
            "role": "admin",
            "admin_key": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def client_token(self):
        """Get client authentication token (non-admin)"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "cliente@teste.com",
            "name": "Cliente Teste",
            "role": "client"
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Client authentication failed")
    
    def test_admin_get_all_legal_documents(self, admin_token):
        """GET /api/admin/legal - Admin can view all documents"""
        response = requests.get(
            f"{BASE_URL}/api/admin/legal",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        docs = response.json()
        assert isinstance(docs, list), "Response should be a list"
        assert len(docs) == 5, f"Expected 5 documents, got {len(docs)}"
        
        # Verify documents are sorted by order
        orders = [doc.get("order", 0) for doc in docs]
        assert orders == sorted(orders), "Documents should be sorted by order"
        
        print(f"SUCCESS: Admin GET /api/admin/legal returned {len(docs)} documents sorted by order")
    
    def test_admin_get_legal_requires_auth(self):
        """GET /api/admin/legal - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/legal")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print(f"SUCCESS: GET /api/admin/legal requires authentication (401)")
    
    def test_admin_get_legal_requires_admin_role(self, client_token):
        """GET /api/admin/legal - Requires admin role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/legal",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        print(f"SUCCESS: GET /api/admin/legal requires admin role (403 for client)")
    
    def test_admin_update_legal_document(self, admin_token):
        """PUT /api/admin/legal/privacy_lgpd - Admin can edit document content"""
        # First get current document
        get_response = requests.get(f"{BASE_URL}/api/legal/privacy_lgpd")
        original_doc = get_response.json()
        original_title = original_doc.get("title")
        
        # Update with new content
        new_title = "Politica de Privacidade - LGPD (Atualizada)"
        update_response = requests.put(
            f"{BASE_URL}/api/admin/legal/privacy_lgpd",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"title": new_title}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        # Response structure is {"message": "...", "document": {...}}
        update_data = update_response.json()
        assert "document" in update_data or "message" in update_data, "Response should have document or message"
        
        # Verify change persisted
        verify_response = requests.get(f"{BASE_URL}/api/legal/privacy_lgpd")
        assert verify_response.status_code == 200
        verified_doc = verify_response.json()
        assert verified_doc.get("title") == new_title, f"Title change should persist, got {verified_doc.get('title')}"
        
        # Restore original title
        restore_response = requests.put(
            f"{BASE_URL}/api/admin/legal/privacy_lgpd",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"title": original_title}
        )
        assert restore_response.status_code == 200
        
        print(f"SUCCESS: Admin can update legal document title and changes persist")
    
    def test_admin_update_legal_content(self, admin_token):
        """PUT /api/admin/legal/terms_general - Admin can edit document content"""
        # Get original content
        get_response = requests.get(f"{BASE_URL}/api/legal/terms_general")
        original_doc = get_response.json()
        original_content = original_doc.get("content")
        
        # Update content
        test_content = original_content + "\n\n[TESTE - Conteudo adicionado para teste]"
        update_response = requests.put(
            f"{BASE_URL}/api/admin/legal/terms_general",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"content": test_content}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/legal/terms_general")
        verified_doc = verify_response.json()
        assert "[TESTE - Conteudo adicionado para teste]" in verified_doc.get("content", "")
        
        # Restore original
        restore_response = requests.put(
            f"{BASE_URL}/api/admin/legal/terms_general",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"content": original_content}
        )
        assert restore_response.status_code == 200
        
        print(f"SUCCESS: Admin can update legal document content")
    
    def test_admin_update_invalid_key_returns_error(self, admin_token):
        """PUT /api/admin/legal/invalid_key - Returns error for invalid key"""
        response = requests.put(
            f"{BASE_URL}/api/admin/legal/invalid_key",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"title": "Test"}
        )
        # API returns 400 for invalid key (not 404)
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"
        
        print(f"SUCCESS: PUT /api/admin/legal/invalid_key returns error ({response.status_code})")
    
    def test_admin_update_requires_admin_role(self, client_token):
        """PUT /api/admin/legal/privacy_lgpd - Requires admin role"""
        response = requests.put(
            f"{BASE_URL}/api/admin/legal/privacy_lgpd",
            headers={"Authorization": f"Bearer {client_token}"},
            json={"title": "Hacked Title"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        print(f"SUCCESS: PUT /api/admin/legal requires admin role (403 for client)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
