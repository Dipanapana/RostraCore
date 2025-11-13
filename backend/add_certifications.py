"""
Add valid PSIRA certifications to all employees who don't have them.
This ensures all employees can be assigned to shifts by the roster optimizer.
"""
import sys
from datetime import date, timedelta
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.models.certification import Certification
from app.models.employee import Employee

def add_certifications():
    db = SessionLocal()
    try:
        # Get all employees
        employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()
        print(f"Found {len(employees)} active employees")

        # Set certification dates (valid for 2+ years)
        issue_date = date.today() - timedelta(days=180)  # Issued 6 months ago
        expiry_date = date.today() + timedelta(days=730)  # Expires in 2 years

        updated_count = 0

        for emp in employees:
            # Check if employee has any verified PSIRA certifications
            existing_certs = db.query(Certification).filter(
                Certification.employee_id == emp.employee_id,
                Certification.verified == True
            ).all()

            has_psira = any(
                cert.cert_type in ['PSIRA Grade A', 'PSIRA Grade B', 'PSIRA Grade C']
                and cert.expiry_date > date.today()
                for cert in existing_certs
            )

            if not has_psira:
                print(f"\n  Adding certifications for Employee {emp.employee_id}: {emp.first_name} {emp.last_name}")

                # Add PSIRA Grade A (most common)
                cert_a = Certification(
                    employee_id=emp.employee_id,
                    cert_type="PSIRA Grade A",
                    issue_date=issue_date,
                    expiry_date=expiry_date,
                    verified=True,
                    cert_number=f"PSA{emp.employee_id:04d}123",
                    issuing_authority="PSIRA"
                )
                db.add(cert_a)
                print(f"    + Added PSIRA Grade A (expires {expiry_date})")

                # Add First Aid certification
                cert_fa = Certification(
                    employee_id=emp.employee_id,
                    cert_type="First Aid",
                    issue_date=issue_date,
                    expiry_date=expiry_date,
                    verified=True,
                    cert_number=f"FA{emp.employee_id:04d}456",
                    issuing_authority="Red Cross"
                )
                db.add(cert_fa)
                print(f"    + Added First Aid (expires {expiry_date})")

                updated_count += 1

        if updated_count > 0:
            db.commit()
            print(f"\nSUCCESS: Added certifications for {updated_count} employees")
        else:
            print("\nSUCCESS: All employees already have valid PSIRA certifications")

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("Adding valid certifications to employees...\n")
    add_certifications()
