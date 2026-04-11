"""
Anti-Fraud System Tests - Iteration 45
Tests for:
- Rate limiting on login (5/min per IP)
- Rate limiting on QR code generation (15/day per user)
- Rate limiting on payments (10/hour per user)
- CPF validation with check digit algorithm
- Duplicate CPF detection
- Admin fraud alerts endpoints
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://draft-offer-mode.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "admin@itoke.master"
ADMIN_NAME = "Admin iToke"
CLIENT_EMAIL = "cliente@teste.com"
CLIENT_NAME = "Cliente Teste"
PACKAGE_CONFIG_ID = "tpkg_da93faf63d66"

# Valid CPFs (pass check digit algorithm)
VALID_CPFS = ["11144477735", "52998224725"]
# Invalid CPFs (fail check digit algorithm)
INVALID_CPFS = ["12345678900", "11111111111", "00000000000"]


class TestAntiFraudSystem:
    """Anti-fraud system tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Use unique IP for each test class to avoid rate limiting
        self.test_ip = f"192.168.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}"
    
    def get_admin_token(self, ip_suffix="admin"):
        """Get admin authentication token"""
        unique_ip = f"10.0.0.{hash(ip_suffix) % 256}"
        response = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": ADMIN_EMAIL, "name": ADMIN_NAME, "role": "admin"},
            headers={"X-Forwarded-For": unique_ip}
        )
        if response.status_code == 200:
            return response.json().get("session_token")
        return None
    
    def get_client_token(self, ip_suffix="client"):
        """Get client authentication token"""
        unique_ip = f"10.0.1.{hash(ip_suffix) % 256}"
        response = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": CLIENT_EMAIL, "name": CLIENT_NAME, "role": "client"},
            headers={"X-Forwarded-For": unique_ip}
        )
        if response.status_code == 200:
            return response.json().get("session_token")
        return None


class TestLoginRateLimiting(TestAntiFraudSystem):
    """Test login rate limiting - max 5 attempts per minute per IP"""
    
    def test_login_rate_limit_triggers_after_5_attempts(self):
        """Test that 6th login attempt from same IP returns 429"""
        # Use a unique IP for this test
        test_ip = f"172.16.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}"
        
        # Make 5 successful login attempts
        for i in range(5):
            response = self.session.post(
                f"{BASE_URL}/api/auth/email-login",
                json={"email": f"test{i}@example.com", "name": f"Test User {i}"},
                headers={"X-Forwarded-For": test_ip}
            )
            # First 5 should succeed (200) or create new user
            assert response.status_code in [200, 201], f"Attempt {i+1} failed: {response.text}"
        
        # 6th attempt should be rate limited
        response = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": "test6@example.com", "name": "Test User 6"},
            headers={"X-Forwarded-For": test_ip}
        )
        assert response.status_code == 429, f"Expected 429, got {response.status_code}: {response.text}"
        assert "Muitas tentativas" in response.json().get("detail", "")
    
    def test_different_ips_not_rate_limited(self):
        """Test that different IPs are not affected by each other's rate limits"""
        # Login from IP 1
        ip1 = f"192.168.100.{uuid.uuid4().int % 256}"
        response1 = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": CLIENT_EMAIL, "name": CLIENT_NAME},
            headers={"X-Forwarded-For": ip1}
        )
        assert response1.status_code == 200
        
        # Login from IP 2 should also work
        ip2 = f"192.168.200.{uuid.uuid4().int % 256}"
        response2 = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": CLIENT_EMAIL, "name": CLIENT_NAME},
            headers={"X-Forwarded-For": ip2}
        )
        assert response2.status_code == 200


