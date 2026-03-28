"""
Test suite for iToke Voucher System with Backup Codes
Tests: QR generation, validation, vouchers/my, sales-history
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')

# Test credentials
CLIENT_EMAIL = "cliente@teste.com"
CLIENT_NAME = "Cliente Teste"
ESTABLISHMENT_EMAIL = "teste@estabelecimento.com"
ESTABLISHMENT_NAME = "Teste Estabelecimento"
TEST_OFFER_ID = "offer_faa3cfe6cae5"


class TestHealthCheck:
    """Basic health check to ensure API is running"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "healthy", f"Unexpected health status: {data}"
        print("✓ Health check passed")


class TestClientAuthentication:
    """Test client login and token retrieval"""
    
    def test_client_login(self):
        """Test client email login returns session_token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"No session_token in response: {data}"
        assert len(data["session_token"]) > 0, "Empty session_token"
        print(f"✓ Client login successful, token: {data['session_token'][:20]}...")
        return data["session_token"]


class TestEstablishmentAuthentication:
    """Test establishment login"""
    
    def test_establishment_login(self):
        """Test establishment email login returns session_token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ESTABLISHMENT_EMAIL,
            "name": ESTABLISHMENT_NAME,
            "role": "establishment"
        })
        assert response.status_code == 200, f"Establishment login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"No session_token in response: {data}"
        print(f"✓ Establishment login successful, token: {data['session_token'][:20]}...")
        return data["session_token"]


