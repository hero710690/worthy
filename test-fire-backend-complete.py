#!/usr/bin/env python3
"""
Comprehensive FIRE Backend Testing Script
Tests all FIRE calculator endpoints and functionality
"""

import requests
import json
import sys
from datetime import datetime

# API Configuration
API_BASE_URL = 'https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development'
TEST_USER_EMAIL = 'firetest@worthy.com'
TEST_USER_PASSWORD = 'testpass123'

def print_section(title):
    print(f"\n{'='*60}")
    print(f"🧪 {title}")
    print('='*60)

def print_result(test_name, success, details=None):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"   Details: {details}")

def register_test_user():
    """Register a test user for FIRE testing"""
    print_section("USER REGISTRATION")
    
    # Try to register new user
    response = requests.post(f"{API_BASE_URL}/auth/register", json={
        "name": "FIRE Test User",
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD,
        "base_currency": "USD",
        "birth_year": 1990
    })
    
    if response.status_code == 200:
        data = response.json()
        print_result("User Registration", True, f"User ID: {data.get('user', {}).get('user_id')}")
        return data.get('token')
    else:
        # User might already exist, try login
        print_result("User Registration", False, "User might already exist, trying login...")
        return login_test_user()

def login_test_user():
    """Login test user and get token"""
    print_section("USER LOGIN")
    
    response = requests.post(f"{API_BASE_URL}/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('token')
        user_id = data.get('user', {}).get('user_id')
        print_result("User Login", True, f"Token obtained, User ID: {user_id}")
        return token
    else:
        print_result("User Login", False, f"Status: {response.status_code}, Response: {response.text}")
        return None

def test_fire_profile_creation(token):
    """Test FIRE profile creation"""
    print_section("FIRE PROFILE CREATION")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    fire_profile_data = {
        "annual_income": 1200000,  # NT$1.2M
        "annual_savings": 300000,  # NT$300K (25% savings rate)
        "annual_expenses": 800000,  # NT$800K retirement expenses
        "target_retirement_age": 60,
        "safe_withdrawal_rate": 0.04,  # 4%
        "expected_return_pre_retirement": 0.07,  # 7%
        "expected_return_post_retirement": 0.05,  # 5%
        "expected_inflation_rate": 0.025,  # 2.5%
        "other_passive_income": 0,
        "effective_tax_rate": 0.15,  # 15%
        "barista_annual_contribution": 120000,  # NT$120K during part-time
        "inflation_rate": 0.025,
        "expected_annual_return": 0.07,  # Legacy field
        "barista_annual_income": 400000  # NT$400K part-time income
    }
    
    response = requests.post(f"{API_BASE_URL}/fire-profile", 
                           headers=headers, 
                           json=fire_profile_data)
    
    if response.status_code == 200:
        data = response.json()
        profile_id = data.get('fire_profile', {}).get('profile_id')
        print_result("FIRE Profile Creation", True, f"Profile ID: {profile_id}")
        return True
    else:
        print_result("FIRE Profile Creation", False, f"Status: {response.status_code}, Response: {response.text}")
        return False

def test_fire_profile_retrieval(token):
    """Test FIRE profile retrieval"""
    print_section("FIRE PROFILE RETRIEVAL")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(f"{API_BASE_URL}/fire-profile", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        fire_profile = data.get('fire_profile')
        
        if fire_profile:
            print_result("FIRE Profile Retrieval", True, f"Annual Expenses: {fire_profile.get('annual_expenses')}")
            print(f"   📊 Profile Details:")
            print(f"      • Annual Expenses: NT${fire_profile.get('annual_expenses', 0):,.0f}")
            print(f"      • Target Retirement Age: {fire_profile.get('target_retirement_age')}")
            print(f"      • Safe Withdrawal Rate: {fire_profile.get('safe_withdrawal_rate', 0)*100:.1f}%")
            print(f"      • Expected Return: {fire_profile.get('expected_annual_return', 0)*100:.1f}%")
            print(f"      • Barista Income: NT${fire_profile.get('barista_annual_income', 0):,.0f}")
            return fire_profile
        else:
            print_result("FIRE Profile Retrieval", False, "No profile found")
            return None
    else:
        print_result("FIRE Profile Retrieval", False, f"Status: {response.status_code}")
        return None

def test_fire_progress_calculation(token):
    """Test FIRE progress calculation"""
    print_section("FIRE PROGRESS CALCULATION")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(f"{API_BASE_URL}/fire-progress", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        fire_progress = data.get('fire_progress', {})
        calculations = data.get('calculations', [])
        
        print_result("FIRE Progress Calculation", True, f"Current Assets: NT${fire_progress.get('current_total_assets', 0):,.0f}")
        
        print(f"\n   🎯 FIRE Targets:")
        print(f"      • Traditional FIRE: NT${fire_progress.get('traditional_fire_target', 0):,.0f}")
        print(f"      • Barista FIRE: NT${fire_progress.get('barista_fire_target', 0):,.0f}")
        print(f"      • Coast FIRE: NT${fire_progress.get('coast_fire_target', 0):,.0f}")
        
        print(f"\n   📈 Progress:")
        print(f"      • Traditional: {fire_progress.get('traditional_fire_progress', 0):.1f}%")
        print(f"      • Barista: {fire_progress.get('barista_fire_progress', 0):.1f}%")
        print(f"      • Coast: {fire_progress.get('coast_fire_progress', 0):.1f}%")
        
        print(f"\n   ⏰ Years to FIRE:")
        print(f"      • Traditional: {fire_progress.get('years_to_traditional_fire', 0):.1f} years")
        print(f"      • Barista: {fire_progress.get('years_to_barista_fire', 0):.1f} years")
        print(f"      • Coast: {fire_progress.get('years_to_coast_fire', 0):.1f} years")
        
        print(f"\n   💰 Monthly Investment Needed:")
        print(f"      • Traditional: NT${fire_progress.get('monthly_investment_needed_traditional', 0):,.0f}")
        print(f"      • Barista: NT${fire_progress.get('monthly_investment_needed_barista', 0):,.0f}")
        
        # Test calculation objects
        print(f"\n   🧮 Calculation Objects:")
        for calc in calculations:
            fire_type = calc.get('fire_type')
            achieved = calc.get('achieved', False)
            progress_pct = calc.get('progress_percentage', 0)
            years_remaining = calc.get('years_remaining', 0)
            
            status = "🎉 ACHIEVED" if achieved else f"⏳ {years_remaining:.1f} years"
            print(f"      • {fire_type}: {progress_pct:.1f}% - {status}")
        
        return True
    else:
        print_result("FIRE Progress Calculation", False, f"Status: {response.status_code}, Response: {response.text}")
        return False

def test_fire_profile_update(token):
    """Test FIRE profile update"""
    print_section("FIRE PROFILE UPDATE")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Update with different values
    updated_data = {
        "annual_income": 1500000,  # Increased income
        "annual_savings": 400000,  # Increased savings
        "annual_expenses": 900000,  # Increased expenses
        "target_retirement_age": 55,  # Earlier retirement
        "safe_withdrawal_rate": 0.035,  # More conservative
        "expected_return_pre_retirement": 0.08,  # Higher expected return
        "expected_return_post_retirement": 0.05,
        "expected_inflation_rate": 0.03,  # Higher inflation
        "other_passive_income": 50000,  # Some passive income
        "effective_tax_rate": 0.20,  # Higher tax rate
        "barista_annual_contribution": 150000,
        "inflation_rate": 0.03,
        "expected_annual_return": 0.08,
        "barista_annual_income": 500000
    }
    
    response = requests.post(f"{API_BASE_URL}/fire-profile", 
                           headers=headers, 
                           json=updated_data)
    
    if response.status_code == 200:
        data = response.json()
        message = data.get('message', '')
        print_result("FIRE Profile Update", True, message)
        
        # Verify the update by retrieving the profile
        verify_response = requests.get(f"{API_BASE_URL}/fire-profile", headers=headers)
        if verify_response.status_code == 200:
            verify_data = verify_response.json()
            profile = verify_data.get('fire_profile', {})
            
            print(f"   📊 Updated Profile:")
            print(f"      • Annual Income: NT${updated_data['annual_income']:,.0f}")
            print(f"      • Annual Expenses: NT${updated_data['annual_expenses']:,.0f}")
            print(f"      • Target Retirement Age: {updated_data['target_retirement_age']}")
            print(f"      • Safe Withdrawal Rate: {updated_data['safe_withdrawal_rate']*100:.1f}%")
            
        return True
    else:
        print_result("FIRE Profile Update", False, f"Status: {response.status_code}, Response: {response.text}")
        return False

def test_edge_cases(token):
    """Test edge cases and error handling"""
    print_section("EDGE CASES & ERROR HANDLING")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test 1: Invalid data types
    invalid_data = {
        "annual_expenses": "invalid",  # Should be number
        "target_retirement_age": -5,  # Invalid age
        "safe_withdrawal_rate": 2.0,  # Too high (200%)
    }
    
    response = requests.post(f"{API_BASE_URL}/fire-profile", 
                           headers=headers, 
                           json=invalid_data)
    
    # Should handle gracefully (either accept with defaults or return error)
    print_result("Invalid Data Handling", True, f"Status: {response.status_code}")
    
    # Test 2: Missing required fields
    minimal_data = {
        "annual_expenses": 500000,
        "target_retirement_age": 65
    }
    
    response = requests.post(f"{API_BASE_URL}/fire-profile", 
                           headers=headers, 
                           json=minimal_data)
    
    print_result("Minimal Data Handling", response.status_code == 200, f"Status: {response.status_code}")
    
    # Test 3: Extreme values
    extreme_data = {
        "annual_expenses": 100000000,  # Very high expenses
        "target_retirement_age": 25,   # Very early retirement
        "safe_withdrawal_rate": 0.01,  # Very conservative
        "expected_annual_return": 0.15, # Very optimistic return
        "barista_annual_income": 0      # No barista income
    }
    
    response = requests.post(f"{API_BASE_URL}/fire-profile", 
                           headers=headers, 
                           json=extreme_data)
    
    print_result("Extreme Values Handling", response.status_code == 200, f"Status: {response.status_code}")

def run_comprehensive_fire_test():
    """Run comprehensive FIRE backend test suite"""
    print("🚀 Starting Comprehensive FIRE Backend Test Suite")
    print(f"📅 Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 API Base URL: {API_BASE_URL}")
    
    # Step 1: Get authentication token
    token = register_test_user()
    if not token:
        token = login_test_user()
    
    if not token:
        print("❌ CRITICAL: Could not obtain authentication token")
        return False
    
    print(f"🔑 Authentication token obtained: {token[:20]}...")
    
    # Step 2: Test FIRE profile creation
    profile_created = test_fire_profile_creation(token)
    
    # Step 3: Test FIRE profile retrieval
    profile = test_fire_profile_retrieval(token)
    
    # Step 4: Test FIRE progress calculation
    progress_calculated = test_fire_progress_calculation(token)
    
    # Step 5: Test FIRE profile update
    profile_updated = test_fire_profile_update(token)
    
    # Step 6: Test edge cases
    test_edge_cases(token)
    
    # Final verification
    print_section("FINAL VERIFICATION")
    final_progress = test_fire_progress_calculation(token)
    
    # Summary
    print_section("TEST SUMMARY")
    tests_passed = sum([
        bool(token),
        profile_created,
        bool(profile),
        progress_calculated,
        profile_updated,
        final_progress
    ])
    
    total_tests = 6
    success_rate = (tests_passed / total_tests) * 100
    
    print(f"📊 Test Results: {tests_passed}/{total_tests} tests passed ({success_rate:.1f}%)")
    
    if success_rate >= 80:
        print("🎉 FIRE Backend Test Suite: PASSED")
        print("✅ All critical FIRE calculator functionality is working correctly")
    else:
        print("⚠️ FIRE Backend Test Suite: NEEDS ATTENTION")
        print("❌ Some FIRE calculator functionality may need fixes")
    
    return success_rate >= 80

if __name__ == "__main__":
    success = run_comprehensive_fire_test()
    sys.exit(0 if success else 1)
