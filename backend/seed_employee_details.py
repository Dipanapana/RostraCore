#!/usr/bin/env python3
"""Seed realistic employee details: banking, PSIRA certs, ID numbers, tax refs, addresses.

Uses raw SQL to avoid SQLAlchemy enum issues on production (uppercase enums).
All data is realistic South African format.
"""

import random
from datetime import date, timedelta
from sqlalchemy import create_engine, text

DB_URL = 'postgresql://postgres:ThXKAIVXyOEMdNhUhNhArKdrlwddBoYY@yamabiko.proxy.rlwy.net:41494/railway'
ORG_ID = 1

engine = create_engine(DB_URL, pool_pre_ping=True, pool_recycle=60)

# ─── South African Banks ────────────────────────────────────
SA_BANKS = [
    {"name": "FNB", "branch_code": "250655", "prefix": "62"},
    {"name": "ABSA", "branch_code": "632005", "prefix": "40"},
    {"name": "Standard Bank", "branch_code": "051001", "prefix": "00"},
    {"name": "Nedbank", "branch_code": "198765", "prefix": "10"},
    {"name": "Capitec Bank", "branch_code": "470010", "prefix": "12"},
    {"name": "African Bank", "branch_code": "430000", "prefix": "80"},
    {"name": "TymeBank", "branch_code": "678910", "prefix": "21"},
]
BANK_WEIGHTS = [25, 20, 20, 15, 15, 3, 2]  # Market share approximation

ACCOUNT_TYPES = ["savings", "cheque", "savings", "savings", "cheque"]  # More savings

# ─── SA Provinces with realistic addresses ───────────────────
PROVINCE_ADDRESSES = {
    "North West": [
        "14 Molopo Street, Mahikeng, 2745",
        "27 Kgosi Pilane Road, Rustenburg, 0299",
        "3 Leopard Drive, Brits, 0250",
        "88 Sol Plaatje Avenue, Klerksdorp, 2570",
        "45 Taung Road, Vryburg, 8600",
        "19 Game Reserve Lane, Sun City, 0316",
        "102 Chrome Street, Rustenburg, 0300",
        "56 Mabeskraal Road, Phokeng, 0335",
        "71 Lichtenburg Road, Zeerust, 2865",
        "33 Mogwase Drive, Pilanesberg, 0314",
    ],
    "Northern Cape": [
        "5 Kimberley Road, Kimberley, 8301",
        "12 Diamond Street, Kathu, 8446",
        "78 Upington Main Road, Upington, 8800",
        "34 Sol Plaatje Drive, Kimberley, 8301",
        "9 Douglas Avenue, De Aar, 7000",
        "61 Kalahari Street, Kuruman, 8460",
        "22 Sishen Crescent, Kathu, 8446",
        "45 Oranje Drive, Springbok, 8240",
        "17 Griekwastad Road, Griquatown, 8365",
        "89 Prieska Avenue, Prieska, 8940",
    ],
    "Gauteng": [
        "123 Commissioner Street, Johannesburg, 2001",
        "45 Pretoria Main Road, Midrand, 1685",
        "67 Church Street, Pretoria, 0002",
        "12 Vaal Drive, Vereeniging, 1930",
        "88 Rivonia Road, Sandton, 2196",
        "34 Soweto Highway, Soweto, 1818",
        "7 Centurion Drive, Centurion, 0157",
        "51 Tembisa Road, Tembisa, 1632",
        "29 Germiston Avenue, Germiston, 1401",
        "16 Boksburg Street, Boksburg, 1459",
    ],
    "KwaZulu-Natal": [
        "88 Smith Street, Durban, 4001",
        "12 Marine Parade, Umhlanga, 4319",
        "45 Pietermaritzburg Road, PMB, 3200",
        "23 Richards Bay Road, Richards Bay, 3900",
        "67 King Shaka Drive, Ballito, 4399",
        "34 Newcastle Avenue, Newcastle, 2940",
        "9 Ladysmith Road, Ladysmith, 3370",
        "56 Tongaat Highway, Tongaat, 4400",
        "78 Pinetown Avenue, Pinetown, 3610",
        "41 Chatsworth Drive, Chatsworth, 4092",
    ],
    "Free State": [
        "23 Bloemfontein Drive, Bloemfontein, 9301",
        "56 Welkom Road, Welkom, 9460",
        "11 President Brand Street, Bloemfontein, 9301",
        "78 Bethlehem Avenue, Bethlehem, 9700",
        "34 Kroonstad Road, Kroonstad, 9500",
    ],
    "Limpopo": [
        "12 Polokwane Street, Polokwane, 0700",
        "45 Thohoyandou Road, Thohoyandou, 0950",
        "89 Tzaneen Drive, Tzaneen, 0850",
        "23 Musina Avenue, Musina, 0900",
        "67 Lephalale Road, Lephalale, 0555",
    ],
    "Mpumalanga": [
        "34 Nelspruit Road, Mbombela, 1200",
        "78 Witbank Avenue, Emalahleni, 1035",
        "12 Secunda Drive, Secunda, 2302",
        "56 White River Road, White River, 1240",
        "90 Middelburg Street, Middelburg, 1050",
    ],
    "Eastern Cape": [
        "23 Oxford Street, East London, 5201",
        "67 Port Elizabeth Main, Gqeberha, 6001",
        "11 Mthatha Road, Mthatha, 5099",
        "45 Grahamstown Drive, Makhanda, 6139",
        "89 Queenstown Avenue, Queenstown, 5319",
    ],
    "Western Cape": [
        "12 Long Street, Cape Town, 8001",
        "56 Stellenbosch Road, Stellenbosch, 7600",
        "34 Paarl Avenue, Paarl, 7646",
        "78 George Street, George, 6529",
        "23 Worcester Drive, Worcester, 6849",
    ],
}

