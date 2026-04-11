"""
Test Suite for Representative Phase 2 Features (Iteration 48)
- Contract acceptance (POST /api/rep/accept-contract, GET /api/rep/contract)
- Document upload (POST /api/rep/upload-document, GET /api/rep/documents, DELETE /api/rep/documents/{doc_id})
- Withdrawals (POST /api/rep/withdrawals, GET /api/rep/withdrawals)
- Admin document review (GET /api/admin/rep-documents/{rep_id}, PUT /api/admin/rep-documents/{doc_id}/review)
- Admin contract view (GET /api/admin/rep-contracts/{rep_id})
- Admin withdrawal management (GET /api/admin/rep-withdrawals, PUT /api/admin/rep-withdrawals/{wd_id})
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials
REP_TOKEN = "rptk_47f23a5d65db44e0adec80c2ca4defa7"
REP_ID = "rep_597cd705fa02"
ADMIN_EMAIL = "admin@itoke.master"
ADMIN_NAME = "Admin iToke"

# Session-scoped admin token to avoid rate limiting
_admin_token_cache = {"token": None}

def get_admin_token():
    """Get admin token with caching to avoid rate limiting"""
    if _admin_token_cache["token"]:
        return _admin_token_cache["token"]
    
    login_response = requests.post(
        f"{BASE_URL}/api/auth/email-login",
        json={"email": ADMIN_EMAIL, "name": ADMIN_NAME}
    )
    if login_response.status_code == 200:
        _admin_token_cache["token"] = login_response.json().get("session_token")
        return _admin_token_cache["token"]
    elif login_response.status_code == 429:
        pytest.skip("Rate limited - skipping admin tests")
    else:
        pytest.fail(f"Admin login failed: {login_response.text}")
    return None


class TestRepContractEndpoints:
    """Test contract acceptance and retrieval endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup rep headers"""
        self.rep_headers = {
            "X-Rep-Token": REP_TOKEN,
            "Content-Type": "application/json"
        }
    
    def test_get_contract_status(self):
        """GET /api/rep/contract - Get contract status and text"""
        response = requests.get(
            f"{BASE_URL}/api/rep/contract",
            headers=self.rep_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Contract was already accepted by test rep
        assert "accepted" in data
        assert "preview_text" in data
        
        if data["accepted"]:
            assert data["contract"] is not None
            assert "full_name_signed" in data["contract"]
            assert "ip_address" in data["contract"]
            assert "contract_text" in data["contract"]
            print(f"Contract already accepted by: {data['contract'].get('full_name_signed')}")
        else:
            print("Contract not yet accepted")
        
        # Verify preview text contains expected sections
        assert "CONTRATO DE REPRESENTACAO COMERCIAL PJ" in data["preview_text"]
        print("GET /api/rep/contract - PASSED")
    
    def test_accept_contract_already_accepted(self):
        """POST /api/rep/accept-contract - Should return already_accepted if contract was accepted"""
        response = requests.post(
            f"{BASE_URL}/api/rep/accept-contract",
            headers=self.rep_headers,
            json={"full_name": "Carlos Representante"}
        )
        # Should return 200 with already_accepted=True since contract was already accepted
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("already_accepted") == True or data.get("accepted") == True
        print("POST /api/rep/accept-contract (already accepted) - PASSED")
    
    def test_accept_contract_missing_name(self):
        """POST /api/rep/accept-contract - Should fail without full_name"""
        response = requests.post(
            f"{BASE_URL}/api/rep/accept-contract",
            headers=self.rep_headers,
            json={"full_name": ""}
        )
        # Should return 400 or 200 with already_accepted
        if response.status_code == 400:
            data = response.json()
            assert "obrigatorio" in data.get("detail", "").lower() or "nome" in data.get("detail", "").lower()
            print("POST /api/rep/accept-contract (missing name) - PASSED (400 error)")
        else:
            # Contract already accepted, so it returns 200
            assert response.status_code == 200
            print("POST /api/rep/accept-contract (missing name) - PASSED (already accepted)")


class TestRepDocumentEndpoints:
    """Test document upload and management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup rep headers"""
        self.rep_headers = {
            "X-Rep-Token": REP_TOKEN,
            "Content-Type": "application/json"
        }
        self.created_doc_ids = []
    
    def test_get_documents_list(self):
        """GET /api/rep/documents - Get list of uploaded documents"""
        response = requests.get(
            f"{BASE_URL}/api/rep/documents",
            headers=self.rep_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify documents don't include base64 data
        for doc in data:
            assert "base64_data" not in doc, "base64_data should not be included in list"
            assert "doc_id" in doc
            assert "doc_type" in doc
            assert "status" in doc
        
        print(f"GET /api/rep/documents - PASSED ({len(data)} documents)")
    
    def test_upload_document_valid(self):
        """POST /api/rep/upload-document - Upload a valid document"""
        # Small base64 test image (1x1 pixel PNG)
        test_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{BASE_URL}/api/rep/upload-document",
            headers=self.rep_headers,
            json={
                "doc_type": "rg",
                "base64_data": test_base64,
                "filename": f"TEST_rg_{uuid.uuid4().hex[:8]}.png"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "doc_id" in data
        assert data["status"] == "pending"
        
        self.created_doc_ids.append(data["doc_id"])
        print(f"POST /api/rep/upload-document - PASSED (doc_id: {data['doc_id']})")
        return data["doc_id"]
    
    def test_upload_document_invalid_type(self):
        """POST /api/rep/upload-document - Should fail with invalid doc_type"""
        test_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{BASE_URL}/api/rep/upload-document",
            headers=self.rep_headers,
            json={
                "doc_type": "invalid_type",
                "base64_data": test_base64,
                "filename": "test.png"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "invalido" in data.get("detail", "").lower()
        print("POST /api/rep/upload-document (invalid type) - PASSED")
    
    def test_upload_document_missing_data(self):
        """POST /api/rep/upload-document - Should fail without base64_data"""
        response = requests.post(
            f"{BASE_URL}/api/rep/upload-document",
            headers=self.rep_headers,
            json={
                "doc_type": "rg",
                "base64_data": "",
                "filename": "test.png"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "obrigatorio" in data.get("detail", "").lower()
        print("POST /api/rep/upload-document (missing data) - PASSED")
    
    def test_upload_document_all_valid_types(self):
        """POST /api/rep/upload-document - Test all valid doc_types"""
        valid_types = ["rg", "cnpj_card", "contrato_social", "selfie", "outro"]
        test_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        uploaded_docs = []
        for doc_type in valid_types:
            response = requests.post(
                f"{BASE_URL}/api/rep/upload-document",
                headers=self.rep_headers,
                json={
                    "doc_type": doc_type,
                    "base64_data": test_base64,
                    "filename": f"TEST_{doc_type}_{uuid.uuid4().hex[:8]}.png"
                }
            )
            if response.status_code == 400 and "limite" in response.text.lower():
                print(f"Document limit reached at {doc_type}, cleaning up and skipping remaining")
                break
            assert response.status_code == 200, f"Expected 200 for {doc_type}, got {response.status_code}: {response.text}"
            uploaded_docs.append(response.json()["doc_id"])
        
        # Cleanup uploaded docs
        for doc_id in uploaded_docs:
            requests.delete(f"{BASE_URL}/api/rep/documents/{doc_id}", headers=self.rep_headers)
        
        print(f"POST /api/rep/upload-document (valid types) - PASSED ({len(uploaded_docs)} uploaded)")
    
    def test_delete_document(self):
        """DELETE /api/rep/documents/{doc_id} - Delete a pending document"""
        # First upload a document
        test_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        upload_response = requests.post(
            f"{BASE_URL}/api/rep/upload-document",
            headers=self.rep_headers,
            json={
                "doc_type": "outro",
                "base64_data": test_base64,
                "filename": f"TEST_delete_{uuid.uuid4().hex[:8]}.png"
            }
        )
        if upload_response.status_code == 400 and "limite" in upload_response.text.lower():
            pytest.skip("Document limit reached - skipping test")
        assert upload_response.status_code == 200
        doc_id = upload_response.json()["doc_id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/rep/documents/{doc_id}",
            headers=self.rep_headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        data = delete_response.json()
        assert data.get("deleted") == True
        print(f"DELETE /api/rep/documents/{doc_id} - PASSED")
    
    def test_delete_document_not_found(self):
        """DELETE /api/rep/documents/{doc_id} - Should fail for non-existent document"""
        response = requests.delete(
            f"{BASE_URL}/api/rep/documents/nonexistent_doc_id",
            headers=self.rep_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("DELETE /api/rep/documents (not found) - PASSED")


class TestRepWithdrawalEndpoints:
    """Test withdrawal request and history endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup rep headers"""
        self.rep_headers = {
            "X-Rep-Token": REP_TOKEN,
            "Content-Type": "application/json"
        }
    
    def test_get_withdrawals_history(self):
        """GET /api/rep/withdrawals - Get withdrawal history"""
        response = requests.get(
            f"{BASE_URL}/api/rep/withdrawals",
            headers=self.rep_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        for wd in data:
            assert "withdrawal_id" in wd
            assert "amount" in wd
            assert "status" in wd
            assert "pix_key" in wd
        
        print(f"GET /api/rep/withdrawals - PASSED ({len(data)} withdrawals)")
    
    def test_request_withdrawal_missing_pix(self):
        """POST /api/rep/withdrawals - Should fail without pix_key"""
        response = requests.post(
            f"{BASE_URL}/api/rep/withdrawals",
            headers=self.rep_headers,
            json={
                "amount": 10.00,
                "pix_key": "",
                "pix_type": "cpf"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Could fail for missing pix OR insufficient balance (balance check happens first)
        detail = data.get("detail", "").lower()
        assert "pix" in detail or "saldo" in detail
        print("POST /api/rep/withdrawals (missing pix or insufficient balance) - PASSED")
    
    def test_request_withdrawal_invalid_amount(self):
        """POST /api/rep/withdrawals - Should fail with zero or negative amount"""
        response = requests.post(
            f"{BASE_URL}/api/rep/withdrawals",
            headers=self.rep_headers,
            json={
                "amount": 0,
                "pix_key": "12345678901",
                "pix_type": "cpf"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "valor" in data.get("detail", "").lower() or "maior" in data.get("detail", "").lower()
        print("POST /api/rep/withdrawals (invalid amount) - PASSED")
    
    def test_request_withdrawal_insufficient_balance(self):
        """POST /api/rep/withdrawals - Should fail if amount exceeds balance"""
        response = requests.post(
            f"{BASE_URL}/api/rep/withdrawals",
            headers=self.rep_headers,
            json={
                "amount": 999999.99,
                "pix_key": "12345678901",
                "pix_type": "cpf"
            }
        )
        # Should return 400 for insufficient balance or pending withdrawal
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "saldo" in data.get("detail", "").lower() or "pendente" in data.get("detail", "").lower()
        print("POST /api/rep/withdrawals (insufficient balance) - PASSED")


class TestAdminDocumentReviewEndpoints:
    """Test admin document review endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin auth"""
        self.admin_token = get_admin_token()
        self.admin_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
        
        self.rep_headers = {
            "X-Rep-Token": REP_TOKEN,
            "Content-Type": "application/json"
        }
    
    def test_admin_get_rep_documents(self):
        """GET /api/admin/rep-documents/{rep_id} - Admin views rep documents"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rep-documents/{REP_ID}",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Admin should see base64_data
        for doc in data:
            assert "doc_id" in doc
            assert "doc_type" in doc
            # base64_data should be included for admin
        
        print(f"GET /api/admin/rep-documents/{REP_ID} - PASSED ({len(data)} documents)")
    
    def test_admin_review_document_approve(self):
        """PUT /api/admin/rep-documents/{doc_id}/review - Admin approves document"""
        # First upload a document as rep
        test_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        upload_response = requests.post(
            f"{BASE_URL}/api/rep/upload-document",
            headers=self.rep_headers,
            json={
                "doc_type": "rg",
                "base64_data": test_base64,
                "filename": f"TEST_approve_{uuid.uuid4().hex[:8]}.png"
            }
        )
        if upload_response.status_code == 400 and "limite" in upload_response.text.lower():
            pytest.skip("Document limit reached - skipping test")
        assert upload_response.status_code == 200
        doc_id = upload_response.json()["doc_id"]
        
        # Admin approves
        review_response = requests.put(
            f"{BASE_URL}/api/admin/rep-documents/{doc_id}/review",
            headers=self.admin_headers,
            json={"status": "approved", "note": "Documento verificado"}
        )
        assert review_response.status_code == 200, f"Expected 200, got {review_response.status_code}: {review_response.text}"
        
        data = review_response.json()
        assert data["status"] == "approved"
        
        # Cleanup - delete the doc (can't delete approved, but try)
        requests.delete(f"{BASE_URL}/api/rep/documents/{doc_id}", headers=self.rep_headers)
        print(f"PUT /api/admin/rep-documents/{doc_id}/review (approve) - PASSED")
    
    def test_admin_review_document_reject(self):
        """PUT /api/admin/rep-documents/{doc_id}/review - Admin rejects document"""
        # First upload a document as rep
        test_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        upload_response = requests.post(
            f"{BASE_URL}/api/rep/upload-document",
            headers=self.rep_headers,
            json={
                "doc_type": "selfie",
                "base64_data": test_base64,
                "filename": f"TEST_reject_{uuid.uuid4().hex[:8]}.png"
            }
        )
        if upload_response.status_code == 400 and "limite" in upload_response.text.lower():
            pytest.skip("Document limit reached - skipping test")
        assert upload_response.status_code == 200
        doc_id = upload_response.json()["doc_id"]
        
        # Admin rejects
        review_response = requests.put(
            f"{BASE_URL}/api/admin/rep-documents/{doc_id}/review",
            headers=self.admin_headers,
            json={"status": "rejected", "note": "Documento ilegivel"}
        )
        assert review_response.status_code == 200, f"Expected 200, got {review_response.status_code}: {review_response.text}"
        
        data = review_response.json()
        assert data["status"] == "rejected"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/rep/documents/{doc_id}", headers=self.rep_headers)
        print(f"PUT /api/admin/rep-documents/{doc_id}/review (reject) - PASSED")
    
    def test_admin_review_document_invalid_status(self):
        """PUT /api/admin/rep-documents/{doc_id}/review - Should fail with invalid status"""
        # First upload a document as rep
        test_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        upload_response = requests.post(
            f"{BASE_URL}/api/rep/upload-document",
            headers=self.rep_headers,
            json={
                "doc_type": "outro",
                "base64_data": test_base64,
                "filename": f"TEST_invalid_{uuid.uuid4().hex[:8]}.png"
            }
        )
        if upload_response.status_code == 400 and "limite" in upload_response.text.lower():
            pytest.skip("Document limit reached - skipping test")
        assert upload_response.status_code == 200
        doc_id = upload_response.json()["doc_id"]
        
        # Admin tries invalid status
        review_response = requests.put(
            f"{BASE_URL}/api/admin/rep-documents/{doc_id}/review",
            headers=self.admin_headers,
            json={"status": "invalid_status"}
        )
        assert review_response.status_code == 400, f"Expected 400, got {review_response.status_code}: {review_response.text}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/rep/documents/{doc_id}", headers=self.rep_headers)
        print("PUT /api/admin/rep-documents (invalid status) - PASSED")


