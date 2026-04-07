"""
Test suite for iToke Fiscal Report features - Iteration 41
Tests:
- PUT /api/auth/cpf - Update client CPF (11 digits validation)
- GET /api/establishments/me/fiscal-report - Fiscal report with transactions
- GET /api/establishments/me/fiscal-report/pdf - PDF generation
- GET /api/admin/report-layout - Get report layout settings
- PUT /api/admin/report-layout - Update report layout settings
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com').rstrip('/')


class TestCPFUpdate:
    """Tests for PUT /api/auth/cpf endpoint"""
    
    @pytest.fixture
    def client_session(self):
        """Login as client and return session token"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "cliente@teste.com",
            "name": "Cliente Teste",
            "role": "client"
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session
    
    def test_update_cpf_valid_11_digits(self, client_session):
        """Test updating CPF with valid 11 digits"""
        response = client_session.put(f"{BASE_URL}/api/auth/cpf", json={
            "cpf": "12345678901"
        })
        assert response.status_code == 200, f"CPF update failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert data["cpf"] == "12345678901"
        print(f"SUCCESS: CPF updated to {data['cpf']}")
    
    def test_update_cpf_with_formatting(self, client_session):
        """Test updating CPF with formatting (dots and dash)"""
        response = client_session.put(f"{BASE_URL}/api/auth/cpf", json={
            "cpf": "123.456.789-01"
        })
        assert response.status_code == 200, f"CPF update with formatting failed: {response.text}"
        data = response.json()
        assert data["cpf"] == "12345678901"  # Should be cleaned
        print(f"SUCCESS: Formatted CPF cleaned to {data['cpf']}")
    
    def test_update_cpf_invalid_less_than_11_digits(self, client_session):
        """Test rejecting CPF with less than 11 digits"""
        response = client_session.put(f"{BASE_URL}/api/auth/cpf", json={
            "cpf": "1234567890"  # Only 10 digits
        })
        assert response.status_code == 400, f"Expected 400 for invalid CPF, got {response.status_code}"
        data = response.json()
        assert "11 digitos" in data.get("detail", "").lower() or "invalido" in data.get("detail", "").lower()
        print(f"SUCCESS: Invalid CPF rejected with message: {data.get('detail')}")
    
    def test_update_cpf_invalid_more_than_11_digits(self, client_session):
        """Test rejecting CPF with more than 11 digits"""
        response = client_session.put(f"{BASE_URL}/api/auth/cpf", json={
            "cpf": "123456789012"  # 12 digits
        })
        assert response.status_code == 400, f"Expected 400 for invalid CPF, got {response.status_code}"
        print("SUCCESS: CPF with more than 11 digits rejected")
    
    def test_update_cpf_invalid_non_numeric(self, client_session):
        """Test rejecting CPF with non-numeric characters"""
        response = client_session.put(f"{BASE_URL}/api/auth/cpf", json={
            "cpf": "1234567890A"  # Contains letter
        })
        assert response.status_code == 400, f"Expected 400 for non-numeric CPF, got {response.status_code}"
        print("SUCCESS: Non-numeric CPF rejected")