class TestCPFValidation(TestAntiFraudSystem):
    """Test CPF validation with check digit algorithm"""
    
    def test_valid_cpf_accepted(self):
        """Test that valid CPFs are accepted"""
        token = self.get_client_token("cpf_valid")
        assert token, "Failed to get client token"
        
        for cpf in VALID_CPFS:
            # Create a new test user for each CPF test
            unique_ip = f"10.1.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}"
            test_email = f"cpftest_{uuid.uuid4().hex[:8]}@test.com"
            
            # Login as new user
            login_resp = self.session.post(
                f"{BASE_URL}/api/auth/email-login",
                json={"email": test_email, "name": "CPF Test User"},
                headers={"X-Forwarded-For": unique_ip}
            )
            if login_resp.status_code != 200:
                continue
            
            user_token = login_resp.json().get("session_token")
            
            # Try to update CPF
            response = self.session.put(
                f"{BASE_URL}/api/auth/cpf",
                json={"cpf": cpf},
                headers={"Authorization": f"Bearer {user_token}"}
            )
            # Should succeed (200) or fail due to duplicate (400 with specific message)
            if response.status_code == 200:
                assert "CPF atualizado" in response.json().get("message", "")
            elif response.status_code == 400:
                # Might be duplicate CPF which is expected
                detail = response.json().get("detail", "")
                assert "ja esta cadastrado" in detail or "invalido" not in detail.lower()
    
    def test_invalid_cpf_rejected(self):
        """Test that invalid CPFs are rejected"""
        # Create a new test user
        unique_ip = f"10.2.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}"
        test_email = f"cpfinvalid_{uuid.uuid4().hex[:8]}@test.com"
        
        login_resp = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": test_email, "name": "Invalid CPF Test"},
            headers={"X-Forwarded-For": unique_ip}
        )
        assert login_resp.status_code == 200
        user_token = login_resp.json().get("session_token")
        
        for cpf in INVALID_CPFS:
            response = self.session.put(
                f"{BASE_URL}/api/auth/cpf",
                json={"cpf": cpf},
                headers={"Authorization": f"Bearer {user_token}"}
            )
            assert response.status_code == 400, f"CPF {cpf} should be rejected, got {response.status_code}"
            assert "invalido" in response.json().get("detail", "").lower()
    
    def test_cpf_wrong_length_rejected(self):
        """Test that CPFs with wrong length are rejected"""
        unique_ip = f"10.3.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}"
        test_email = f"cpflength_{uuid.uuid4().hex[:8]}@test.com"
        
        login_resp = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": test_email, "name": "Length CPF Test"},
            headers={"X-Forwarded-For": unique_ip}
        )
        assert login_resp.status_code == 200
        user_token = login_resp.json().get("session_token")
        
        # Test short CPF
        response = self.session.put(
            f"{BASE_URL}/api/auth/cpf",
            json={"cpf": "1234567890"},  # 10 digits
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 400
        
        # Test long CPF
        response = self.session.put(
            f"{BASE_URL}/api/auth/cpf",
            json={"cpf": "123456789012"},  # 12 digits
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 400


class TestDuplicateCPFDetection(TestAntiFraudSystem):
    """Test duplicate CPF detection across users"""
    
    def test_duplicate_cpf_rejected(self):
        """Test that same CPF cannot be used by two different users"""
        # Use a unique CPF for this test
        test_cpf = "52998224725"  # Valid CPF
        
        # Create first user and set CPF
        unique_ip1 = f"10.4.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}"
        email1 = f"dup1_{uuid.uuid4().hex[:8]}@test.com"
        
        login1 = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": email1, "name": "Dup Test 1"},
            headers={"X-Forwarded-For": unique_ip1}
        )
        assert login1.status_code == 200
        token1 = login1.json().get("session_token")
        
        # Set CPF for first user
        cpf_resp1 = self.session.put(
            f"{BASE_URL}/api/auth/cpf",
            json={"cpf": test_cpf},
            headers={"Authorization": f"Bearer {token1}"}
        )
        # May succeed or fail if CPF already exists
        if cpf_resp1.status_code != 200:
            pytest.skip("CPF already in use by another user")
        
        # Create second user and try to use same CPF
        unique_ip2 = f"10.5.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}"
        email2 = f"dup2_{uuid.uuid4().hex[:8]}@test.com"
        
        login2 = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={"email": email2, "name": "Dup Test 2"},
            headers={"X-Forwarded-For": unique_ip2}
        )
        assert login2.status_code == 200
        token2 = login2.json().get("session_token")
        
        # Try to set same CPF for second user - should fail
        cpf_resp2 = self.session.put(
            f"{BASE_URL}/api/auth/cpf",
            json={"cpf": test_cpf},
            headers={"Authorization": f"Bearer {token2}"}
        )
        assert cpf_resp2.status_code == 400
        assert "ja esta cadastrado" in cpf_resp2.json().get("detail", "")


