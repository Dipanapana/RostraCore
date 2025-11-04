"""
Fix employee emails that have spaces in them.
Issue: Some South African surnames like "van der Merwe" create invalid emails with spaces.
"""

from app.database import SessionLocal
from app.models import Employee

def fix_emails():
    db = SessionLocal()
    try:
        print("Fixing employee emails with spaces...")
        print("=" * 80)

        # Get all employees
        employees = db.query(Employee).all()

        fixed_count = 0
        for emp in employees:
            if emp.email and ' ' in emp.email:
                # Remove spaces and convert to lowercase
                old_email = emp.email
                new_email = emp.email.replace(' ', '').lower()
                emp.email = new_email
                fixed_count += 1
                print(f"Fixed: {old_email} -> {new_email}")

        if fixed_count > 0:
            db.commit()
            print(f"\nSUCCESS: Fixed {fixed_count} employee emails")
        else:
            print("\nNo emails needed fixing")

    except Exception as e:
        print(f"\nERROR: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    fix_emails()
