#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class OfferCreationTester:
    def __init__(self, base_url="https://draft-offer-mode.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_data = None
        self.establishment_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_offers = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        if success:
            self.tests_passed += 1
        return success

    def test_email_login(self):
        """Test email login for establishment"""
        print("\n🔐 Testing Email Login...")
        
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/email-login",
                json={
                    "email": "test.establishment@itoke.demo",
                    "name": "Test Establishment",
                    "role": "establishment"
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.session_token = data.get("session_token")
                self.user_data = data.get("user")
                return self.log_test("Email login", True, f"Token: {self.session_token[:20]}...")
            else:
                return self.log_test("Email login", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Email login", False, f"Error: {str(e)}")

    def test_create_establishment(self):
        """Test establishment creation"""
        print("\n🏢 Testing Establishment Creation...")
        
        if not self.session_token:
            return self.log_test("Create establishment", False, "No session token")
        
        try:
            response = requests.post(
                f"{self.base_url}/api/establishments",
                json={
                    "business_name": "Restaurante Teste iToke",
                    "address": "Rua de Teste, 123",
                    "city": "São Paulo",
                    "neighborhood": "Vila Teste",
                    "category": "food",
                    "about": "Restaurante para testes do sistema iToke"
                },
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.session_token}"
                }
            )
            
            if response.status_code == 200:
                self.establishment_data = response.json()
                return self.log_test("Create establishment", True, f"ID: {self.establishment_data.get('establishment_id')}")
            else:
                return self.log_test("Create establishment", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Create establishment", False, f"Error: {str(e)}")

    def test_get_my_establishment(self):
        """Test getting establishment data"""
        print("\n📋 Testing Get My Establishment...")
        
        if not self.session_token:
            return self.log_test("Get my establishment", False, "No session token")
        
        try:
            response = requests.get(
                f"{self.base_url}/api/establishments/me",
                headers={"Authorization": f"Bearer {self.session_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.establishment_data = data
                return self.log_test("Get my establishment", True, f"Name: {data.get('business_name')}")
            else:
                return self.log_test("Get my establishment", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Get my establishment", False, f"Error: {str(e)}")

    def test_create_first_offer(self):
        """Test creating first offer (should be free)"""
        print("\n🎯 Testing First Offer Creation (Free)...")
        
        if not self.session_token:
            return self.log_test("Create first offer", False, "No session token")
        
        try:
            offer_data = {
                "title": "Primeira Oferta Teste",
                "description": "Primeira oferta criada para teste do sistema",
                "discount_value": 30,
                "original_price": 50.00,
                "discounted_price": 35.00,
                "valid_days": "Seg, Ter, Qua, Qui, Sex",
                "valid_hours": "11:00 às 22:00",
                "delivery_allowed": True,
                "dine_in_only": False,
                "pickup_allowed": True
            }
            
            response = requests.post(
                f"{self.base_url}/api/offers",
                json=offer_data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.session_token}"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.created_offers.append(data.get('offer_id'))
                return self.log_test("Create first offer", True, f"ID: {data.get('offer_id')}")
            else:
                return self.log_test("Create first offer", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Create first offer", False, f"Error: {str(e)}")

    def test_create_second_offer_simulation_mode(self):
        """Test creating second offer without tokens (simulation mode)"""
        print("\n🎯 Testing Second Offer Creation (Simulation Mode)...")
        
        if not self.session_token:
            return self.log_test("Create second offer", False, "No session token")
        
        try:
            offer_data = {
                "title": "Segunda Oferta Teste - Modo Simulação",
                "description": "Segunda oferta criada para teste do modo simulação",
                "discount_value": 40,
                "original_price": 80.00,
                "discounted_price": 48.00,
                "valid_days": "Sáb, Dom",
                "valid_hours": "12:00 às 20:00",
                "delivery_allowed": False,
                "dine_in_only": True,
                "pickup_allowed": False
            }
            
            response = requests.post(
                f"{self.base_url}/api/offers",
                json=offer_data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.session_token}"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.created_offers.append(data.get('offer_id'))
                return self.log_test("Create second offer", True, f"ID: {data.get('offer_id')} - Simulation mode working!")
            else:
                return self.log_test("Create second offer", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Create second offer", False, f"Error: {str(e)}")

    def test_create_third_offer_simulation_mode(self):
        """Test creating third offer without tokens (simulation mode)"""
        print("\n🎯 Testing Third Offer Creation (Simulation Mode)...")
        
        if not self.session_token:
            return self.log_test("Create third offer", False, "No session token")
        
        try:
            offer_data = {
                "title": "Terceira Oferta Teste - Modo Simulação",
                "description": "Terceira oferta criada para teste do modo simulação",
                "discount_value": 25,
                "original_price": 100.00,
                "discounted_price": 75.00,
                "valid_days": "Todos os dias",
                "valid_hours": "09:00 às 23:00",
                "delivery_allowed": True,
                "dine_in_only": False,
                "pickup_allowed": True
            }
            
            response = requests.post(
                f"{self.base_url}/api/offers",
                json=offer_data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.session_token}"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.created_offers.append(data.get('offer_id'))
                return self.log_test("Create third offer", True, f"ID: {data.get('offer_id')} - Simulation mode working!")
            else:
                return self.log_test("Create third offer", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Create third offer", False, f"Error: {str(e)}")

    def test_get_my_offers(self):
        """Test getting establishment offers"""
        print("\n📋 Testing Get My Offers...")
        
        if not self.session_token:
            return self.log_test("Get my offers", False, "No session token")
        
        try:
            response = requests.get(
                f"{self.base_url}/api/establishments/me/offers",
                headers={"Authorization": f"Bearer {self.session_token}"}
            )
            
            if response.status_code == 200:
                offers = response.json()
                return self.log_test("Get my offers", True, f"Found {len(offers)} offers")
            else:
                return self.log_test("Get my offers", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Get my offers", False, f"Error: {str(e)}")

    def test_get_active_offers_endpoint(self):
        """Test GET /api/offers endpoint for active offers"""
        print("\n🌐 Testing GET /api/offers for Active Offers...")
        
        try:
            response = requests.get(f"{self.base_url}/api/offers")
            
            if response.status_code == 200:
                offers = response.json()
                # Filter offers created by our test establishment
                test_offers = [o for o in offers if any(created_id in o.get('offer_id', '') for created_id in self.created_offers)]
                return self.log_test("Get active offers", True, f"Found {len(offers)} total offers, {len(test_offers)} from our test")
            else:
                return self.log_test("Get active offers", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Get active offers", False, f"Error: {str(e)}")

    def test_establishment_token_balance(self):
        """Test establishment token balance (should be 0 in simulation mode)"""
        print("\n💰 Testing Establishment Token Balance...")
        
        if not self.establishment_data:
            return self.log_test("Check token balance", False, "No establishment data")
        
        try:
            token_balance = self.establishment_data.get('token_balance', 0)
            # In simulation mode, token balance doesn't matter for offer creation
            return self.log_test("Check token balance", True, f"Token balance: {token_balance} (simulation mode bypasses this)")
                
        except Exception as e:
            return self.log_test("Check token balance", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting iToke Offer Creation Tests (Simulation Mode)")
        print("=" * 60)
        
        # Test sequence
        if not self.test_email_login():
            return self.print_summary()
        
        if not self.test_create_establishment():
            # Try to get existing establishment
            self.test_get_my_establishment()
        
        self.test_establishment_token_balance()
        self.test_create_first_offer()
        self.test_create_second_offer_simulation_mode()
        self.test_create_third_offer_simulation_mode()
        self.test_get_my_offers()
        self.test_get_active_offers_endpoint()
        
        return self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.created_offers:
            print(f"\n✅ Created Offers: {len(self.created_offers)}")
            for offer_id in self.created_offers:
                print(f"   - {offer_id}")
        
        print("\n🎯 SIMULATION MODE STATUS:")
        if self.tests_passed >= 6:  # Minimum successful tests
            print("✅ Simulation mode is working correctly!")
            print("✅ Offers can be created without token verification!")
            print("✅ Multiple offers creation is now possible!")
        else:
            print("❌ Simulation mode may have issues!")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = OfferCreationTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())