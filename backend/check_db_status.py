"""Quick script to check database status and create test organization if needed."""
import sys
sys.path.append('.')

from app.database import SessionLocal
from app.models.organization import Organization
from app.models.user import User
from sqlalchemy import text

db = SessionLocal()

try:
    # Check if we have any organizations
    orgs = db.query(Organization).all()
    print(f"Found {len(orgs)} organizations")
    
    if orgs:
        for org in orgs:
            print(f"  - {org.company_name} (ID: {org.org_id}, Code: {org.org_code})")
    
    # Check if we have any users
    users = db.query(User).all()
    print(f"\nFound {len(users)} users")
    
    if users:
        for user in users:
            print(f"  - {user.username} (Org ID: {user.org_id}, Role: {user.role})")
    
    # Check table counts
    print("\nTable counts:")
    tables = ['employees', 'sites', 'shifts', 'clients', 'certifications']
    for table in tables:
        try:
            result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            print(f"  - {table}: {count}")
        except Exception as e:
            print(f"  - {table}: Error - {e}")
    
finally:
    db.close()
