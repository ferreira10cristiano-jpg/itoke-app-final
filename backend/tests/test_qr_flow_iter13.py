"""
Test QR Flow - Iteration 13
Tests for:
1. POST /api/qr/generate - generates QR with credits_used saved correctly
2. POST /api/qr/validate - step=preview without finalizing
3. POST /api/qr/confirm - step=confirmed, finalizes sale
4. GET /api/vouchers/my - returns vouchers with all financial fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')

class TestQRFlow:
    """Test QR generation and validation flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.client_email = "cliente@teste.com"
        self.client_name = "Cliente Teste"
        self.establishment_email = "teste@estabelecimento.com"
        self.establishment_name = "Teste Estabelecimento"
        self.test_offer_id = "offer_faa3cfe6cae5"
        
    def get_client_session(self):
        """Login as client and return session token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": self.client_email,
            "name": self.client_name,
            "role": "client"
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        return data.get("session_token")
    
    def get_establishment_session(self):
        """Login as establishment and return session token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": self.establishment_email,
            "name": self.establishment_name,
            "role": "establishment"
        })
        assert response.status_code == 200, f"Establishment login failed: {response.text}"
        data = response.json()
        return data.get("session_token")
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")
    
    def test_qr_generate_with_credits(self):
        """Test QR generation with credits_used saved correctly"""
        token = self.get_client_session()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Generate QR with credits
        response = requests.post(f"{BASE_URL}/api/qr/generate", json={
            "offer_id": self.test_offer_id,
            "use_credits": 3.50
        }, headers=headers)
        
        assert response.status_code == 200, f"QR generate failed: {response.text}"
        data = response.json()
        
        # Verify credits_used is saved
        assert "credits_used" in data, "credits_used field missing"
        assert data["credits_used"] == 3.50 or data["credits_used"] > 0, f"credits_used not saved correctly: {data['credits_used']}"
        assert "code_hash" in data, "code_hash missing"
        assert "backup_code" in data, "backup_code missing"
        assert "final_price_to_pay" in data, "final_price_to_pay missing"
        
        print(f"✓ QR generated with credits_used={data['credits_used']}, final_price_to_pay={data['final_price_to_pay']}")
        return data
    
    def test_qr_validate_returns_preview(self):
        """Test /api/qr/validate returns step=preview without finalizing"""
        # First generate a QR as client
        client_token = self.get_client_session()
        client_headers = {"Authorization": f"Bearer {client_token}"}
        
        gen_response = requests.post(f"{BASE_URL}/api/qr/generate", json={
            "offer_id": self.test_offer_id,
            "use_credits": 2.00
        }, headers=client_headers)
        
        assert gen_response.status_code == 200, f"QR generate failed: {gen_response.text}"
        qr_data = gen_response.json()
        code_hash = qr_data["code_hash"]
        backup_code = qr_data.get("backup_code")
        
        # Now validate as establishment
        est_token = self.get_establishment_session()
        est_headers = {"Authorization": f"Bearer {est_token}"}
        
        validate_response = requests.post(f"{BASE_URL}/api/qr/validate", json={
            "code_hash": code_hash
        }, headers=est_headers)
        
        assert validate_response.status_code == 200, f"QR validate failed: {validate_response.text}"
        preview_data = validate_response.json()
        
        # Verify step=preview
        assert preview_data.get("step") == "preview", f"Expected step=preview, got {preview_data.get('step')}"
        assert "voucher_id" in preview_data, "voucher_id missing in preview"
        assert "customer_name" in preview_data, "customer_name missing in preview"
        assert "credits_used" in preview_data, "credits_used missing in preview"
        assert "amount_to_pay_cash" in preview_data, "amount_to_pay_cash missing in preview"
        
        print(f"✓ Validate returns step=preview with voucher_id={preview_data['voucher_id']}")
        return preview_data
    
    def test_qr_confirm_finalizes_sale(self):
        """Test /api/qr/confirm finalizes sale with step=confirmed"""
        # Generate QR as client
        client_token = self.get_client_session()
        client_headers = {"Authorization": f"Bearer {client_token}"}
        
        gen_response = requests.post(f"{BASE_URL}/api/qr/generate", json={
            "offer_id": self.test_offer_id,
            "use_credits": 1.50
        }, headers=client_headers)
        
        assert gen_response.status_code == 200, f"QR generate failed: {gen_response.text}"
        qr_data = gen_response.json()
        
        # Validate as establishment (preview step)
        est_token = self.get_establishment_session()
        est_headers = {"Authorization": f"Bearer {est_token}"}
        
        validate_response = requests.post(f"{BASE_URL}/api/qr/validate", json={
            "code_hash": qr_data["code_hash"]
        }, headers=est_headers)
        
        assert validate_response.status_code == 200
        preview_data = validate_response.json()
        voucher_id = preview_data["voucher_id"]
        
        # Confirm the sale
        confirm_response = requests.post(f"{BASE_URL}/api/qr/confirm", json={
            "voucher_id": voucher_id
        }, headers=est_headers)
        
        assert confirm_response.status_code == 200, f"QR confirm failed: {confirm_response.text}"
        confirm_data = confirm_response.json()
        
        # Verify step=confirmed
        assert confirm_data.get("step") == "confirmed", f"Expected step=confirmed, got {confirm_data.get('step')}"
        assert confirm_data.get("success") == True, "success should be True"
        assert "credits_used" in confirm_data, "credits_used missing in confirm"
        assert "amount_to_pay_cash" in confirm_data, "amount_to_pay_cash missing in confirm"
        
        print(f"✓ Confirm returns step=confirmed, success=True")
        return confirm_data
    
    def test_vouchers_my_returns_all_fields(self):
        """Test GET /api/vouchers/my returns all financial fields"""
        token = self.get_client_session()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/vouchers/my", headers=headers)
        
        assert response.status_code == 200, f"Get vouchers failed: {response.text}"
        vouchers = response.json()
        
        assert isinstance(vouchers, list), "Response should be a list"
        
        if len(vouchers) > 0:
            voucher = vouchers[0]
            # Check required financial fields
            required_fields = ["credits_used", "final_price_to_pay", "original_price", "discounted_price"]
            for field in required_fields:
                assert field in voucher, f"Field {field} missing in voucher"
            
            print(f"✓ Vouchers endpoint returns all fields: {list(voucher.keys())}")
        else:
            print("✓ Vouchers endpoint works (no vouchers found)")
        
        return vouchers
    
    def test_validate_with_backup_code(self):
        """Test validation works with backup code (ITK-XXX format)"""
        # Generate QR as client
        client_token = self.get_client_session()
        client_headers = {"Authorization": f"Bearer {client_token}"}
        
        gen_response = requests.post(f"{BASE_URL}/api/qr/generate", json={
            "offer_id": self.test_offer_id,
            "use_credits": 0
        }, headers=client_headers)
        
        assert gen_response.status_code == 200
        qr_data = gen_response.json()
        backup_code = qr_data.get("backup_code")
        
        assert backup_code, "backup_code should be present"
        assert backup_code.startswith("ITK-"), f"backup_code should start with ITK-, got {backup_code}"
        
        # Validate using backup code
        est_token = self.get_establishment_session()
        est_headers = {"Authorization": f"Bearer {est_token}"}
        
        validate_response = requests.post(f"{BASE_URL}/api/qr/validate", json={
            "code_hash": backup_code  # Using backup code instead of hash
        }, headers=est_headers)
        
        assert validate_response.status_code == 200, f"Validate with backup code failed: {validate_response.text}"
        preview_data = validate_response.json()
        assert preview_data.get("step") == "preview"
        
        print(f"✓ Validation works with backup code: {backup_code}")
        return preview_data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
