"""
Test suite for iToke 2-Step Validation Flow - Iteration 12
Tests: 
- POST /api/qr/validate returns step=preview (no side effects)
- POST /api/qr/confirm finalizes sale, returns step=confirmed
- POST /api/qr/confirm returns 400 for already used voucher
- POST /api/qr/generate with use_credits saves credits_used, deducts from wallet
- GET /api/vouchers/my returns all fields including credits_used, final_price_to_pay, original_price
- POST /api/vouchers/{id}/cancel refunds credits correctly
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
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("✓ Health check passed")


class TestTwoStepValidationFlow:
    """Test the 2-step validation flow: validate (preview) -> confirm (finalize)"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        return response.json()["session_token"]
    
    @pytest.fixture
    def establishment_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ESTABLISHMENT_EMAIL,
            "name": ESTABLISHMENT_NAME,
            "role": "establishment"
        })
        assert response.status_code == 200, f"Establishment login failed: {response.text}"
        return response.json()["session_token"]
    
    def test_validate_returns_preview_step(self, client_token, establishment_token):
        """POST /api/qr/validate - returns step=preview with billing summary WITHOUT finalizing"""
        client_headers = {"Authorization": f"Bearer {client_token}"}
        est_headers = {"Authorization": f"Bearer {establishment_token}"}
        
        # Get client balance
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=client_headers)
        client_data = me_response.json()
        client_tokens = client_data.get("tokens", 0)
        client_credits = client_data.get("credits", 0)
        
        print(f"  Client balance - Tokens: {client_tokens}, Credits: R$ {client_credits:.2f}")
        
        if client_tokens < 1:
            pytest.skip("Client has no tokens")
        
        # Use credits if available
        credits_to_use = min(1.0, client_credits) if client_credits > 0 else 0
        
        # Generate QR with credits
        gen_response = requests.post(f"{BASE_URL}/api/qr/generate", 
            headers=client_headers,
            json={"offer_id": TEST_OFFER_ID, "use_credits": credits_to_use}
        )
        
        assert gen_response.status_code == 200, f"QR generation failed: {gen_response.text}"
        qr_data = gen_response.json()
        backup_code = qr_data.get("backup_code")
        voucher_id = qr_data.get("voucher_id") or qr_data.get("qr_id")
        
        print(f"  Generated QR - backup_code: {backup_code}, voucher_id: {voucher_id}")
        
        # Step 1: Validate (preview) - should NOT finalize
        validate_response = requests.post(f"{BASE_URL}/api/qr/validate",
            headers=est_headers,
            json={"code_hash": backup_code}
        )
        
        assert validate_response.status_code == 200, f"Validation failed: {validate_response.text}"
        preview_data = validate_response.json()
        
        # Verify step=preview
        assert preview_data.get("step") == "preview", f"Expected step=preview, got: {preview_data.get('step')}"
        
        # Verify billing summary fields
        assert "voucher_id" in preview_data, f"No voucher_id in preview: {preview_data}"
        assert "customer_name" in preview_data, f"No customer_name in preview: {preview_data}"
        assert "offer_title" in preview_data, f"No offer_title in preview: {preview_data}"
        assert "original_price" in preview_data, f"No original_price in preview: {preview_data}"
        assert "discounted_price" in preview_data, f"No discounted_price in preview: {preview_data}"
        assert "credits_used" in preview_data, f"No credits_used in preview: {preview_data}"
        assert "amount_to_pay_cash" in preview_data, f"No amount_to_pay_cash in preview: {preview_data}"
        
        print(f"✓ Validate returns step=preview with billing summary:")
        print(f"    Customer: {preview_data.get('customer_name')}")
        print(f"    Offer: {preview_data.get('offer_title')}")
        print(f"    Original: R$ {preview_data.get('original_price', 0):.2f}")
        print(f"    Discounted: R$ {preview_data.get('discounted_price', 0):.2f}")
        print(f"    Credits used: R$ {preview_data.get('credits_used', 0):.2f}")
        print(f"    Amount to pay cash: R$ {preview_data.get('amount_to_pay_cash', 0):.2f}")
        
        # Verify voucher is NOT marked as used yet
        vouchers_response = requests.get(f"{BASE_URL}/api/vouchers/my", headers=client_headers)
        vouchers = vouchers_response.json()
        
        target_voucher = None
        for v in vouchers:
            if v.get("voucher_id") == voucher_id or v.get("qr_id") == voucher_id:
                target_voucher = v
                break
        
        if target_voucher:
            assert target_voucher.get("used") != True, "Voucher should NOT be marked as used after preview"
            assert target_voucher.get("status") != "used", "Voucher status should NOT be 'used' after preview"
            print("✓ Voucher NOT marked as used after preview (no side effects)")
        
        return preview_data
    
    def test_confirm_finalizes_sale(self, client_token, establishment_token):
        """POST /api/qr/confirm - takes voucher_id, finalizes sale, returns step=confirmed"""
        client_headers = {"Authorization": f"Bearer {client_token}"}
        est_headers = {"Authorization": f"Bearer {establishment_token}"}
        
        # Get client balance
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=client_headers)
        client_data = me_response.json()
        client_tokens = client_data.get("tokens", 0)
        client_credits = client_data.get("credits", 0)
        
        if client_tokens < 1:
            pytest.skip("Client has no tokens")
        
        # Use credits if available
        credits_to_use = min(0.5, client_credits) if client_credits > 0 else 0
        
        # Generate QR
        gen_response = requests.post(f"{BASE_URL}/api/qr/generate", 
            headers=client_headers,
            json={"offer_id": TEST_OFFER_ID, "use_credits": credits_to_use}
        )
        
        assert gen_response.status_code == 200, f"QR generation failed: {gen_response.text}"
        qr_data = gen_response.json()
        backup_code = qr_data.get("backup_code")
        voucher_id = qr_data.get("voucher_id") or qr_data.get("qr_id")
        
        print(f"  Generated QR - backup_code: {backup_code}, voucher_id: {voucher_id}")
        
        # Step 1: Validate (preview)
        validate_response = requests.post(f"{BASE_URL}/api/qr/validate",
            headers=est_headers,
            json={"code_hash": backup_code}
        )
        
        assert validate_response.status_code == 200, f"Validation failed: {validate_response.text}"
        preview_data = validate_response.json()
        preview_voucher_id = preview_data.get("voucher_id")
        
        print(f"  Preview voucher_id: {preview_voucher_id}")
        
        # Step 2: Confirm (finalize)
        confirm_response = requests.post(f"{BASE_URL}/api/qr/confirm",
            headers=est_headers,
            json={"voucher_id": preview_voucher_id}
        )
        
        assert confirm_response.status_code == 200, f"Confirm failed: {confirm_response.text}"
        confirm_data = confirm_response.json()
        
        # Verify step=confirmed
        assert confirm_data.get("step") == "confirmed", f"Expected step=confirmed, got: {confirm_data.get('step')}"
        assert confirm_data.get("success") == True, f"Expected success=True, got: {confirm_data.get('success')}"
        
        # Verify response fields
        assert "customer_name" in confirm_data, f"No customer_name in confirm: {confirm_data}"
        assert "credits_used" in confirm_data, f"No credits_used in confirm: {confirm_data}"
        assert "amount_to_pay_cash" in confirm_data, f"No amount_to_pay_cash in confirm: {confirm_data}"
        assert "discounted_price" in confirm_data, f"No discounted_price in confirm: {confirm_data}"
        
        print(f"✓ Confirm returns step=confirmed with success:")
        print(f"    Customer: {confirm_data.get('customer_name')}")
        print(f"    Credits used: R$ {confirm_data.get('credits_used', 0):.2f}")
        print(f"    Amount paid cash: R$ {confirm_data.get('amount_to_pay_cash', 0):.2f}")
        print(f"    Total: R$ {confirm_data.get('discounted_price', 0):.2f}")
        
        # Verify voucher IS marked as used now
        vouchers_response = requests.get(f"{BASE_URL}/api/vouchers/my", headers=client_headers)
        vouchers = vouchers_response.json()
        
        target_voucher = None
        for v in vouchers:
            if v.get("voucher_id") == voucher_id or v.get("qr_id") == voucher_id:
                target_voucher = v
                break
        
        if target_voucher:
            assert target_voucher.get("used") == True or target_voucher.get("status") == "used", \
                f"Voucher should be marked as used after confirm: {target_voucher}"
            print("✓ Voucher marked as used after confirm")
        
        return confirm_data
    
    def test_confirm_already_used_voucher_returns_400(self, client_token, establishment_token):
        """POST /api/qr/confirm - returns 400 for already used voucher"""
        client_headers = {"Authorization": f"Bearer {client_token}"}
        est_headers = {"Authorization": f"Bearer {establishment_token}"}
        
        # Get client balance
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=client_headers)
        client_data = me_response.json()
        client_tokens = client_data.get("tokens", 0)
        
        if client_tokens < 1:
            pytest.skip("Client has no tokens")
        
        # Generate QR
        gen_response = requests.post(f"{BASE_URL}/api/qr/generate", 
            headers=client_headers,
            json={"offer_id": TEST_OFFER_ID, "use_credits": 0}
        )
        
        assert gen_response.status_code == 200, f"QR generation failed: {gen_response.text}"
        qr_data = gen_response.json()
        backup_code = qr_data.get("backup_code")
        
        # Step 1: Validate (preview)
        validate_response = requests.post(f"{BASE_URL}/api/qr/validate",
            headers=est_headers,
            json={"code_hash": backup_code}
        )
        
        assert validate_response.status_code == 200
        preview_data = validate_response.json()
        voucher_id = preview_data.get("voucher_id")
        
        # Step 2: Confirm (finalize) - first time
        confirm_response = requests.post(f"{BASE_URL}/api/qr/confirm",
            headers=est_headers,
            json={"voucher_id": voucher_id}
        )
        
        assert confirm_response.status_code == 200, f"First confirm failed: {confirm_response.text}"
        
        # Step 3: Try to confirm again - should fail with 400
        confirm_again_response = requests.post(f"{BASE_URL}/api/qr/confirm",
            headers=est_headers,
            json={"voucher_id": voucher_id}
        )
        
        assert confirm_again_response.status_code == 400, \
            f"Expected 400 for already used voucher, got: {confirm_again_response.status_code}"
        
        print("✓ Confirm already used voucher correctly returns 400")