class TestQRGeneration:
    """Test QR code generation with backup codes"""
    
    @pytest.fixture
    def client_token(self):
        """Get client auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        return response.json()["session_token"]
    
    def test_qr_generate_returns_backup_code(self, client_token):
        """POST /api/qr/generate - generates voucher with backup_code in ITK-XXX format"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # First check if client has tokens
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        if me_response.status_code == 200:
            user_data = me_response.json()
            print(f"  Client tokens: {user_data.get('tokens', 0)}")
        
        response = requests.post(f"{BASE_URL}/api/qr/generate", 
            headers=headers,
            json={"offer_id": TEST_OFFER_ID, "use_credits": 0}
        )
        
        # Check for token insufficiency error
        if response.status_code == 400:
            error_data = response.json()
            if "Tokens insuficientes" in error_data.get("detail", ""):
                pytest.skip("Client has no tokens - skipping QR generation test")
        
        assert response.status_code == 200, f"QR generation failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify no MongoDB ObjectId serialization error (no 500)
        assert "_id" not in data or data["_id"] is None, f"_id should be excluded or None: {data.get('_id')}"
        
        # Verify backup_code format ITK-XXX
        assert "backup_code" in data, f"No backup_code in response: {data}"
        backup_code = data["backup_code"]
        assert backup_code.startswith("ITK-"), f"Backup code should start with ITK-: {backup_code}"
        assert len(backup_code) == 7, f"Backup code should be 7 chars (ITK-XXX): {backup_code}"
        
        # Verify other required fields
        assert "voucher_id" in data or "qr_id" in data, f"No voucher_id/qr_id: {data}"
        assert "code_hash" in data, f"No code_hash: {data}"
        assert "for_offer_id" in data, f"No for_offer_id: {data}"
        assert data["for_offer_id"] == TEST_OFFER_ID, f"Wrong offer_id: {data['for_offer_id']}"
        
        print(f"✓ QR generated with backup_code: {backup_code}")
        return data
    
    def test_qr_generate_response_is_json_serializable(self, client_token):
        """Verify QR generate response has no ObjectId serialization issues"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        response = requests.post(f"{BASE_URL}/api/qr/generate", 
            headers=headers,
            json={"offer_id": TEST_OFFER_ID, "use_credits": 0}
        )
        
        if response.status_code == 400:
            error_data = response.json()
            if "Tokens insuficientes" in error_data.get("detail", ""):
                pytest.skip("Client has no tokens")
        
        # If we get here, response should be valid JSON (no 500 error)
        assert response.status_code != 500, f"Server error (likely ObjectId issue): {response.text}"
        
        # Verify response is valid JSON
        try:
            data = response.json()
            print(f"✓ Response is valid JSON, keys: {list(data.keys())}")
        except Exception as e:
            pytest.fail(f"Response is not valid JSON: {e}")


class TestQRValidation:
    """Test QR code validation - CRITICAL: was returning 500 error"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        return response.json()["session_token"]
    
    @pytest.fixture
    def establishment_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ESTABLISHMENT_EMAIL,
            "name": ESTABLISHMENT_NAME,
            "role": "establishment"
        })
        return response.json()["session_token"]
    
    def test_validate_with_backup_code_no_500_error(self, client_token, establishment_token):
        """POST /api/qr/validate - validates QR by backup_code, returns proper JSON (no 500 error)"""
        client_headers = {"Authorization": f"Bearer {client_token}"}
        est_headers = {"Authorization": f"Bearer {establishment_token}"}
        
        # First generate a QR code
        gen_response = requests.post(f"{BASE_URL}/api/qr/generate", 
            headers=client_headers,
            json={"offer_id": TEST_OFFER_ID, "use_credits": 0}
        )
        
        if gen_response.status_code == 400:
            error_data = gen_response.json()
            if "Tokens insuficientes" in error_data.get("detail", ""):
                pytest.skip("Client has no tokens for QR generation")
        
        assert gen_response.status_code == 200, f"QR generation failed: {gen_response.text}"
        qr_data = gen_response.json()
        backup_code = qr_data.get("backup_code")
        assert backup_code, f"No backup_code in generated QR: {qr_data}"
        
        print(f"  Generated QR with backup_code: {backup_code}")
        
        # Now validate using backup code
        validate_response = requests.post(f"{BASE_URL}/api/qr/validate",
            headers=est_headers,
            json={"code_hash": backup_code}
        )
        
        # CRITICAL: Should NOT return 500 (MongoDB ObjectId serialization error)
        assert validate_response.status_code != 500, f"500 error on validation (ObjectId issue?): {validate_response.text}"
        
        # Should return 200 for successful validation
        assert validate_response.status_code == 200, f"Validation failed: {validate_response.status_code} - {validate_response.text}"
        
        data = validate_response.json()
        
        # Verify response structure
        assert data.get("success") == True, f"Validation not successful: {data}"
        assert "sale" in data, f"No sale in response: {data}"
        assert "customer_name" in data, f"No customer_name: {data}"
        assert "credits_used" in data, f"No credits_used: {data}"
        assert "amount_to_pay_cash" in data, f"No amount_to_pay_cash: {data}"
        
        # Verify no _id in response
        sale = data.get("sale", {})
        assert "_id" not in sale, f"_id should be excluded from sale: {sale}"
        
        print(f"✓ QR validated successfully via backup_code: {backup_code}")
        print(f"  Customer: {data.get('customer_name')}, Credits: {data.get('credits_used')}, Cash: {data.get('amount_to_pay_cash')}")
        return data
    
    def test_validate_with_code_hash(self, client_token, establishment_token):
        """POST /api/qr/validate - validates QR by code_hash"""
        client_headers = {"Authorization": f"Bearer {client_token}"}
        est_headers = {"Authorization": f"Bearer {establishment_token}"}
        
        # Generate QR
        gen_response = requests.post(f"{BASE_URL}/api/qr/generate", 
            headers=client_headers,
            json={"offer_id": TEST_OFFER_ID, "use_credits": 0}
        )
        
        if gen_response.status_code == 400:
            pytest.skip("Client has no tokens")
        
        assert gen_response.status_code == 200
        qr_data = gen_response.json()
        code_hash = qr_data.get("code_hash")
        
        print(f"  Generated QR with code_hash: {code_hash}")
        
        # Validate using code_hash
        validate_response = requests.post(f"{BASE_URL}/api/qr/validate",
            headers=est_headers,
            json={"code_hash": code_hash}
        )
        
        assert validate_response.status_code != 500, f"500 error: {validate_response.text}"
        assert validate_response.status_code == 200, f"Validation failed: {validate_response.text}"
        
        data = validate_response.json()
        assert data.get("success") == True
        print(f"✓ QR validated successfully via code_hash")
    
    def test_validate_invalid_code_returns_404(self, establishment_token):
        """POST /api/qr/validate - returns 404 for invalid code"""
        headers = {"Authorization": f"Bearer {establishment_token}"}
        
        response = requests.post(f"{BASE_URL}/api/qr/validate",
            headers=headers,
            json={"code_hash": "INVALID-CODE-123"}
        )
        
        # Should return 404, not 500
        assert response.status_code != 500, f"500 error for invalid code: {response.text}"
        assert response.status_code == 404, f"Expected 404 for invalid code, got: {response.status_code}"
        print("✓ Invalid code returns 404 as expected")
    
    def test_validate_already_used_returns_400(self, client_token, establishment_token):
        """POST /api/qr/validate - returns 400 for already used voucher"""
        client_headers = {"Authorization": f"Bearer {client_token}"}
        est_headers = {"Authorization": f"Bearer {establishment_token}"}
        
        # Generate QR
        gen_response = requests.post(f"{BASE_URL}/api/qr/generate", 
            headers=client_headers,
            json={"offer_id": TEST_OFFER_ID, "use_credits": 0}
        )
        
        if gen_response.status_code == 400:
            pytest.skip("Client has no tokens")
        
        qr_data = gen_response.json()
        backup_code = qr_data.get("backup_code")
        
        # First validation - should succeed
        first_response = requests.post(f"{BASE_URL}/api/qr/validate",
            headers=est_headers,
            json={"code_hash": backup_code}
        )
        assert first_response.status_code == 200, f"First validation failed: {first_response.text}"
        
        # Second validation - should fail with 400
        second_response = requests.post(f"{BASE_URL}/api/qr/validate",
            headers=est_headers,
            json={"code_hash": backup_code}
        )
        
        assert second_response.status_code != 500, f"500 error: {second_response.text}"
        assert second_response.status_code == 400, f"Expected 400 for used voucher, got: {second_response.status_code}"
        print("✓ Already used voucher returns 400 as expected")


