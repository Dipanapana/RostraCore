#!/usr/bin/env python3
"""Comprehensive seed script for Mafoko Security Patrols demo data.

Creates: Organization, Admin User, 100 Employees, PSIRA Certifications,
8 Clients, 24 Sites, Contract Values, 3 months of Rosters/Shifts/Assignments,
3 months of Payroll, 3 months of Invoices, and Payment Transactions.

Uses raw SQL to avoid SQLAlchemy enum casing issues on Railway (uppercase).
"""

import os
import sys
import random
import hashlib
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import create_engine, text

# --Configuration ----------------------------------------------
DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://rostracore_user:rostracore_password@localhost:5432/rostracore",
)
# Railway uses postgres:// but SQLAlchemy needs postgresql://
if DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL, pool_pre_ping=True, pool_recycle=60)

# --Date ranges ------------------------------------------------
MONTHS = [
    (date(2025, 12, 1), date(2025, 12, 31), "2025-12"),
    (date(2026, 1, 1), date(2026, 1, 31), "2026-01"),
    (date(2026, 2, 1), date(2026, 2, 28), "2026-02"),
]

SA_HOLIDAYS = {
    date(2025, 12, 16),  # Day of Reconciliation
    date(2025, 12, 25),  # Christmas
    date(2025, 12, 26),  # Day of Goodwill
    date(2026, 1, 1),    # New Year's Day
    date(2026, 2, 1),    # (none, but keep for weekend checks)
}

# --South African Name Data ------------------------------------
MALE_FIRST = [
    "Sipho", "Thabo", "Bongani", "Mandla", "Tshepo", "Kagiso", "Sibusiso",
    "Themba", "Thabiso", "Lebogang", "Mpho", "Sifiso", "Nkosinathi", "Musa",
    "David", "Johannes", "Pieter", "Willem", "Andile", "Siyabonga",
    "Sbusiso", "Vusi", "Tumelo", "Kabelo", "Kgomotso", "Tshepang",
    "Welcome", "Lucky", "Justice", "Innocent", "Blessing", "Given",
    "Goodness", "Wiseman", "Comfort", "Knowledge", "Patience", "Freedom",
    "Victor", "Samuel", "Joseph", "Daniel", "Moses", "Abraham",
    "Patrick", "Richard", "William", "Edward", "Charles", "Robert",
]
FEMALE_FIRST = [
    "Thandi", "Nomvula", "Lerato", "Zanele", "Lindiwe", "Nompumelelo",
    "Palesa", "Boitumelo", "Dineo", "Refilwe", "Nokuthula", "Grace",
    "Maria", "Anna", "Fatima", "Priya", "Kelebogile", "Thato",
    "Nomsa", "Precious", "Beauty", "Happiness", "Patience", "Charity",
    "Faith", "Hope", "Prudence", "Florence", "Gladys", "Dorothy",
]
LAST_NAMES = [
    "Nkosi", "Mokoena", "Dlamini", "Zulu", "Ndlovu", "Khumalo", "Mkhize",
    "Mthembu", "Sithole", "Shabalala", "Maseko", "Mahlangu", "Ngcobo",
    "Molefe", "Motaung", "Ntuli", "Cele", "Mabaso", "Tshabalala",
    "van der Merwe", "Botha", "du Plessis", "Pretorius", "Venter",
    "le Roux", "Louw", "Williams", "September", "Pillay", "Govender",
    "Maharaj", "Chetty", "Naicker", "Naidoo", "Reddy", "Smith",
    "Adams", "Jacobs", "Hendricks", "Daniels", "Petersen", "Joubert",
    "Kruger", "Steyn", "Fourie", "Erasmus", "Swanepoel", "Marx",
]

PROVINCES = [
    "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
    "Free State", "Limpopo", "Mpumalanga", "North West", "Northern Cape",
]
PROVINCE_WEIGHTS = [30, 15, 15, 10, 7, 7, 6, 5, 5]  # Distribution

SA_BANKS = [
    {"name": "FNB", "branch_code": "250655", "prefix": "62"},
    {"name": "ABSA", "branch_code": "632005", "prefix": "40"},
    {"name": "Standard Bank", "branch_code": "051001", "prefix": "00"},
    {"name": "Nedbank", "branch_code": "198765", "prefix": "10"},
    {"name": "Capitec Bank", "branch_code": "470010", "prefix": "12"},
]
BANK_WEIGHTS = [25, 20, 25, 15, 15]

GRADE_DISTRIBUTION = (
    ["Grade A"] * 10 + ["Grade B"] * 20 + ["Grade C"] * 50 +
    ["Grade D"] * 15 + ["Grade E"] * 5
)
GRADE_RATES = {
    "Grade A": 65.0, "Grade B": 55.0, "Grade C": 45.0,
    "Grade D": 38.0, "Grade E": 32.0,
}
GRADE_ENUM_MAP = {
    "Grade A": "GRADE_A", "Grade B": "GRADE_B", "Grade C": "GRADE_C",
    "Grade D": "GRADE_D", "Grade E": "GRADE_E",
}