# ─── Emergency contact first & last names ────────────────────
EC_FIRST_NAMES = [
    "Thandi", "Sipho", "Nomvula", "Bongani", "Lerato", "Mandla",
    "Zanele", "Tshepo", "Lindiwe", "Kagiso", "Nompumelelo", "Sibusiso",
    "Grace", "Johannes", "Maria", "David", "Sarah", "Michael", "Anna",
    "Pieter", "Fatima", "Ahmed", "Priya", "Rajesh", "Nokuthula",
    "Themba", "Palesa", "Mpho", "Boitumelo", "Karabo", "Dineo",
    "Thabiso", "Kelebogile", "Thato", "Refilwe",
]
EC_LAST_NAMES = [
    "Nkosi", "Mokoena", "Dlamini", "Zulu", "Ndlovu", "Khumalo",
    "Mkhize", "van der Merwe", "Botha", "du Plessis", "Pretorius",
    "Williams", "September", "Mthembu", "Sithole", "Shabalala",
    "Maseko", "Mahlangu", "Ngcobo", "Molefe", "Motaung", "Louw",
    "le Roux", "Venter", "Jansen", "Smith", "Adams", "Pillay",
    "Govender", "Maharaj", "Ntuli", "Cele", "Mabaso", "Tshabalala",
]

EC_RELATIONSHIPS = ["spouse", "parent", "sibling", "child", "partner"]


def generate_sa_id_number(birth_year: int, birth_month: int, birth_day: int, gender: str) -> str:
    """Generate a realistic SA ID number: YYMMDD GSSS C A Z
    YY = year, MM = month, DD = day
    GSSS = gender (0000-4999 female, 5000-9999 male) + sequence
    C = citizenship (0 = SA citizen)
    A = deprecated (usually 8)
    Z = checksum (Luhn)
    """
    yy = f"{birth_year % 100:02d}"
    mm = f"{birth_month:02d}"
    dd = f"{birth_day:02d}"

    if gender == "male":
        gsss = random.randint(5000, 9999)
    else:
        gsss = random.randint(0, 4999)

    citizenship = 0  # SA citizen
    deprecated = 8

    partial = f"{yy}{mm}{dd}{gsss:04d}{citizenship}{deprecated}"

    # Luhn checksum for last digit
    digits = [int(d) for d in partial]
    odd_sum = sum(digits[0::2])
    even_digits = ''.join(str(d) for d in digits[1::2])
    doubled = str(int(even_digits) * 2)
    even_sum = sum(int(d) for d in doubled)
    total = odd_sum + even_sum
    checksum = (10 - (total % 10)) % 10

    return f"{partial}{checksum}"


def generate_tax_number() -> str:
    """SA tax reference number: 10-digit starting with 0, 1, 2, 3, or 9."""
    first = random.choice([0, 1, 2, 3, 9])
    rest = random.randint(100000000, 999999999)
    return f"{first}{rest}"


