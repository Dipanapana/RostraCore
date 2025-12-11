"""
Test data generation endpoints for admin testing.
Only accessible by organization admins.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
import random
import string

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.employee import Employee, EmployeeRole, EmployeeStatus, Gender
from app.models.site import Site
from app.models.client import Client
from app.models.shift import Shift
from app.models.shift_assignment import ShiftAssignment

router = APIRouter(tags=["Test Data"])

# South African first names
SA_FIRST_NAMES = [
    "Thabo", "Sipho", "Bongani", "Mandla", "Johannes", "Pieter", "Willem", "Andries",
    "David", "Michael", "Joseph", "Daniel", "Samuel", "Benjamin", "Emmanuel", "Isaac",
    "Themba", "Lucky", "Gift", "Blessing", "Welcome", "Innocent", "Justice", "Knowledge",
    "Nomsa", "Thandi", "Zanele", "Lindiwe", "Precious", "Grace", "Faith", "Hope",
    "Maria", "Anna", "Elizabeth", "Sarah", "Rebecca", "Rachel", "Martha", "Miriam",
    "Lerato", "Palesa", "Mpho", "Kgomotso", "Tshepiso", "Kagiso", "Neo", "Lesedi"
]

# South African surnames
SA_SURNAMES = [
    "Nkosi", "Dlamini", "Ndlovu", "Mthembu", "Ngcobo", "Zulu", "Cele", "Shabalala",
    "Molefe", "Mokoena", "Maluleke", "Mahlangu", "Chauke", "Sithole", "Zwane", "Khumalo",
    "van der Merwe", "Botha", "du Plessis", "Pretorius", "van Wyk", "Joubert", "Nel", "Venter",
    "Pillay", "Naidoo", "Govender", "Moodley", "Singh", "Chetty", "Reddy", "Naicker",
    "Williams", "Adams", "Johnson", "Smith", "Brown", "Thomas", "James", "Charles"
]

# Gauteng locations
GAUTENG_LOCATIONS = [
    ("Sandton City", "Sandton", "-26.1076,28.0567"),
    ("Rosebank Mall", "Rosebank", "-26.1460,28.0436"),
    ("Mall of Africa", "Midrand", "-25.9420,28.1250"),
    ("Menlyn Park", "Menlyn", "-25.7833,28.2769"),
    ("Eastgate Shopping Centre", "Bedfordview", "-26.1797,28.1203"),
    ("Clearwater Mall", "Roodepoort", "-26.1127,27.9142"),
    ("Cresta Shopping Centre", "Cresta", "-26.1322,27.9731"),
    ("Fourways Mall", "Fourways", "-26.0172,28.0117"),
    ("Northgate Mall", "Northgate", "-26.1197,27.9456"),
    ("The Glen Shopping Centre", "Glenvista", "-26.2744,28.0503"),
    ("Greenstone Shopping Centre", "Greenstone", "-26.1339,28.1528"),
    ("Lakeside Mall", "Benoni", "-26.1553,28.3219"),
    ("Brooklyn Mall", "Pretoria", "-25.7714,28.2386"),
    ("Kolonnade Shopping Centre", "Montana", "-25.6936,28.1658"),
    ("Woodlands Mall", "Pretoria", "-25.7350,28.2847")
]

# Client company names
CLIENT_COMPANIES = [
    "Shoprite Holdings", "Pick n Pay", "Woolworths SA", "Massmart Holdings",
    "Clicks Group", "Dis-Chem Pharmacies", "Mr Price Group", "TFG Limited",
    "Nedbank Group", "Standard Bank", "FNB Corporate", "Absa Bank",
    "Vodacom Group", "MTN South Africa", "Telkom SA", "Cell C"
]


def generate_sa_id_number(birth_date: date, gender: str) -> str:
    """Generate a valid SA ID number format."""
    yy = birth_date.strftime("%y")
    mm = birth_date.strftime("%m")
    dd = birth_date.strftime("%d")

    gender_digit = random.randint(5, 9) if gender == "Male" else random.randint(0, 4)
    sequence = f"{gender_digit}{random.randint(0, 9999):04d}"
    citizenship = "0"

    partial = f"{yy}{mm}{dd}{sequence}{citizenship}"

    # Simplified checksum (not the actual Luhn algorithm but generates valid-looking IDs)
    check = random.randint(0, 9)

    return f"{partial}{check}"


def generate_psira_number() -> str:
    """Generate a PSIRA registration number."""
    return f"{random.randint(1000000, 9999999)}"


@router.post("/generate-test-data")
async def generate_test_data(
    num_employees: int = 80,
    num_clients: int = 10,
    num_sites: int = 15,
    days_back: int = 30,
    days_forward: int = 14,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate comprehensive test data for the authenticated user's organization.

    Creates:
    - Clients with South African company names
    - Sites at Gauteng locations
    - Employees with realistic SA data
    - Shifts for past and future dates
    - Backdated shift assignments with COMPLETED status

    Only accessible by organization admins.
    """

    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only admins can generate test data")

    if current_user.org_id is None:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    org_id = current_user.org_id

    results = {
        "org_id": org_id,
        "clients_created": 0,
        "sites_created": 0,
        "employees_created": 0,
        "shifts_created": 0,
        "assignments_created": 0,
        "errors": []
    }

    try:
        # Create clients
        created_clients = []
        for i in range(num_clients):
            company_name = CLIENT_COMPANIES[i % len(CLIENT_COMPANIES)]
            if i >= len(CLIENT_COMPANIES):
                company_name = f"{company_name} {i // len(CLIENT_COMPANIES) + 1}"

            client = Client(
                client_name=company_name,
                contact_person=f"{random.choice(SA_FIRST_NAMES)} {random.choice(SA_SURNAMES)}",
                contact_email=f"security@{company_name.lower().replace(' ', '')}.co.za",
                contact_phone=f"011-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
                org_id=org_id,
                status="active"
            )
            db.add(client)
            db.flush()
            created_clients.append(client)
            results["clients_created"] += 1

        # Create sites
        created_sites = []
        for i in range(num_sites):
            location = GAUTENG_LOCATIONS[i % len(GAUTENG_LOCATIONS)]
            site_name = location[0]
            if i >= len(GAUTENG_LOCATIONS):
                site_name = f"{site_name} {i // len(GAUTENG_LOCATIONS) + 1}"

            client = random.choice(created_clients)
            coords = location[2].split(",")
            min_staff = random.randint(2, 6)

            site = Site(
                site_name=site_name,
                client_name=client.client_name,
                address=f"{random.randint(1, 500)} {location[1]} Drive, {location[1]}, Gauteng",
                city=location[1],
                province="Gauteng",
                gps_lat=float(coords[0]),
                gps_lng=float(coords[1]),
                client_id=client.client_id,
                org_id=org_id,
                billing_rate=random.uniform(45.0, 85.0),
                min_staff=min_staff
            )
            db.add(site)
            db.flush()
            created_sites.append(site)
            results["sites_created"] += 1

        # Create employees
        created_employees = []
        for i in range(num_employees):
            first_name = random.choice(SA_FIRST_NAMES)
            last_name = random.choice(SA_SURNAMES)
            is_male = first_name in SA_FIRST_NAMES[:24]
            gender_enum = Gender.MALE if is_male else Gender.FEMALE

            birth_year = random.randint(1970, 2000)
            birth_month = random.randint(1, 12)
            birth_day = random.randint(1, 28)
            birth_date = date(birth_year, birth_month, birth_day)

            employee = Employee(
                first_name=first_name,
                last_name=last_name,
                email=f"{first_name.lower()}.{last_name.lower().replace(' ', '')}{i}@email.co.za",
                phone=f"07{random.randint(1, 9)}{random.randint(1000000, 9999999)}",
                id_number=generate_sa_id_number(birth_date, "Male" if is_male else "Female"),
                org_id=org_id,
                status=EmployeeStatus.ACTIVE,
                role=random.choice([EmployeeRole.ARMED, EmployeeRole.UNARMED]),
                gender=gender_enum,
                hourly_rate=random.uniform(35.0, 55.0),
                psira_number=generate_psira_number(),
                psira_expiry_date=date.today() + timedelta(days=random.randint(30, 730)),
                address=f"{random.randint(1, 999)} {random.choice(['Main', 'Church', 'Park', 'Long', 'High'])} Street, {random.choice(['Johannesburg', 'Pretoria', 'Soweto', 'Sandton'])}, Gauteng",
                emergency_contact_name=f"{random.choice(SA_FIRST_NAMES)} {last_name}",
                emergency_contact_phone=f"07{random.randint(1, 9)}{random.randint(1000000, 9999999)}",
                bank_name=random.choice(["FNB", "Standard Bank", "Absa", "Nedbank", "Capitec"]),
                account_number=f"{random.randint(1000000000, 9999999999)}",
                branch_code=random.choice(["250655", "051001", "632005", "198765", "470010"]),
                tax_number=f"{random.randint(1000000000, 9999999999)}"
            )
            db.add(employee)
            db.flush()
            created_employees.append(employee)
            results["employees_created"] += 1

        # Create shifts for past days (backdated) and future days
        today = date.today()
        start_date = today - timedelta(days=days_back)
        end_date = today + timedelta(days=days_forward)

        current_date = start_date
        while current_date <= end_date:
            # Create shifts for each site
            for site in created_sites:
                required_staff = site.min_staff or 2

                # Day shift (06:00 - 18:00)
                day_start = datetime.combine(current_date, datetime.strptime("06:00", "%H:%M").time())
                day_end = datetime.combine(current_date, datetime.strptime("18:00", "%H:%M").time())

                day_shift = Shift(
                    site_id=site.site_id,
                    start_time=day_start,
                    end_time=day_end,
                    required_staff=required_staff,
                    org_id=org_id
                )
                db.add(day_shift)
                db.flush()
                results["shifts_created"] += 1

                # Night shift (18:00 - 06:00 next day)
                night_start = datetime.combine(current_date, datetime.strptime("18:00", "%H:%M").time())
                night_end = datetime.combine(current_date + timedelta(days=1), datetime.strptime("06:00", "%H:%M").time())
                night_staff = max(1, required_staff - 1)

                night_shift = Shift(
                    site_id=site.site_id,
                    start_time=night_start,
                    end_time=night_end,
                    required_staff=night_staff,
                    org_id=org_id
                )
                db.add(night_shift)
                db.flush()
                results["shifts_created"] += 1

                # Create assignments for past shifts (completed)
                if current_date < today:
                    # Assign employees to day shift
                    day_employees = random.sample(created_employees, min(day_shift.required_staff, len(created_employees)))
                    for emp in day_employees:
                        assignment = ShiftAssignment(
                            shift_id=day_shift.shift_id,
                            employee_id=emp.employee_id,
                            status="completed",
                            assigned_at=datetime.combine(current_date, datetime.strptime("05:00", "%H:%M").time()),
                            check_in_time=datetime.combine(current_date, datetime.strptime("05:55", "%H:%M").time()),
                            check_out_time=datetime.combine(current_date, datetime.strptime("18:05", "%H:%M").time()),
                            checked_in=True,
                            checked_out=True,
                            regular_hours=12.0
                        )
                        db.add(assignment)
                        results["assignments_created"] += 1

                    # Assign employees to night shift
                    night_employees = random.sample(created_employees, min(night_shift.required_staff, len(created_employees)))
                    for emp in night_employees:
                        checkout_date = current_date + timedelta(days=1)
                        assignment = ShiftAssignment(
                            shift_id=night_shift.shift_id,
                            employee_id=emp.employee_id,
                            status="completed",
                            assigned_at=datetime.combine(current_date, datetime.strptime("17:00", "%H:%M").time()),
                            check_in_time=datetime.combine(current_date, datetime.strptime("17:55", "%H:%M").time()),
                            check_out_time=datetime.combine(checkout_date, datetime.strptime("06:05", "%H:%M").time()),
                            checked_in=True,
                            checked_out=True,
                            regular_hours=12.0
                        )
                        db.add(assignment)
                        results["assignments_created"] += 1

            current_date += timedelta(days=1)

        db.commit()

        return {
            "success": True,
            "message": "Test data generated successfully",
            "results": results
        }

    except Exception as e:
        db.rollback()
        results["errors"].append(str(e))
        raise HTTPException(status_code=500, detail=f"Error generating test data: {str(e)}")