# --Clients & Sites -------------------------------------------
CLIENTS = [
    {"name": "Shoprite Holdings", "code": "SHP", "province": "Gauteng",
     "billing_rate": 65.0, "contact": "James van Wyk", "email": "security@shoprite.co.za", "phone": "0218808000"},
    {"name": "Pick n Pay", "code": "PNP", "province": "Western Cape",
     "billing_rate": 60.0, "contact": "Linda Nkomo", "email": "security@pnp.co.za", "phone": "0218080100"},
    {"name": "Woolworths", "code": "WOL", "province": "Gauteng",
     "billing_rate": 70.0, "contact": "Sarah Chen", "email": "security@woolworths.co.za", "phone": "0218071000"},
    {"name": "Massmart Holdings", "code": "MAS", "province": "KwaZulu-Natal",
     "billing_rate": 55.0, "contact": "Deon Venter", "email": "security@massmart.co.za", "phone": "0118020000"},
    {"name": "Clicks Group", "code": "CLK", "province": "Gauteng",
     "billing_rate": 62.0, "contact": "Nomsa Dlamini", "email": "security@clicks.co.za", "phone": "0214603911"},
    {"name": "Dis-Chem", "code": "DSC", "province": "Gauteng",
     "billing_rate": 58.0, "contact": "Pieter Botha", "email": "security@dischem.co.za", "phone": "0117260606"},
    {"name": "Mr Price Group", "code": "MRP", "province": "KwaZulu-Natal",
     "billing_rate": 52.0, "contact": "Zanele Mkhize", "email": "security@mrpricegroup.com", "phone": "0313100300"},
    {"name": "TFG (The Foschini Group)", "code": "TFG", "province": "Western Cape",
     "billing_rate": 56.0, "contact": "Anton Swart", "email": "security@tfg.co.za", "phone": "0219389111"},
]

# 3 sites per client in different provinces
SITE_TEMPLATES = [
    {"suffix": "GP01", "province": "Gauteng", "city": "Johannesburg", "addr": "Sandton City Mall, Rivonia Rd, Sandton"},
    {"suffix": "WC01", "province": "Western Cape", "city": "Cape Town", "addr": "Canal Walk Shopping Centre, Century City"},
    {"suffix": "KZN01", "province": "KwaZulu-Natal", "city": "Durban", "addr": "Gateway Theatre of Shopping, Umhlanga"},
]

GPS_COORDS = {
    "Johannesburg": (-26.1076, 28.0567),
    "Cape Town": (-33.8938, 18.5098),
    "Durban": (-29.7682, 31.0436),
}


# --Helper Functions -------------------------------------------

def generate_sa_id(birth_year, birth_month, birth_day, gender):
    yy = f"{birth_year % 100:02d}"
    mm = f"{birth_month:02d}"
    dd = f"{birth_day:02d}"
    gsss = random.randint(5000, 9999) if gender == "male" else random.randint(0, 4999)
    partial = f"{yy}{mm}{dd}{gsss:04d}08"
    digits = [int(d) for d in partial]
    odd_sum = sum(digits[0::2])
    even_digits = ''.join(str(d) for d in digits[1::2])
    doubled = str(int(even_digits) * 2)
    even_sum = sum(int(d) for d in doubled)
    total = odd_sum + even_sum
    checksum = (10 - (total % 10)) % 10
    return f"{partial}{checksum}"


def generate_phone():
    prefix = random.choice(["060", "061", "063", "064", "065", "071",
                             "072", "073", "074", "076", "078", "079",
                             "081", "082", "083", "084"])
    return f"{prefix}{random.randint(1000000, 9999999)}"


def generate_tax_number():
    first = random.choice([0, 1, 2, 3, 9])
    return f"{first}{random.randint(100000000, 999999999)}"


def hash_password(password):
    """Use passlib bcrypt for password hashing."""
    try:
        from passlib.context import CryptContext
        ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return ctx.hash(password)
    except ImportError:
        # Fallback: won't work for login but at least seeds
        import bcrypt
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def is_sunday(d):
    return d.weekday() == 6


def is_holiday(d):
    return d in SA_HOLIDAYS


# ==============================================================
# MAIN SEEDING
# ==============================================================

print("=" * 70)
print("  MAFOKO SECURITY PATROLS - COMPREHENSIVE DATA SEEDING")
print("=" * 70)
print(f"  Database: {DB_URL[:50]}...")
print(f"  Period: Dec 2025 - Feb 2026")
print(f"  Employees: 100 | Clients: 8 | Sites: 24")
print("=" * 70)

# --Phase 1: Organization -------------------------------------
print("\n[1/10] Creating Mafoko organization...")