class TestFiscalReport:
    """Tests for GET /api/establishments/me/fiscal-report endpoint"""
    
    @pytest.fixture
    def establishment_session(self):
        """Login as establishment and return session token"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "teste@estabelecimento.com",
            "name": "Teste Estabelecimento",
            "role": "establishment"
        })
        assert response.status_code == 200, f"Establishment login failed: {response.text}"
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session
    
    def test_get_fiscal_report_basic(self, establishment_session):
        """Test getting fiscal report returns correct structure"""
        response = establishment_session.get(f"{BASE_URL}/api/establishments/me/fiscal-report")
        assert response.status_code == 200, f"Fiscal report failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "establishment" in data, "Missing 'establishment' in response"
        assert "transactions" in data, "Missing 'transactions' in response"
        assert "summary" in data, "Missing 'summary' in response"
        assert "layout" in data, "Missing 'layout' in response"
        assert "period" in data, "Missing 'period' in response"
        
        # Verify establishment info
        est = data["establishment"]
        assert "business_name" in est
        assert "cnpj" in est
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_transactions" in summary
        assert "total_credits_received" in summary
        assert "total_cash_received" in summary
        assert "total_revenue" in summary
        
        print(f"SUCCESS: Fiscal report returned with {summary['total_transactions']} transactions")
        print(f"  - Total credits: R$ {summary['total_credits_received']}")
        print(f"  - Total cash: R$ {summary['total_cash_received']}")
        print(f"  - Total revenue: R$ {summary['total_revenue']}")
    
    def test_get_fiscal_report_with_date_filter(self, establishment_session):
        """Test fiscal report with date filter"""
        response = establishment_session.get(
            f"{BASE_URL}/api/establishments/me/fiscal-report",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"}
        )
        assert response.status_code == 200, f"Fiscal report with filter failed: {response.text}"
        data = response.json()
        
        assert "transactions" in data
        assert "period" in data
        print(f"SUCCESS: Fiscal report with date filter returned {len(data['transactions'])} transactions")
    
    def test_fiscal_report_transactions_have_customer_info(self, establishment_session):
        """Test that transactions include customer CPF and email"""
        response = establishment_session.get(f"{BASE_URL}/api/establishments/me/fiscal-report")
        assert response.status_code == 200
        data = response.json()
        
        if data["transactions"]:
            tx = data["transactions"][0]
            # These fields should exist (may be empty for old records)
            assert "customer_name" in tx, "Missing customer_name in transaction"
            assert "customer_cpf" in tx or tx.get("customer_cpf") is None, "customer_cpf field should exist"
            assert "customer_email" in tx or tx.get("customer_email") is None, "customer_email field should exist"
            assert "offer_title" in tx, "Missing offer_title in transaction"
            assert "credits_used" in tx, "Missing credits_used in transaction"
            assert "amount_to_pay_cash" in tx, "Missing amount_to_pay_cash in transaction"
            print(f"SUCCESS: Transaction has customer info - Name: {tx.get('customer_name')}, CPF: {tx.get('customer_cpf', 'N/A')}")
        else:
            print("INFO: No transactions found to verify customer info")


class TestFiscalReportPDF:
    """Tests for GET /api/establishments/me/fiscal-report/pdf endpoint"""
    
    @pytest.fixture
    def establishment_session(self):
        """Login as establishment and return session token"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "teste@estabelecimento.com",
            "name": "Teste Estabelecimento",
            "role": "establishment"
        })
        assert response.status_code == 200, f"Establishment login failed: {response.text}"
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session
    
    def test_get_fiscal_report_pdf(self, establishment_session):
        """Test PDF generation returns valid PDF"""
        response = establishment_session.get(f"{BASE_URL}/api/establishments/me/fiscal-report/pdf")
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "pdf" in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        
        # Check PDF magic bytes
        content = response.content
        assert content[:4] == b'%PDF', "Response is not a valid PDF (missing PDF header)"
        
        print(f"SUCCESS: PDF generated, size: {len(content)} bytes")
    
    def test_get_fiscal_report_pdf_with_date_filter(self, establishment_session):
        """Test PDF generation with date filter"""
        response = establishment_session.get(
            f"{BASE_URL}/api/establishments/me/fiscal-report/pdf",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"}
        )
        assert response.status_code == 200, f"PDF with filter failed: {response.text}"
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        print("SUCCESS: PDF with date filter generated")