def generate_psira_number() -> str:
    """PSIRA registration number: 7-digit numeric."""
    return str(random.randint(1000000, 9999999))


def generate_account_number(prefix: str) -> str:
    """Generate realistic SA bank account number (10 digits)."""
    suffix = random.randint(10000000, 99999999)
    return f"{prefix}{suffix}"


def generate_phone() -> str:
    """Generate SA mobile number."""
    prefix = random.choice(["060", "061", "062", "063", "064", "065",
                             "066", "067", "068", "069", "071", "072",
                             "073", "074", "076", "078", "079", "081",
                             "082", "083", "084"])
    return f"{prefix}{random.randint(1000000, 9999999)}"


# ─── MAIN SEEDING ────────────────────────────────────────────
print("=" * 60)
print("SEEDING EMPLOYEE DETAILS: Banking, PSIRA, Tax, Addresses")
print("=" * 60)

with engine.begin() as conn:
    employees = conn.execute(text(
        "SELECT employee_id, first_name, last_name, role, gender, province, "
        "       id_number, psira_number, psira_grade, bank_name, tax_number, "
        "       hire_date, address "
        "FROM employees WHERE org_id = :oid AND status = 'ACTIVE' "
        "ORDER BY employee_id"
    ), {"oid": ORG_ID}).fetchall()

    print(f"\nFound {len(employees)} active employees to update\n")

    updated = 0
    certs_created = 0

    for emp in employees:
        eid = emp.employee_id
        first = emp.first_name
        last = emp.last_name
        role = emp.role  # e.g., 'ARMED', 'UNARMED', 'SUPERVISOR'
        gender = (emp.gender or "male").lower()
        province = emp.province or "North West"

        # ── Banking Details ──
        bank = random.choices(SA_BANKS, weights=BANK_WEIGHTS, k=1)[0]
        bank_name = bank["name"]
        branch_code = bank["branch_code"]
        account_number = generate_account_number(bank["prefix"])
        account_type = random.choice(ACCOUNT_TYPES)

        # ── Tax Number ──
        tax_number = emp.tax_number or generate_tax_number()

        # ── ID Number (generate if missing or placeholder) ──
        id_number = emp.id_number
        if not id_number or len(id_number) < 13 or id_number.startswith("TEMP"):
            # Generate based on age 23-55
            birth_year = random.randint(1971, 2003)
            birth_month = random.randint(1, 12)
            birth_day = random.randint(1, 28)
            id_number = generate_sa_id_number(birth_year, birth_month, birth_day, gender)

        # ── PSIRA Details ──
        # Grade based on role
        if role in ("ARMED", "armed"):
            psira_grade = random.choice(["A", "B", "C"])
        elif role in ("SUPERVISOR", "supervisor"):
            psira_grade = random.choice(["A", "B"])
        elif role in ("MANAGER", "manager"):
            psira_grade = "A"
        else:
            psira_grade = random.choice(["C", "D", "E", "C", "D"])

        psira_number = emp.psira_number or generate_psira_number()
        # Expiry 1-4 years from now
        psira_expiry = date.today() + timedelta(days=random.randint(180, 1460))

        # ── Address ──
        addresses = PROVINCE_ADDRESSES.get(province, PROVINCE_ADDRESSES["North West"])
        address = random.choice(addresses)

        # ── Emergency Contact ──
        ec_first = random.choice(EC_FIRST_NAMES)
        ec_last = random.choice(EC_LAST_NAMES)
        # Avoid same name as employee
        while ec_first == first and ec_last == last:
            ec_first = random.choice(EC_FIRST_NAMES)
            ec_last = random.choice(EC_LAST_NAMES)
        ec_name = f"{ec_first} {ec_last} ({random.choice(EC_RELATIONSHIPS)})"
        ec_phone = generate_phone()

        # ── Hire Date ── (6-30 months ago)
        hire_date = emp.hire_date or (date.today() - timedelta(days=random.randint(180, 900)))

        # ── UPDATE employee ──
        conn.execute(text("""
            UPDATE employees SET
                bank_name = :bank_name,
                account_number = :account_number,
                branch_code = :branch_code,
                account_type = :account_type,
                tax_number = :tax_number,
                id_number = :id_number,
                psira_number = :psira_number,
                psira_grade = :psira_grade,
                psira_expiry_date = :psira_expiry,
                address = :address,
                emergency_contact_name = :ec_name,
                emergency_contact_phone = :ec_phone,
                hire_date = :hire_date
            WHERE employee_id = :eid
        """), {
            "bank_name": bank_name,
            "account_number": account_number,
            "branch_code": branch_code,
            "account_type": account_type,
            "tax_number": tax_number,
            "id_number": id_number,
            "psira_number": psira_number,
            "psira_grade": psira_grade,
            "psira_expiry": psira_expiry,
            "address": address,
            "ec_name": ec_name,
            "ec_phone": ec_phone,
            "hire_date": hire_date,
            "eid": eid,
        })
        updated += 1

        # ── CREATE CERTIFICATIONS ──
        # Check if employee already has certs
        existing_certs = conn.execute(text(
            "SELECT COUNT(*) FROM certifications WHERE employee_id = :eid"
        ), {"eid": eid}).scalar()

        if existing_certs == 0:
            # 1. PSIRA Grade Certificate (everyone gets one)
            psira_issue = psira_expiry - timedelta(days=random.choice([365*3, 365*5]))
            conn.execute(text("""
                INSERT INTO certifications
                    (employee_id, cert_type, issue_date, expiry_date, verified,
                     cert_number, issuing_authority, psira_grade, firearm_competency)
                VALUES
                    (:eid, :cert_type, :issue_date, :expiry_date, :verified,
                     :cert_number, :issuing_authority, :psira_grade, NULL)
            """), {
                "eid": eid,
                "cert_type": f"PSIRA Grade {psira_grade}",
                "issue_date": psira_issue,
                "expiry_date": psira_expiry,
                "verified": True,
                "cert_number": f"PSIRA-{psira_number}",
                "issuing_authority": "Private Security Industry Regulatory Authority",
                "psira_grade": f"GRADE_{psira_grade}",
            })
            certs_created += 1

            # 2. First Aid (80% of employees)
            if random.random() < 0.80:
                fa_issue = date.today() - timedelta(days=random.randint(30, 700))
                fa_expiry = fa_issue + timedelta(days=365*3)
                conn.execute(text("""
                    INSERT INTO certifications
                        (employee_id, cert_type, issue_date, expiry_date, verified,
                         cert_number, issuing_authority, psira_grade, firearm_competency)
                    VALUES
                        (:eid, 'First Aid Level 1', :issue_date, :expiry_date, :verified,
                         :cert_number, 'South African Red Cross Society', NULL, NULL)
                """), {
                    "eid": eid,
                    "issue_date": fa_issue,
                    "expiry_date": fa_expiry,
                    "verified": random.random() < 0.9,
                    "cert_number": f"FA-{random.randint(100000, 999999)}",
                })
                certs_created += 1

            # 3. Firearm competency (for ARMED and some SUPERVISORS)
            if role in ("ARMED", "armed") or (role in ("SUPERVISOR", "supervisor") and random.random() < 0.6):
                firearm_type = random.choice(["HANDGUN", "HANDGUN", "HANDGUN", "SHOTGUN"])
                fa_issue = date.today() - timedelta(days=random.randint(30, 500))
                fa_expiry = fa_issue + timedelta(days=365*5)
                conn.execute(text("""
                    INSERT INTO certifications
                        (employee_id, cert_type, issue_date, expiry_date, verified,
                         cert_number, issuing_authority, psira_grade, firearm_competency)
                    VALUES
                        (:eid, :cert_type, :issue_date, :expiry_date, :verified,
                         :cert_number, 'South African Police Service (SAPS)', NULL, :firearm_type)
                """), {
                    "eid": eid,
                    "cert_type": f"Firearm Competency - {firearm_type.title()}",
                    "issue_date": fa_issue,
                    "expiry_date": fa_expiry,
                    "verified": True,
                    "cert_number": f"SAPS-FC-{random.randint(100000, 999999)}",
                    "firearm_type": firearm_type,
                })
                certs_created += 1

            # 4. Fire Safety (40% of employees)
            if random.random() < 0.40:
                fs_issue = date.today() - timedelta(days=random.randint(60, 800))
                fs_expiry = fs_issue + timedelta(days=365*2)
                conn.execute(text("""
                    INSERT INTO certifications
                        (employee_id, cert_type, issue_date, expiry_date, verified,
                         cert_number, issuing_authority, psira_grade, firearm_competency)
                    VALUES
                        (:eid, 'Fire Safety Awareness', :issue_date, :expiry_date, :verified,
                         :cert_number, 'Fire Protection Association of Southern Africa', NULL, NULL)
                """), {
                    "eid": eid,
                    "issue_date": fs_issue,
                    "expiry_date": fs_expiry,
                    "verified": random.random() < 0.85,
                    "cert_number": f"FPASA-{random.randint(10000, 99999)}",
                })
                certs_created += 1

            # 5. CPR / Basic Life Support (30% of employees)
            if random.random() < 0.30:
                cpr_issue = date.today() - timedelta(days=random.randint(60, 600))
                cpr_expiry = cpr_issue + timedelta(days=365*2)
                conn.execute(text("""
                    INSERT INTO certifications
                        (employee_id, cert_type, issue_date, expiry_date, verified,
                         cert_number, issuing_authority, psira_grade, firearm_competency)
                    VALUES
                        (:eid, 'Basic Life Support (BLS)', :issue_date, :expiry_date, :verified,
                         :cert_number, 'Health Professions Council of South Africa', NULL, NULL)
                """), {
                    "eid": eid,
                    "issue_date": cpr_issue,
                    "expiry_date": cpr_expiry,
                    "verified": random.random() < 0.9,
                    "cert_number": f"HPCSA-BLS-{random.randint(10000, 99999)}",
                })
                certs_created += 1

        if updated % 20 == 0:
            print(f"  Updated {updated}/{len(employees)} employees...")

    print(f"\nDone! Updated {updated} employees, created {certs_created} certifications.")

