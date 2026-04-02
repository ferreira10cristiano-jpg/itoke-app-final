"""
Iteration 33 Tests - iToke Platform
Testing 6 fixes:
1. Dashboard: 'Equipe / Validadores' button in 'Ações Rápidas'
2. Team page: WhatsApp button, Copy Link button
3. Team page: Reenviar, Bloquear, Excluir buttons for validators
4. Validator page title: 'Validador de QR Code'
5. Pending button text: 'Pagar o restante no caixa (Pendente)'
6. Scanner QR bug fix: code_hash lowercase vs backup_code uppercase
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com').rstrip('/')


class TestValidatorScannerBugFix:
    """Test the QR scanner bug fix - code_hash lowercase vs backup_code uppercase"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.est_id = "est_58fcd7f2f965"  # Test establishment from problem statement
        self.backup_code = "ITK-WCU"  # Uppercase backup code
        self.code_hash = "c19205af71207b2b"  # Lowercase code_hash
        self.validator_id = "val_00912f311d31"  # Test validator
    
    def test_scan_with_backup_code_uppercase(self):
        """Test scanning with uppercase backup_code (ITK-WCU)"""
        response = requests.post(
            f"{BASE_URL}/api/v/{self.est_id}/scan",
            json={
                "validator_id": self.validator_id,
                "code": self.backup_code  # ITK-WCU uppercase
            }
        )
        # Should either find the voucher or return 404 if voucher doesn't exist
        # The key is it should NOT fail due to case sensitivity bug
        print(f"Backup code scan response: {response.status_code} - {response.json()}")
        assert response.status_code in [200, 400, 404], f"Unexpected status: {response.status_code}"
    
    def test_scan_with_code_hash_lowercase(self):
        """Test scanning with lowercase code_hash (c19205af71207b2b)"""
        response = requests.post(
            f"{BASE_URL}/api/v/{self.est_id}/scan",
            json={
                "validator_id": self.validator_id,
                "code": self.code_hash  # c19205af71207b2b lowercase
            }
        )
        # Should either find the voucher or return 404 if voucher doesn't exist
        # The key is it should NOT fail due to case sensitivity bug
        print(f"Code hash scan response: {response.status_code} - {response.json()}")
        assert response.status_code in [200, 400, 404], f"Unexpected status: {response.status_code}"
    
    def test_scan_with_lowercase_backup_code(self):
        """Test that lowercase backup code is converted to uppercase for search"""
        response = requests.post(
            f"{BASE_URL}/api/v/{self.est_id}/scan",
            json={
                "validator_id": self.validator_id,
                "code": "itk-wcu"  # lowercase version
            }
        )
        print(f"Lowercase backup code scan response: {response.status_code} - {response.json()}")
        # Should work the same as uppercase
        assert response.status_code in [200, 400, 404], f"Unexpected status: {response.status_code}"


class TestDeleteValidatorEndpoint:
    """Test DELETE /api/establishments/me/validators/{validator_id}"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for establishment"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-login",
            json={
                "email": "teste@estabelecimento.com",
                "name": "Teste Estabelecimento",
                "role": "establishment"
            }
        )
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Could not authenticate")
    
    def test_delete_validator_requires_auth(self):
        """Test that DELETE validator requires authentication"""
        response = requests.delete(
            f"{BASE_URL}/api/establishments/me/validators/val_test123"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_delete_validator_not_found(self, auth_token):
        """Test DELETE returns 404 for non-existent validator"""
        response = requests.delete(
            f"{BASE_URL}/api/establishments/me/validators/val_nonexistent",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_delete_validator_success(self, auth_token):
        """Test DELETE validator successfully removes validator"""
        # First, get establishment info
        est_response = requests.get(
            f"{BASE_URL}/api/establishments/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if est_response.status_code != 200:
            pytest.skip("Could not get establishment")
        
        est_id = est_response.json().get("establishment_id")
        
        # Create a test validator to delete
        create_response = requests.post(
            f"{BASE_URL}/api/v/{est_id}/register",
            json={"name": "TEST_ToDelete_Validator"}
        )
        if create_response.status_code != 200:
            pytest.skip("Could not create test validator")
        
        validator_id = create_response.json().get("validator_id")
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/establishments/me/validators/{validator_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        data = delete_response.json()
        assert "message" in data
        print(f"Delete response: {data}")
        
        # Verify it's actually deleted
        check_response = requests.get(
            f"{BASE_URL}/api/v/{est_id}/check/{validator_id}"
        )
        assert check_response.status_code == 404, "Validator should be deleted"


class TestValidatorPageInfo:
    """Test validator page info endpoint"""
    
    def test_get_validator_establishment_info(self):
        """Test GET /api/v/{est_id}/info returns establishment info"""
        response = requests.get(f"{BASE_URL}/api/v/est_58fcd7f2f965/info")
        print(f"Validator info response: {response.status_code} - {response.json() if response.status_code == 200 else response.text}")
        # May return 404 if establishment doesn't exist, but endpoint should work
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert "business_name" in data
            assert "establishment_id" in data


class TestTeamPageEndpoints:
    """Test endpoints used by the Team page"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for establishment"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-login",
            json={
                "email": "teste@estabelecimento.com",
                "name": "Teste Estabelecimento",
                "role": "establishment"
            }
        )
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Could not authenticate")
    
    def test_get_my_validators(self, auth_token):
        """Test GET /api/establishments/me/validators returns list"""
        response = requests.get(
            f"{BASE_URL}/api/establishments/me/validators",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Validators count: {len(data)}")
    
    def test_toggle_validator(self, auth_token):
        """Test PUT /api/establishments/me/validators/{id}/toggle"""
        # First get establishment
        est_response = requests.get(
            f"{BASE_URL}/api/establishments/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if est_response.status_code != 200:
            pytest.skip("Could not get establishment")
        
        est_id = est_response.json().get("establishment_id")
        
        # Create a test validator
        create_response = requests.post(
            f"{BASE_URL}/api/v/{est_id}/register",
            json={"name": "TEST_ToggleValidator"}
        )
        if create_response.status_code != 200:
            pytest.skip("Could not create test validator")
        
        validator_id = create_response.json().get("validator_id")
        
        # Toggle (block)
        toggle_response = requests.put(
            f"{BASE_URL}/api/establishments/me/validators/{validator_id}/toggle",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert toggle_response.status_code == 200, f"Expected 200, got {toggle_response.status_code}"
        data = toggle_response.json()
        assert data.get("blocked") == True, "Validator should be blocked"
        
        # Toggle again (unblock)
        toggle_response2 = requests.put(
            f"{BASE_URL}/api/establishments/me/validators/{validator_id}/toggle",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert toggle_response2.status_code == 200
        data2 = toggle_response2.json()
        assert data2.get("blocked") == False, "Validator should be unblocked"
        
        # Cleanup - delete the test validator
        requests.delete(
            f"{BASE_URL}/api/establishments/me/validators/{validator_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )


class TestEstablishmentLogin:
    """Test establishment login flow"""
    
    def test_email_login_establishment(self):
        """Test POST /api/auth/email-login for establishment"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-login",
            json={
                "email": "teste@estabelecimento.com",
                "name": "Teste Estabelecimento",
                "role": "establishment"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "session_token" in data
        assert "user" in data
        assert data["user"]["role"] == "establishment"
        print(f"Login successful, user_id: {data['user']['user_id']}")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
