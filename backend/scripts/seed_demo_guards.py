"""
Seed 50 demo guards for org_id=1 (tirelo@gmail.com's organization).

Correctly uses org_id (not tenant_id), status (not employment_status),
psira_number (not psira_registration), psira_expiry_date (not psira_expiry).

Run with: cd backend && python -m scripts.seed_demo_guards
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.employee import Employee, EmployeeRole, EmployeeStatus
from app.models.client import Client
from datetime import date
import random

ORG_ID = 1
TARGET_GUARD_COUNT = 50

FIRST_NAMES = [
    "Thabo", "Sipho", "Mandla", "Bongani", "Zanele", "Nomvula", "Lerato", "Tumelo",
    "Johannes", "Pieter", "Maria", "Elizabeth", "David", "Michael", "Sarah", "Linda",
    "Nkosi", "Musa", "Thandeka", "Sizwe", "Precious", "Grace", "Lucky", "Justice",
    "William", "James", "John", "Robert", "Patricia", "Jennifer", "Susan", "Jessica",
    "Khaya", "Lunga", "Andile", "Simphiwe", "Nomsa", "Busisiwe", "Zinhle", "Ayanda",
    "Vusi", "Tshepo", "Palesa", "Kagiso", "Refilwe", "Dineo", "Katlego", "Mpho",
    "Welcome", "Blessing",
]

LAST_NAMES = [
    "Dlamini", "Nkosi", "Mahlangu", "Khumalo", "Mokoena", "Molefe", "Ndlovu", "Zulu",
    "Van der Merwe", "Botha", "De Wet", "Pretorius", "Smith", "Jones", "Brown", "Wilson",
    "Sithole", "Mthembu", "Ngcobo", "Buthelezi", "Zwane", "Shabalala", "Ntuli", "Dube",
    "Radebe", "Kubheka", "Cele", "Mdluli", "Maseko", "Nhlapo", "Tshabalala", "Mkhize",
    "Chetty", "Pillay", "Govender", "Naidoo", "Maharaj", "Singh", "Patel", "Du Plessis",
    "Fourie", "Steyn", "Venter", "Le Roux", "Motaung", "Phiri", "Ngobeni", "Maluleke",
    "Mabuza", "Chauke",
]

PSIRA_GRADES = ["Grade A", "Grade B", "Grade C", "Grade D", "Grade E"]

ROLES = [EmployeeRole.ARMED, EmployeeRole.UNARMED, EmployeeRole.SUPERVISOR]
ROLE_WEIGHTS = [0.35, 0.50, 0.15]

SA_BANKS = ["FNB", "ABSA", "Standard Bank", "Nedbank", "Capitec"]
ACCOUNT_TYPES = ["cheque", "savings"]

PROVINCES = ["Gauteng", "Western Cape", "KwaZulu-Natal", "Mpumalanga", "Limpopo"]


def generate_sa_id(birth_year: int, birth_month: int, birth_day: int, gender: str, seq: int) -> str:
    """Generate a 13-digit SA ID number."""
    yy = f"{birth_year % 100:02d}"
    mm = f"{birth_month:02d}"
    dd = f"{birth_day:02d}"
    gender_digit = random.randint(5000, 9999) if gender == "male" else random.randint(0, 4999)
    citizenship = "0"
    race_digit = "8"
    partial = f"{yy}{mm}{dd}{gender_digit:04d}{citizenship}{race_digit}"
    # Luhn check digit
    total = 0
    for i, ch in enumerate(reversed(partial)):
        n = int(ch)
        if i % 2 == 0:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    check = (10 - (total % 10)) % 10
    return f"{partial}{check}"


def seed_guards():
    db: Session = SessionLocal()
    try:
        # Check existing guard count for this org
        existing_count = db.query(Employee).filter(Employee.org_id == ORG_ID).count()
        print(f"Existing employees for org_id={ORG_ID}: {existing_count}")

        if existing_count >= TARGET_GUARD_COUNT:
            print(f"Already have {existing_count} employees (target: {TARGET_GUARD_COUNT}). Skipping.")
            return

        to_create = TARGET_GUARD_COUNT - existing_count
        print(f"Creating {to_create} new guards...")

        # Get existing clients for this org
        clients = db.query(Client).filter(Client.org_id == ORG_ID).all()
        client_ids = [c.client_id for c in clients]
        print(f"Found {len(client_ids)} clients for org_id={ORG_ID}: {client_ids}")

        # Get existing id_numbers to avoid duplicates
        existing_ids = set(
            row[0] for row in db.query(Employee.id_number).filter(Employee.org_id == ORG_ID).all()
        )
        existing_emails = set(
            row[0] for row in db.query(Employee.email).filter(Employee.email.isnot(None)).all()
        )

        random.seed(42)
        created = 0
        attempts = 0

        while created < to_create and attempts < to_create * 3:
            attempts += 1
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)

            # Generate unique ID number
            birth_year = random.randint(1975, 2000)
            birth_month = random.randint(1, 12)
            birth_day = random.randint(1, 28)
            gender = random.choice(["male", "female"])
            id_number = generate_sa_id(birth_year, birth_month, birth_day, gender, created)

            if id_number in existing_ids:
                continue
            existing_ids.add(id_number)

            # Generate unique email
            email = f"{first.lower()}.{last.lower().replace(' ', '')}@demo.rostracore.co.za"
            suffix = 1
            base_email = email
            while email in existing_emails:
                email = base_email.replace("@", f"{suffix}@")
                suffix += 1
            existing_emails.add(email)

            role = random.choices(ROLES, weights=ROLE_WEIGHTS, k=1)[0]
            grade = random.choice(PSIRA_GRADES)

            # Higher rates for armed/supervisor
            if role == EmployeeRole.ARMED:
                hourly_rate = round(random.uniform(55.0, 75.0), 2)
            elif role == EmployeeRole.SUPERVISOR:
                hourly_rate = round(random.uniform(65.0, 85.0), 2)
            else:
                hourly_rate = round(random.uniform(42.0, 58.0), 2)

            psira_number = f"PSR{random.randint(1000000, 9999999)}"
            psira_expiry = date(2027, random.randint(1, 12), random.randint(1, 28))

            # Assign to a client (round-robin if clients exist)
            assigned_client_id = client_ids[created % len(client_ids)] if client_ids else None

            guard = Employee(
                org_id=ORG_ID,
                first_name=first,
                last_name=last,
                id_number=id_number,
                email=email,
                phone=f"07{random.randint(10000000, 99999999)}",
                role=role,
                pay_type="hourly",
                hourly_rate=hourly_rate,
                status=EmployeeStatus.ACTIVE,
                psira_number=psira_number,
                psira_expiry_date=psira_expiry,
                psira_grade=grade,
                province=random.choice(PROVINCES),
                assigned_client_id=assigned_client_id,
                hire_date=date(random.randint(2022, 2025), random.randint(1, 12), random.randint(1, 28)),
                bank_name=random.choice(SA_BANKS),
                account_number=str(random.randint(1000000000, 9999999999)),
                branch_code=str(random.randint(100000, 999999)),
                account_type=random.choice(ACCOUNT_TYPES),
                max_hours_week=48,
            )
            db.add(guard)
            created += 1

            if created % 10 == 0:
                print(f"  Created {created}/{to_create} guards...")

        db.commit()
        print(f"\nDone! Created {created} guards for org_id={ORG_ID}")

        # Summary
        total = db.query(Employee).filter(Employee.org_id == ORG_ID).count()
        print(f"Total employees for org_id={ORG_ID}: {total}")

        # Role breakdown
        for r in ROLES:
            count = db.query(Employee).filter(Employee.org_id == ORG_ID, Employee.role == r).count()
            print(f"  {r.value}: {count}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_guards()