class TestQRGenerateWithCredits:
    """Test QR generation with credits"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        return response.json()["session_token"]
    
    def test_qr_generate_saves_credits_and_deducts(self, client_token):
        """POST /api/qr/generate with use_credits - saves credits_used, deducts from wallet"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Get initial balance
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        initial_data = me_response.json()
        initial_tokens = initial_data.get("tokens", 0)
        initial_credits = initial_data.get("credits", 0)
        
        print(f"  Initial balance - Tokens: {initial_tokens}, Credits: R$ {initial_credits:.2f}")
        
        if initial_tokens < 1:
            pytest.skip("Client has no tokens")
        
        # Use credits if available
        credits_to_use = min(0.5, initial_credits) if initial_credits > 0 else 0
        
        # Generate QR with credits
        response = requests.post(f"{BASE_URL}/api/qr/generate", 
            headers=headers,
            json={"offer_id": TEST_OFFER_ID, "use_credits": credits_to_use}
        )
        
        assert response.status_code == 200, f"QR generation failed: {response.text}"
        data = response.json()
        
        # Verify credits_used is saved
        assert "credits_used" in data, f"No credits_used in response: {data}"
        assert "final_price_to_pay" in data, f"No final_price_to_pay in response: {data}"
        
        if credits_to_use > 0:
            assert data["credits_used"] == credits_to_use, \
                f"credits_used mismatch: expected {credits_to_use}, got {data['credits_used']}"
        
        print(f"✓ QR generated - credits_used: {data['credits_used']}, final_price_to_pay: {data['final_price_to_pay']}")
        
        # Verify credits were deducted from wallet
        me_after = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        after_data = me_after.json()
        after_credits = after_data.get("credits", 0)
        after_tokens = after_data.get("tokens", 0)
        
        # Token should be deducted
        assert after_tokens == initial_tokens - 1, \
            f"Token not deducted: {initial_tokens} -> {after_tokens}"
        
        # Credits should be deducted
        if credits_to_use > 0:
            expected_credits = initial_credits - credits_to_use
            assert abs(after_credits - expected_credits) < 0.01, \
                f"Credits not deducted: expected {expected_credits:.2f}, got {after_credits:.2f}"
            print(f"✓ Credits deducted from wallet: R$ {initial_credits:.2f} -> R$ {after_credits:.2f}")