with engine.begin() as conn:
    existing = conn.execute(text(
        "SELECT org_id FROM organizations WHERE org_code = 'MAFOKO'"
    )).fetchone()

    if existing:
        org_id = existing[0]
        print(f"  -> Organization already exists (org_id={org_id}), reusing")
        # Delete all existing data for clean re-seed (FK-safe ordering)
        print("  -> Cleaning existing data...")
        # Tables without org_id - delete via JOINs first
        conn.execute(text(
            "DELETE FROM payment_transactions WHERE org_id = :oid"
        ), {"oid": org_id})
        conn.execute(text("""
            DELETE FROM invoice_line_items WHERE invoice_id IN
            (SELECT invoice_id FROM client_invoices WHERE org_id = :oid)
        """), {"oid": org_id})
        conn.execute(text("""
            DELETE FROM shift_assignments WHERE shift_id IN
            (SELECT shift_id FROM shifts WHERE org_id = :oid)
        """), {"oid": org_id})
        conn.execute(text("""
            DELETE FROM certifications WHERE employee_id IN
            (SELECT employee_id FROM employees WHERE org_id = :oid)
        """), {"oid": org_id})
        # Tables with org_id - direct delete
        for table in [
            "client_invoices", "payroll_summary", "shifts", "rosters",
            "contract_values", "employees", "sites", "clients",
        ]:
            conn.execute(text(f"DELETE FROM {table} WHERE org_id = :oid"), {"oid": org_id})
        # Delete admin user
        conn.execute(text(
            "DELETE FROM users WHERE org_id = :oid AND username IN "
            "('mafoko_admin', 'mafoko_scheduler', 'mafoko_finance', 'mafoko_guard')"
        ), {"oid": org_id})
        print("  -> Cleaned existing data")
    else:
        result = conn.execute(text("""
            INSERT INTO organizations (
                org_code, company_name, subscription_tier, subscription_status,
                approval_status, address_line1, city, postal_code, phone,
                vat_number, registration_number, psira_company_registration,
                bank_name, bank_account_number, bank_branch_code, bank_account_holder,
                billing_email, max_employees, max_sites, is_active,
                payslip_template, subscription_started_at,
                active_guard_count, monthly_rate_per_guard, current_month_cost
            ) VALUES (
                'MAFOKO', 'Mafoko Security Patrols (Pty) Ltd', 'business', 'active',
                'approved', '1234 Arcadia Street, Hatfield', 'Pretoria', '0028', '0123625000',
                '4530267891', '2004/012345/07', 'PSiRA 1234567',
                'FNB', '62345678901', '250655', 'Mafoko Security Patrols',
                'accounts@mafokosecurity.co.za', 250, 40, true,
                'professional', :sub_start,
                100, 29.00, 2900.00
            ) RETURNING org_id
        """), {"sub_start": datetime(2025, 6, 1)})
        org_id = result.fetchone()[0]
        print(f"  -> Created organization (org_id={org_id})")


# --Phase 2: Admin User ---------------------------------------
print("\n[2/10] Creating admin user...")

with engine.begin() as conn:
    existing_user = conn.execute(text(
        "SELECT user_id FROM users WHERE username = 'mafoko_admin'"
    )).fetchone()

    if not existing_user:
        pwd_hash = hash_password("Mafoko2026!")
        conn.execute(text("""
            INSERT INTO users (
                username, email, hashed_password, full_name, phone,
                role, org_id, is_owner, is_active, is_email_verified,
                failed_login_attempts
            ) VALUES (
                'mafoko_admin', 'admin@mafokosecurity.co.za', :pwd,
                'Thabo Mafoko', '0123625001',
                'company_admin', :oid, true, true, true,
                0
            )
        """), {"pwd": pwd_hash, "oid": org_id})
        print("  -> Created admin user (mafoko_admin / Mafoko2026!)")
    else:
        print(f"  -> Admin user already exists (user_id={existing_user[0]})")
        pwd_hash = hash_password("Mafoko2026!")

    # Create additional role-based users
    EXTRA_USERS = [
        {"username": "mafoko_scheduler", "email": "scheduler@mafokosecurity.co.za",
         "full_name": "Roster Scheduler", "role": "scheduler", "is_owner": False},
        {"username": "mafoko_finance", "email": "finance@mafokosecurity.co.za",
         "full_name": "Finance Officer", "role": "finance", "is_owner": False},
        {"username": "mafoko_guard", "email": "guard@mafokosecurity.co.za",
         "full_name": "Guard User", "role": "guard", "is_owner": False},
    ]
    for u in EXTRA_USERS:
        exists = conn.execute(text(
            "SELECT user_id FROM users WHERE username = :uname"
        ), {"uname": u["username"]}).fetchone()
        if not exists:
            conn.execute(text("""
                INSERT INTO users (
                    username, email, hashed_password, full_name,
                    role, org_id, is_owner, is_active, is_email_verified,
                    failed_login_attempts
                ) VALUES (
                    :uname, :email, :pwd, :full_name,
                    :role, :oid, :is_owner, true, true, 0
                )
            """), {
                "uname": u["username"], "email": u["email"],
                "pwd": pwd_hash, "full_name": u["full_name"],
                "role": u["role"], "oid": org_id, "is_owner": u["is_owner"],
            })
            print(f"  -> Created {u['role']} user ({u['username']} / Mafoko2026!)")
        else:
            print(f"  -> {u['username']} already exists")


