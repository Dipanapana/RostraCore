"""
Add comprehensive employee data to make the application fully testable.
Creates 20 additional employees with:
- Valid PSIRA certifications
- Diverse roles (armed, unarmed, supervisors)
- GPS locations near sites
- Full availability
- Proper South African names and details
"""
import sys
from datetime import date, time, timedelta
from random import choice, uniform
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.models.employee import Employee, EmployeeRole, EmployeeStatus
from app.models.certification import Certification
from app.models.availability import Availability
from app.models.site import Site

# South African names
FIRST_NAMES = [
    "Thabo", "Sipho", "Lerato", "Nomsa", "Andile", "Zanele", "Bongani", "Precious",
    "Mpho", "Themba", "Naledi", "Mandla", "Busisiwe", "Sello", "Nthabiseng", "Kagiso",
    "Thandi", "Dumisani", "Refilwe", "Tshepo", "Palesa", "Vusi", "Nokuthula", "Sanele"
]

LAST_NAMES = [
    "Mkhize", "Dlamini", "Nkosi", "Sithole", "Ndlovu", "Zulu", "Shabalala", "Ngcobo",
    "Mthembu", "Khumalo", "Mokoena", "Molefe", "Mahlangu", "Radebe", "Naidoo", "Pillay",
    "Moodley", "Govender", "Chetty", "Reddy", "Singh", "Nair", "Patel", "Van der Merwe"
]

def create_employees():
    db = SessionLocal()
    try:
        # Get existing employee count and sites
        existing_count = db.query(Employee).count()
        sites = db.query(Site).all()

        print(f"Current employee count: {existing_count}")
        print(f"Available sites: {len(sites)}\n")

        if not sites:
            print("ERROR: No sites found. Please create sites first.")
            return

        # Create 20 new employees
        num_new_employees = 20
        new_employees = []

        # Role distribution: 70% armed, 20% unarmed, 10% supervisors
        roles = (
            [EmployeeRole.ARMED] * 14 +
            [EmployeeRole.UNARMED] * 4 +
            [EmployeeRole.SUPERVISOR] * 2
        )

        # Certification dates
        issue_date = date.today() - timedelta(days=180)
        expiry_date = date.today() + timedelta(days=730)

        print("Creating new employees...")
        print("=" * 70)

        for i in range(num_new_employees):
            emp_number = existing_count + i + 1
            first_name = choice(FIRST_NAMES)
            last_name = choice(LAST_NAMES)
            role = roles[i]

            # Generate South African ID number (format: YYMMDDSSSSCCZ)
            year = str(uniform(75, 99)).split('.')[0].zfill(2)
            month = str(uniform(1, 12)).split('.')[0].zfill(2)
            day = str(uniform(1, 28)).split('.')[0].zfill(2)
            sequence = str(uniform(1000, 9999)).split('.')[0]
            id_number = f"{year}{month}{day}{sequence}08{i % 10}"

            # Assign to a site (for location)
            site = sites[i % len(sites)]

            # Create location near site (±0.03 degrees ≈ 3km)
            gps_lat = site.gps_lat + uniform(-0.03, 0.03)
            gps_lng = site.gps_lng + uniform(-0.03, 0.03)

            # Hourly rates based on role
            if role == EmployeeRole.SUPERVISOR:
                hourly_rate = uniform(85.0, 120.0)
                cert_level = "Grade A"
            elif role == EmployeeRole.ARMED:
                hourly_rate = uniform(65.0, 90.0)
                cert_level = choice(["Grade A", "Grade B"])
            else:  # UNARMED
                hourly_rate = uniform(50.0, 70.0)
                cert_level = choice(["Grade B", "Grade C"])

            # Create employee
            employee = Employee(
                first_name=first_name,
                last_name=last_name,
                id_number=id_number,
                role=role,
                hourly_rate=round(hourly_rate, 2),
                max_hours_week=48,
                cert_level=cert_level,
                home_location=f"Near {site.client_name}, Johannesburg",
                home_gps_lat=gps_lat,
                home_gps_lng=gps_lng,
                status=EmployeeStatus.ACTIVE,
                email=f"{first_name.lower()}.{last_name.lower()}.{emp_number}@rostracore.co.za",
                phone=f"+27{uniform(60, 89):.0f}{uniform(1000000, 9999999):.0f}"
            )

            db.add(employee)
            db.flush()  # Get employee_id

            new_employees.append(employee)

            print(f"\n{i+1}. {first_name} {last_name} (ID: {employee.employee_id})")
            print(f"   Role: {role.value} | Rate: R{hourly_rate:.2f}/hr | Cert: PSIRA {cert_level}")
            print(f"   Location: {gps_lat:.4f}, {gps_lng:.4f} (near {site.client_name})")

            # Add PSIRA certification
            psira_type = f"PSIRA {cert_level}"
            cert = Certification(
                employee_id=employee.employee_id,
                cert_type=psira_type,
                issue_date=issue_date,
                expiry_date=expiry_date,
                verified=True,
                cert_number=f"PSA{employee.employee_id:04d}{i:03d}",
                issuing_authority="PSIRA"
            )
            db.add(cert)

            # Add First Aid certification (required for all)
            first_aid = Certification(
                employee_id=employee.employee_id,
                cert_type="First Aid",
                issue_date=issue_date,
                expiry_date=expiry_date,
                verified=True,
                cert_number=f"FA{employee.employee_id:04d}{i:03d}",
                issuing_authority="Red Cross SA"
            )
            db.add(first_aid)

            # Add Fire Safety for supervisors and some armed guards
            if role == EmployeeRole.SUPERVISOR or (role == EmployeeRole.ARMED and i % 3 == 0):
                fire_safety = Certification(
                    employee_id=employee.employee_id,
                    cert_type="Fire Safety",
                    issue_date=issue_date,
                    expiry_date=expiry_date,
                    verified=True,
                    cert_number=f"FS{employee.employee_id:04d}{i:03d}",
                    issuing_authority="Fire Safety Institute SA"
                )
                db.add(fire_safety)

            # Add 14 days of availability
            for day_offset in range(14):
                target_date = date.today() + timedelta(days=day_offset)
                avail = Availability(
                    employee_id=employee.employee_id,
                    date=target_date,
                    start_time=time(0, 0, 0),
                    end_time=time(23, 59, 59),
                    available=True
                )
                db.add(avail)

        db.commit()

        print("\n" + "=" * 70)
        print(f"\nSUCCESS: Created {num_new_employees} new employees!")
        print(f"\nTotal employees now: {existing_count + num_new_employees}")

        # Summary by role
        print("\nEmployee Distribution:")
        armed_count = sum(1 for e in new_employees if e.role == EmployeeRole.ARMED)
        unarmed_count = sum(1 for e in new_employees if e.role == EmployeeRole.UNARMED)
        supervisor_count = sum(1 for e in new_employees if e.role == EmployeeRole.SUPERVISOR)

        print(f"  - Armed Guards: {armed_count}")
        print(f"  - Unarmed Guards: {unarmed_count}")
        print(f"  - Supervisors: {supervisor_count}")

        print("\nAll employees have:")
        print("  + Valid PSIRA certifications (expires 2027-11-04)")
        print("  + First Aid certifications")
        print("  + Fire Safety certifications (supervisors + some armed guards)")
        print("  + 14 days of full availability")
        print("  + GPS locations near sites")

        print("\nReady to generate rosters!")

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("Adding 20 new employees to RostraCore...\n")
    create_employees()
