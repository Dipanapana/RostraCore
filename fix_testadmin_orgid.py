"""Fix testadmin user org_id"""
import sys
sys.path.insert(0, 'backend')

from app.database import SessionLocal
from app.models.user import User
from app.models.organization import Organization

db = SessionLocal()

try:
    # Find testadmin user
    testadmin = db.query(User).filter(User.username == "testadmin").first()

    if not testadmin:
        print("ERROR: testadmin user not found!")
        exit(1)

    print(f"Current testadmin user:")
    print(f"  user_id: {testadmin.user_id}")
    print(f"  username: {testadmin.username}")
    print(f"  org_id: {testadmin.org_id}")
    print(f"  role: {testadmin.role}")

    # Find TEST001 organization
    test_org = db.query(Organization).filter(Organization.org_code.like("TEST%")).first()

    if not test_org:
        print("\nERROR: No TEST organization found!")
        exit(1)

    print(f"\nFound organization:")
    print(f"  org_id: {test_org.org_id}")
    print(f"  org_code: {test_org.org_code}")
    print(f"  company_name: {test_org.company_name}")

    # Fix org_id if needed
    if testadmin.org_id != test_org.org_id:
        print(f"\nFixing org_id: {testadmin.org_id} -> {test_org.org_id}")
        testadmin.org_id = test_org.org_id
        db.commit()
        print("✓ Fixed!")
    else:
        print(f"\n✓ org_id is already correct ({testadmin.org_id})")

finally:
    db.close()
