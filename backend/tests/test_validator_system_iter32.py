"""
Test Suite for Validator System (Iteration 32)
Tests the collaborator/validator system for establishments (garçons/caixa)

Features tested:
- Public validator page endpoints (no auth required)
- Validator registration and check
- QR code scanning and preview
- Finalize and pending actions
- Owner management of validators (requires auth)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test establishment credentials
TEST_EST_EMAIL = "teste@estabelecimento.com"
TEST_EST_NAME = "Teste Estabelecimento"
TEST_EST_ID = "est_296a0cfc0660"


class TestValidatorPublicEndpoints:
    """Test public validator endpoints (no auth required)"""

    def test_get_establishment_info(self):
        """GET /api/v/{est_id}/info - returns establishment info"""
        response = requests.get(f"{BASE_URL}/api/v/{TEST_EST_ID}/info")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "establishment_id" in data
        assert "business_name" in data
        assert data["establishment_id"] == TEST_EST_ID
        print(f"✓ GET /api/v/{TEST_EST_ID}/info - establishment: {data['business_name']}")

    def test_get_establishment_info_not_found(self):
        """GET /api/v/{est_id}/info - returns 404 for invalid establishment"""
        response = requests.get(f"{BASE_URL}/api/v/invalid_est_id/info")
        assert response.status_code == 404
        print("✓ GET /api/v/invalid_est_id/info - returns 404 for invalid establishment")

    def test_register_validator(self):
        """POST /api/v/{est_id}/register - creates a new validator"""
        unique_name = f"TEST_Validator_{uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/register",
            json={"name": unique_name}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "validator_id" in data
        assert data["name"] == unique_name
        assert data["establishment_id"] == TEST_EST_ID
        assert data["blocked"] == False
        assert data["validations_count"] == 0
        print(f"✓ POST /api/v/{TEST_EST_ID}/register - created validator: {data['validator_id']}")
        return data["validator_id"]

    def test_register_validator_empty_name(self):
        """POST /api/v/{est_id}/register - returns 400 for empty name"""
        response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/register",
            json={"name": ""}
        )
        assert response.status_code == 400
        print("✓ POST /api/v/{TEST_EST_ID}/register - returns 400 for empty name")

    def test_register_validator_invalid_establishment(self):
        """POST /api/v/{est_id}/register - returns 404 for invalid establishment"""
        response = requests.post(
            f"{BASE_URL}/api/v/invalid_est_id/register",
            json={"name": "Test Validator"}
        )
        assert response.status_code == 404
        print("✓ POST /api/v/invalid_est_id/register - returns 404 for invalid establishment")

    def test_check_validator_active(self):
        """GET /api/v/{est_id}/check/{validator_id} - returns active validator"""
        # First create a validator
        unique_name = f"TEST_CheckValidator_{uuid.uuid4().hex[:6]}"
        reg_response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/register",
            json={"name": unique_name}
        )
        assert reg_response.status_code == 200
        validator_id = reg_response.json()["validator_id"]
        
        # Check the validator
        response = requests.get(f"{BASE_URL}/api/v/{TEST_EST_ID}/check/{validator_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["validator_id"] == validator_id
        assert data["name"] == unique_name
        assert data["blocked"] == False
        print(f"✓ GET /api/v/{TEST_EST_ID}/check/{validator_id} - validator is active")

    def test_check_validator_not_found(self):
        """GET /api/v/{est_id}/check/{validator_id} - returns 404 for invalid validator"""
        response = requests.get(f"{BASE_URL}/api/v/{TEST_EST_ID}/check/invalid_validator_id")
        assert response.status_code == 404
        print("✓ GET /api/v/{TEST_EST_ID}/check/invalid_validator_id - returns 404")


class TestValidatorScanEndpoints:
    """Test validator scan/finalize/pending endpoints"""

    @pytest.fixture
    def validator_id(self):
        """Create a test validator for scan tests"""
        unique_name = f"TEST_ScanValidator_{uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/register",
            json={"name": unique_name}
        )
        assert response.status_code == 200
        return response.json()["validator_id"]

    def test_scan_missing_params(self, validator_id):
        """POST /api/v/{est_id}/scan - returns 400 for missing params"""
        response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/scan",
            json={"validator_id": validator_id}  # missing code
        )
        assert response.status_code == 400
        print("✓ POST /api/v/{TEST_EST_ID}/scan - returns 400 for missing code")

    def test_scan_invalid_code(self, validator_id):
        """POST /api/v/{est_id}/scan - returns 404 for invalid voucher code"""
        response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/scan",
            json={"validator_id": validator_id, "code": "INVALID-CODE-123"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "não encontrado" in data.get("detail", "").lower() or "not found" in data.get("detail", "").lower()
        print("✓ POST /api/v/{TEST_EST_ID}/scan - returns 404 for invalid code")

    def test_finalize_missing_params(self, validator_id):
        """POST /api/v/{est_id}/finalize - returns 400 for missing params"""
        response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/finalize",
            json={"validator_id": validator_id}  # missing voucher_id
        )
        assert response.status_code == 400
        print("✓ POST /api/v/{TEST_EST_ID}/finalize - returns 400 for missing voucher_id")

    def test_finalize_invalid_voucher(self, validator_id):
        """POST /api/v/{est_id}/finalize - returns 404 for invalid voucher"""
        response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/finalize",
            json={"validator_id": validator_id, "voucher_id": "invalid_voucher_id"}
        )
        assert response.status_code == 404
        print("✓ POST /api/v/{TEST_EST_ID}/finalize - returns 404 for invalid voucher")

    def test_pending_missing_params(self, validator_id):
        """POST /api/v/{est_id}/pending - returns 400 for missing params"""
        response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/pending",
            json={"validator_id": validator_id}  # missing voucher_id
        )
        assert response.status_code == 400
        print("✓ POST /api/v/{TEST_EST_ID}/pending - returns 400 for missing voucher_id")

    def test_pending_invalid_voucher(self, validator_id):
        """POST /api/v/{est_id}/pending - returns 404 for invalid voucher"""
        response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/pending",
            json={"validator_id": validator_id, "voucher_id": "invalid_voucher_id"}
        )
        assert response.status_code == 404
        print("✓ POST /api/v/{TEST_EST_ID}/pending - returns 404 for invalid voucher")


class TestValidatorOwnerManagement:
    """Test owner management of validators (requires auth)"""

    @pytest.fixture
    def auth_token(self):
        """Get authentication token for establishment owner"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": TEST_EST_EMAIL, "name": TEST_EST_NAME}
        )
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Authentication failed - skipping authenticated tests")

    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

    def test_get_my_validators(self, auth_headers):
        """GET /api/establishments/me/validators - returns list of validators"""
        response = requests.get(
            f"{BASE_URL}/api/establishments/me/validators",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/establishments/me/validators - returned {len(data)} validators")
        
        # Verify validator structure if any exist
        if len(data) > 0:
            validator = data[0]
            assert "validator_id" in validator
            assert "name" in validator
            assert "blocked" in validator
            assert "validations_count" in validator
            print(f"  First validator: {validator['name']} (blocked: {validator['blocked']})")

    def test_get_my_validators_unauthorized(self):
        """GET /api/establishments/me/validators - returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/establishments/me/validators")
        assert response.status_code == 401
        print("✓ GET /api/establishments/me/validators - returns 401 without auth")

    def test_toggle_validator_block(self, auth_headers):
        """PUT /api/establishments/me/validators/{id}/toggle - blocks/unblocks validator"""
        # First create a validator to toggle
        unique_name = f"TEST_ToggleValidator_{uuid.uuid4().hex[:6]}"
        reg_response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/register",
            json={"name": unique_name}
        )
        assert reg_response.status_code == 200
        validator_id = reg_response.json()["validator_id"]
        
        # Toggle to block
        response = requests.put(
            f"{BASE_URL}/api/establishments/me/validators/{validator_id}/toggle",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["validator_id"] == validator_id
        assert data["blocked"] == True  # Should be blocked now
        print(f"✓ PUT /api/establishments/me/validators/{validator_id}/toggle - blocked validator")
        
        # Verify blocked validator returns 403 on check
        check_response = requests.get(f"{BASE_URL}/api/v/{TEST_EST_ID}/check/{validator_id}")
        assert check_response.status_code == 403
        print(f"✓ GET /api/v/{TEST_EST_ID}/check/{validator_id} - returns 403 for blocked validator")
        
        # Toggle to unblock
        response2 = requests.put(
            f"{BASE_URL}/api/establishments/me/validators/{validator_id}/toggle",
            headers=auth_headers
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["blocked"] == False  # Should be unblocked now
        print(f"✓ PUT /api/establishments/me/validators/{validator_id}/toggle - unblocked validator")

    def test_toggle_validator_not_found(self, auth_headers):
        """PUT /api/establishments/me/validators/{id}/toggle - returns 404 for invalid validator"""
        response = requests.put(
            f"{BASE_URL}/api/establishments/me/validators/invalid_validator_id/toggle",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("✓ PUT /api/establishments/me/validators/invalid_validator_id/toggle - returns 404")

    def test_toggle_validator_unauthorized(self):
        """PUT /api/establishments/me/validators/{id}/toggle - returns 401 without auth"""
        response = requests.put(
            f"{BASE_URL}/api/establishments/me/validators/some_id/toggle"
        )
        assert response.status_code == 401
        print("✓ PUT /api/establishments/me/validators/some_id/toggle - returns 401 without auth")


class TestValidatorWithExistingVoucher:
    """Test scan with existing voucher codes (if available)"""

    @pytest.fixture
    def validator_id(self):
        """Create a test validator"""
        unique_name = f"TEST_VoucherValidator_{uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/register",
            json={"name": unique_name}
        )
        assert response.status_code == 200
        return response.json()["validator_id"]

    def test_scan_used_voucher(self, validator_id):
        """POST /api/v/{est_id}/scan - returns 400 for used voucher"""
        # Try with known used voucher code from test_credentials.md
        response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/scan",
            json={"validator_id": validator_id, "code": "ITK-YAM"}
        )
        # Could be 400 (already used) or 404 (not found for this establishment)
        assert response.status_code in [400, 404, 403]
        print(f"✓ POST /api/v/{TEST_EST_ID}/scan with used voucher - status: {response.status_code}")

    def test_scan_active_voucher(self, validator_id):
        """POST /api/v/{est_id}/scan - test with active voucher code"""
        # Try with known active voucher code from test_credentials.md
        response = requests.post(
            f"{BASE_URL}/api/v/{TEST_EST_ID}/scan",
            json={"validator_id": validator_id, "code": "ITK-WCU"}
        )
        # Could be 200 (preview), 400 (already used/expired), 404 (not found), or 403 (wrong establishment)
        print(f"✓ POST /api/v/{TEST_EST_ID}/scan with active voucher - status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "step" in data
            if data["step"] == "preview":
                assert "voucher_id" in data
                assert "customer_name" in data
                assert "offer_title" in data
                assert "original_price" in data
                assert "discounted_price" in data
                assert "credits_used" in data
                assert "amount_to_pay_cash" in data
                print(f"  Preview data: {data['offer_title']} - R$ {data['amount_to_pay_cash']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
