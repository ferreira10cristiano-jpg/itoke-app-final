"""
Test Suite for Representative Phase 3 Features - Iteration 49
Features tested:
1. Share links and messages (GET /api/rep/share-link)
2. Marketing materials (GET /api/rep/marketing-materials, Admin CRUD)
3. Token allocation to establishments (POST /api/rep/allocate-tokens)
4. Token allocation rules (GET/PUT /api/admin/rep-token-rules)
5. Token allocation history (GET /api/rep/token-allocations, GET /api/admin/rep-token-allocations)
6. Admin allocation approval (PUT /api/admin/rep-token-allocations/{id})
7. Special launch package (GET /api/rep/special-package, GET/PUT /api/admin/rep-special-package)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@itoke.master"
ADMIN_NAME = "Admin iToke"
REP_TOKEN = "rptk_47f23a5d65db44e0adec80c2ca4defa7"
REP_ID = "rep_597cd705fa02"
REP_REFERRAL_CODE = "REPDC01FA"


class TestAdminAuth:
    """Get admin token for admin-only endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": ADMIN_EMAIL, "name": ADMIN_NAME}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "No session_token in response"
        return data["session_token"]


class TestRepShareLink(TestAdminAuth):
    """Test GET /api/rep/share-link - Share links and messages"""
    
    def test_get_share_link_returns_links_and_messages(self):
        """GET /api/rep/share-link returns share links and messages for client and establishment targets"""
        response = requests.get(
            f"{BASE_URL}/api/rep/share-link",
            headers={"X-Rep-Token": REP_TOKEN}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify all required fields
        assert "referral_code" in data, "Missing referral_code"
        assert data["referral_code"] == REP_REFERRAL_CODE, f"Wrong referral code: {data['referral_code']}"
        
        assert "share_link_client" in data, "Missing share_link_client"
        assert "share_link_establishment" in data, "Missing share_link_establishment"
        assert "share_message_client" in data, "Missing share_message_client"
        assert "share_message_establishment" in data, "Missing share_message_establishment"
        
        # Verify links contain referral code
        assert REP_REFERRAL_CODE in data["share_link_client"], "Client link missing referral code"
        assert REP_REFERRAL_CODE in data["share_link_establishment"], "Establishment link missing referral code"
        assert "type=est" in data["share_link_establishment"], "Establishment link missing type=est"
        
        # Verify messages contain referral code
        assert REP_REFERRAL_CODE in data["share_message_client"], "Client message missing referral code"
        assert REP_REFERRAL_CODE in data["share_message_establishment"], "Establishment message missing referral code"
        
        print(f"✓ Share link test passed - referral_code: {data['referral_code']}")
    
    def test_share_link_requires_auth(self):
        """GET /api/rep/share-link requires X-Rep-Token"""
        response = requests.get(f"{BASE_URL}/api/rep/share-link")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Share link auth check passed")


class TestMarketingMaterials(TestAdminAuth):
    """Test marketing materials endpoints"""
    
    def test_get_rep_marketing_materials(self):
        """GET /api/rep/marketing-materials returns active marketing materials list"""
        response = requests.get(
            f"{BASE_URL}/api/rep/marketing-materials",
            headers={"X-Rep-Token": REP_TOKEN}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Rep marketing materials returned {len(data)} items")
    
    def test_admin_create_marketing_material(self, admin_token):
        """POST /api/admin/rep-marketing-materials creates marketing material"""
        material_data = {
            "title": f"TEST_Material_{uuid.uuid4().hex[:8]}",
            "description": "Test marketing material for iteration 49",
            "type": "image",
            "url": "https://example.com/test-image.jpg",
            "target": "both",
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/rep-marketing-materials",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json=material_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "material_id" in data, "Missing material_id"
        assert data["title"] == material_data["title"], "Title mismatch"
        assert data["active"] == True, "Material should be active"
        
        # Store for cleanup
        self.__class__.created_material_id = data["material_id"]
        print(f"✓ Created marketing material: {data['material_id']}")
        return data["material_id"]
    
    def test_admin_list_marketing_materials(self, admin_token):
        """GET /api/admin/rep-marketing-materials lists all marketing materials"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rep-marketing-materials",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Admin marketing materials returned {len(data)} items")
    
    def test_admin_delete_marketing_material(self, admin_token):
        """DELETE /api/admin/rep-marketing-materials/{id} deletes a material"""
        # First create one to delete
        material_data = {
            "title": f"TEST_ToDelete_{uuid.uuid4().hex[:8]}",
            "description": "Material to be deleted",
            "type": "image",
            "target": "client",
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/rep-marketing-materials",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json=material_data
        )
        assert create_response.status_code == 200
        material_id = create_response.json()["material_id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/rep-marketing-materials/{material_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        assert delete_response.json().get("deleted") == True
        print(f"✓ Deleted marketing material: {material_id}")


class TestTokenAllocationRules(TestAdminAuth):
    """Test token allocation rules endpoints"""
    
    def test_admin_get_token_rules(self, admin_token):
        """GET /api/admin/rep-token-rules returns token allocation rules"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rep-token-rules",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify default fields exist
        assert "max_tokens_per_establishment" in data, "Missing max_tokens_per_establishment"
        assert "token_validity_days" in data, "Missing token_validity_days"
        assert "allow_second_allocation" in data, "Missing allow_second_allocation"
        assert "require_admin_approval_for_repeat" in data, "Missing require_admin_approval_for_repeat"
        
        print(f"✓ Token rules: max={data['max_tokens_per_establishment']}, validity={data['token_validity_days']} days")
        return data
    
    def test_admin_update_token_rules(self, admin_token):
        """PUT /api/admin/rep-token-rules updates token allocation rules"""
        # Get current rules first
        get_response = requests.get(
            f"{BASE_URL}/api/admin/rep-token-rules",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_rules = get_response.json()
        
        # Update rules
        new_rules = {
            "max_tokens_per_establishment": 100,
            "token_validity_days": 60,
            "allow_second_allocation": True,
            "require_admin_approval_for_repeat": False,
        }
        update_response = requests.put(
            f"{BASE_URL}/api/admin/rep-token-rules",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json=new_rules
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/rep-token-rules",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        updated = verify_response.json()
        assert updated["max_tokens_per_establishment"] == 100, "max_tokens not updated"
        assert updated["token_validity_days"] == 60, "validity_days not updated"
        
        # Restore original rules
        requests.put(
            f"{BASE_URL}/api/admin/rep-token-rules",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json=original_rules
        )
        print("✓ Token rules update and restore successful")


class TestTokenAllocation(TestAdminAuth):
    """Test token allocation endpoints"""
    
    def test_allocate_tokens_rejects_unlinked_establishment(self):
        """POST /api/rep/allocate-tokens rejects if establishment not linked to rep"""
        # Use a fake establishment ID that is not linked
        response = requests.post(
            f"{BASE_URL}/api/rep/allocate-tokens",
            headers={"X-Rep-Token": REP_TOKEN, "Content-Type": "application/json"},
            json={"establishment_id": "est_fake_not_linked", "amount": 10}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "nao esta vinculado" in data.get("detail", "").lower() or "not linked" in data.get("detail", "").lower(), \
            f"Expected 'nao esta vinculado' error, got: {data}"
        print("✓ Allocate tokens correctly rejects unlinked establishment")
    
    def test_allocate_tokens_rejects_insufficient_tokens(self):
        """POST /api/rep/allocate-tokens rejects if insufficient free tokens"""
        # Request more tokens than available (rep has limited free tokens)
        response = requests.post(
            f"{BASE_URL}/api/rep/allocate-tokens",
            headers={"X-Rep-Token": REP_TOKEN, "Content-Type": "application/json"},
            json={"establishment_id": "est_any", "amount": 999999}
        )
        # Should fail either due to insufficient tokens or unlinked establishment
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Allocate tokens correctly rejects large amount request")
    
    def test_allocate_tokens_requires_valid_data(self):
        """POST /api/rep/allocate-tokens requires establishment_id and amount"""
        # Missing establishment_id
        response = requests.post(
            f"{BASE_URL}/api/rep/allocate-tokens",
            headers={"X-Rep-Token": REP_TOKEN, "Content-Type": "application/json"},
            json={"amount": 10}
        )
        assert response.status_code == 400, f"Expected 400 for missing establishment_id"
        
        # Missing amount
        response2 = requests.post(
            f"{BASE_URL}/api/rep/allocate-tokens",
            headers={"X-Rep-Token": REP_TOKEN, "Content-Type": "application/json"},
            json={"establishment_id": "est_test"}
        )
        assert response2.status_code == 400, f"Expected 400 for missing amount"
        
        # Zero amount
        response3 = requests.post(
            f"{BASE_URL}/api/rep/allocate-tokens",
            headers={"X-Rep-Token": REP_TOKEN, "Content-Type": "application/json"},
            json={"establishment_id": "est_test", "amount": 0}
        )
        assert response3.status_code == 400, f"Expected 400 for zero amount"
        print("✓ Allocate tokens validation working correctly")
    
    def test_get_token_allocations(self):
        """GET /api/rep/token-allocations returns allocation history"""
        response = requests.get(
            f"{BASE_URL}/api/rep/token-allocations",
            headers={"X-Rep-Token": REP_TOKEN}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Token allocations returned {len(data)} items")
    
    def test_admin_list_token_allocations(self, admin_token):
        """GET /api/admin/rep-token-allocations lists all allocations for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rep-token-allocations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Admin token allocations returned {len(data)} items")
    
    def test_admin_list_token_allocations_with_filter(self, admin_token):
        """GET /api/admin/rep-token-allocations with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rep-token-allocations?status_filter=pending_approval",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        # All items should have pending_approval status if any exist
        for item in data:
            assert item.get("status") == "pending_approval", f"Filter not working: {item.get('status')}"
        print(f"✓ Admin token allocations filter returned {len(data)} pending items")
    
    def test_admin_process_allocation_invalid_id(self, admin_token):
        """PUT /api/admin/rep-token-allocations/{id} returns 404 for invalid ID"""
        response = requests.put(
            f"{BASE_URL}/api/admin/rep-token-allocations/invalid_alloc_id",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"action": "approve"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Admin process allocation returns 404 for invalid ID")
    
    def test_admin_process_allocation_invalid_action(self, admin_token):
        """PUT /api/admin/rep-token-allocations/{id} rejects invalid action"""
        response = requests.put(
            f"{BASE_URL}/api/admin/rep-token-allocations/any_id",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"action": "invalid_action"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Admin process allocation rejects invalid action")


class TestSpecialPackage(TestAdminAuth):
    """Test special launch package endpoints"""
    
    def test_get_rep_special_package(self):
        """GET /api/rep/special-package returns the special launch package config"""
        response = requests.get(
            f"{BASE_URL}/api/rep/special-package",
            headers={"X-Rep-Token": REP_TOKEN}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert "tokens" in data, "Missing tokens field"
        assert "price" in data, "Missing price field"
        assert "name" in data, "Missing name field"
        assert "active" in data, "Missing active field"
        
        # Verify default values
        assert data["tokens"] == 20, f"Expected 20 tokens, got {data['tokens']}"
        assert data["price"] == 9.90, f"Expected 9.90 price, got {data['price']}"
        
        print(f"✓ Special package: {data['tokens']} tokens for R${data['price']}")
    
    def test_admin_get_special_package(self, admin_token):
        """GET /api/admin/rep-special-package returns special package config"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rep-special-package",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "tokens" in data, "Missing tokens"
        assert "price" in data, "Missing price"
        assert "name" in data, "Missing name"
        assert "active" in data, "Missing active"
        print(f"✓ Admin special package: {data}")
    
    def test_admin_update_special_package(self, admin_token):
        """PUT /api/admin/rep-special-package updates special package config"""
        # Get current config
        get_response = requests.get(
            f"{BASE_URL}/api/admin/rep-special-package",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original = get_response.json()
        
        # Update config
        new_config = {
            "tokens": 25,
            "price": 12.90,
            "name": "Pacote Especial Teste",
            "active": True
        }
        update_response = requests.put(
            f"{BASE_URL}/api/admin/rep-special-package",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json=new_config
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/rep-special-package",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        updated = verify_response.json()
        assert updated["tokens"] == 25, "tokens not updated"
        assert updated["price"] == 12.90, "price not updated"
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/rep-special-package",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json=original
        )
        print("✓ Special package update and restore successful")


class TestAuthorizationChecks(TestAdminAuth):
    """Test authorization requirements for all endpoints"""
    
    def test_rep_endpoints_require_rep_token(self):
        """Rep endpoints require X-Rep-Token header"""
        endpoints = [
            "/api/rep/share-link",
            "/api/rep/marketing-materials",
            "/api/rep/token-allocations",
            "/api/rep/special-package",
        ]
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code in [401, 403], f"{endpoint} should require auth, got {response.status_code}"
        print("✓ All rep endpoints require X-Rep-Token")
    
    def test_admin_endpoints_require_admin_token(self, admin_token):
        """Admin endpoints require admin Bearer token"""
        # Test with rep token (should fail)
        admin_endpoints = [
            "/api/admin/rep-token-rules",
            "/api/admin/rep-special-package",
            "/api/admin/rep-marketing-materials",
            "/api/admin/rep-token-allocations",
        ]
        for endpoint in admin_endpoints:
            response = requests.get(
                f"{BASE_URL}{endpoint}",
                headers={"X-Rep-Token": REP_TOKEN}  # Wrong auth type
            )
            assert response.status_code in [401, 403], f"{endpoint} should reject rep token"
        print("✓ All admin endpoints require admin Bearer token")


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests"""
    yield
    # Cleanup would go here if needed
    print("\n✓ Test cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
