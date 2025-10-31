"""Create sample data for RostraCore with South African names."""

from datetime import datetime, timedelta
import random
from app.database import SessionLocal
from app.models.employee import Employee, EmployeeStatus, EmployeeRole
from app.models.site import Site
from app.models.shift import Shift, ShiftStatus
from app.models.availability import Availability
from app.models.certification import Certification

# South African names (diverse representation)
FIRST_NAMES = [
    # Zulu names
    "Thabo", "Sipho", "Mandla", "Bongani", "Siyabonga", "Nkosi", "Mpho",
    "Zanele", "Nomsa", "Thandi", "Precious", "Lindiwe", "Nosipho",
    # Xhosa names
    "Andile", "Luthando", "Lunga", "Zolani", "Ayanda",
    "Nomvula", "Ntombi", "Babalwa", "Pumza",
    # Sotho names
    "Lerato", "Tebogo", "Kgotso", "Rethabile", "Karabo",
    # Afrikaans names
    "Pieter", "Johan", "Francois", "Hendrik", "Riaan",
    "Annelie", "Elise", "Marietjie", "Lizelle",
    # English names
    "Michael", "David", "James", "John", "Robert",
    "Sarah", "Jennifer", "Michelle", "Nicole",
    # Indian names
    "Priya", "Rajesh", "Pradeep", "Kavitha", "Nisha"
]

LAST_NAMES = [
    # Zulu surnames
    "Dlamini", "Nkosi", "Ngubane", "Mthembu", "Buthelezi", "Zuma", "Mkhize",
    # Xhosa surnames
    "Madikizela", "Mandela", "Mbeki", "Sisulu", "Tutu", "Ramaphosa",
    # Sotho surnames
    "Mokoena", "Molefe", "Khumalo", "Mahlangu", "Motaung",
    # Afrikaans surnames
    "Van der Merwe", "Botha", "Pretorius", "Du Plessis", "Venter", "Steyn",
    # English surnames
    "Smith", "Johnson", "Williams", "Brown", "Jones",
    # Indian surnames
    "Pillay", "Naidoo", "Govender", "Reddy", "Moodley"
]

# South African cities and areas
SA_LOCATIONS = [
    {"name": "Johannesburg CBD", "lat": -26.2041, "lng": 28.0473},
    {"name": "Sandton", "lat": -26.1076, "lng": 28.0567},
    {"name": "Pretoria Central", "lat": -25.7479, "lng": 28.2293},
    {"name": "Cape Town CBD", "lat": -33.9249, "lng": 18.4241},
    {"name": "Durban Beachfront", "lat": -29.8587, "lng": 31.0218},
    {"name": "Port Elizabeth Central", "lat": -33.9608, "lng": 25.6022},
    {"name": "Bloemfontein CBD", "lat": -29.1211, "lng": 26.2142},
    {"name": "East London", "lat": -33.0153, "lng": 27.9116},
    {"name": "Nelspruit", "lat": -25.4748, "lng": 30.9697},
    {"name": "Polokwane", "lat": -23.9045, "lng": 29.4689},
]

