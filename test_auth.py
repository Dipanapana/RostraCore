#!/usr/bin/env python3
"""
Diagnostic script to test authentication flow.
Run this to debug login issues.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.auth.security import (
    authenticate_user,
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password
)
from datetime import timedelta

def test_auth_flow():
    """Test the complete authentication flow."""
    print("=" * 60)
    print("🔐 AUTHENTICATION FLOW DIAGNOSTIC")
    print("=" * 60)

    db = SessionLocal()

    try:
        # Step 1: Check if admin exists
        print("\n📋 STEP 1: Check Admin User")
        print("-" * 60)

        admin = db.query(User).filter(User.username == "admin").first()

        if not admin:
            print("❌ Admin user does NOT exist!")
            print("   Run: python backend/create_admin.py")
            return False

        print(f"✅ Admin user exists")
        print(f"   User ID: {admin.user_id}")
        print(f"   Username: {admin.username}")
        print(f"   Email: {admin.email}")
        print(f"   Role: {admin.role.value}")
        print(f"   Active: {admin.is_active}")
        print(f"   Email Verified: {admin.is_email_verified}")
        print(f"   Created: {admin.created_at}")

        # Step 2: Test password verification
        print("\n🔑 STEP 2: Test Password Verification")
        print("-" * 60)

        test_password = "admin123"
        is_valid = verify_password(test_password, admin.hashed_password)

        if is_valid:
            print(f"✅ Password '{test_password}' is VALID")
        else:
            print(f"❌ Password '{test_password}' is INVALID")
            print(f"   Hashed password: {admin.hashed_password[:50]}...")
            return False

        # Step 3: Test authenticate_user
        print("\n🔓 STEP 3: Test authenticate_user()")
        print("-" * 60)

        try:
            authenticated_user = authenticate_user(db, "admin", "admin123")

            if authenticated_user:
                print(f"✅ Authentication SUCCESSFUL")
                print(f"   Returned user: {authenticated_user.username}")
            else:
                print(f"❌ Authentication FAILED")
                print(f"   authenticate_user returned None")
                return False
        except Exception as e:
            print(f"❌ Authentication ERROR: {e}")
            return False

        # Step 4: Test token creation
        print("\n🎫 STEP 4: Test Token Creation")
        print("-" * 60)

        try:
            access_token = create_access_token(
                data={
                    "sub": admin.user_id,
                    "username": admin.username,
                    "role": admin.role.value
                },
                expires_delta=timedelta(minutes=30)
            )

            print(f"✅ Token created successfully")
            print(f"   Token (first 50 chars): {access_token[:50]}...")
            print(f"   Token length: {len(access_token)} characters")
        except Exception as e:
            print(f"❌ Token creation ERROR: {e}")
            return False

        # Step 5: Test token decoding
        print("\n🔍 STEP 5: Test Token Decoding")
        print("-" * 60)

        try:
            payload = decode_access_token(access_token)

            print(f"✅ Token decoded successfully")
            print(f"   User ID (sub): {payload.get('sub')}")
            print(f"   Username: {payload.get('username')}")
            print(f"   Role: {payload.get('role')}")
            print(f"   Expires (exp): {payload.get('exp')}")

            # Verify user ID matches
            if payload.get('sub') != admin.user_id:
                print(f"❌ WARNING: User ID mismatch!")
                print(f"   Expected: {admin.user_id}")
                print(f"   Got: {payload.get('sub')}")
                return False

        except Exception as e:
            print(f"❌ Token decoding ERROR: {e}")
            import traceback
            traceback.print_exc()
            return False

        # Step 6: Simulate get_current_user
        print("\n👤 STEP 6: Simulate get_current_user()")
        print("-" * 60)

        try:
            user_id = payload.get('sub')
            user = db.query(User).filter(User.user_id == user_id).first()

            if user is None:
                print(f"❌ User with ID {user_id} not found in database")
                return False

            if not user.is_active:
                print(f"❌ User is INACTIVE")
                return False

            print(f"✅ User lookup successful")
            print(f"   Found user: {user.username}")
            print(f"   Is active: {user.is_active}")

        except Exception as e:
            print(f"❌ User lookup ERROR: {e}")
            return False

        # Step 7: Check email verification requirement
        print("\n📧 STEP 7: Check Email Verification")
        print("-" * 60)

        from app.config import settings

        if settings.ENABLE_EMAIL_VERIFICATION:
            print(f"⚠️  Email verification is ENABLED")

            if not admin.is_email_verified:
                print(f"❌ Admin email is NOT verified")
                print(f"   This will cause 403 Forbidden errors")
                print(f"   Fix: Set is_email_verified = True OR disable email verification")
                return False
            else:
                print(f"✅ Admin email is verified")
        else:
            print(f"✅ Email verification is DISABLED (testing mode)")

        # All tests passed!
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print("\n🎉 Authentication flow is working correctly!")
        print("\nIf you're still getting 401 errors:")
        print("1. Check backend logs for specific error messages")
        print("2. Check frontend console for the actual request being sent")
        print("3. Verify CORS settings in backend/app/main.py")
        print("4. Check SECRET_KEY matches between requests")

        return True

    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("\n")
    success = test_auth_flow()
    print("\n")

    sys.exit(0 if success else 1)
