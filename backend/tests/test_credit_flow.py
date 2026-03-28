"""
Test suite for iToke Credit Flow - Iteration 11
Tests: Credit deduction at QR generation, cancel/refund, credit transfer at validation
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


class TestClientCreditsAndTokens:
    """Test client balance retrieval"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        assert response.status_code == 200
        return response.json()["session_token"]
    
    def test_get_me_returns_balance(self, client_token):
        """GET /api/auth/me - returns tokens and credits balance"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Failed to get user: {response.text}"
        
        data = response.json()
        assert "tokens" in data, f"No tokens in response: {data}"
        assert "credits" in data, f"No credits in response: {data}"
        
        print(f"✓ Client balance - Tokens: {data['tokens']}, Credits: R$ {data['credits']:.2f}")
        return data


class TestQRGenerationWithCredits:
    """Test QR generation with credit deduction"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        return response.json()["session_token"]
    
    def test_qr_generate_saves_credits_used(self, client_token):
        """POST /api/qr/generate with use_credits - must save credits_used in voucher"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Get initial balance
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        initial_data = me_response.json()
        initial_tokens = initial_data.get("tokens", 0)
        initial_credits = initial_data.get("credits", 0)
        
        print(f"  Initial balance - Tokens: {initial_tokens}, Credits: R$ {initial_credits:.2f}")
        
        if initial_tokens < 1:
            pytest.skip("Client has no tokens - skipping QR generation test")
        
        # Determine credits to use (use 1.00 if available, else 0)
        credits_to_use = min(1.0, initial_credits) if initial_credits > 0 else 0
        
        # Generate QR with credits
        response = requests.post(f"{BASE_URL}/api/qr/generate", 
            headers=headers,
            json={"offer_id": TEST_OFFER_ID, "use_credits": credits_to_use}
        )
        
        if response.status_code == 400:
            error_data = response.json()
            if "Tokens insuficientes" in error_data.get("detail", ""):
                pytest.skip("Client has no tokens")
        
        assert response.status_code == 200, f"QR generation failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify credits_used is saved in response
        assert "credits_used" in data, f"No credits_used in response: {data}"
        assert "final_price_to_pay" in data, f"No final_price_to_pay in response: {data}"
        
        # Verify credits_used matches what we requested (or 0 if no credits)
        if credits_to_use > 0:
            assert data["credits_used"] == credits_to_use, f"credits_used mismatch: expected {credits_to_use}, got {data['credits_used']}"
        
        print(f"✓ QR generated with credits_used: {data['credits_used']}, final_price_to_pay: {data['final_price_to_pay']}")
        return data
    
    def test_qr_generate_deducts_credits_from_wallet(self, client_token):
        """POST /api/qr/generate - must deduct credits from client_credits immediately"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Get initial balance
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        initial_data = me_response.json()
        initial_tokens = initial_data.get("tokens", 0)
        initial_credits = initial_data.get("credits", 0)
        
        print(f"  Initial balance - Tokens: {initial_tokens}, Credits: R$ {initial_credits:.2f}")
        
        if initial_tokens < 1:
            pytest.skip("Client has no tokens")
        
        if initial_credits < 0.5:
            pytest.skip("Client has insufficient credits to test deduction")
        
        # Use 0.50 credits
        credits_to_use = 0.50
        
        # Generate QR with credits
        response = requests.post(f"{BASE_URL}/api/qr/generate", 
            headers=headers,
            json={"offer_id": TEST_OFFER_ID, "use_credits": credits_to_use}
        )
        
        assert response.status_code == 200, f"QR generation failed: {response.text}"
        
        # Check balance after generation
        me_response_after = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response_after.status_code == 200
        after_data = me_response_after.json()
        after_credits = after_data.get("credits", 0)
        after_tokens = after_data.get("tokens", 0)
        
        print(f"  After QR - Tokens: {after_tokens}, Credits: R$ {after_credits:.2f}")
        
        # Verify token was deducted
        assert after_tokens == initial_tokens - 1, f"Token not deducted: {initial_tokens} -> {after_tokens}"
        
        # Verify credits were deducted
        expected_credits = initial_credits - credits_to_use
        assert abs(after_credits - expected_credits) < 0.01, f"Credits not deducted correctly: expected {expected_credits:.2f}, got {after_credits:.2f}"
        
        print(f"✓ Credits deducted: R$ {initial_credits:.2f} -> R$ {after_credits:.2f}")