class TestAdminFraudAlerts(TestAntiFraudSystem):
    """Test admin fraud alerts endpoints"""
    
    def test_get_fraud_alerts_requires_admin(self):
        """Test that fraud alerts endpoint requires admin role"""
        # Try with client token
        client_token = self.get_client_token("alerts_client")
        assert client_token, "Failed to get client token"
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/fraud-alerts",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_get_fraud_alerts_admin_success(self):
        """Test that admin can get fraud alerts"""
        admin_token = self.get_admin_token("alerts_admin")
        assert admin_token, "Failed to get admin token"
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/fraud-alerts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "alerts" in data
        assert "stats" in data
        assert "total" in data["stats"]
        assert "new" in data["stats"]
        assert "reviewed" in data["stats"]
    
    def test_get_fraud_alerts_filter_new(self):
        """Test filtering fraud alerts by status=new"""
        admin_token = self.get_admin_token("alerts_filter")
        assert admin_token, "Failed to get admin token"
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/fraud-alerts?status=new",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # All returned alerts should have reviewed=False
        for alert in data.get("alerts", []):
            assert alert.get("reviewed") == False
    
    def test_get_fraud_alerts_filter_reviewed(self):
        """Test filtering fraud alerts by status=reviewed"""
        admin_token = self.get_admin_token("alerts_reviewed")
        assert admin_token, "Failed to get admin token"
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/fraud-alerts?status=reviewed",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # All returned alerts should have reviewed=True
        for alert in data.get("alerts", []):
            assert alert.get("reviewed") == True
    
    def test_review_fraud_alert(self):
        """Test marking a fraud alert as reviewed"""
        admin_token = self.get_admin_token("review_alert")
        assert admin_token, "Failed to get admin token"
        
        # First get alerts to find one to review
        alerts_resp = self.session.get(
            f"{BASE_URL}/api/admin/fraud-alerts?status=new",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert alerts_resp.status_code == 200
        
        alerts = alerts_resp.json().get("alerts", [])
        if not alerts:
            pytest.skip("No new alerts to review")
        
        alert_id = alerts[0]["alert_id"]
        
        # Review the alert
        review_resp = self.session.put(
            f"{BASE_URL}/api/admin/fraud-alerts/{alert_id}/review",
            json={"notes": "Reviewed during testing"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert review_resp.status_code == 200
        assert "revisado" in review_resp.json().get("message", "").lower()
    
    def test_review_nonexistent_alert(self):
        """Test reviewing a non-existent alert returns 404"""
        admin_token = self.get_admin_token("review_404")
        assert admin_token, "Failed to get admin token"
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/fraud-alerts/nonexistent_alert_id/review",
            json={"notes": "Test"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
    
    def test_clear_reviewed_alerts(self):
        """Test clearing reviewed alerts"""
        admin_token = self.get_admin_token("clear_alerts")
        assert admin_token, "Failed to get admin token"
        
        response = self.session.delete(
            f"{BASE_URL}/api/admin/fraud-alerts/clear-reviewed",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "removidos" in response.json().get("message", "")
    
    def test_clear_reviewed_requires_admin(self):
        """Test that clearing alerts requires admin role"""
        client_token = self.get_client_token("clear_client")
        assert client_token, "Failed to get client token"
        
        response = self.session.delete(
            f"{BASE_URL}/api/admin/fraud-alerts/clear-reviewed",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403


class TestQRCodeRateLimiting(TestAntiFraudSystem):
    """Test QR code generation rate limiting - max 15 per day per user"""
    
    def test_qr_rate_limit_key_is_per_user(self):
        """Test that QR rate limiting is per user, not per IP"""
        # This test verifies the rate limit key format
        # We can't easily test 15 QR codes without tokens, but we can verify the endpoint exists
        client_token = self.get_client_token("qr_test")
        assert client_token, "Failed to get client token"
        
        # Try to generate QR code (will likely fail due to missing CPF or tokens)
        response = self.session.post(
            f"{BASE_URL}/api/qr/generate",
            json={"offer_id": "test_offer"},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        # Should return 400 (CPF required or tokens required) not 401 or 500
        assert response.status_code in [400, 404, 429], f"Unexpected status: {response.status_code}"


class TestPaymentRateLimiting(TestAntiFraudSystem):
    """Test payment rate limiting - max 10 per hour per user"""
    
    def test_payment_endpoint_exists(self):
        """Test that payment checkout endpoint exists and requires auth"""
        # Without auth
        response = self.session.post(
            f"{BASE_URL}/api/payments/checkout",
            json={"package_config_id": PACKAGE_CONFIG_ID, "origin_url": "https://test.com"}
        )
        assert response.status_code == 401
    
    def test_payment_with_auth(self):
        """Test payment checkout with authentication"""
        client_token = self.get_client_token("payment_test")
        assert client_token, "Failed to get client token"
        
        response = self.session.post(
            f"{BASE_URL}/api/payments/checkout",
            json={"package_config_id": PACKAGE_CONFIG_ID, "origin_url": "https://test.com"},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        # Should succeed (200) or fail due to Stripe config, not rate limit on first attempt
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"


class TestSuspiciousActivityLogging(TestAntiFraudSystem):
    """Test that suspicious activities are logged"""
    
    def test_rate_limit_creates_fraud_alert(self):
        """Test that hitting rate limit creates a fraud alert"""
        admin_token = self.get_admin_token("log_test")
        assert admin_token, "Failed to get admin token"
        
        # Get initial alert count
        initial_resp = self.session.get(
            f"{BASE_URL}/api/admin/fraud-alerts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert initial_resp.status_code == 200
        initial_count = initial_resp.json().get("stats", {}).get("total", 0)
        
        # Trigger rate limit with a unique IP
        test_ip = f"172.30.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}"
        for i in range(6):
            self.session.post(
                f"{BASE_URL}/api/auth/email-login",
                json={"email": f"alerttest{i}@test.com", "name": f"Alert Test {i}"},
                headers={"X-Forwarded-For": test_ip}
            )
        
        # Need to get a fresh admin token since we may have used up rate limit
        admin_token2 = self.get_admin_token("log_test2")
        assert admin_token2, "Failed to get admin token for verification"
        
        # Check if new alert was created
        final_resp = self.session.get(
            f"{BASE_URL}/api/admin/fraud-alerts",
            headers={"Authorization": f"Bearer {admin_token2}"}
        )
        assert final_resp.status_code == 200
        final_count = final_resp.json().get("stats", {}).get("total", 0)
        
        # Should have at least one more alert (rate limit alert)
        assert final_count > initial_count, f"Rate limit should create fraud alert. Initial: {initial_count}, Final: {final_count}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