# --Phase 3: 100 Employees ------------------------------------
print("\n[3/10] Creating 100 employees...")

employees = []  # Will store (employee_id, hourly_rate, grade, province)
used_ids = set()

with engine.begin() as conn:
    random.seed(42)  # Reproducible data

    for i in range(100):
        emp_num = f"MSP{i+1:05d}"
        gender = "male" if i < 65 else "female"
        first_name = random.choice(MALE_FIRST if gender == "male" else FEMALE_FIRST)
        last_name = random.choice(LAST_NAMES)

        # Birth date: age 22-55
        birth_year = random.randint(1971, 2003)
        birth_month = random.randint(1, 12)
        birth_day = random.randint(1, 28)
        id_number = generate_sa_id(birth_year, birth_month, birth_day, gender)
        while id_number in used_ids:
            birth_day = random.randint(1, 28)
            id_number = generate_sa_id(birth_year, birth_month, birth_day, gender)
        used_ids.add(id_number)

        grade = random.choice(GRADE_DISTRIBUTION)
        rate = GRADE_RATES[grade]
        province = random.choices(PROVINCES, weights=PROVINCE_WEIGHTS, k=1)[0]
        bank = random.choices(SA_BANKS, weights=BANK_WEIGHTS, k=1)[0]
        hire_date = date(random.randint(2020, 2025), random.randint(1, 12), random.randint(1, 28))
        psira_number = str(random.randint(1000000, 9999999))
        psira_expiry = hire_date + timedelta(days=730)  # 2 years

        # Role: first 5 supervisors, next 10 armed, rest unarmed
        if i < 5:
            role = "SUPERVISOR"
            is_supervisor = True
        elif i < 15:
            role = "ARMED"
            is_supervisor = False
        else:
            role = "UNARMED"
            is_supervisor = False

        email = f"{first_name.lower()}.{last_name.lower().replace(' ', '')}{i}@mafoko.co.za"
        phone = generate_phone()

        result = conn.execute(text("""
            INSERT INTO employees (
                org_id, employee_number, first_name, last_name, id_number,
                role, status, gender, email, phone,
                hourly_rate, pay_type, psira_number, psira_expiry_date, psira_grade,
                bank_name, account_number, branch_code, account_type, tax_number,
                province, hire_date, is_supervisor, max_hours_week, address
            ) VALUES (
                :oid, :emp_num, :first, :last, :id_num,
                :role, 'ACTIVE', :gender, :email, :phone,
                :rate, 'hourly', :psira, :psira_exp, :grade,
                :bank_name, :acct, :branch, :acct_type, :tax,
                :province, :hire, :is_sup, 48,
                :address
            ) RETURNING employee_id
        """), {
            "oid": org_id, "emp_num": emp_num, "first": first_name,
            "last": last_name, "id_num": id_number, "role": role,
            "gender": gender.upper(), "email": email, "phone": phone,
            "rate": rate, "psira": psira_number, "psira_exp": psira_expiry,
            "grade": grade, "bank_name": bank["name"],
            "acct": f"{bank['prefix']}{random.randint(10000000, 99999999)}",
            "branch": bank["branch_code"],
            "acct_type": random.choice(["savings", "cheque"]),
            "tax": generate_tax_number(), "province": province,
            "hire": hire_date, "is_sup": is_supervisor,
            "address": f"{random.randint(1, 200)} {random.choice(['Main', 'Church', 'Voortrekker', 'Nelson Mandela', 'Jan Smuts', 'Beyers Naude'])} Street, {province}",
        })
        emp_id = result.fetchone()[0]
        employees.append({
            "id": emp_id, "rate": rate, "grade": grade,
            "province": province, "name": f"{first_name} {last_name}",
            "hire_date": hire_date, "psira_number": psira_number,
            "psira_expiry": psira_expiry,
        })

    print(f"  -> Created {len(employees)} employees")


# --Phase 4: PSIRA Certifications -----------------------------
print("\n[4/10] Creating PSIRA certifications...")

with engine.begin() as conn:
    for emp in employees:
        verified = random.random() < 0.9
        conn.execute(text("""
            INSERT INTO certifications (
                employee_id, cert_type, cert_number, issuing_authority,
                issue_date, expiry_date, verified, psira_grade
            ) VALUES (
                :eid, 'PSIRA Registration', :cert_num,
                'Private Security Industry Regulatory Authority',
                :issue, :expiry, :verified, :grade
            )
        """), {
            "eid": emp["id"],
            "cert_num": f"PSiRA-{emp['psira_number']}",
            "issue": emp["hire_date"],
            "expiry": emp["psira_expiry"],
            "verified": verified,
            "grade": GRADE_ENUM_MAP[emp["grade"]],
        })
    print(f"  -> Created {len(employees)} PSIRA certifications")