class TestVouchersMy:
    """Test GET /api/vouchers/my returns credits_used and final_price_to_pay"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        return response.json()["session_token"]
    
    def test_vouchers_my_returns_price_fields(self, client_token):
        """GET /api/vouchers/my - must return vouchers with credits_used, final_price_to_pay, original_price, discounted_price"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        response = requests.get(f"{BASE_URL}/api/vouchers/my", headers=headers)
        assert response.status_code == 200, f"Failed to get vouchers: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        
        print(f"✓ GET /api/vouchers/my returned {len(data)} vouchers")
        
        if len(data) > 0:
            voucher = data[0]
            
            # Verify required price fields
            assert "credits_used" in voucher or "credits_reserved" in voucher, f"No credits_used/credits_reserved in voucher: {voucher.keys()}"
            assert "final_price_to_pay" in voucher, f"No final_price_to_pay in voucher: {voucher.keys()}"
            assert "original_price" in voucher, f"No original_price in voucher: {voucher.keys()}"
            assert "discounted_price" in voucher, f"No discounted_price in voucher: {voucher.keys()}"
            
            credits_used = voucher.get("credits_used") or voucher.get("credits_reserved", 0)
            final_price = voucher.get("final_price_to_pay", 0)
            original_price = voucher.get("original_price", 0)
            discounted_price = voucher.get("discounted_price", 0)
            
            print(f"  Voucher price breakdown:")
            print(f"    Original: R$ {original_price:.2f}")
            print(f"    Discounted: R$ {discounted_price:.2f}")
            print(f"    Credits used: R$ {credits_used:.2f}")
            print(f"    Final to pay: R$ {final_price:.2f}")
            
            # Verify backup_code
            assert "backup_code" in voucher, f"No backup_code in voucher"
            print(f"    Backup code: {voucher.get('backup_code')}")
        else:
            print("  No vouchers to verify")


class TestVoucherCancel:
    """Test POST /api/vouchers/{id}/cancel - cancel and refund credits"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": CLIENT_EMAIL,
            "name": CLIENT_NAME,
            "role": "client"
        })
        return response.json()["session_token"]
    
    def test_cancel_active_voucher_refunds_credits(self, client_token):
        """POST /api/vouchers/{id}/cancel - must cancel active voucher and refund credits"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Get initial balance
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        initial_data = me_response.json()
        initial_tokens = initial_data.get("tokens", 0)
        initial_credits = initial_data.get("credits", 0)
        
        print(f"  Initial balance - Tokens: {initial_tokens}, Credits: R$ {initial_credits:.2f}")
        
        if initial_tokens < 1:
            pytest.skip("Client has no tokens")
        
        # Use some credits if available
        credits_to_use = min(1.0, initial_credits) if initial_credits > 0 else 0
        
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
        print(f"  Credits after generation: R$ {credits_after_gen:.2f}")
        
        # Cancel the voucher
        cancel_response = requests.post(f"{BASE_URL}/api/vouchers/{voucher_id}/cancel", headers=headers)
        
        assert cancel_response.status_code == 200, f"Cancel failed: {cancel_response.status_code} - {cancel_response.text}"
        cancel_data = cancel_response.json()
        
        assert cancel_data.get("success") == True, f"Cancel not successful: {cancel_data}"
        assert "credits_refunded" in cancel_data, f"No credits_refunded in response: {cancel_data}"
        
        print(f"  Cancel response: {cancel_data}")
        
        # Verify credits were refunded
        me_after_cancel = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        credits_after_cancel = me_after_cancel.json().get("credits", 0)
        
        print(f"  Credits after cancel: R$ {credits_after_cancel:.2f}")
        
        # Credits should be restored
        if credits_used > 0:
            expected_credits = credits_after_gen + credits_used
            assert abs(credits_after_cancel - expected_credits) < 0.01, f"Credits not refunded: expected {expected_credits:.2f}, got {credits_after_cancel:.2f}"
            print(f"✓ Credits refunded: R$ {credits_used:.2f}")
        else:
            print("✓ No credits to refund (0 credits used)")
    
    def test_cancel_used_voucher_fails(self, client_token):
        """POST /api/vouchers/{id}/cancel - must fail for already used voucher"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Get vouchers and find a used one
        vouchers_response = requests.get(f"{BASE_URL}/api/vouchers/my", headers=headers)
        assert vouchers_response.status_code == 200
        vouchers = vouchers_response.json()
        
        used_voucher = None
        for v in vouchers:
            if v.get("used") or v.get("status") == "used":
                used_voucher = v
                break
        
        if not used_voucher:
            pytest.skip("No used voucher found to test cancel failure")
        
        voucher_id = used_voucher.get("voucher_id") or used_voucher.get("qr_id")
        
        # Try to cancel used voucher
        cancel_response = requests.post(f"{BASE_URL}/api/vouchers/{voucher_id}/cancel", headers=headers)
        
        assert cancel_response.status_code == 400, f"Expected 400 for used voucher, got: {cancel_response.status_code}"
        print("✓ Cancel used voucher correctly returns 400")
    
    def test_cancel_already_cancelled_voucher_fails(self, client_token):
        """POST /api/vouchers/{id}/cancel - must fail for already cancelled voucher"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Get vouchers and find a cancelled one
        vouchers_response = requests.get(f"{BASE_URL}/api/vouchers/my", headers=headers)
        assert vouchers_response.status_code == 200
        vouchers = vouchers_response.json()
        
        cancelled_voucher = None
        for v in vouchers:
            if v.get("status") == "cancelled":
                cancelled_voucher = v
                break
        
        if not cancelled_voucher:
            pytest.skip("No cancelled voucher found to test double-cancel failure")
        
        voucher_id = cancelled_voucher.get("voucher_id") or cancelled_voucher.get("qr_id")
        
        # Try to cancel already cancelled voucher
        cancel_response = requests.post(f"{BASE_URL}/api/vouchers/{voucher_id}/cancel", headers=headers)
        
        assert cancel_response.status_code == 400, f"Expected 400 for already cancelled voucher, got: {cancel_response.status_code}"
        print("✓ Cancel already cancelled voucher correctly returns 400")


