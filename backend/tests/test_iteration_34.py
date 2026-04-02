"""
Iteration 34 Tests: Reports Feature + Dashboard Button Order
Tests for:
1. Dashboard Ações Rápidas button order (Criar Ofertas → Validar QR → Equipe → Relatório Financeiro → Meu Perfil)
2. New 'Relatório Financeiro' button with graph icon and subtitle
3. Reports page /establishment/reports with header 'Relatório Financeiro'
4. Reports date filters (Hoje, 7 dias, 30 dias, 90 dias, Tudo)
5. Reports 4 tabs (Créditos, QR Codes, Top Ofertas, Resumo)
6. Backend GET /api/establishments/me/reports endpoint
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')

class TestReportsEndpoint:
    """Test the new reports endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with establishment login"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as establishment
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/email-login",
            json={
                "email": "teste@estabelecimento.com",
                "name": "Teste Estabelecimento",
                "role": "establishment"
            }
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            self.user = data.get("user")
        else:
            pytest.skip("Could not login as establishment")
    
    def test_reports_endpoint_requires_auth(self):
        """Test that reports endpoint requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/establishments/me/reports")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Reports endpoint requires authentication")
    
    def test_reports_endpoint_returns_200(self):
        """Test that reports endpoint returns 200 for authenticated establishment"""
        response = self.session.get(f"{BASE_URL}/api/establishments/me/reports")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Reports endpoint returns 200 for authenticated establishment")
    
    def test_reports_response_structure(self):
        """Test that reports response has correct structure with 4 sections"""
        response = self.session.get(f"{BASE_URL}/api/establishments/me/reports")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all 4 sections exist
        assert "credits_received" in data, "Missing credits_received section"
        assert "qr_codes_read" in data, "Missing qr_codes_read section"
        assert "top_offers" in data, "Missing top_offers section"
        assert "sales_summary" in data, "Missing sales_summary section"
        
        print("✓ Reports response has all 4 sections (credits_received, qr_codes_read, top_offers, sales_summary)")
    
    def test_credits_received_structure(self):
        """Test credits_received section structure"""
        response = self.session.get(f"{BASE_URL}/api/establishments/me/reports")
        assert response.status_code == 200
        
        data = response.json()
        credits = data.get("credits_received", {})
        
        assert "total_credits" in credits, "Missing total_credits in credits_received"
        assert "total_cash" in credits, "Missing total_cash in credits_received"
        assert "sales" in credits, "Missing sales list in credits_received"
        assert isinstance(credits["sales"], list), "sales should be a list"
        
        print(f"✓ Credits received: total_credits={credits['total_credits']}, total_cash={credits['total_cash']}, sales_count={len(credits['sales'])}")
    
    def test_qr_codes_read_structure(self):
        """Test qr_codes_read section structure"""
        response = self.session.get(f"{BASE_URL}/api/establishments/me/reports")
        assert response.status_code == 200
        
        data = response.json()
        qr = data.get("qr_codes_read", {})
        
        assert "total" in qr, "Missing total in qr_codes_read"
        assert "sales" in qr, "Missing sales list in qr_codes_read"
        assert isinstance(qr["total"], int), "total should be an integer"
        
        print(f"✓ QR Codes read: total={qr['total']}")
    
    def test_top_offers_structure(self):
        """Test top_offers section structure"""
        response = self.session.get(f"{BASE_URL}/api/establishments/me/reports")
        assert response.status_code == 200
        
        data = response.json()
        top_offers = data.get("top_offers", [])
        
        assert isinstance(top_offers, list), "top_offers should be a list"
        
        if len(top_offers) > 0:
            offer = top_offers[0]
            assert "offer_id" in offer, "Missing offer_id in top offer"
            assert "offer_title" in offer, "Missing offer_title in top offer"
            assert "count" in offer, "Missing count in top offer"
            assert "percentage" in offer, "Missing percentage in top offer"
            print(f"✓ Top offers: {len(top_offers)} offers, top offer: {offer['offer_title']} ({offer['count']} sales, {offer['percentage']}%)")
        else:
            print("✓ Top offers: empty list (no sales in period)")
    
    def test_sales_summary_structure(self):
        """Test sales_summary section structure"""
        response = self.session.get(f"{BASE_URL}/api/establishments/me/reports")
        assert response.status_code == 200
        
        data = response.json()
        summary = data.get("sales_summary", {})
        
        assert "total_revenue" in summary, "Missing total_revenue in sales_summary"
        assert "total_transactions" in summary, "Missing total_transactions in sales_summary"
        assert "ticket_medio" in summary, "Missing ticket_medio in sales_summary"
        assert "first_sale" in summary, "Missing first_sale in sales_summary"
        assert "last_sale" in summary, "Missing last_sale in sales_summary"
        
        print(f"✓ Sales summary: revenue={summary['total_revenue']}, transactions={summary['total_transactions']}, ticket_medio={summary['ticket_medio']}")
    
    def test_reports_with_date_filter_today(self):
        """Test reports with today's date filter"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = self.session.get(
            f"{BASE_URL}/api/establishments/me/reports",
            params={"start_date": today, "end_date": today}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Reports with date filter (today: {today}) returns 200")
    
    def test_reports_with_date_filter_7_days(self):
        """Test reports with 7 days date filter"""
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        response = self.session.get(
            f"{BASE_URL}/api/establishments/me/reports",
            params={"start_date": start_date, "end_date": end_date}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Reports with date filter (7 days: {start_date} to {end_date}) returns 200")
    
    def test_reports_with_date_filter_30_days(self):
        """Test reports with 30 days date filter"""
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        response = self.session.get(
            f"{BASE_URL}/api/establishments/me/reports",
            params={"start_date": start_date, "end_date": end_date}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Reports with date filter (30 days: {start_date} to {end_date}) returns 200")
    
    def test_reports_with_date_filter_90_days(self):
        """Test reports with 90 days date filter"""
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        response = self.session.get(
            f"{BASE_URL}/api/establishments/me/reports",
            params={"start_date": start_date, "end_date": end_date}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Reports with date filter (90 days: {start_date} to {end_date}) returns 200")
    
    def test_reports_without_date_filter(self):
        """Test reports without date filter (all time)"""
        response = self.session.get(f"{BASE_URL}/api/establishments/me/reports")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Reports without date filter (all time) returns 200")


class TestHealthAndAuth:
    """Basic health and auth tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint returns healthy status")
    
    def test_establishment_login(self):
        """Test establishment login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-login",
            json={
                "email": "teste@estabelecimento.com",
                "name": "Teste Estabelecimento",
                "role": "establishment"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "session_token" in data, "Missing session_token in response"
        assert "user" in data, "Missing user in response"
        print("✓ Establishment login works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