# --Phase 5: 8 Clients ----------------------------------------
print("\n[5/10] Creating 8 clients...")

client_ids = {}  # code -> client_id

with engine.begin() as conn:
    for cl in CLIENTS:
        result = conn.execute(text("""
            INSERT INTO clients (
                org_id, client_name, client_code, contact_person,
                contact_email, contact_phone, province, status,
                billing_rate, payment_terms_days, contract_start_date
            ) VALUES (
                :oid, :name, :code, :contact,
                :email, :phone, :prov, 'active',
                :rate, 30, '2025-06-01'
            ) RETURNING client_id
        """), {
            "oid": org_id, "name": cl["name"], "code": cl["code"],
            "contact": cl["contact"], "email": cl["email"],
            "phone": cl["phone"], "prov": cl["province"],
            "rate": cl["billing_rate"],
        })
        client_ids[cl["code"]] = result.fetchone()[0]

    print(f"  -> Created {len(client_ids)} clients")


# --Phase 6: 24 Sites (3 per client) --------------------------
print("\n[6/10] Creating 24 sites...")

site_data = []  # Will store {site_id, client_code, min_staff, billing_rate}

with engine.begin() as conn:
    for cl in CLIENTS:
        cid = client_ids[cl["code"]]
        for st in SITE_TEMPLATES:
            site_code = f"{cl['code']}-{st['suffix']}"
            site_name = f"{cl['name']} - {st['city']}"
            lat, lng = GPS_COORDS.get(st["city"], (-26.0, 28.0))
            min_staff = random.choice([2, 3, 3, 4])

            result = conn.execute(text("""
                INSERT INTO sites (
                    org_id, client_id, client_name, site_name, site_code,
                    address, city, province, country,
                    gps_lat, gps_lng, min_staff, billing_rate,
                    geofence_radius, geofence_enabled
                ) VALUES (
                    :oid, :cid, :cname, :sname, :scode,
                    :addr, :city, :prov, 'South Africa',
                    :lat, :lng, :min_staff, :rate,
                    200, true
                ) RETURNING site_id
            """), {
                "oid": org_id, "cid": cid, "cname": cl["name"],
                "sname": site_name, "scode": site_code,
                "addr": st["addr"], "city": st["city"], "prov": st["province"],
                "lat": lat + random.uniform(-0.01, 0.01),
                "lng": lng + random.uniform(-0.01, 0.01),
                "min_staff": min_staff, "rate": cl["billing_rate"],
            })
            site_data.append({
                "site_id": result.fetchone()[0],
                "client_code": cl["code"],
                "client_id": cid,
                "min_staff": min_staff,
                "billing_rate": cl["billing_rate"],
                "site_code": site_code,
                "site_name": site_name,
            })

    print(f"  -> Created {len(site_data)} sites")


# --Phase 7: Contract Values ----------------------------------
print("\n[7/10] Creating contract values...")

with engine.begin() as conn:
    for cl in CLIENTS:
        cid = client_ids[cl["code"]]
        # Average 3 staff per site, 3 sites, ~730 hours/month
        monthly_val = cl["billing_rate"] * 3 * 3 * 240  # ~240 hours/guard/month
        conn.execute(text("""
            INSERT INTO contract_values (
                org_id, client_id, contract_number, monthly_value,
                billing_frequency, hourly_bill_rate, wage_budget_pct,
                monthly_wage_budget, start_date, is_active
            ) VALUES (
                :oid, :cid, :contract, :monthly,
                'monthly', :rate, 65.0,
                :wage_budget, '2025-06-01', true
            )
        """), {
            "oid": org_id, "cid": cid,
            "contract": f"MAF-{cl['code']}-2025",
            "monthly": monthly_val,
            "rate": cl["billing_rate"],
            "wage_budget": monthly_val * 0.65,
        })
    print(f"  -> Created {len(CLIENTS)} contract values")


# --Phase 8: Rosters + Shifts + Assignments (3 months) --------
print("\n[8/10] Creating rosters, shifts, and assignments (3 months)...")

# Assign employees to sites (round-robin with some randomness)
site_employee_map = {}
emp_pool = list(employees)
random.shuffle(emp_pool)
idx = 0
for site in site_data:
    site_emps = []
    for _ in range(site["min_staff"] + 1):  # +1 extra for rotation
        if idx >= len(emp_pool):
            idx = 0
        site_emps.append(emp_pool[idx])
        idx += 1
    site_employee_map[site["site_id"]] = site_emps

total_shifts = 0
total_assignments = 0