class TestQRValidationCreditsTransfer:
    """Test POST /api/qr/validate - credits transfer to establishment"""
    
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
    
    def test_validate_transfers_credits_to_establishment(self, client_token, establishment_token):
        """POST /api/qr/validate - must transfer credits to establishment withdrawable_balance"""
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
        
        # Get establishment initial balance
        est_response = requests.get(f"{BASE_URL}/api/establishments/me", headers=est_headers)
        if est_response.status_code != 200:
            pytest.skip("Could not get establishment data")
        
        est_data = est_response.json()
        initial_withdrawable = est_data.get("withdrawable_balance", 0)
        print(f"  Establishment initial withdrawable: R$ {initial_withdrawable:.2f}")
        
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
        credits_used = qr_data.get("credits_used", 0)
        
        print(f"  Generated QR with backup_code: {backup_code}, credits_used: {credits_used}")
        
        # Validate QR
        validate_response = requests.post(f"{BASE_URL}/api/qr/validate",
            headers=est_headers,
            json={"code_hash": backup_code}
        )
        
        assert validate_response.status_code == 200, f"Validation failed: {validate_response.text}"
        validate_data = validate_response.json()
        
        assert validate_data.get("success") == True, f"Validation not successful: {validate_data}"
        assert "credits_used" in validate_data, f"No credits_used in validation response: {validate_data}"
        
        print(f"  Validation response - credits_used: {validate_data.get('credits_used')}, amount_to_pay_cash: {validate_data.get('amount_to_pay_cash')}")
        
        # Check establishment balance after validation
        est_response_after = requests.get(f"{BASE_URL}/api/establishments/me", headers=est_headers)
        est_data_after = est_response_after.json()
        final_withdrawable = est_data_after.get("withdrawable_balance", 0)
        
        print(f"  Establishment final withdrawable: R$ {final_withdrawable:.2f}")
        
        # Verify credits were transferred
        if credits_used > 0:
            expected_withdrawable = initial_withdrawable + credits_used
            assert abs(final_withdrawable - expected_withdrawable) < 0.01, f"Credits not transferred: expected {expected_withdrawable:.2f}, got {final_withdrawable:.2f}"
            print(f"✓ Credits transferred to establishment: R$ {credits_used:.2f}")
        else:
            print("✓ No credits to transfer (0 credits used)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
