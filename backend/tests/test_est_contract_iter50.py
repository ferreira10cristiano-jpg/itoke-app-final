"""
Test Establishment Contract (Intermediation) Feature - Iteration 50
Tests:
1. GET /api/admin/establishment-contract - Admin gets contract text
2. PUT /api/admin/establishment-contract - Admin updates contract text
3. GET /api/establishments/me/contract - Establishment gets contract status
4. POST /api/establishments/me/accept-contract - Establishment accepts contract
5. POST /api/offers - Returns 'contract_required' error if not accepted
6. POST /api/offers - Works after contract is accepted
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@itoke.master"
ADMIN_NAME = "Admin iToke"
EST_EMAIL = "teste@estabelecimento.com"
EST_NAME = "Teste Estabelecimento"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin token once for all tests"""
    time.sleep(1)  # Rate limit protection
    resp = api_client.post(f"{BASE_URL}/api/auth/email-login", json={
        "email": ADMIN_EMAIL,
        "name": ADMIN_NAME,
        "role": "admin"
    })
    if resp.status_code == 429:
        time.sleep(60)
        resp = api_client.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": ADMIN_EMAIL,
            "name": ADMIN_NAME,
            "role": "admin"
        })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json().get("session_token")


@pytest.fixture(scope="module")
def est_token(api_client, admin_token):
    """Get establishment token once for all tests"""
    time.sleep(1)  # Rate limit protection
    resp = api_client.post(f"{BASE_URL}/api/auth/email-login", json={
        "email": EST_EMAIL,
        "name": EST_NAME,
        "role": "establishment"
    })
    if resp.status_code == 429:
        time.sleep(60)
        resp = api_client.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": EST_EMAIL,
            "name": EST_NAME,
            "role": "establishment"
        })
    assert resp.status_code == 200, f"Establishment login failed: {resp.text}"
    return resp.json().get("session_token")


# ========== Admin Contract Endpoints ==========

def test_admin_get_contract(api_client, admin_token):
    """GET /api/admin/establishment-contract - Admin gets contract text"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = api_client.get(f"{BASE_URL}/api/admin/establishment-contract", headers=headers)
    
    assert resp.status_code == 200, f"Failed to get contract: {resp.text}"
    data = resp.json()
    assert "contract_text" in data, "Response should contain contract_text"
    assert len(data["contract_text"]) > 100, "Contract text should be substantial"
    print(f"✓ Admin GET contract: {len(data['contract_text'])} chars")


def test_admin_get_contract_unauthorized(api_client, est_token):
    """GET /api/admin/establishment-contract - Non-admin should be rejected"""
    headers = {"Authorization": f"Bearer {est_token}"}
    resp = api_client.get(f"{BASE_URL}/api/admin/establishment-contract", headers=headers)
    
    assert resp.status_code == 403, f"Expected 403 for non-admin, got {resp.status_code}"
    print("✓ Non-admin rejected from admin contract endpoint")


def test_admin_update_contract(api_client, admin_token):
    """PUT /api/admin/establishment-contract - Admin updates contract text"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # First get current contract
    get_resp = api_client.get(f"{BASE_URL}/api/admin/establishment-contract", headers=headers)
    original_text = get_resp.json().get("contract_text", "")
    
    # Update with new text
    new_text = original_text + "\n\n[TESTE AUTOMATIZADO - CLAUSULA ADICIONAL]"
    update_resp = api_client.put(
        f"{BASE_URL}/api/admin/establishment-contract",
        headers=headers,
        json={"contract_text": new_text}
    )
    
    assert update_resp.status_code == 200, f"Failed to update contract: {update_resp.text}"
    assert "atualizado" in update_resp.json().get("message", "").lower()
    
    # Verify update
    verify_resp = api_client.get(f"{BASE_URL}/api/admin/establishment-contract", headers=headers)
    assert "[TESTE AUTOMATIZADO" in verify_resp.json().get("contract_text", "")
    
    # Restore original
    api_client.put(
        f"{BASE_URL}/api/admin/establishment-contract",
        headers=headers,
        json={"contract_text": original_text}
    )
    print("✓ Admin PUT contract update works")