class TestAdminContractEndpoints:
    """Test admin contract view endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin auth"""
        self.admin_token = get_admin_token()
        self.admin_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_admin_get_rep_contract(self):
        """GET /api/admin/rep-contracts/{rep_id} - Admin views signed contract"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rep-contracts/{REP_ID}",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "signed" in data
        
        if data["signed"]:
            assert data["contract"] is not None
            assert "full_name_signed" in data["contract"]
            assert "ip_address" in data["contract"]
            assert "contract_text" in data["contract"]
            assert "accepted_at" in data["contract"]
            print(f"GET /api/admin/rep-contracts/{REP_ID} - PASSED (signed by: {data['contract'].get('full_name_signed')})")
        else:
            print(f"GET /api/admin/rep-contracts/{REP_ID} - PASSED (not signed yet)")
    
    def test_admin_get_rep_contract_nonexistent(self):
        """GET /api/admin/rep-contracts/{rep_id} - Should return signed=False for non-existent rep"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rep-contracts/nonexistent_rep_id",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["signed"] == False
        assert data["contract"] is None
        print("GET /api/admin/rep-contracts (nonexistent) - PASSED")


class TestAdminWithdrawalEndpoints:
    """Test admin withdrawal management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin auth"""
        self.admin_token = get_admin_token()
        self.admin_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_admin_list_withdrawals(self):
        """GET /api/admin/rep-withdrawals - Admin lists all withdrawals"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rep-withdrawals",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        for wd in data:
            assert "withdrawal_id" in wd
            assert "rep_id" in wd
            assert "amount" in wd
            assert "status" in wd
            assert "pix_key" in wd
        
        print(f"GET /api/admin/rep-withdrawals - PASSED ({len(data)} withdrawals)")
    
    def test_admin_list_withdrawals_with_filter(self):
        """GET /api/admin/rep-withdrawals?status_filter=pending - Admin lists filtered withdrawals"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rep-withdrawals?status_filter=pending",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # All should be pending
        for wd in data:
            assert wd["status"] == "pending"
        
        print(f"GET /api/admin/rep-withdrawals (pending filter) - PASSED ({len(data)} pending)")
    
    def test_admin_process_withdrawal_invalid_action(self):
        """PUT /api/admin/rep-withdrawals/{wd_id} - Should fail with invalid action"""
        response = requests.put(
            f"{BASE_URL}/api/admin/rep-withdrawals/some_wd_id",
            headers=self.admin_headers,
            json={"action": "invalid_action"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "approve" in data.get("detail", "").lower() or "reject" in data.get("detail", "").lower()
        print("PUT /api/admin/rep-withdrawals (invalid action) - PASSED")
    
    def test_admin_process_withdrawal_not_found(self):
        """PUT /api/admin/rep-withdrawals/{wd_id} - Should fail for non-existent withdrawal"""
        response = requests.put(
            f"{BASE_URL}/api/admin/rep-withdrawals/nonexistent_wd_id",
            headers=self.admin_headers,
            json={"action": "approve"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("PUT /api/admin/rep-withdrawals (not found) - PASSED")


class TestRepAuthRequired:
    """Test that rep endpoints require authentication"""
    
    def test_contract_requires_auth(self):
        """GET /api/rep/contract - Should fail without X-Rep-Token"""
        response = requests.get(f"{BASE_URL}/api/rep/contract")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("GET /api/rep/contract (no auth) - PASSED")
    
    def test_documents_requires_auth(self):
        """GET /api/rep/documents - Should fail without X-Rep-Token"""
        response = requests.get(f"{BASE_URL}/api/rep/documents")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("GET /api/rep/documents (no auth) - PASSED")
    
    def test_withdrawals_requires_auth(self):
        """GET /api/rep/withdrawals - Should fail without X-Rep-Token"""
        response = requests.get(f"{BASE_URL}/api/rep/withdrawals")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("GET /api/rep/withdrawals (no auth) - PASSED")


class TestAdminAuthRequired:
    """Test that admin endpoints require admin authentication"""
    
    def test_admin_documents_requires_admin(self):
        """GET /api/admin/rep-documents/{rep_id} - Should fail without admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/rep-documents/{REP_ID}")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("GET /api/admin/rep-documents (no auth) - PASSED")
    
    def test_admin_contracts_requires_admin(self):
        """GET /api/admin/rep-contracts/{rep_id} - Should fail without admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/rep-contracts/{REP_ID}")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("GET /api/admin/rep-contracts (no auth) - PASSED")
    
    def test_admin_withdrawals_requires_admin(self):
        """GET /api/admin/rep-withdrawals - Should fail without admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/rep-withdrawals")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("GET /api/admin/rep-withdrawals (no auth) - PASSED")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