for month_start, month_end, period_label in MONTHS:
    print(f"\n  --{period_label} --")

    with engine.begin() as conn:
        # Create one roster per site per month
        for site in site_data:
            roster_code = f"MAF-{site['site_code']}-{period_label}"

            result = conn.execute(text("""
                INSERT INTO rosters (
                    org_id, roster_code, name, start_date, end_date,
                    client_id, status, algorithm_used, solver_status,
                    total_shifts, assigned_shifts, unassigned_shifts,
                    total_cost, regular_pay_cost, overtime_cost,
                    premium_cost, travel_reimbursement,
                    bcea_compliant, psira_compliant, created_at
                ) VALUES (
                    :oid, :code, :name, :start, :end,
                    :cid, 'completed', 'production_cpsat', 'optimal',
                    0, 0, 0,
                    0, 0, 0,
                    0, 0,
                    true, true, :created
                ) RETURNING roster_id
            """), {
                "oid": org_id, "code": roster_code,
                "name": f"{site['site_name']} - {period_label}",
                "start": datetime.combine(month_start, time(6, 0)),
                "end": datetime.combine(month_end, time(18, 0)),
                "cid": site["client_id"],
                "created": datetime.combine(month_start, time(8, 0)),
            })
            roster_id = result.fetchone()[0]

            site_emps = site_employee_map[site["site_id"]]
            current_date = month_start
            month_shifts = 0
            month_assignments = 0

            while current_date <= month_end:
                # Create day shift (06:00-18:00) and night shift (18:00-06:00)
                for shift_type in ["day", "night"]:
                    if shift_type == "day":
                        s_start = datetime.combine(current_date, time(6, 0))
                        s_end = datetime.combine(current_date, time(18, 0))
                    else:
                        s_start = datetime.combine(current_date, time(18, 0))
                        s_end = datetime.combine(current_date + timedelta(days=1), time(6, 0))

                    result = conn.execute(text("""
                        INSERT INTO shifts (
                            org_id, site_id, start_time, end_time,
                            required_staff, status, is_overtime,
                            includes_meal_break, meal_break_duration_minutes
                        ) VALUES (
                            :oid, :sid, :start, :end,
                            :staff, 'COMPLETED', false,
                            true, 60
                        ) RETURNING shift_id
                    """), {
                        "oid": org_id, "sid": site["site_id"],
                        "start": s_start, "end": s_end,
                        "staff": site["min_staff"],
                    })
                    shift_id = result.fetchone()[0]
                    total_shifts += 1
                    month_shifts += 1

                    # Assign employees (5 on, 2 off pattern)
                    for emp_idx, emp in enumerate(site_emps[:site["min_staff"]]):
                        # Simple rotation: skip if day_of_year + emp_idx % 7 in [5, 6]
                        day_offset = (current_date.timetuple().tm_yday + emp_idx) % 7
                        if day_offset >= 5:
                            continue  # Day off

                        regular_hours = 11.0  # 12h shift - 1h meal
                        overtime_hours = 0.0
                        rate = emp["rate"]

                        # Premium calculations
                        sunday_premium = 0.0
                        holiday_premium = 0.0
                        night_premium = 0.0
                        premium_type = "regular"

                        if is_holiday(current_date):
                            holiday_premium = regular_hours * rate * 1.0  # Double time = extra 100%
                            premium_type = "holiday"
                        elif is_sunday(current_date):
                            sunday_premium = regular_hours * rate * 0.5  # Time and a half = extra 50%
                            premium_type = "sunday"

                        if shift_type == "night":
                            night_premium = regular_hours * rate * 0.1  # 10% night allowance

                        regular_pay = regular_hours * rate
                        total_cost = regular_pay + sunday_premium + holiday_premium + night_premium

                        conn.execute(text("""
                            INSERT INTO shift_assignments (
                                shift_id, employee_id, roster_id, status,
                                regular_hours, overtime_hours,
                                regular_pay, overtime_pay,
                                night_premium, weekend_premium, sunday_premium, holiday_premium,
                                travel_reimbursement,
                                total_cost, premium_type,
                                is_confirmed, checked_in, checked_out,
                                assigned_at
                            ) VALUES (
                                :sid, :eid, :rid, 'completed',
                                :reg_h, :ot_h,
                                :reg_pay, 0,
                                :night, :weekend, :sunday, :holiday,
                                0,
                                :total, :ptype,
                                true, true, true,
                                :assigned
                            )
                        """), {
                            "sid": shift_id, "eid": emp["id"], "rid": roster_id,
                            "reg_h": regular_hours, "ot_h": overtime_hours,
                            "reg_pay": regular_pay, "night": night_premium,
                            "weekend": sunday_premium,  # weekend_premium = sunday premium
                            "sunday": sunday_premium, "holiday": holiday_premium,
                            "total": total_cost, "ptype": premium_type,
                            "assigned": datetime.combine(month_start, time(8, 0)),
                        })
                        total_assignments += 1
                        month_assignments += 1

                current_date += timedelta(days=1)

            # Update roster stats
            conn.execute(text("""
                UPDATE rosters SET
                    total_shifts = :ts,
                    assigned_shifts = :as_,
                    unassigned_shifts = :ts - :as_,
                    total_cost = (SELECT COALESCE(SUM(total_cost), 0) FROM shift_assignments WHERE roster_id = :rid),
                    regular_pay_cost = (SELECT COALESCE(SUM(regular_pay), 0) FROM shift_assignments WHERE roster_id = :rid),
                    overtime_cost = (SELECT COALESCE(SUM(overtime_pay), 0) FROM shift_assignments WHERE roster_id = :rid),
                    premium_cost = (SELECT COALESCE(SUM(night_premium + sunday_premium + holiday_premium), 0) FROM shift_assignments WHERE roster_id = :rid),
                    travel_reimbursement = 0
                WHERE roster_id = :rid
            """), {"ts": month_shifts, "as_": month_assignments, "rid": roster_id})

    print(f"  -> {period_label}: Created shifts and assignments for {len(site_data)} sites")

