#!/usr/bin/env python3
"""Seed script for 4 demo security companies (EasyRoster, Prime Africa, MI7, Dodot).

Creates: Organization, Users (admin/scheduler/finance/guard), Employees with
SA data, PSIRA Certifications, Clients, Sites, Contract Values, 3 months of
Rosters/Shifts/Assignments, Payroll, and Invoices.

Skips companies that already exist (checks org_code). Re-run to clean and re-seed.

Uses raw SQL via SQLAlchemy to avoid enum casing issues on Railway.
Pattern follows seed_mafoko.py exactly.
"""

import os
import sys
import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import create_engine, text

# --Configuration ----------------------------------------------
DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://rostracore_user:rostracore_password@localhost:5432/rostracore",
)
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
    date(2025, 12, 16), date(2025, 12, 25), date(2025, 12, 26),
    date(2026, 1, 1),
}

# --South African Name Data ------------------------------------
MALE_FIRST = [
    "Sipho", "Thabo", "Bongani", "Mandla", "Tshepo", "Kagiso", "Sibusiso",
    "Themba", "Thabiso", "Lebogang", "Mpho", "Sifiso", "Nkosinathi", "Musa",
    "David", "Johannes", "Pieter", "Willem", "Andile", "Siyabonga",
    "Welcome", "Lucky", "Justice", "Innocent", "Blessing", "Given",
    "Victor", "Samuel", "Joseph", "Daniel", "Moses", "Patrick",
    "Richard", "William", "Edward", "Charles", "Robert", "Freedom",
]
FEMALE_FIRST = [
    "Thandi", "Nomvula", "Lerato", "Zanele", "Lindiwe", "Nompumelelo",
    "Palesa", "Boitumelo", "Dineo", "Refilwe", "Nokuthula", "Grace",
    "Maria", "Anna", "Fatima", "Nomsa", "Precious", "Beauty",
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
]

PROVINCES = [
    "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
    "Free State", "Limpopo", "Mpumalanga", "North West", "Northern Cape",
]
PROVINCE_WEIGHTS = [30, 15, 15, 10, 7, 7, 6, 5, 5]

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

GPS_COORDS = {
    "Johannesburg": (-26.1076, 28.0567),
    "Pretoria": (-25.7479, 28.2293),
    "Cape Town": (-33.8938, 18.5098),
    "Durban": (-29.7682, 31.0436),
    "Port Elizabeth": (-33.9608, 25.6022),
    "Bloemfontein": (-29.0852, 26.1596),
    "Polokwane": (-23.9045, 29.4688),
    "Nelspruit": (-25.4753, 30.9694),
    "Rustenburg": (-25.6715, 27.2421),
    "Kimberley": (-28.7382, 24.7637),
    "East London": (-33.0292, 27.8546),
    "Pietermaritzburg": (-29.6006, 30.3794),
    "Sandton": (-26.1076, 28.0567),
    "Midrand": (-25.9864, 28.1283),
    "Centurion": (-25.8603, 28.1894),
    "Umhlanga": (-29.7282, 31.0836),
}

# ==============================================================
# COMPANY CONFIGURATIONS
# ==============================================================