@router.delete("/clear-test-data")
async def clear_test_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Clear all test data for the organization.
    WARNING: This deletes ALL employees, clients, sites, shifts, and assignments.

    Only accessible by organization admins.
    """

    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only admins can clear test data")

    if current_user.org_id is None:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    org_id = current_user.org_id

    try:
        # Delete in order of dependencies
        # First get shift IDs for this org to delete assignments
        org_shift_ids = [s.shift_id for s in db.query(Shift.shift_id).filter(Shift.org_id == org_id).all()]
        assignments_deleted = 0
        if org_shift_ids:
            assignments_deleted = db.query(ShiftAssignment).filter(ShiftAssignment.shift_id.in_(org_shift_ids)).delete(synchronize_session=False)

        shifts_deleted = db.query(Shift).filter(Shift.org_id == org_id).delete()
        employees_deleted = db.query(Employee).filter(Employee.org_id == org_id).delete()
        sites_deleted = db.query(Site).filter(Site.org_id == org_id).delete()
        clients_deleted = db.query(Client).filter(Client.org_id == org_id).delete()

        db.commit()

        return {
            "success": True,
            "message": "Test data cleared successfully",
            "deleted": {
                "assignments": assignments_deleted,
                "shifts": shifts_deleted,
                "employees": employees_deleted,
                "sites": sites_deleted,
                "clients": clients_deleted
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error clearing test data: {str(e)}")


@router.post("/fix-invalid-emails")
async def fix_invalid_emails(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fix any employees with invalid emails (containing spaces).
    Removes spaces from email addresses.

    Only accessible by organization admins.
    """

    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only admins can fix data")

    if current_user.org_id is None and current_user.role != "superadmin":
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    try:
        from sqlalchemy import text

        # For superadmin, fix all orgs; otherwise just user's org
        if current_user.role == "superadmin":
            result = db.execute(text("UPDATE employees SET email = REPLACE(email, ' ', '') WHERE email LIKE '% %'"))
        else:
            result = db.execute(text("UPDATE employees SET email = REPLACE(email, ' ', '') WHERE email LIKE '% %' AND org_id = :org_id"), {"org_id": current_user.org_id})

        db.commit()

        return {
            "success": True,
            "message": f"Fixed {result.rowcount} invalid email addresses"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error fixing emails: {str(e)}")