print(f"\n  Total: {total_shifts} shifts, {total_assignments} assignments")


# --Phase 9: Payroll Records (3 months) -----------------------
print("\n[9/10] Creating payroll records (3 months)...")

payroll_count = 0

for month_start, month_end, period_label in MONTHS:
    status = "paid" if period_label in ("2025-12", "2026-01") else "approved"

    with engine.begin() as conn:
        # For each employee, sum their shift assignment costs for this month
        for emp in employees:
            result = conn.execute(text("""
                SELECT
                    COALESCE(SUM(sa.regular_hours), 0) as total_hours,
                    COALESCE(SUM(sa.overtime_hours), 0) as ot_hours,
                    COALESCE(SUM(sa.total_cost), 0) as gross
                FROM shift_assignments sa
                JOIN shifts s ON s.shift_id = sa.shift_id
                WHERE sa.employee_id = :eid
                  AND s.start_time >= :start
                  AND s.start_time < :end
            """), {
                "eid": emp["id"],
                "start": datetime.combine(month_start, time(0, 0)),
                "end": datetime.combine(month_end + timedelta(days=1), time(0, 0)),
            })
            row = result.fetchone()
            total_hours = float(row[0])
            ot_hours = float(row[1])
            gross_pay = float(row[2])

            if total_hours == 0:
                continue  # Employee didn't work this month

            # Calculate deductions (simplified SA tax)
            annual_gross = gross_pay * 12
            # UIF: 1% capped at R177.12
            uif = min(gross_pay * 0.01, 177.12)
            # PAYE: simplified bracket calculation
            if annual_gross <= 95750:
                paye_annual = 0
            elif annual_gross <= 237100:
                paye_annual = (annual_gross - 95750) * 0.18
            elif annual_gross <= 370500:
                paye_annual = 25443 + (annual_gross - 237100) * 0.26
            elif annual_gross <= 512800:
                paye_annual = 60127 + (annual_gross - 370500) * 0.31
            else:
                paye_annual = 104240 + (annual_gross - 512800) * 0.36

            # Primary rebate
            paye_annual = max(0, paye_annual - 17235)
            paye_monthly = paye_annual / 12

            expenses = uif + paye_monthly
            net_pay = gross_pay - expenses

            paid_at = None
            if status == "paid":
                paid_at = datetime.combine(month_end, time(12, 0)) + timedelta(days=5)

            conn.execute(text("""
                INSERT INTO payroll_summary (
                    org_id, employee_id, period_start, period_end,
                    total_hours, overtime_hours, gross_pay,
                    expenses_total, net_pay, status, paid_at
                ) VALUES (
                    :oid, :eid, :start, :end,
                    :hours, :ot, :gross,
                    :expenses, :net, :status, :paid
                )
            """), {
                "oid": org_id, "eid": emp["id"],
                "start": month_start, "end": month_end,
                "hours": total_hours, "ot": ot_hours,
                "gross": round(gross_pay, 2),
                "expenses": round(expenses, 2),
                "net": round(net_pay, 2),
                "status": status, "paid": paid_at,
            })
            payroll_count += 1

    print(f"  -> {period_label}: Created payroll records (status={status})")

print(f"  Total: {payroll_count} payroll records")


# --Phase 10: Invoices + Line Items (3 months) ----------------
print("\n[10/10] Creating invoices and payment transactions...")

invoice_count = 0
payment_count = 0