DEMO_COMPANIES = [
    {
        "org_code": "EASYROSTER",
        "company_name": "EasyRoster Security Services (Pty) Ltd",
        "admin_email": "admin@easyroster.co.za",
        "password": "Demo2026!",
        "address": "15 Rivonia Road, Sandton",
        "city": "Johannesburg",
        "phone": "0114567890",
        "num_employees": 25,
        "psira_reg": "PSiRA 2345678",
        "vat": "4890123456",
        "reg_number": "2012/034567/07",
        "clients": [
            {"name": "Gautrain Management Agency", "code": "GTR", "province": "Gauteng",
             "billing_rate": 72.0, "contact": "Thabo Letlape", "email": "security@gautrain.co.za", "phone": "0113170000"},
            {"name": "Melrose Arch Precinct", "code": "MEL", "province": "Gauteng",
             "billing_rate": 65.0, "contact": "Jean du Plessis", "email": "ops@melrosearch.co.za", "phone": "0112146400"},
            {"name": "Fourways Mall Management", "code": "FWM", "province": "Gauteng",
             "billing_rate": 58.0, "contact": "Nomsa Khumalo", "email": "security@fourwaysmall.co.za", "phone": "0114654700"},
            {"name": "Montecasino Complex", "code": "MTC", "province": "Gauteng",
             "billing_rate": 68.0, "contact": "David Botha", "email": "security@montecasino.co.za", "phone": "0115108000"},
        ],
        "site_cities": ["Johannesburg", "Sandton", "Midrand"],
    },
    {
        "org_code": "PRIMEAFRICA",
        "company_name": "Prime Africa Security Group (Pty) Ltd",
        "admin_email": "admin@primeafrica.co.za",
        "password": "Demo2026!",
        "address": "88 Strand Street, City Bowl",
        "city": "Cape Town",
        "phone": "0214567890",
        "num_employees": 30,
        "psira_reg": "PSiRA 3456789",
        "vat": "4780234567",
        "reg_number": "2008/045678/07",
        "clients": [
            {"name": "V&A Waterfront Holdings", "code": "VAW", "province": "Western Cape",
             "billing_rate": 75.0, "contact": "Sarah Williams", "email": "security@waterfront.co.za", "phone": "0214081600"},
            {"name": "Century City Property Owners", "code": "CCP", "province": "Western Cape",
             "billing_rate": 60.0, "contact": "Pieter Louw", "email": "ops@centurycity.co.za", "phone": "0215510500"},
            {"name": "Cape Town International Convention Centre", "code": "CTICC", "province": "Western Cape",
             "billing_rate": 70.0, "contact": "Zanele Mthembu", "email": "security@cticc.co.za", "phone": "0214104500"},
            {"name": "Tyger Valley Centre", "code": "TVC", "province": "Western Cape",
             "billing_rate": 55.0, "contact": "Johan Steyn", "email": "security@tygervalley.co.za", "phone": "0219145400"},
            {"name": "Canal Walk Shopping Centre", "code": "CWS", "province": "Western Cape",
             "billing_rate": 62.0, "contact": "Lerato Dlamini", "email": "security@canalwalk.co.za", "phone": "0215290200"},
        ],
        "site_cities": ["Cape Town", "Cape Town", "Cape Town"],
    },
    {
        "org_code": "MI7SEC",
        "company_name": "MI7 National Security Solutions (Pty) Ltd",
        "admin_email": "admin@mi7security.co.za",
        "password": "Demo2026!",
        "address": "42 Commissioner Street, Marshalltown",
        "city": "Johannesburg",
        "phone": "0113456789",
        "num_employees": 20,
        "psira_reg": "PSiRA 4567890",
        "vat": "4670345678",
        "reg_number": "2015/056789/07",
        "clients": [
            {"name": "Transnet SOC Ltd", "code": "TRN", "province": "Gauteng",
             "billing_rate": 80.0, "contact": "Mandla Nkosi", "email": "security@transnet.net", "phone": "0113084000"},
            {"name": "Eskom Holdings SOC", "code": "ESK", "province": "Mpumalanga",
             "billing_rate": 85.0, "contact": "Sipho Maseko", "email": "security@eskom.co.za", "phone": "0118007111"},
            {"name": "Sasol Ltd", "code": "SAS", "province": "Mpumalanga",
             "billing_rate": 78.0, "contact": "Johann Venter", "email": "security@sasol.com", "phone": "0103445000"},
        ],
        "site_cities": ["Johannesburg", "Nelspruit", "Midrand"],
    },
    {
        "org_code": "DODOT",
        "company_name": "Dodot Security Services (Pty) Ltd",
        "admin_email": "admin@dodotsecurity.co.za",
        "password": "Demo2026!",
        "address": "200 Dr Pixley KaSeme Street",
        "city": "Durban",
        "phone": "0314567890",
        "num_employees": 15,
        "psira_reg": "PSiRA 5678901",
        "vat": "4560456789",
        "reg_number": "2018/067890/07",
        "clients": [
            {"name": "uMhlanga Ridge Town Centre", "code": "URT", "province": "KwaZulu-Natal",
             "billing_rate": 58.0, "contact": "Bongani Mkhize", "email": "security@umhlangaridge.co.za", "phone": "0315661200"},
            {"name": "Ballito Junction Regional Mall", "code": "BJR", "province": "KwaZulu-Natal",
             "billing_rate": 52.0, "contact": "Lindiwe Zulu", "email": "security@ballitojunction.co.za", "phone": "0329461200"},
            {"name": "Pavilion Shopping Centre", "code": "PAV", "province": "KwaZulu-Natal",
             "billing_rate": 55.0, "contact": "Thandi Cele", "email": "security@pavilion.co.za", "phone": "0312655900"},
        ],
        "site_cities": ["Durban", "Umhlanga", "Pietermaritzburg"],
    },
]


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
    try:
        from passlib.context import CryptContext
        ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return ctx.hash(password)
    except ImportError:
        import bcrypt
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def is_sunday(d):
    return d.weekday() == 6