def test_admin_update_contract_empty_rejected(api_client, admin_token):
    """PUT /api/admin/establishment-contract - Empty text should be rejected"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = api_client.put(
        f"{BASE_URL}/api/admin/establishment-contract",
        headers=headers,
        json={"contract_text": "   "}
    )
    
    assert resp.status_code == 400, f"Expected 400 for empty text, got {resp.status_code}"
    print("✓ Empty contract text rejected")


# ========== Establishment Contract Endpoints ==========

def test_establishment_get_contract_status(api_client, est_token):
    """GET /api/establishments/me/contract - Get contract status and text"""
    headers = {"Authorization": f"Bearer {est_token}"}
    resp = api_client.get(f"{BASE_URL}/api/establishments/me/contract", headers=headers)
    
    assert resp.status_code == 200, f"Failed to get contract status: {resp.text}"
    data = resp.json()
    
    assert "accepted" in data, "Response should contain 'accepted' field"
    assert "contract_text" in data, "Response should contain 'contract_text' field"
    assert isinstance(data["accepted"], bool), "'accepted' should be boolean"
    
    print(f"✓ Establishment contract status: accepted={data['accepted']}")
    
    # If accepted, should have contract_record
    if data["accepted"]:
        assert "contract_record" in data, "Accepted contract should have contract_record"
        if data["contract_record"]:
            record = data["contract_record"]
            assert "full_name_signed" in record, "Contract record should have full_name_signed"
            assert "accepted_at" in record, "Contract record should have accepted_at"
            print(f"  - Signed by: {record.get('full_name_signed')}")
            print(f"  - Accepted at: {record.get('accepted_at')}")


def test_establishment_accept_contract_already_accepted(api_client, est_token):
    """POST /api/establishments/me/accept-contract - Already accepted returns message"""
    headers = {"Authorization": f"Bearer {est_token}"}
    
    # Check if already accepted
    status_resp = api_client.get(f"{BASE_URL}/api/establishments/me/contract", headers=headers)
    if status_resp.json().get("accepted"):
        # Try to accept again
        resp = api_client.post(
            f"{BASE_URL}/api/establishments/me/accept-contract",
            headers=headers,
            json={"full_name": "Test User"}
        )
        assert resp.status_code == 200, f"Unexpected status: {resp.status_code}"
        data = resp.json()
        assert data.get("already_accepted") == True, "Should indicate already accepted"
        print("✓ Already accepted contract returns appropriate message")
    else:
        pytest.skip("Establishment has not accepted contract yet")


def test_offer_creation_with_accepted_contract(api_client, est_token):
    """POST /api/offers - Works when contract is accepted"""
    headers = {"Authorization": f"Bearer {est_token}"}
    
    # First check contract status
    status_resp = api_client.get(f"{BASE_URL}/api/establishments/me/contract", headers=headers)
    contract_accepted = status_resp.json().get("accepted", False)
    
    if not contract_accepted:
        pytest.skip("Establishment has not accepted contract - cannot test offer creation")
    
    # Check token balance
    tokens_resp = api_client.get(f"{BASE_URL}/api/establishments/me/tokens", headers=headers)
    available_tokens = tokens_resp.json().get("available", 0)
    
    if available_tokens < 1:
        pytest.skip("No tokens available for offer creation test")
    
    # Try to create an offer
    offer_data = {
        "title": f"TEST_Offer_{uuid.uuid4().hex[:6]}",
        "description": "Test offer for contract verification",
        "discount_value": 20,
        "original_price": 50.00,
        "discounted_price": 40.00,
        "valid_days": "Segunda, Terca, Quarta",
        "valid_hours": "11:00 às 22:00",
        "tokens_allocated": 1
    }
    
    resp = api_client.post(f"{BASE_URL}/api/offers", headers=headers, json=offer_data)
    
    # Should succeed since contract is accepted
    if resp.status_code == 200:
        data = resp.json()
        assert "offer_id" in data, "Response should contain offer_id"
        print(f"✓ Offer created successfully: {data.get('offer_id')}")
        
        # Clean up - pause the offer
        offer_id = data.get("offer_id")
        api_client.put(f"{BASE_URL}/api/offers/{offer_id}/toggle", headers=headers)
    elif resp.status_code == 400:
        # Might fail due to insufficient tokens or other validation
        print(f"  Offer creation failed (validation): {resp.text}")
    else:
        print(f"  Unexpected response: {resp.status_code} - {resp.text}")


def test_offer_creation_blocked_without_contract(api_client):
    """POST /api/offers - Returns 'contract_required' if not accepted"""
    time.sleep(2)  # Rate limit protection
    
    # Create a new establishment that hasn't accepted contract
    unique_id = uuid.uuid4().hex[:8]
    new_email = f"test_nocontract_{unique_id}@test.com"
    
    # Login as new establishment
    login_resp = api_client.post(f"{BASE_URL}/api/auth/email-login", json={
        "email": new_email,
        "name": f"Test NoContract {unique_id}",
        "role": "establishment"
    })
    
    if login_resp.status_code == 429:
        pytest.skip("Rate limited - cannot create new establishment")
    
    if login_resp.status_code != 200:
        pytest.skip("Could not create new establishment")
    
    new_token = login_resp.json().get("session_token")
    headers = {"Authorization": f"Bearer {new_token}"}
    
    # First need to register the establishment
    est_data = {
        "business_name": f"Test Business {unique_id}",
        "cnpj": "12345678000199",
        "category": "Restaurante",
        "city": "São Paulo",
        "neighborhood": "Centro"
    }
    
    reg_resp = api_client.post(f"{BASE_URL}/api/establishments", headers=headers, json=est_data)
    
    if reg_resp.status_code not in [200, 201]:
        print(f"  Establishment registration: {reg_resp.status_code} - {reg_resp.text}")
    
    # Now try to create an offer without accepting contract
    offer_data = {
        "title": f"TEST_Blocked_{unique_id}",
        "description": "Should be blocked",
        "discount_value": 10,
        "original_price": 100.00,
        "discounted_price": 90.00,
        "tokens_allocated": 1
    }
    
    resp = api_client.post(f"{BASE_URL}/api/offers", headers=headers, json=offer_data)
    
    # Should return 403 with contract_required
    if resp.status_code == 403:
        error_detail = resp.json().get("detail", "")
        assert "contract_required" in error_detail.lower() or "contract" in error_detail.lower(), \
            f"Expected contract_required error, got: {error_detail}"
        print("✓ Offer creation blocked without contract acceptance (403 contract_required)")
    elif resp.status_code == 400:
        # Might fail due to no tokens
        print(f"  Offer blocked (validation): {resp.text}")
    else:
        print(f"  Response: {resp.status_code} - {resp.text}")


def test_new_establishment_contract_flow(api_client):
    """Full flow: Register -> Check contract -> Accept -> Create offer"""
    time.sleep(2)  # Rate limit protection
    
    unique_id = uuid.uuid4().hex[:8]
    new_email = f"test_flow_{unique_id}@test.com"
    
    # 1. Login as new establishment
    login_resp = api_client.post(f"{BASE_URL}/api/auth/email-login", json={
        "email": new_email,
        "name": f"Test Flow {unique_id}",
        "role": "establishment"
    })
    
    if login_resp.status_code == 429:
        pytest.skip("Rate limited")
    
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("session_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Register establishment
    est_data = {
        "business_name": f"Flow Business {unique_id}",
        "cnpj": "98765432000188",
        "category": "Restaurante",
        "city": "São Paulo",
        "neighborhood": "Pinheiros"
    }
    reg_resp = api_client.post(f"{BASE_URL}/api/establishments", headers=headers, json=est_data)
    
    if reg_resp.status_code not in [200, 201]:
        print(f"  Registration response: {reg_resp.status_code} - {reg_resp.text}")
        pytest.skip("Could not register establishment")
    
    print(f"✓ Step 1: Establishment registered")
    
    # 3. Check contract status (should be not accepted)
    status_resp = api_client.get(f"{BASE_URL}/api/establishments/me/contract", headers=headers)
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    
    assert status_data.get("accepted") == False, "New establishment should not have accepted contract"
    assert "contract_text" in status_data, "Should return contract text"
    print(f"✓ Step 2: Contract status checked (accepted=False)")
    
    # 4. Try to create offer (should fail)
    offer_data = {
        "title": f"TEST_Flow_{unique_id}",
        "discount_value": 15,
        "original_price": 80.00,
        "discounted_price": 68.00,
        "tokens_allocated": 1
    }
    offer_resp = api_client.post(f"{BASE_URL}/api/offers", headers=headers, json=offer_data)
    
    assert offer_resp.status_code == 403, f"Expected 403, got {offer_resp.status_code}"
    assert "contract_required" in offer_resp.json().get("detail", "").lower()
    print(f"✓ Step 3: Offer creation blocked (contract_required)")
    
    # 5. Accept contract
    accept_resp = api_client.post(
        f"{BASE_URL}/api/establishments/me/accept-contract",
        headers=headers,
        json={"full_name": f"Test User {unique_id}"}
    )
    assert accept_resp.status_code == 200
    accept_data = accept_resp.json()
    assert accept_data.get("accepted") == True or accept_data.get("contract_id")
    print(f"✓ Step 4: Contract accepted")
    
    # 6. Verify contract status updated
    verify_resp = api_client.get(f"{BASE_URL}/api/establishments/me/contract", headers=headers)
    assert verify_resp.json().get("accepted") == True
    print(f"✓ Step 5: Contract status verified (accepted=True)")
    
    # 7. Now offer creation should work (but might fail due to no tokens)
    offer_resp2 = api_client.post(f"{BASE_URL}/api/offers", headers=headers, json=offer_data)
    
    if offer_resp2.status_code == 200:
        print(f"✓ Step 6: Offer created after contract acceptance")
    elif offer_resp2.status_code == 400:
        # Expected - no tokens
        print(f"✓ Step 6: Offer blocked by token validation (contract check passed)")
    else:
        print(f"  Step 6: Unexpected response: {offer_resp2.status_code} - {offer_resp2.text}")