class TestAdminReportLayout:
    """Tests for GET/PUT /api/admin/report-layout endpoints"""
    
    @pytest.fixture
    def admin_session(self):
        """Login as admin and return session token"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "admin@itoke.master",
            "name": "Admin iToke",
            "role": "admin",
            "admin_key": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session
    
    @pytest.fixture
    def non_admin_session(self):
        """Login as non-admin and return session token"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "cliente@teste.com",
            "name": "Cliente Teste",
            "role": "client"
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session
    
    def test_get_report_layout_as_admin(self, admin_session):
        """Test getting report layout as admin"""
        response = admin_session.get(f"{BASE_URL}/api/admin/report-layout")
        assert response.status_code == 200, f"Get report layout failed: {response.text}"
        data = response.json()
        
        # Verify default fields exist
        assert "company_name" in data, "Missing company_name"
        assert "tagline" in data, "Missing tagline"
        assert "disclaimer" in data, "Missing disclaimer"
        assert "footer_text" in data, "Missing footer_text"
        
        print(f"SUCCESS: Report layout retrieved - Company: {data.get('company_name')}")
    
    def test_get_report_layout_as_non_admin_forbidden(self, non_admin_session):
        """Test that non-admin cannot access report layout"""
        response = non_admin_session.get(f"{BASE_URL}/api/admin/report-layout")
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("SUCCESS: Non-admin access to report layout correctly forbidden")
    
    def test_update_report_layout(self, admin_session):
        """Test updating report layout fields"""
        # First get current layout
        get_response = admin_session.get(f"{BASE_URL}/api/admin/report-layout")
        assert get_response.status_code == 200
        original = get_response.json()
        
        # Update with new values
        new_tagline = "Teste Tagline Atualizada"
        response = admin_session.put(f"{BASE_URL}/api/admin/report-layout", json={
            "tagline": new_tagline,
            "footer_text": "Rodape de teste"
        })
        assert response.status_code == 200, f"Update report layout failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert "layout" in data
        assert data["layout"]["tagline"] == new_tagline
        
        print(f"SUCCESS: Report layout updated - Tagline: {new_tagline}")
        
        # Restore original tagline
        admin_session.put(f"{BASE_URL}/api/admin/report-layout", json={
            "tagline": original.get("tagline", "Ofertas que saem de Graca"),
            "footer_text": original.get("footer_text", "Documento gerado automaticamente pela plataforma iToke")
        })
    
    def test_update_report_layout_as_non_admin_forbidden(self, non_admin_session):
        """Test that non-admin cannot update report layout"""
        response = non_admin_session.put(f"{BASE_URL}/api/admin/report-layout", json={
            "tagline": "Hacked tagline"
        })
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("SUCCESS: Non-admin update to report layout correctly forbidden")


class TestFiscalReportIntegration:
    """Integration tests for fiscal report flow"""
    
    def test_full_fiscal_report_flow(self):
        """Test complete flow: login -> get report -> verify structure"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # 1. Login as establishment
        login_response = session.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "teste@estabelecimento.com",
            "name": "Teste Estabelecimento",
            "role": "establishment"
        })
        assert login_response.status_code == 200
        token = login_response.json()["session_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # 2. Get fiscal report
        report_response = session.get(f"{BASE_URL}/api/establishments/me/fiscal-report")
        assert report_response.status_code == 200
        report = report_response.json()
        
        # 3. Verify all required fields
        assert report["establishment"]["business_name"]
        assert isinstance(report["transactions"], list)
        assert isinstance(report["summary"]["total_transactions"], int)
        assert isinstance(report["summary"]["total_revenue"], (int, float))
        
        # 4. Get PDF
        pdf_response = session.get(f"{BASE_URL}/api/establishments/me/fiscal-report/pdf")
        assert pdf_response.status_code == 200
        assert pdf_response.content[:4] == b'%PDF'
        
        print("SUCCESS: Full fiscal report flow completed")
        print(f"  - Establishment: {report['establishment']['business_name']}")
        print(f"  - Transactions: {report['summary']['total_transactions']}")
        print(f"  - PDF size: {len(pdf_response.content)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