def create_sample_data():
    """Create comprehensive sample data."""
    db = SessionLocal()

    try:
        print("Creating sample data for RostraCore...")
        print("=" * 60)

        # Check if sample data already exists
        existing_employees = db.query(Employee).count()
        existing_sites = db.query(Site).count()

        if existing_sites > 0:
            print(f"\nSample data already exists!")
            print(f"  - Employees: {existing_employees}")
            print(f"  - Sites: {existing_sites}")
            print("\nSkipping data creation to avoid duplicates.")
            print("If you want to reset, delete the database file and run migrations again.")
            return

        if existing_employees > 0:
            print(f"\nNote: {existing_employees} employee(s) already exist (likely admin user)")
            print("Continuing with sample data creation...")

        # 1. CREATE SITES
        print("\n1. Creating sites...")
        sites = []
        site_types = [
            "Shopping Mall", "Office Building", "Warehouse", "Hospital",
            "School", "Hotel", "Factory", "Retail Store"
        ]

        for i, location in enumerate(SA_LOCATIONS[:8]):
            site = Site(
                client_name=f"{location['name']} - {site_types[i]}",
                address=f"{random.randint(1, 999)} Main Street, {location['name']}",
                gps_lat=location['lat'],
                gps_lng=location['lng'],
                shift_pattern=random.choice(["day", "night", "12hr", "24hr"]),
                required_skill=random.choice(["armed", "unarmed"]),
                billing_rate=random.uniform(150.0, 250.0),
                min_staff=random.randint(1, 3),
                notes=f"Security site at {location['name']}"
            )
            db.add(site)
            sites.append(site)

        db.commit()
        print(f"   Created {len(sites)} sites")

        # 2. CREATE EMPLOYEES
        print("\n2. Creating employees...")
        employees = []
        roles = [
            EmployeeRole.ARMED,
            EmployeeRole.UNARMED,
            EmployeeRole.SUPERVISOR
        ]

        # Create 30 employees with South African names
        for i in range(30):
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            role = random.choices(roles, weights=[20, 7, 3])[0]  # More guards than supervisors/managers

            # Home location (near one of the sites)
            home_location = random.choice(SA_LOCATIONS)

            employee = Employee(
                first_name=first_name,
                last_name=last_name,
                id_number=f"{random.randint(70, 99)}{random.randint(10, 12):02d}{random.randint(10, 28):02d}{random.randint(1000, 9999)}0{random.randint(0, 9)}{random.randint(0, 9)}",
                email=f"{first_name.lower()}.{last_name.lower().replace(' ', '')}@rostracore.co.za",
                phone=f"0{random.randint(60, 89)}-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
                role=role,
                hourly_rate=120.0 if role == EmployeeRole.UNARMED
                           else 180.0 if role == EmployeeRole.ARMED
                           else 250.0,
                max_hours_week=random.choice([40, 45, 48]),
                cert_level=random.choice(["Grade A", "Grade B", "Grade C"]),
                home_location=f"{random.randint(1, 500)} {random.choice(['Main', 'Church', 'Market', 'Park'])} Road, {home_location['name']}",
                home_gps_lat=home_location['lat'] + random.uniform(-0.05, 0.05),
                home_gps_lng=home_location['lng'] + random.uniform(-0.05, 0.05),
                status=EmployeeStatus.ACTIVE
            )
            db.add(employee)
            employees.append(employee)

        db.commit()
        print(f"   Created {len(employees)} employees")

        # Refresh employees to get their IDs
        for emp in employees:
            db.refresh(emp)

        # 3. CREATE CERTIFICATIONS
        print("\n3. Creating certifications...")
        cert_types = ["PSIRA Grade A", "PSIRA Grade B", "PSIRA Grade C", "First Aid", "Fire Safety"]
        certifications_created = 0

        for employee in employees:
            # Each employee gets 2-4 certifications
            num_certs = random.randint(2, 4)
            for cert_type in random.sample(cert_types, num_certs):
                cert = Certification(
                    employee_id=employee.employee_id,
                    cert_type=cert_type,
                    cert_number=f"CERT-{random.randint(100000, 999999)}",
                    issue_date=datetime.now() - timedelta(days=random.randint(180, 365)),
                    expiry_date=datetime.now() + timedelta(days=random.randint(365, 730)),
                    verified=random.choice([True, True, True, False])  # 75% verified
                )
                db.add(cert)
                certifications_created += 1

        db.commit()
        print(f"   Created {certifications_created} certifications")

        # 4. CREATE AVAILABILITY
        print("\n4. Creating availability records...")
        availability_created = 0

        # Create availability for next 14 days
        for employee in employees[:20]:  # First 20 employees
            for day_offset in range(14):
                date = datetime.now().date() + timedelta(days=day_offset)

                # 80% chance of being available
                if random.random() < 0.8:
                    avail = Availability(
                        employee_id=employee.employee_id,
                        date=date,
                        start_time=datetime.strptime("06:00", "%H:%M").time(),
                        end_time=datetime.strptime("22:00", "%H:%M").time(),
                        available=True
                    )
                    db.add(avail)
                    availability_created += 1

        db.commit()
        print(f"   Created {availability_created} availability records")

        # 5. CREATE SHIFTS
        print("\n5. Creating shifts...")
        shifts_created = 0

        # Create shifts for next 7 days
        for day_offset in range(7):
            for site in sites:
                # Morning shift (6am-2pm)
                shift = Shift(
                    site_id=site.site_id,
                    start_time=datetime.now() + timedelta(days=day_offset, hours=6),
                    end_time=datetime.now() + timedelta(days=day_offset, hours=14),
                    required_skill=random.choice(["armed", "unarmed"]),
                    assigned_employee_id=None,  # Unassigned
                    status=ShiftStatus.PLANNED
                )
                db.add(shift)
                shifts_created += 1

                # Afternoon shift (2pm-10pm)
                shift = Shift(
                    site_id=site.site_id,
                    start_time=datetime.now() + timedelta(days=day_offset, hours=14),
                    end_time=datetime.now() + timedelta(days=day_offset, hours=22),
                    required_skill=random.choice(["armed", "unarmed"]),
                    assigned_employee_id=None,
                    status=ShiftStatus.UNASSIGNED
                )
                db.add(shift)
                shifts_created += 1

                # Night shift (10pm-6am)
                shift = Shift(
                    site_id=site.site_id,
                    start_time=datetime.now() + timedelta(days=day_offset, hours=22),
                    end_time=datetime.now() + timedelta(days=day_offset + 1, hours=6),
                    required_skill=random.choice(["armed", "unarmed"]),
                    assigned_employee_id=None,
                    status=ShiftStatus.UNASSIGNED
                )
                db.add(shift)
                shifts_created += 1

        db.commit()
        print(f"   Created {shifts_created} shifts")

        # 6. ASSIGN SOME SHIFTS (25% pre-assigned)
        print("\n6. Pre-assigning some shifts...")
        all_shifts = db.query(Shift).all()
        assigned_count = 0

        for shift in random.sample(all_shifts, len(all_shifts) // 4):
            # Find a suitable employee
            suitable_employees = [e for e in employees if e.role.value == shift.required_skill]
            if suitable_employees:
                employee = random.choice(suitable_employees)
                shift.assigned_employee_id = employee.employee_id
                shift.status = ShiftStatus.CONFIRMED
                assigned_count += 1

        db.commit()
        print(f"   Pre-assigned {assigned_count} shifts")

        # SUMMARY
        print("\n" + "=" * 60)
        print("SAMPLE DATA CREATED SUCCESSFULLY!")
        print("=" * 60)
        print(f"\nSummary:")
        print(f"  - Sites: {len(sites)}")
        print(f"  - Employees: {len(employees)}")
        print(f"  - Certifications: {certifications_created}")
        print(f"  - Availability Records: {availability_created}")
        print(f"  - Shifts Created: {shifts_created}")
        print(f"  - Shifts Pre-assigned: {assigned_count}")
        print(f"  - Unassigned Shifts: {shifts_created - assigned_count}")

        print(f"\nEmployee Breakdown:")
        armed = sum(1 for e in employees if e.role == EmployeeRole.ARMED)
        unarmed = sum(1 for e in employees if e.role == EmployeeRole.UNARMED)
        supervisors = sum(1 for e in employees if e.role == EmployeeRole.SUPERVISOR)
        print(f"  - Armed Guards: {armed}")
        print(f"  - Unarmed Guards: {unarmed}")
        print(f"  - Supervisors: {supervisors}")

        print(f"\nSample Employees:")
        for employee in employees[:5]:
            print(f"  - {employee.first_name} {employee.last_name} ({employee.role.value}) - {employee.home_location}")

        print(f"\n{'='*60}")
        print("You can now generate rosters using the /api/v1/roster/generate endpoint!")
        print("Visit http://localhost:8000/docs to try it out.")
        print(f"{'='*60}\n")

    except Exception as e:
        print(f"\nError creating sample data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("\nRostraCore Sample Data Generator")
    print("Using South African Names and Locations")
    print("=" * 60)
    create_sample_data()
