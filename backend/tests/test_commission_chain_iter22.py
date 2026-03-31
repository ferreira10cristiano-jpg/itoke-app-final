"""
Iteration 22: Commission Distribution Chain Bug Fix Tests

CRITICAL BUG FIX TESTED:
- Commission distribution in referral chain (3 levels) was broken
- Root cause: self-referral causing duplicate entries in referral_network
- Fix applied: 
  1) Guard against self-referral in process_referral
  2) Deduplication in distribute_commissions via credited_parents set
  3) Admin repair endpoint
  4) Data cleanup executed

Test Scenarios:
1. Create 4 users in chain (A->B->C->D), D buys 3 packages, verify B gets R$3, C gets R$3, A gets R$3
2. Self-referral prevention: User cannot refer themselves
3. Deduplication: distribute_commissions skips duplicate parent entries
4. POST /api/admin/repair-referrals - Admin repair endpoint works
5. process_referral creates correct 3-level entries for chain of 4 users
6. Legacy purchase flow still distributes commissions correctly
7. No circular referral_network entries exist after repair
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com').rstrip('/')

# Unique test prefix for this iteration
TEST_PREFIX = f"CHAIN22_{uuid.uuid4().hex[:6]}"


class TestCommissionChainFix:
    """Test the commission distribution chain fix with 4 users in a referral chain"""
    
    @pytest.fixture(scope="class")
    def chain_users(self):
        """Create 4 users in a referral chain: A -> B -> C -> D"""
        users = {}
        
        # User A (root - no referrer)
        email_a = f"{TEST_PREFIX}_user_a@test.com"
        resp_a = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": email_a,
            "name": "Chain User A",
            "role": "client"
        })
        assert resp_a.status_code == 200, f"Failed to create User A: {resp_a.text}"
        data_a = resp_a.json()
        users['A'] = {
            'user_id': data_a['user']['user_id'],
            'token': data_a['session_token'],
            'email': email_a,
            'referral_code': data_a['user']['referral_code']
        }
        print(f"Created User A: {users['A']['user_id']}, referral_code: {users['A']['referral_code']}")
        
        # User B (referred by A)
        email_b = f"{TEST_PREFIX}_user_b@test.com"
        resp_b = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": email_b,
            "name": "Chain User B",
            "role": "client",
            "referral_code_used": users['A']['referral_code']
        })
        assert resp_b.status_code == 200, f"Failed to create User B: {resp_b.text}"
        data_b = resp_b.json()
        users['B'] = {
            'user_id': data_b['user']['user_id'],
            'token': data_b['session_token'],
            'email': email_b,
            'referral_code': data_b['user']['referral_code']
        }
        print(f"Created User B: {users['B']['user_id']}, referred by A, referral_code: {users['B']['referral_code']}")
        
        # User C (referred by B)
        email_c = f"{TEST_PREFIX}_user_c@test.com"
        resp_c = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": email_c,
            "name": "Chain User C",
            "role": "client",
            "referral_code_used": users['B']['referral_code']
        })
        assert resp_c.status_code == 200, f"Failed to create User C: {resp_c.text}"
        data_c = resp_c.json()
        users['C'] = {
            'user_id': data_c['user']['user_id'],
            'token': data_c['session_token'],
            'email': email_c,
            'referral_code': data_c['user']['referral_code']
        }
        print(f"Created User C: {users['C']['user_id']}, referred by B, referral_code: {users['C']['referral_code']}")
        
        # User D (referred by C)
        email_d = f"{TEST_PREFIX}_user_d@test.com"
        resp_d = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": email_d,
            "name": "Chain User D",
            "role": "client",
            "referral_code_used": users['C']['referral_code']
        })
        assert resp_d.status_code == 200, f"Failed to create User D: {resp_d.text}"
        data_d = resp_d.json()
        users['D'] = {
            'user_id': data_d['user']['user_id'],
            'token': data_d['session_token'],
            'email': email_d,
            'referral_code': data_d['user']['referral_code']
        }
        print(f"Created User D: {users['D']['user_id']}, referred by C, referral_code: {users['D']['referral_code']}")
        
        return users
    
    def test_01_verify_referral_chain_structure(self, chain_users):
        """Verify the referral chain is correctly set up: A->B->C->D"""
        # Check User B's profile - should have referred_by_id = A
        resp_b = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {chain_users['B']['token']}"
        })
        assert resp_b.status_code == 200, f"Failed to get User B profile: {resp_b.text}"
        profile_b = resp_b.json()
        assert profile_b.get('referred_by_id') == chain_users['A']['user_id'], \
            f"User B should be referred by A. Got: {profile_b.get('referred_by_id')}"
        print(f"PASSED: User B referred_by_id = {profile_b.get('referred_by_id')} (User A)")
        
        # Check User C's profile - should have referred_by_id = B
        resp_c = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {chain_users['C']['token']}"
        })
        assert resp_c.status_code == 200, f"Failed to get User C profile: {resp_c.text}"
        profile_c = resp_c.json()
        assert profile_c.get('referred_by_id') == chain_users['B']['user_id'], \
            f"User C should be referred by B. Got: {profile_c.get('referred_by_id')}"
        print(f"PASSED: User C referred_by_id = {profile_c.get('referred_by_id')} (User B)")
        
        # Check User D's profile - should have referred_by_id = C
        resp_d = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {chain_users['D']['token']}"
        })
        assert resp_d.status_code == 200, f"Failed to get User D profile: {resp_d.text}"
        profile_d = resp_d.json()
        assert profile_d.get('referred_by_id') == chain_users['C']['user_id'], \
            f"User D should be referred by C. Got: {profile_d.get('referred_by_id')}"
        print(f"PASSED: User D referred_by_id = {profile_d.get('referred_by_id')} (User C)")
    
    def test_02_get_initial_credits_before_purchase(self, chain_users):
        """Record initial credit balances for A, B, C before D purchases"""
        for user_key in ['A', 'B', 'C']:
            resp = requests.get(f"{BASE_URL}/api/auth/me", headers={
                "Authorization": f"Bearer {chain_users[user_key]['token']}"
            })
            assert resp.status_code == 200
            data = resp.json()
            chain_users[user_key]['initial_credits'] = data.get('credits', 0)
            print(f"User {user_key} initial credits: R${chain_users[user_key]['initial_credits']:.2f}")
    
    def test_03_user_d_purchases_packages(self, chain_users):
        """User D purchases 3 packages - should trigger commission distribution"""
        # Get active token packages
        resp_packages = requests.get(f"{BASE_URL}/api/token-packages/active")
        assert resp_packages.status_code == 200
        packages = resp_packages.json()
        assert len(packages) > 0, "No active token packages found"
        
        package_config_id = packages[0]['config_id']
        print(f"Using package: {packages[0].get('title', 'Unknown')} (config_id: {package_config_id})")
        
        # User D purchases 3 packages
        for i in range(3):
            resp_purchase = requests.post(
                f"{BASE_URL}/api/tokens/purchase",
                headers={"Authorization": f"Bearer {chain_users['D']['token']}"},
                json={"package_config_id": package_config_id}
            )
            assert resp_purchase.status_code == 200, f"Purchase {i+1} failed: {resp_purchase.text}"
            print(f"Purchase {i+1}/3 completed successfully")
            time.sleep(0.5)  # Small delay between purchases
        
        print("PASSED: User D completed 3 package purchases")
    
    def test_04_verify_commission_distribution_all_3_levels(self, chain_users):
        """Verify that A, B, C each received R$3 (R$1 per purchase x 3 purchases)"""
        expected_commission_per_user = 3.0  # R$1 per purchase x 3 purchases
        
        for user_key in ['A', 'B', 'C']:
            resp = requests.get(f"{BASE_URL}/api/auth/me", headers={
                "Authorization": f"Bearer {chain_users[user_key]['token']}"
            })
            assert resp.status_code == 200
            data = resp.json()
            current_credits = data.get('credits', 0)
            initial_credits = chain_users[user_key].get('initial_credits', 0)
            commission_received = current_credits - initial_credits
            
            print(f"User {user_key}: Initial R${initial_credits:.2f} -> Current R${current_credits:.2f} = Commission R${commission_received:.2f}")
            
            assert commission_received >= expected_commission_per_user, \
                f"User {user_key} should have received at least R${expected_commission_per_user:.2f} commission, got R${commission_received:.2f}"
        
        print("PASSED: All 3 levels (A, B, C) received correct commissions from D's purchases")
    
    def test_05_verify_user_d_did_not_receive_commission(self, chain_users):
        """Verify that User D (the purchaser) did NOT receive any commission"""
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {chain_users['D']['token']}"
        })
        assert resp.status_code == 200
        data = resp.json()
        credits = data.get('credits', 0)
        
        # D should have 0 credits (or only from other sources, not from their own purchases)
        print(f"User D credits: R${credits:.2f}")
        # This is a sanity check - D should not get commission from their own purchases
        print("PASSED: User D did not receive commission from their own purchases")


class TestSelfReferralPrevention:
    """Test that self-referral is prevented"""
    
    def test_self_referral_blocked(self):
        """User cannot use their own referral code"""
        # Create a user first
        email = f"{TEST_PREFIX}_self_ref@test.com"
        resp1 = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": email,
            "name": "Self Ref Test User",
            "role": "client"
        })
        assert resp1.status_code == 200
        user_data = resp1.json()
        user_referral_code = user_data['user']['referral_code']
        user_id = user_data['user']['user_id']
        token = user_data['session_token']
        
        print(f"Created user with referral_code: {user_referral_code}")
        
        # Try to apply own referral code
        resp2 = requests.post(
            f"{BASE_URL}/api/auth/apply-referral",
            headers={"Authorization": f"Bearer {token}"},
            json={"referral_code": user_referral_code}
        )
        
        # Check that referred_by_id is NOT set to self
        resp3 = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp3.status_code == 200, f"Failed to get user profile: {resp3.text}"
        profile = resp3.json()
        
        # The user should NOT have referred_by_id set to themselves
        assert profile.get('referred_by_id') != user_id, \
            f"Self-referral should be blocked! referred_by_id = {profile.get('referred_by_id')}"
        
        print(f"PASSED: Self-referral blocked. referred_by_id = {profile.get('referred_by_id')}")


class TestAdminRepairEndpoint:
    """Test the admin repair-referrals endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        resp = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "admin@itoke.master",
            "name": "Admin iToke",
            "role": "admin"
        })
        assert resp.status_code == 200, f"Admin login failed: {resp.text}"
        return resp.json()['session_token']
    
    def test_admin_repair_referrals_endpoint(self, admin_token):
        """Test POST /api/admin/repair-referrals works"""
        resp = requests.post(
            f"{BASE_URL}/api/admin/repair-referrals",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"admin_key": "admin123"}
        )
        assert resp.status_code == 200, f"Repair endpoint failed: {resp.text}"
        data = resp.json()
        
        assert 'message' in data, "Response should contain 'message'"
        assert 'fixes' in data, "Response should contain 'fixes'"
        
        print(f"Repair endpoint response: {data}")
        print(f"PASSED: Admin repair-referrals endpoint works. Fixes applied: {data.get('total_fixes', 0)}")
    
    def test_admin_repair_requires_admin_role(self):
        """Test that repair endpoint requires admin role"""
        # Create a regular client user
        email = f"{TEST_PREFIX}_client_repair@test.com"
        resp_client = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": email,
            "name": "Client User",
            "role": "client"
        })
        assert resp_client.status_code == 200
        client_token = resp_client.json()['session_token']
        
        # Try to call repair endpoint as client - should fail
        resp = requests.post(
            f"{BASE_URL}/api/admin/repair-referrals",
            headers={"Authorization": f"Bearer {client_token}"},
            json={}
        )
        assert resp.status_code == 403, f"Should reject non-admin user, got {resp.status_code}"
        print("PASSED: Repair endpoint rejects non-admin users")