class TestVouchersMy:
    """Test GET /api/vouchers/my returns all required fields"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        return response.json()["session_token"]
    
    def test_vouchers_my_returns_all_fields(self, client_token):
        """GET /api/vouchers/my - returns all fields including credits_used, final_price_to_pay, original_price"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        response = requests.get(f"{BASE_URL}/api/vouchers/my", headers=headers)
        assert response.status_code == 200, f"Failed to get vouchers: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        
        print(f"✓ GET /api/vouchers/my returned {len(data)} vouchers")
        
        if len(data) > 0:
            voucher = data[0]
            
            # Verify required fields
            required_fields = ["credits_used", "final_price_to_pay", "original_price", "discounted_price", "backup_code"]
            for field in required_fields:
                # credits_used might be credits_reserved in some cases
                if field == "credits_used" and field not in voucher:
                    assert "credits_reserved" in voucher, f"No credits_used or credits_reserved in voucher"
                else:
                    assert field in voucher, f"No {field} in voucher: {voucher.keys()}"
            
            credits_used = voucher.get("credits_used") or voucher.get("credits_reserved", 0)
            print(f"  Sample voucher:")
            print(f"    Original: R$ {voucher.get('original_price', 0):.2f}")
            print(f"    Discounted: R$ {voucher.get('discounted_price', 0):.2f}")
            print(f"    Credits used: R$ {credits_used:.2f}")
            print(f"    Final to pay: R$ {voucher.get('final_price_to_pay', 0):.2f}")
            print(f"    Backup code: {voucher.get('backup_code')}")