for month_start, month_end, period_label in MONTHS:
    inv_status = "paid" if period_label in ("2025-12", "2026-01") else "sent"

    with engine.begin() as conn:
        for cl in CLIENTS:
            cid = client_ids[cl["code"]]
            # Get sites for this client
            cl_sites = [s for s in site_data if s["client_id"] == cid]

            subtotal = 0.0
            total_hours = 0.0
            total_shifts_count = 0
            line_items = []

            for site in cl_sites:
                result = conn.execute(text("""
                    SELECT
                        COALESCE(SUM(sa.regular_hours + sa.overtime_hours), 0) as hours,
                        COUNT(*) as shifts,
                        COALESCE(SUM(sa.total_cost), 0) as cost
                    FROM shift_assignments sa
                    JOIN shifts s ON s.shift_id = sa.shift_id
                    WHERE s.site_id = :sid
                      AND s.start_time >= :start
                      AND s.start_time < :end
                      AND sa.status = 'completed'
                """), {
                    "sid": site["site_id"],
                    "start": datetime.combine(month_start, time(0, 0)),
                    "end": datetime.combine(month_end + timedelta(days=1), time(0, 0)),
                })
                row = result.fetchone()
                hours = float(row[0])
                shifts = int(row[1])
                # Invoice amount = hours x client billing rate
                amount = hours * site["billing_rate"]

                if hours > 0:
                    line_items.append({
                        "site_id": site["site_id"],
                        "description": f"Security services - {site['site_name']}",
                        "hours": hours,
                        "shifts": shifts,
                        "rate_per_hour": site["billing_rate"],
                        "amount": round(amount, 2),
                    })
                    subtotal += amount
                    total_hours += hours
                    total_shifts_count += shifts

            if subtotal == 0:
                continue

            tax_amount = round(subtotal * 0.15, 2)
            total_amount = round(subtotal + tax_amount, 2)
            subtotal = round(subtotal, 2)

            inv_date = month_end
            due_date = month_end + timedelta(days=30)
            inv_number = f"INV-{org_id}-{cid}-{month_end.strftime('%Y%m%d')}-001"

            paid_date = None
            payment_ref = None
            if inv_status == "paid":
                paid_date = due_date - timedelta(days=random.randint(5, 20))
                payment_ref = f"EFT-{random.randint(100000, 999999)}"

            result = conn.execute(text("""
                INSERT INTO client_invoices (
                    client_id, org_id, invoice_number, invoice_date,
                    period_start, period_end, due_date,
                    total_hours, total_shifts, subtotal, tax_amount, total_amount,
                    status, paid_date, payment_reference,
                    payment_terms, notes
                ) VALUES (
                    :cid, :oid, :inv_num, :inv_date,
                    :start, :end, :due,
                    :hours, :shifts, :sub, :tax, :total,
                    :status, :paid_date, :pay_ref,
                    'Net 30', :notes
                ) RETURNING invoice_id
            """), {
                "cid": cid, "oid": org_id, "inv_num": inv_number,
                "inv_date": inv_date, "start": month_start,
                "end": month_end, "due": due_date,
                "hours": round(total_hours, 2), "shifts": total_shifts_count,
                "sub": subtotal, "tax": tax_amount, "total": total_amount,
                "status": inv_status, "paid_date": paid_date,
                "pay_ref": payment_ref,
                "notes": f"Security services for {period_label}",
            })
            invoice_id = result.fetchone()[0]
            invoice_count += 1

            # Insert line items
            for li in line_items:
                conn.execute(text("""
                    INSERT INTO invoice_line_items (
                        invoice_id, site_id, description,
                        hours, shifts, rate_per_hour, amount
                    ) VALUES (
                        :iid, :sid, :desc,
                        :hours, :shifts, :rate, :amount
                    )
                """), {
                    "iid": invoice_id, "sid": li["site_id"],
                    "desc": li["description"], "hours": li["hours"],
                    "shifts": li["shifts"], "rate": li["rate_per_hour"],
                    "amount": li["amount"],
                })

            # Create payment transaction for paid invoices
            if inv_status == "paid":
                conn.execute(text("""
                    INSERT INTO payment_transactions (
                        org_id, gateway, gateway_transaction_id, gateway_status,
                        status, amount, currency, billing_period,
                        description, created_at, completed_at
                    ) VALUES (
                        :oid, 'payfast', :gtid, 'COMPLETE',
                        'completed', :amount, 'ZAR', :period,
                        :desc, :created, :completed
                    )
                """), {
                    "oid": org_id,
                    "gtid": f"pf_{cl['code']}_{period_label}_{random.randint(100000, 999999)}",
                    "amount": total_amount, "period": period_label,
                    "desc": f"Invoice {inv_number} - {cl['name']}",
                    "created": datetime.combine(paid_date, time(10, 0)),
                    "completed": datetime.combine(paid_date, time(10, 5)),
                })
                payment_count += 1

    print(f"  -> {period_label}: Created invoices (status={inv_status})")

print(f"  Total: {invoice_count} invoices, {payment_count} payment transactions")


# --Summary ----------------------------------------------------
print("\n" + "=" * 70)
print("  SEEDING COMPLETE!")
print("=" * 70)
print(f"  Organization: Mafoko Security Patrols (org_id={org_id})")
print(f"  Logins:       mafoko_admin / mafoko_scheduler / mafoko_finance / mafoko_guard")
print(f"  Password:     Mafoko2026!")
print(f"  Employees:    {len(employees)}")
print(f"  Clients:      {len(CLIENTS)}")
print(f"  Sites:        {len(site_data)}")
print(f"  Shifts:       {total_shifts}")
print(f"  Assignments:  {total_assignments}")
print(f"  Payroll Recs: {payroll_count}")
print(f"  Invoices:     {invoice_count}")
print(f"  Payments:     {payment_count}")
print("=" * 70)