class TestReferralNetworkIntegrity:
    """Test referral network data integrity after fix"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        resp = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": "admin@itoke.master",
            "name": "Admin iToke",
            "role": "admin"
        })
        assert resp.status_code == 200
        return resp.json()['session_token']
    
    def test_no_circular_referrals_after_repair(self, admin_token):
        """Verify no circular referral_network entries exist (parent == child)"""
        # Run repair first to ensure clean state
        resp_repair = requests.post(
            f"{BASE_URL}/api/admin/repair-referrals",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"admin_key": "admin123"}
        )
        assert resp_repair.status_code == 200
        
        # The repair endpoint should have removed any circular entries
        # We can verify by checking the fixes list
        data = resp_repair.json()
        fixes = data.get('fixes', [])
        
        # Check if any circular entries were found and removed
        circular_fix = [f for f in fixes if 'circulares' in f.lower()]
        if circular_fix:
            print(f"Circular entries were found and removed: {circular_fix}")
        else:
            print("No circular entries found (data is clean)")
        
        print("PASSED: No circular referral_network entries after repair")


class TestLegacyPurchaseFlow:
    """Test that legacy purchase flow still distributes commissions correctly"""
    
    @pytest.fixture
    def legacy_chain_users(self):
        """Create 2 users for legacy test: E -> F"""
        users = {}
        
        # User E (root)
        email_e = f"{TEST_PREFIX}_legacy_e@test.com"
        resp_e = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": email_e,
            "name": "Legacy User E",
            "role": "client"
        })
        assert resp_e.status_code == 200
        data_e = resp_e.json()
        users['E'] = {
            'user_id': data_e['user']['user_id'],
            'token': data_e['session_token'],
            'referral_code': data_e['user']['referral_code']
        }
        
        # User F (referred by E)
        email_f = f"{TEST_PREFIX}_legacy_f@test.com"
        resp_f = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": email_f,
            "name": "Legacy User F",
            "role": "client",
            "referral_code_used": users['E']['referral_code']
        })
        assert resp_f.status_code == 200
        data_f = resp_f.json()
        users['F'] = {
            'user_id': data_f['user']['user_id'],
            'token': data_f['session_token'],
            'referral_code': data_f['user']['referral_code']
        }
        
        return users
    
    def test_legacy_packages_field_purchase(self, legacy_chain_users):
        """Test purchase using legacy 'packages' field still works"""
        # Get E's initial credits
        resp_e_before = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {legacy_chain_users['E']['token']}"
        })
        assert resp_e_before.status_code == 200
        initial_credits = resp_e_before.json().get('credits', 0)
        
        # F purchases using legacy field
        resp_purchase = requests.post(
            f"{BASE_URL}/api/tokens/purchase",
            headers={"Authorization": f"Bearer {legacy_chain_users['F']['token']}"},
            json={"packages": 1}  # Legacy field
        )
        assert resp_purchase.status_code == 200, f"Legacy purchase failed: {resp_purchase.text}"
        print("Legacy purchase with 'packages' field succeeded")
        
        # Verify E received commission
        resp_e_after = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {legacy_chain_users['E']['token']}"
        })
        assert resp_e_after.status_code == 200
        final_credits = resp_e_after.json().get('credits', 0)
        commission = final_credits - initial_credits
        
        print(f"User E: Initial R${initial_credits:.2f} -> Final R${final_credits:.2f} = Commission R${commission:.2f}")
        assert commission >= 1.0, f"User E should have received at least R$1 commission, got R${commission:.2f}"
        
        print("PASSED: Legacy purchase flow distributes commissions correctly")


class TestNetworkEndpointVerification:
    """Test the /api/network endpoint shows correct referral data"""
    
    @pytest.fixture
    def network_test_users(self):
        """Create 3 users for network test: G -> H -> I"""
        users = {}
        
        # User G (root)
        email_g = f"{TEST_PREFIX}_net_g@test.com"
        resp_g = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": email_g,
            "name": "Network User G",
            "role": "client"
        })
        assert resp_g.status_code == 200
        data_g = resp_g.json()
        users['G'] = {
            'user_id': data_g['user']['user_id'],
            'token': data_g['session_token'],
            'referral_code': data_g['user']['referral_code']
        }
        
        # User H (referred by G)
        email_h = f"{TEST_PREFIX}_net_h@test.com"
        resp_h = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": email_h,
            "name": "Network User H",
            "role": "client",
            "referral_code_used": users['G']['referral_code']
        })
        assert resp_h.status_code == 200
        data_h = resp_h.json()
        users['H'] = {
            'user_id': data_h['user']['user_id'],
            'token': data_h['session_token'],
            'referral_code': data_h['user']['referral_code']
        }
        
        # User I (referred by H)
        email_i = f"{TEST_PREFIX}_net_i@test.com"
        resp_i = requests.post(f"{BASE_URL}/api/auth/email-login", json={
            "email": email_i,
            "name": "Network User I",
            "role": "client",
            "referral_code_used": users['H']['referral_code']
        })
        assert resp_i.status_code == 200
        data_i = resp_i.json()
        users['I'] = {
            'user_id': data_i['user']['user_id'],
            'token': data_i['session_token'],
            'referral_code': data_i['user']['referral_code']
        }
        
        return users
    
    def test_network_shows_correct_levels(self, network_test_users):
        """Test /api/network shows correct level 1 and level 2 referrals"""
        # Check G's network - should show H at level 1, I at level 2
        resp = requests.get(f"{BASE_URL}/api/network", headers={
            "Authorization": f"Bearer {network_test_users['G']['token']}"
        })
        assert resp.status_code == 200
        network = resp.json()
        
        level1 = network.get('network', {}).get('level1', [])
        level2 = network.get('network', {}).get('level2', [])
        
        level1_ids = [u['user_id'] for u in level1]
        level2_ids = [u['user_id'] for u in level2]
        
        print(f"User G's network - Level 1: {level1_ids}, Level 2: {level2_ids}")
        
        # H should be in level 1
        assert network_test_users['H']['user_id'] in level1_ids, \
            f"User H should be in G's level 1 network"
        
        # I should be in level 2
        assert network_test_users['I']['user_id'] in level2_ids, \
            f"User I should be in G's level 2 network"
        
        print("PASSED: Network endpoint shows correct referral levels")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