class TestVoucherCancel:
    """Test voucher cancellation and credit refund"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        return response.json()["session_token"]
    
    def test_cancel_voucher_refunds_credits(self, client_token):
        """POST /api/vouchers/{id}/cancel - refunds credits correctly"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Get initial balance
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        initial_data = me_response.json()
        initial_tokens = initial_data.get("tokens", 0)
        initial_credits = initial_data.get("credits", 0)
        
        if initial_tokens < 1:
            pytest.skip("Client has no tokens")
        
        # Use credits if available
        credits_to_use = min(0.5, initial_credits) if initial_credits > 0 else 0
        
        # Generate QR with credits
        gen_response = requests.post(f"{BASE_URL}/api/qr/generate", 
            headers=headers,
            json={"offer_id": TEST_OFFER_ID, "use_credits": credits_to_use}
        )
        
        assert gen_response.status_code == 200, f"QR generation failed: {gen_response.text}"
        qr_data = gen_response.json()
        voucher_id = qr_data.get("voucher_id") or qr_data.get("qr_id")
        credits_used = qr_data.get("credits_used", 0)
        
        print(f"  Generated voucher: {voucher_id}, credits_used: {credits_used}")
        
        # Get balance after generation
        me_after_gen = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        credits_after_gen = me_after_gen.json().get("credits", 0)
        
        # Cancel the voucher
        cancel_response = requests.post(f"{BASE_URL}/api/vouchers/{voucher_id}/cancel", headers=headers)
        
        assert cancel_response.status_code == 200, f"Cancel failed: {cancel_response.text}"
        cancel_data = cancel_response.json()
        
        assert cancel_data.get("success") == True, f"Cancel not successful: {cancel_data}"
        assert "credits_refunded" in cancel_data, f"No credits_refunded in response: {cancel_data}"
        
        # Verify credits were refunded
        me_after_cancel = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        credits_after_cancel = me_after_cancel.json().get("credits", 0)
        
        if credits_used > 0:
            expected_credits = credits_after_gen + credits_used
            assert abs(credits_after_cancel - expected_credits) < 0.01, \
                f"Credits not refunded: expected {expected_credits:.2f}, got {credits_after_cancel:.2f}"
            print(f"✓ Credits refunded: R$ {credits_used:.2f}")
        else:
            print("✓ No credits to refund (0 credits used)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