# ── Verify ───────────────────────────────────────────────────
print("\n── VERIFICATION ──")
with engine.connect() as conn:
    row = conn.execute(text("""
        SELECT
            COUNT(*) as total,
            COUNT(bank_name) as has_bank,
            COUNT(tax_number) as has_tax,
            COUNT(psira_number) as has_psira,
            COUNT(address) as has_address,
            COUNT(emergency_contact_name) as has_emergency,
            COUNT(hire_date) as has_hire
        FROM employees WHERE org_id = :oid AND status = 'ACTIVE'
    """), {"oid": ORG_ID}).fetchone()

    print(f"  Total active:     {row.total}")
    print(f"  Has bank:         {row.has_bank}")
    print(f"  Has tax number:   {row.has_tax}")
    print(f"  Has PSIRA:        {row.has_psira}")
    print(f"  Has address:      {row.has_address}")
    print(f"  Has emergency:    {row.has_emergency}")
    print(f"  Has hire date:    {row.has_hire}")

    cert_count = conn.execute(text(
        "SELECT COUNT(*) FROM certifications c "
        "JOIN employees e ON c.employee_id = e.employee_id "
        "WHERE e.org_id = :oid"
    ), {"oid": ORG_ID}).scalar()
    print(f"  Total certs:      {cert_count}")

    # Sample one employee
    sample = conn.execute(text("""
        SELECT e.first_name, e.last_name, e.bank_name, e.account_number,
               e.branch_code, e.account_type, e.tax_number, e.id_number,
               e.psira_number, e.psira_grade, e.psira_expiry_date,
               e.address, e.emergency_contact_name, e.emergency_contact_phone,
               e.hire_date
        FROM employees e
        WHERE e.org_id = :oid AND e.status = 'ACTIVE'
        ORDER BY e.employee_id LIMIT 1
    """), {"oid": ORG_ID}).fetchone()

    if sample:
        print(f"\n── SAMPLE: {sample.first_name} {sample.last_name} ──")
        print(f"  Bank:       {sample.bank_name} ({sample.account_type})")
        print(f"  Account:    ****{sample.account_number[-4:]}")
        print(f"  Branch:     {sample.branch_code}")
        print(f"  Tax No:     {sample.tax_number}")
        print(f"  ID No:      {sample.id_number[:6]}****{sample.id_number[-3:]}")
        print(f"  PSIRA:      {sample.psira_number} (Grade {sample.psira_grade}, exp {sample.psira_expiry_date})")
        print(f"  Address:    {sample.address}")
        print(f"  Emergency:  {sample.emergency_contact_name} ({sample.emergency_contact_phone})")
        print(f"  Hire Date:  {sample.hire_date}")

print("\nAll done!")