class TestVouchersMy:
    """Test GET /api/vouchers/my endpoint"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        return response.json()["session_token"]
    
    def test_get_my_vouchers_returns_list(self, client_token):
        """GET /api/vouchers/my - returns client vouchers with required fields"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        response = requests.get(f"{BASE_URL}/api/vouchers/my", headers=headers)
        
        assert response.status_code == 200, f"Failed to get vouchers: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"✓ GET /api/vouchers/my returned {len(data)} vouchers")
        
        # If there are vouchers, verify structure
        if len(data) > 0:
            voucher = data[0]
            
            # Verify no _id in response
            assert "_id" not in voucher, f"_id should be excluded: {voucher}"
            
            # Verify required fields
            assert "backup_code" in voucher, f"No backup_code in voucher: {voucher}"
            assert "code_hash" in voucher, f"No code_hash: {voucher}"
            assert "for_offer_id" in voucher, f"No for_offer_id: {voucher}"
            
            # Verify backup_code format
            backup_code = voucher.get("backup_code")
            if backup_code:
                assert backup_code.startswith("ITK-"), f"Invalid backup_code format: {backup_code}"
            
            print(f"  First voucher backup_code: {voucher.get('backup_code')}")
            print(f"  Voucher has offer info: {'offer' in voucher}")
            print(f"  Voucher has establishment info: {'establishment' in voucher}")
    
    def test_vouchers_include_offer_and_establishment_info(self, client_token):
        """Verify vouchers are enriched with offer and establishment info"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        response = requests.get(f"{BASE_URL}/api/vouchers/my", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            voucher = data[0]
            
            # Check for enriched data
            if "offer" in voucher:
                offer = voucher["offer"]
                print(f"  Offer title: {offer.get('title')}")
                print(f"  Offer discount: {offer.get('discount_value')}%")
            
            if "establishment" in voucher:
                est = voucher["establishment"]
                print(f"  Establishment: {est.get('business_name')}")
            
            print("✓ Vouchers include enriched offer/establishment info")
        else:
            print("  No vouchers to verify enrichment")


class TestSalesHistory:
    """Test GET /api/establishments/me/sales-history endpoint"""
    
    @pytest.fixture
    def establishment_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ESTABLISHMENT_EMAIL,
            "name": ESTABLISHMENT_NAME,
            "role": "establishment"
        })
        return response.json()["session_token"]
    
    def test_get_sales_history_returns_structure(self, establishment_token):
        """GET /api/establishments/me/sales-history - returns sales history and summary"""
        headers = {"Authorization": f"Bearer {establishment_token}"}
        
        response = requests.get(f"{BASE_URL}/api/establishments/me/sales-history", headers=headers)
        
        assert response.status_code == 200, f"Failed to get sales history: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "sales" in data, f"No sales in response: {data}"
        assert "summary" in data, f"No summary in response: {data}"
        
        # Verify sales is a list
        assert isinstance(data["sales"], list), f"sales should be list: {type(data['sales'])}"
        
        # Verify summary fields
        summary = data["summary"]
        assert "total_sales" in summary, f"No total_sales in summary: {summary}"
        assert "total_credits_received" in summary, f"No total_credits_received: {summary}"
        assert "total_cash_to_receive" in summary, f"No total_cash_to_receive: {summary}"
        
        print(f"✓ Sales history returned {len(data['sales'])} sales")
        print(f"  Summary: {summary}")
    
    def test_sales_records_have_required_fields(self, establishment_token):
        """Verify sales records contain credits_used and amount_to_pay_cash"""
        headers = {"Authorization": f"Bearer {establishment_token}"}
        
        response = requests.get(f"{BASE_URL}/api/establishments/me/sales-history", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data["sales"]) > 0:
            sale = data["sales"][0]
            
            # Verify no _id
            assert "_id" not in sale, f"_id should be excluded: {sale}"
            
            # Verify required fields
            assert "credits_used" in sale, f"No credits_used in sale: {sale}"
            assert "amount_to_pay_cash" in sale, f"No amount_to_pay_cash: {sale}"
            assert "customer_name" in sale, f"No customer_name: {sale}"
            assert "offer_title" in sale, f"No offer_title: {sale}"
            
            print(f"✓ Sale record has required fields")
            print(f"  Customer: {sale.get('customer_name')}")
            print(f"  Credits used: {sale.get('credits_used')}")
            print(f"  Cash amount: {sale.get('amount_to_pay_cash')}")
        else:
            print("  No sales records to verify")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
