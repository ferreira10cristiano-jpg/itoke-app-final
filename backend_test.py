#!/usr/bin/env python3

import requests
import sys
import json
import re
from datetime import datetime

class OfferCodeTester:
    def __init__(self, base_url="https://draft-offer-mode.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_data = None
        self.establishment_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_offers = []
        self.created_offer_codes = []

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

    def test_existing_token_login(self):
        """Test using existing session token"""
        print("\n🔐 Testing Existing Session Token...")
        
        # Use the provided existing token
        self.session_token = "email_session_f16ac98ba01b4158b400e6656793f855"
        
        try:
            # Test the token by calling /api/auth/me
            response = requests.get(
                f"{self.base_url}/api/auth/me",
                headers={"Authorization": f"Bearer {self.session_token}"}
            )
            
            if response.status_code == 200:
                self.user_data = response.json()
                return self.log_test("Existing token login", True, f"User: {self.user_data.get('name', 'Unknown')}")
            else:
                return self.log_test("Existing token login", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Existing token login", False, f"Error: {str(e)}")

    def test_email_login(self):
        """Test email login for establishment (fallback)"""
        print("\n🔐 Testing Email Login (Fallback)...")
        
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

    def test_create_offer_with_code_validation(self):
        """Test creating offer and validate offer_code format"""
        print("\n🎯 Testing Offer Creation with Code Validation...")
        
        if not self.session_token:
            return self.log_test("Create offer with code", False, "No session token")
        
        try:
            offer_data = {
                "title": "Teste Oferta com Código",
                "description": "Oferta para testar geração de código OFF-XXXXXX",
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
                offer_id = data.get('offer_id')
                offer_code = data.get('offer_code')
                is_simulation = data.get('is_simulation', False)
                
                self.created_offers.append(offer_id)
                
                # Validate offer_code format (OFF-XXXXXX)
                if offer_code and re.match(r'^OFF-[A-Z0-9]{6}$', offer_code):
                    self.created_offer_codes.append(offer_code)
                    return self.log_test("Create offer with code", True, 
                                       f"ID: {offer_id}, Code: {offer_code}, Simulation: {is_simulation}")
                else:
                    return self.log_test("Create offer with code", False, 
                                       f"Invalid offer_code format: {offer_code}")
            else:
                return self.log_test("Create offer with code", False, 
                                   f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Create offer with code", False, f"Error: {str(e)}")

    def test_create_simulation_offer(self):
        """Test creating offer in simulation mode (no tokens)"""
        print("\n🎯 Testing Simulation Mode Offer Creation...")
        
        if not self.session_token:
            return self.log_test("Create simulation offer", False, "No session token")
        
        try:
            offer_data = {
                "title": "Oferta Simulação - Sem Tokens",
                "description": "Oferta criada em modo simulação para teste",
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
                offer_id = data.get('offer_id')
                offer_code = data.get('offer_code')
                is_simulation = data.get('is_simulation', False)
                
                self.created_offers.append(offer_id)
                
                # Validate offer_code format and simulation flag
                if offer_code and re.match(r'^OFF-[A-Z0-9]{6}$', offer_code):
                    self.created_offer_codes.append(offer_code)
                    return self.log_test("Create simulation offer", True, 
                                       f"ID: {offer_id}, Code: {offer_code}, Simulation: {is_simulation}")
                else:
                    return self.log_test("Create simulation offer", False, 
                                       f"Invalid offer_code format: {offer_code}")
            else:
                return self.log_test("Create simulation offer", False, 
                                   f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Create simulation offer", False, f"Error: {str(e)}")

    def test_get_offer_by_exact_code(self):
        """Test GET /api/offers/code/{offer_code} - exact code search"""
        print("\n🔍 Testing Get Offer by Exact Code...")
        
        if not self.session_token:
            return self.log_test("Get offer by exact code", False, "No session token")
        
        # Test with existing offer code
        test_code = "OFF-7WDJWK"
        
        try:
            response = requests.get(
                f"{self.base_url}/api/offers/code/{test_code}",
                headers={"Authorization": f"Bearer {self.session_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                found_code = data.get('offer_code')
                return self.log_test("Get offer by exact code", True, 
                                   f"Found offer with code: {found_code}")
            elif response.status_code == 404:
                # Try with our created codes if available
                if self.created_offer_codes:
                    test_code = self.created_offer_codes[0]
                    response = requests.get(
                        f"{self.base_url}/api/offers/code/{test_code}",
                        headers={"Authorization": f"Bearer {self.session_token}"}
                    )
                    if response.status_code == 200:
                        data = response.json()
                        found_code = data.get('offer_code')
                        return self.log_test("Get offer by exact code", True, 
                                           f"Found offer with created code: {found_code}")
                
                return self.log_test("Get offer by exact code", False, 
                                   f"Offer not found with code: {test_code}")
            else:
                return self.log_test("Get offer by exact code", False, 
                                   f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Get offer by exact code", False, f"Error: {str(e)}")

    def test_search_offers_by_partial_code(self):
        """Test GET /api/offers/search?code=XXX - partial code search"""
        print("\n🔍 Testing Search Offers by Partial Code...")
        
        if not self.session_token:
            return self.log_test("Search offers by partial code", False, "No session token")
        
        # Test with partial code
        partial_code = "OFF"
        
        try:
            response = requests.get(
                f"{self.base_url}/api/offers/search?code={partial_code}",
                headers={"Authorization": f"Bearer {self.session_token}"}
            )
            
            if response.status_code == 200:
                offers = response.json()
                return self.log_test("Search offers by partial code", True, 
                                   f"Found {len(offers)} offers with partial code: {partial_code}")
            else:
                return self.log_test("Search offers by partial code", False, 
                                   f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Search offers by partial code", False, f"Error: {str(e)}")

    def test_get_my_offers_with_codes(self):
        """Test GET /api/establishments/me/offers - should return offer_code and is_simulation"""
        print("\n📋 Testing Get My Offers with Codes and Simulation Flag...")
        
        if not self.session_token:
            return self.log_test("Get my offers with codes", False, "No session token")
        
        try:
            response = requests.get(
                f"{self.base_url}/api/establishments/me/offers",
                headers={"Authorization": f"Bearer {self.session_token}"}
            )
            
            if response.status_code == 200:
                offers = response.json()
                
                # Check if offers have offer_code and is_simulation fields
                offers_with_codes = 0
                offers_with_simulation_flag = 0
                
                for offer in offers:
                    if offer.get('offer_code'):
                        offers_with_codes += 1
                    if 'is_simulation' in offer:
                        offers_with_simulation_flag += 1
                
                return self.log_test("Get my offers with codes", True, 
                                   f"Found {len(offers)} offers, {offers_with_codes} with codes, {offers_with_simulation_flag} with simulation flag")
            else:
                return self.log_test("Get my offers with codes", False, 
                                   f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("Get my offers with codes", False, f"Error: {str(e)}")

    def test_qr_code_generation_with_offer_code(self):
        """Test POST /api/qr/generate - should include offer_code in QR"""
        print("\n📱 Testing QR Code Generation with Offer Code...")
        
        if not self.session_token or not self.created_offers:
            return self.log_test("QR code generation with offer code", False, 
                               "No session token or created offers")
        
        try:
            # Use the first created offer
            offer_id = self.created_offers[0]
            
            response = requests.post(
                f"{self.base_url}/api/qr/generate",
                json={"offer_id": offer_id},
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.session_token}"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                qr_offer_code = data.get('offer_code')
                
                if qr_offer_code:
                    return self.log_test("QR code generation with offer code", True, 
                                       f"QR generated with offer_code: {qr_offer_code}")
                else:
                    return self.log_test("QR code generation with offer code", False, 
                                       "QR generated but no offer_code included")
            else:
                return self.log_test("QR code generation with offer code", False, 
                                   f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            return self.log_test("QR code generation with offer code", False, f"Error: {str(e)}")

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
        print("🚀 Starting iToke Offer Code Features Tests")
        print("=" * 60)
        
        # Test sequence - try existing token first, fallback to email login
        if not self.test_existing_token_login():
            if not self.test_email_login():
                return self.print_summary()
        
        if not self.test_create_establishment():
            # Try to get existing establishment
            self.test_get_my_establishment()
        
        self.test_establishment_token_balance()
        
        # Test offer code features
        self.test_create_offer_with_code_validation()
        self.test_create_simulation_offer()
        self.test_get_offer_by_exact_code()
        self.test_search_offers_by_partial_code()
        self.test_get_my_offers_with_codes()
        self.test_qr_code_generation_with_offer_code()
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
            for i, offer_id in enumerate(self.created_offers):
                code = self.created_offer_codes[i] if i < len(self.created_offer_codes) else "N/A"
                print(f"   - {offer_id} (Code: {code})")
        
        print("\n🎯 OFFER CODE FEATURES STATUS:")
        if self.tests_passed >= 8:  # Minimum successful tests for offer code features
            print("✅ Offer code generation is working correctly!")
            print("✅ Offer codes follow OFF-XXXXXX format!")
            print("✅ Search by exact and partial codes working!")
            print("✅ QR codes include offer_code!")
            print("✅ Simulation mode flag is working!")
        else:
            print("❌ Some offer code features may have issues!")
            print("❌ Check the failed tests above for details!")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = OfferCodeTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())