def is_holiday(d):
    return d in SA_HOLIDAYS


# ==============================================================
# SEED ONE COMPANY
# ==============================================================

def seed_company(eng, config):
    """Seed a single company with all data. Idempotent."""
    code = config["org_code"]
    name = config["company_name"]
    num_emps = config["num_employees"]
    clients_cfg = config["clients"]
    site_cities = config["site_cities"]
    password = config["password"]

    print(f"\n{'='*70}")
    print(f"  SEEDING: {name}")
    print(f"  Code: {code} | Employees: {num_emps} | Clients: {len(clients_cfg)}")
    print(f"{'='*70}")

    # --Phase 1: Organization --
    print(f"\n[1/10] Organization...")
    with eng.begin() as conn:
        existing = conn.execute(text(
            "SELECT org_id FROM organizations WHERE org_code = :code"
        ), {"code": code}).fetchone()

        if existing:
            org_id = existing[0]
            print(f"  -> Already exists (org_id={org_id}), cleaning...")
            conn.execute(text("DELETE FROM payment_transactions WHERE org_id = :oid"), {"oid": org_id})
            conn.execute(text("DELETE FROM invoice_line_items WHERE invoice_id IN (SELECT invoice_id FROM client_invoices WHERE org_id = :oid)"), {"oid": org_id})
            conn.execute(text("DELETE FROM shift_assignments WHERE shift_id IN (SELECT shift_id FROM shifts WHERE org_id = :oid)"), {"oid": org_id})
            conn.execute(text("DELETE FROM certifications WHERE employee_id IN (SELECT employee_id FROM employees WHERE org_id = :oid)"), {"oid": org_id})
            for table in ["client_invoices", "payroll_summary", "shifts", "rosters",
                          "contract_values", "employees", "sites", "clients"]:
                conn.execute(text(f"DELETE FROM {table} WHERE org_id = :oid"), {"oid": org_id})
            # Clean users for this org (except any external ones)
            usernames = [f"{code.lower()}_admin", f"{code.lower()}_scheduler",
                         f"{code.lower()}_finance", f"{code.lower()}_guard"]
            for uname in usernames:
                conn.execute(text("DELETE FROM users WHERE username = :u"), {"u": uname})
            print(f"  -> Cleaned")
        else:
            result = conn.execute(text("""
                INSERT INTO organizations (
                    org_code, company_name, subscription_tier, subscription_status,
                    approval_status, address_line1, city, postal_code, phone,
                    vat_number, registration_number, psira_company_registration,
                    bank_name, bank_account_number, bank_branch_code, bank_account_holder,
                    billing_email, max_employees, max_sites, is_active,
                    payslip_template, subscription_started_at,
                    active_guard_count, monthly_rate_per_guard, current_month_cost,
                    payment_failures, client_management_mode
                ) VALUES (
                    :code, :name, 'business', 'active',
                    'approved', :addr, :city, '0001', :phone,
                    :vat, :reg, :psira,
                    'FNB', :bank_acct, '250655', :name,
                    :email, 250, 40, true,
                    'professional', :sub_start,
                    :num_emp, 29.00, :monthly_cost,
                    0, 'internal'
                ) RETURNING org_id
            """), {
                "code": code, "name": name, "addr": config["address"],
                "city": config["city"], "phone": config["phone"],
                "vat": config["vat"], "reg": config["reg_number"],
                "psira": config["psira_reg"],
                "bank_acct": f"62{random.randint(100000000, 999999999)}",
                "email": config["admin_email"].replace("admin@", "accounts@"),
                "sub_start": datetime(2025, 6, 1),
                "num_emp": num_emps, "monthly_cost": num_emps * 29.0,
            })
            org_id = result.fetchone()[0]
            print(f"  -> Created (org_id={org_id})")

    # --Phase 2: Users --
    print(f"\n[2/10] Users...")
    pwd_hash = hash_password(password)
    domain = config["admin_email"].split("@")[1]
    prefix = code.lower()

    USERS = [
        {"username": f"{prefix}_admin", "email": config["admin_email"],
         "full_name": f"{name.split('(')[0].strip()} Admin", "role": "COMPANY_ADMIN", "is_owner": True},
        {"username": f"{prefix}_scheduler", "email": f"scheduler@{domain}",
         "full_name": "Roster Scheduler", "role": "SCHEDULER", "is_owner": False},
        {"username": f"{prefix}_finance", "email": f"finance@{domain}",
         "full_name": "Finance Officer", "role": "FINANCE", "is_owner": False},
        {"username": f"{prefix}_guard", "email": f"guard@{domain}",
         "full_name": "Guard User", "role": "GUARD", "is_owner": False},
    ]

    with eng.begin() as conn:
        for u in USERS:
            exists = conn.execute(text("SELECT user_id FROM users WHERE username = :u"), {"u": u["username"]}).fetchone()
            if not exists:
                conn.execute(text("""
                    INSERT INTO users (
                        username, email, hashed_password, full_name,
                        role, org_id, is_owner, is_active, is_email_verified,
                        is_phone_verified, failed_login_attempts
                    ) VALUES (
                        :uname, :email, :pwd, :full_name,
                        :role, :oid, :is_owner, true, true, false, 0
                    )
                """), {
                    "uname": u["username"], "email": u["email"],
                    "pwd": pwd_hash, "full_name": u["full_name"],
                    "role": u["role"], "oid": org_id, "is_owner": u["is_owner"],
                })
                print(f"  -> Created {u['role']}: {u['username']} / {password}")

    # --Phase 3: Employees --
    print(f"\n[3/10] {num_emps} employees...")
    employees = []
    used_ids = set()

    with eng.begin() as conn:
        random.seed(hash(code))  # Deterministic per company

        for i in range(num_emps):
            emp_num = f"{code[:3]}{i+1:05d}"
            gender = "male" if i < int(num_emps * 0.65) else "female"
            first_name = random.choice(MALE_FIRST if gender == "male" else FEMALE_FIRST)
            last_name = random.choice(LAST_NAMES)

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
            psira_expiry = hire_date + timedelta(days=730)

            if i < max(2, num_emps // 10):
                role = "SUPERVISOR"
                is_supervisor = True
            elif i < max(4, num_emps // 5):
                role = "ARMED"
                is_supervisor = False
            else:
                role = "UNARMED"
                is_supervisor = False

            email = f"{first_name.lower()}.{last_name.lower().replace(' ', '')}{i}@{domain}"
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
                    :province, :hire, :is_sup, 48, :address
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
                "address": f"{random.randint(1, 200)} {random.choice(['Main', 'Church', 'Voortrekker', 'Nelson Mandela', 'Jan Smuts'])} Street, {province}",
            })
            emp_id = result.fetchone()[0]
            employees.append({
                "id": emp_id, "rate": rate, "grade": grade,
                "province": province, "name": f"{first_name} {last_name}",
                "hire_date": hire_date, "psira_number": psira_number,
                "psira_expiry": psira_expiry,
            })

        print(f"  -> Created {len(employees)} employees")

    # --Phase 4: PSIRA Certifications --
    print(f"\n[4/10] PSIRA certifications...")
    with eng.begin() as conn:
        for emp in employees:
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
                "verified": random.random() < 0.9,
                "grade": GRADE_ENUM_MAP[emp["grade"]],
            })
        print(f"  -> {len(employees)} certifications")

    # --Phase 5: Clients --
    print(f"\n[5/10] Clients...")
    client_ids = {}

    with eng.begin() as conn:
        for cl in clients_cfg:
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

        print(f"  -> {len(client_ids)} clients")

    # --Phase 6: Sites (3 per client) --
    print(f"\n[6/10] Sites...")
    site_data = []

    with eng.begin() as conn:
        for cl in clients_cfg:
            cid = client_ids[cl["code"]]
            for idx, city in enumerate(site_cities):
                prov = cl["province"]
                lat, lng = GPS_COORDS.get(city, (-26.0, 28.0))
                min_staff = random.choice([2, 3, 3, 4])
                site_code = f"{cl['code']}-{idx+1:02d}"
                site_name = f"{cl['name']} - {city}"

                result = conn.execute(text("""
                    INSERT INTO sites (
                        org_id, client_id, client_name, site_name, site_code,
                        address, city, province, country,
                        gps_lat, gps_lng, min_staff, billing_rate,
                        geofence_radius, geofence_enabled
                    ) VALUES (
                        :oid, :cid, :cname, :sname, :scode,
                        :addr, :city, :prov, 'South Africa',
                        :lat, :lng, :min_staff, :rate, 200, true
                    ) RETURNING site_id
                """), {
                    "oid": org_id, "cid": cid, "cname": cl["name"],
                    "sname": site_name, "scode": site_code,
                    "addr": f"{random.randint(1, 500)} {city} Main Road",
                    "city": city, "prov": prov,
                    "lat": lat + random.uniform(-0.01, 0.01),
                    "lng": lng + random.uniform(-0.01, 0.01),
                    "min_staff": min_staff, "rate": cl["billing_rate"],
                })
                site_data.append({
                    "site_id": result.fetchone()[0], "client_code": cl["code"],
                    "client_id": cid, "min_staff": min_staff,
                    "billing_rate": cl["billing_rate"],
                    "site_code": site_code, "site_name": site_name,
                })

        print(f"  -> {len(site_data)} sites")

    # --Phase 7: Contract Values --
    print(f"\n[7/10] Contract values...")
    with eng.begin() as conn:
        for cl in clients_cfg:
            cid = client_ids[cl["code"]]
            monthly_val = cl["billing_rate"] * 3 * len(site_cities) * 240
            conn.execute(text("""
                INSERT INTO contract_values (
                    org_id, client_id, contract_number, monthly_value,
                    billing_frequency, hourly_bill_rate, wage_budget_pct,
                    monthly_wage_budget, start_date, is_active
                ) VALUES (
                    :oid, :cid, :contract, :monthly,
                    'monthly', :rate, 65.0, :wage, '2025-06-01', true
                )
            """), {
                "oid": org_id, "cid": cid,
                "contract": f"{code}-{cl['code']}-2025",
                "monthly": monthly_val, "rate": cl["billing_rate"],
                "wage": monthly_val * 0.65,
            })
        print(f"  -> {len(clients_cfg)} contracts")

    # --Phase 8: Rosters + Shifts + Assignments (3 months) --
    print(f"\n[8/10] Rosters, shifts, assignments (3 months)...")

    site_employee_map = {}
    emp_pool = list(employees)
    random.shuffle(emp_pool)
    idx = 0
    for site in site_data:
        site_emps = []
        for _ in range(site["min_staff"] + 1):
            if idx >= len(emp_pool):
                idx = 0
            site_emps.append(emp_pool[idx])
            idx += 1
        site_employee_map[site["site_id"]] = site_emps

    total_shifts = 0
    total_assignments = 0

    for month_start, month_end, period_label in MONTHS:
        with eng.begin() as conn:
            roster_ids = {}
            for site in site_data:
                roster_code = f"{code}-{site['site_code']}-{period_label}"
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
                        0, 0, 0, 0, 0, 0, 0, 0, true, true, :created
                    ) RETURNING roster_id
                """), {
                    "oid": org_id, "code": roster_code,
                    "name": f"{site['site_name']} - {period_label}",
                    "start": datetime.combine(month_start, time(6, 0)),
                    "end": datetime.combine(month_end, time(18, 0)),
                    "cid": site["client_id"],
                    "created": datetime.combine(month_start, time(8, 0)),
                })
                roster_ids[site["site_id"]] = result.fetchone()[0]

            for site in site_data:
                roster_id = roster_ids[site["site_id"]]
                site_emps = site_employee_map[site["site_id"]]
                current_date = month_start

                while current_date <= month_end:
                    for shift_type in ["day", "night"]:
                        if shift_type == "day":
                            s_start = datetime.combine(current_date, time(6, 0))
                            s_end = datetime.combine(current_date, time(18, 0))
                        else:
                            s_start = datetime.combine(current_date, time(18, 0))
                            s_end = datetime.combine(current_date + timedelta(days=1), time(6, 0))

                        r = conn.execute(text("""
                            INSERT INTO shifts (org_id, site_id, start_time, end_time,
                                required_staff, status, is_overtime, includes_meal_break, meal_break_duration_minutes)
                            VALUES (:oid, :sid, :start, :end, :staff, 'COMPLETED', false, true, 60)
                            RETURNING shift_id
                        """), {"oid": org_id, "sid": site["site_id"],
                               "start": s_start, "end": s_end, "staff": site["min_staff"]})
                        shift_id = r.fetchone()[0]
                        total_shifts += 1

                        for emp_idx, emp in enumerate(site_emps[:site["min_staff"]]):
                            day_offset = (current_date.timetuple().tm_yday + emp_idx) % 7
                            if day_offset >= 5:
                                continue
                            regular_hours = 11.0
                            rate = emp["rate"]
                            sunday_premium = holiday_premium = night_premium = 0.0
                            if is_holiday(current_date):
                                holiday_premium = regular_hours * rate * 1.0
                            elif is_sunday(current_date):
                                sunday_premium = regular_hours * rate * 0.5
                            if shift_type == "night":
                                night_premium = regular_hours * rate * 0.1
                            regular_pay = regular_hours * rate
                            tc = regular_pay + sunday_premium + holiday_premium + night_premium
                            premium_type = "holiday" if holiday_premium else ("sunday" if sunday_premium else "regular")

                            conn.execute(text("""
                                INSERT INTO shift_assignments (
                                    shift_id, employee_id, roster_id, status,
                                    regular_hours, overtime_hours, regular_pay, overtime_pay,
                                    night_premium, weekend_premium, sunday_premium, holiday_premium,
                                    travel_reimbursement, total_cost, premium_type,
                                    is_confirmed, checked_in, checked_out, assigned_at)
                                VALUES (:sid, :eid, :rid, 'completed',
                                    :reg_h, 0, :reg_pay, 0,
                                    :night, :weekend, :sunday, :holiday,
                                    0, :total, :ptype, true, true, true, :assigned)
                            """), {
                                "sid": shift_id, "eid": emp["id"], "rid": roster_id,
                                "reg_h": regular_hours, "reg_pay": regular_pay,
                                "night": night_premium, "weekend": sunday_premium,
                                "sunday": sunday_premium, "holiday": holiday_premium,
                                "total": tc, "ptype": premium_type,
                                "assigned": datetime.combine(month_start, time(8, 0)),
                            })
                            total_assignments += 1

                    current_date += timedelta(days=1)

                # Update roster stats
                conn.execute(text("""
                    UPDATE rosters SET
                        total_shifts = (SELECT COUNT(*) FROM shifts s WHERE s.org_id = :oid AND s.site_id = :sid
                            AND s.start_time >= :start AND s.start_time <= :end_dt),
                        assigned_shifts = (SELECT COUNT(*) FROM shift_assignments WHERE roster_id = :rid),
                        total_cost = (SELECT COALESCE(SUM(total_cost), 0) FROM shift_assignments WHERE roster_id = :rid),
                        regular_pay_cost = (SELECT COALESCE(SUM(regular_pay), 0) FROM shift_assignments WHERE roster_id = :rid),
                        premium_cost = (SELECT COALESCE(SUM(night_premium + sunday_premium + holiday_premium), 0)
                                       FROM shift_assignments WHERE roster_id = :rid)
                    WHERE roster_id = :rid
                """), {
                    "oid": org_id, "sid": site["site_id"], "rid": roster_id,
                    "start": datetime.combine(month_start, time(0, 0)),
                    "end_dt": datetime.combine(month_end, time(23, 59)),
                })

        print(f"  -> {period_label} done")

    print(f"  Total: {total_shifts} shifts, {total_assignments} assignments")

    # --Phase 9: Payroll (3 months) --
    print(f"\n[9/10] Payroll...")
    payroll_count = 0

    for month_start, month_end, period_label in MONTHS:
        status = "paid" if period_label in ("2025-12", "2026-01") else "approved"

        with eng.begin() as conn:
            for emp in employees:
                result = conn.execute(text("""
                    SELECT COALESCE(SUM(sa.regular_hours), 0), COALESCE(SUM(sa.overtime_hours), 0),
                           COALESCE(SUM(sa.total_cost), 0)
                    FROM shift_assignments sa JOIN shifts s ON s.shift_id = sa.shift_id
                    WHERE sa.employee_id = :eid AND s.start_time >= :start AND s.start_time < :end
                """), {
                    "eid": emp["id"],
                    "start": datetime.combine(month_start, time(0, 0)),
                    "end": datetime.combine(month_end + timedelta(days=1), time(0, 0)),
                })
                row = result.fetchone()
                total_hours, ot_hours, gross_pay = float(row[0]), float(row[1]), float(row[2])
                if total_hours == 0:
                    continue

                annual_gross = gross_pay * 12
                uif = min(gross_pay * 0.01, 177.12)
                if annual_gross <= 95750:
                    paye_annual = 0
                elif annual_gross <= 237100:
                    paye_annual = (annual_gross - 95750) * 0.18
                elif annual_gross <= 370500:
                    paye_annual = 25443 + (annual_gross - 237100) * 0.26
                else:
                    paye_annual = 60127 + (annual_gross - 370500) * 0.31
                paye_annual = max(0, paye_annual - 17235)
                paye_monthly = paye_annual / 12
                expenses = uif + paye_monthly
                net_pay = gross_pay - expenses
                paid_at = datetime.combine(month_end + timedelta(days=5), time(12, 0)) if status == "paid" else None

                sdl = gross_pay * 0.01  # Skills Development Levy
                uif_employer = min(gross_pay * 0.01, 177.12)
                total_deductions = uif + paye_monthly
                total_employer_contrib = uif_employer + sdl
                ctc = gross_pay + total_employer_contrib
                net_pay = gross_pay - total_deductions

                conn.execute(text("""
                    INSERT INTO payroll_summary (
                        org_id, employee_id, period_start, period_end,
                        total_hours, overtime_hours, gross_pay,
                        expenses_total, net_pay, status, paid_at,
                        paye, uif_employee, uif_employer, sdl,
                        total_deductions, total_employer_contributions,
                        cost_to_company, currency_code
                    ) VALUES (:oid, :eid, :start, :end, :hours, :ot, :gross, :exp, :net, :status, :paid,
                              :paye, :uif_emp, :uif_er, :sdl,
                              :tot_ded, :tot_er, :ctc, 'ZAR')
                """), {
                    "oid": org_id, "eid": emp["id"], "start": month_start, "end": month_end,
                    "hours": total_hours, "ot": ot_hours,
                    "gross": round(gross_pay, 2), "exp": round(expenses, 2),
                    "net": round(net_pay, 2), "status": status, "paid": paid_at,
                    "paye": round(paye_monthly, 2), "uif_emp": round(uif, 2),
                    "uif_er": round(uif_employer, 2), "sdl": round(sdl, 2),
                    "tot_ded": round(total_deductions, 2), "tot_er": round(total_employer_contrib, 2),
                    "ctc": round(ctc, 2),
                })
                payroll_count += 1

    print(f"  -> {payroll_count} payroll records")

    # --Phase 10: Invoices (3 months) --
    print(f"\n[10/10] Invoices...")
    invoice_count = 0

    for month_start, month_end, period_label in MONTHS:
        inv_status = "paid" if period_label in ("2025-12", "2026-01") else "sent"

        with eng.begin() as conn:
            for cl in clients_cfg:
                cid = client_ids[cl["code"]]
                cl_sites = [s for s in site_data if s["client_id"] == cid]

                subtotal = 0.0
                total_hours = 0.0
                total_shifts_count = 0
                line_items = []

                for site in cl_sites:
                    result = conn.execute(text("""
                        SELECT COALESCE(SUM(sa.regular_hours + sa.overtime_hours), 0),
                               COUNT(*), COALESCE(SUM(sa.total_cost), 0)
                        FROM shift_assignments sa JOIN shifts s ON s.shift_id = sa.shift_id
                        WHERE s.site_id = :sid AND s.start_time >= :start AND s.start_time < :end
                          AND sa.status = 'completed'
                    """), {
                        "sid": site["site_id"],
                        "start": datetime.combine(month_start, time(0, 0)),
                        "end": datetime.combine(month_end + timedelta(days=1), time(0, 0)),
                    })
                    row = result.fetchone()
                    hours, shifts = float(row[0]), int(row[1])
                    amount = hours * site["billing_rate"]
                    if hours > 0:
                        line_items.append({"site_id": site["site_id"],
                            "description": f"Security services - {site['site_name']}",
                            "hours": hours, "shifts": shifts,
                            "rate_per_hour": site["billing_rate"], "amount": round(amount, 2)})
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
                paid_date = due_date - timedelta(days=random.randint(5, 20)) if inv_status == "paid" else None
                payment_ref = f"EFT-{random.randint(100000, 999999)}" if inv_status == "paid" else None

                result = conn.execute(text("""
                    INSERT INTO client_invoices (
                        client_id, org_id, invoice_number, invoice_date,
                        period_start, period_end, due_date,
                        total_hours, total_shifts, subtotal, tax_amount, total_amount,
                        status, paid_date, payment_reference, payment_terms, notes
                    ) VALUES (
                        :cid, :oid, :inv_num, :inv_date, :start, :end, :due,
                        :hours, :shifts, :sub, :tax, :total,
                        :status, :paid_date, :pay_ref, 'Net 30', :notes
                    ) RETURNING invoice_id
                """), {
                    "cid": cid, "oid": org_id, "inv_num": inv_number,
                    "inv_date": inv_date, "start": month_start, "end": month_end,
                    "due": due_date, "hours": round(total_hours, 2),
                    "shifts": total_shifts_count, "sub": subtotal,
                    "tax": tax_amount, "total": total_amount,
                    "status": inv_status, "paid_date": paid_date,
                    "pay_ref": payment_ref,
                    "notes": f"Security services for {period_label}",
                })
                invoice_id = result.fetchone()[0]
                invoice_count += 1

                for li in line_items:
                    conn.execute(text("""
                        INSERT INTO invoice_line_items (
                            invoice_id, site_id, description, hours, shifts, rate_per_hour, amount
                        ) VALUES (:iid, :sid, :desc, :hours, :shifts, :rate, :amount)
                    """), {"iid": invoice_id, "sid": li["site_id"], "desc": li["description"],
                           "hours": li["hours"], "shifts": li["shifts"],
                           "rate": li["rate_per_hour"], "amount": li["amount"]})

                if inv_status == "paid":
                    conn.execute(text("""
                        INSERT INTO payment_transactions (
                            org_id, gateway, gateway_transaction_id, gateway_status,
                            status, amount, currency, billing_period,
                            description, created_at, completed_at
                        ) VALUES (
                            :oid, 'payfast', :gtid, 'COMPLETE',
                            'completed', :amount, 'ZAR', :period, :desc, :created, :completed
                        )
                    """), {
                        "oid": org_id,
                        "gtid": f"pf_{cl['code']}_{period_label}_{random.randint(100000, 999999)}",
                        "amount": total_amount, "period": period_label,
                        "desc": f"Invoice {inv_number} - {cl['name']}",
                        "created": datetime.combine(paid_date, time(10, 0)),
                        "completed": datetime.combine(paid_date, time(10, 5)),
                    })

    print(f"  -> {invoice_count} invoices")

    # --Summary --
    print(f"\n{'='*70}")
    print(f"  {name} SEEDED SUCCESSFULLY!")
    print(f"  org_id={org_id} | {num_emps} employees | {len(clients_cfg)} clients | {len(site_data)} sites")
    print(f"  {total_shifts} shifts | {total_assignments} assignments | {payroll_count} payroll | {invoice_count} invoices")
    print(f"  Login: {USERS[0]['username']} / {password}")
    print(f"{'='*70}")

    return org_id


# ==============================================================
# MAIN
# ==============================================================

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("  ROSTRACORE DEMO COMPANIES - BATCH SEEDING")
    print(f"  Database: {DB_URL[:50]}...")
    print(f"  Companies: {len(DEMO_COMPANIES)}")
    print("=" * 70)

    results = {}
    for company in DEMO_COMPANIES:
        try:
            org_id = seed_company(engine, company)
            results[company["org_code"]] = {"status": "OK", "org_id": org_id}
        except Exception as e:
            print(f"\n  ERROR seeding {company['org_code']}: {e}")
            results[company["org_code"]] = {"status": "FAILED", "error": str(e)}

    print("\n\n" + "=" * 70)
    print("  BATCH SEEDING COMPLETE!")
    print("=" * 70)
    print(f"\n  {'Company':<25} {'Status':<10} {'Login':<35} {'Password'}")
    print(f"  {'-'*25} {'-'*10} {'-'*35} {'-'*12}")
    for company in DEMO_COMPANIES:
        code = company["org_code"]
        r = results.get(code, {})
        login = f"{code.lower()}_admin"
        status = r.get("status", "?")
        print(f"  {company['company_name'][:25]:<25} {status:<10} {login:<35} {company['password']}")

    print(f"\n  All users also have scheduler/finance/guard variants.")
    print(f"  Example: easyroster_scheduler, easyroster_finance, easyroster_guard")
    print("=" * 70)
