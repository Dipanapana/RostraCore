"""Seed comprehensive test data for all Industry Gap Closure features."""
import logging
logging.disable(logging.INFO)

from datetime import datetime, timedelta, date
from app.database import SessionLocal
from sqlalchemy import text
import json, random

db = SessionLocal()

ORG_ID = 1
USER_ID = 1  # testadmin

# Get real employee IDs
rows = db.execute(text("SELECT employee_id, first_name, last_name FROM employees WHERE org_id = :o LIMIT 20"), {"o": ORG_ID}).fetchall()
employees = [(r[0], r[1], r[2]) for r in rows]
print(f"Found {len(employees)} employees")

# Get real site IDs
sites = db.execute(text("SELECT site_id, site_name FROM sites WHERE org_id = :o LIMIT 10"), {"o": ORG_ID}).fetchall()
site_ids = [s[0] for s in sites]
print(f"Found {len(sites)} sites")

# Get user IDs
users = db.execute(text("SELECT user_id, email FROM users WHERE org_id = :o LIMIT 10"), {"o": ORG_ID}).fetchall()
user_ids = [u[0] for u in users]
print(f"Found {len(users)} users")

now = datetime.utcnow()

# --- 1. EMERGENCY ALERTS ---
print("\n=== Seeding Emergency Alerts ===")
alerts_data = [
    ("panic", "active", 0, None),
    ("duress", "active", 1, "Guard under threat at front gate"),
    ("medical", "acknowledged", 2, "Guard collapsed, ambulance called"),
    ("fire", "dispatched", 3, "Fire in storage room at Site B"),
    ("panic", "resolved", 4, "Resolved - false alarm, accidental trigger"),
    ("duress", "resolved", 5, "Suspect apprehended by response team"),
    ("medical", "false_alarm", 6, "Guard tested panic button accidentally"),
    ("panic", "active", 7, "Armed robbery in progress!"),
]
for atype, status, emp_idx, notes in alerts_data:
    emp = employees[emp_idx % len(employees)]
    triggered_at = now - timedelta(hours=random.randint(1, 72))
    ack_at = triggered_at + timedelta(minutes=3) if status in ("acknowledged", "dispatched", "resolved") else None
    resolved_at = triggered_at + timedelta(hours=1) if status in ("resolved", "false_alarm") else None
    site = random.choice(site_ids) if site_ids else None

    db.execute(text("""
        INSERT INTO emergency_alerts (org_id, employee_id, triggered_by_user_id, alert_type, status,
            latitude, longitude, site_id, notes, acknowledged_by_user_id, acknowledged_at,
            resolved_at, resolution_notes, triggered_at)
        VALUES (:org, :emp, :usr, :atype, :status, :lat, :lng, :site, :notes, :ack_user, :ack_at, :res_at, :res_notes, :trig_at)
    """), {
        "org": ORG_ID, "emp": emp[0], "usr": USER_ID, "atype": atype, "status": status,
        "lat": -26.2 + random.uniform(-0.1, 0.1), "lng": 28.0 + random.uniform(-0.1, 0.1),
        "site": site, "notes": notes,
        "ack_user": USER_ID if ack_at else None, "ack_at": ack_at,
        "res_at": resolved_at, "res_notes": f"Resolved: {notes}" if resolved_at else None,
        "trig_at": triggered_at,
    })
print(f"  Created {len(alerts_data)} emergency alerts")

# --- 2. LONE WORKER SESSIONS ---
print("\n=== Seeding Lone Worker Sessions ===")
statuses_lw = ["active", "active", "active", "overdue", "ended", "ended", "escalated", "active"]
for i in range(min(8, len(employees))):
    emp = employees[i]
    st = statuses_lw[i]
    started = now - timedelta(hours=random.randint(1, 48))
    interval = random.choice([15, 30, 60])
    missed = random.randint(1, 3) if st in ("overdue", "escalated") else 0
    ended = started + timedelta(hours=8) if st == "ended" else None
    last_check = now - timedelta(minutes=random.randint(5, 120))
    next_due = last_check + timedelta(minutes=interval)

    db.execute(text("""
        INSERT INTO lone_worker_sessions (org_id, employee_id, user_id, site_id,
            check_in_interval_minutes, status, last_check_in, next_check_in_due,
            missed_check_ins, escalation_level, last_latitude, last_longitude, started_at, ended_at)
        VALUES (:org, :emp, :usr, :site, :interval, :status, :last_ci, :next_ci,
            :missed, :esc, :lat, :lng, :started, :ended)
    """), {
        "org": ORG_ID, "emp": emp[0], "usr": USER_ID,
        "site": random.choice(site_ids) if site_ids else None,
        "interval": interval, "status": st,
        "last_ci": last_check, "next_ci": next_due,
        "missed": missed, "esc": min(missed, 3),
        "lat": -26.2 + random.uniform(-0.1, 0.1), "lng": 28.0 + random.uniform(-0.1, 0.1),
        "started": started, "ended": ended,
    })
print("  Created 8 lone worker sessions")

# --- 3. CHAT CHANNELS & MESSAGES ---
print("\n=== Seeding Chat Channels & Messages ===")
channels = [
    ("Ops Control Room", "group"),
    ("Night Shift Team", "group"),
    ("Site Alpha Guard Chat", "site"),
    ("Incident Response", "group"),
    ("Management Updates", "broadcast"),
]
channel_ids = []
for name, ctype in channels:
    result = db.execute(text("""
        INSERT INTO chat_channels (org_id, channel_type, name, created_by_user_id, is_active)
        VALUES (:org, :ctype, :name, :usr, true) RETURNING channel_id
    """), {"org": ORG_ID, "ctype": ctype, "name": name, "usr": USER_ID})
    cid = result.fetchone()[0]
    channel_ids.append(cid)

    for uid in user_ids[:5]:
        try:
            db.execute(text("INSERT INTO channel_members (channel_id, user_id) VALUES (:cid, :uid)"),
                       {"cid": cid, "uid": uid})
        except Exception:
            pass

msg_pool = [
    "All guards check in please",
    "Perimeter clear, no incidents",
    "Suspicious vehicle spotted at Gate 3",
    "Copy that, dispatching patrol",
    "Guard shift change complete at 18:00",
    "Reminder: Monthly inspection tomorrow",
    "All clear on the north side",
    "Roger, maintaining position",
    "Need backup at parking level 2",
    "Response team en route, ETA 5 min",
    "Incident resolved, filing report now",
    "Good work team, all clear",
]
for cid in channel_ids:
    for msg in random.sample(msg_pool, 6):
        sent_at = now - timedelta(hours=random.randint(0, 24), minutes=random.randint(0, 59))
        db.execute(text("""
            INSERT INTO chat_messages (channel_id, sender_id, content, message_type, sent_at)
            VALUES (:cid, :sender, :content, 'text', :sent_at)
        """), {"cid": cid, "sender": random.choice(user_ids), "content": msg, "sent_at": sent_at})
print(f"  Created {len(channels)} channels with messages")

# --- 4. POST ORDERS ---
print("\n=== Seeding Post Orders ===")
post_orders = [
    ("Night Patrol Procedures", "1. Check all entry points every hour\n2. Log any suspicious activity\n3. Verify alarm systems are armed\n4. Report to control room at 22:00, 02:00, and 06:00", "active"),
    ("Vehicle Access Control", "1. Check all vehicle permits\n2. Record plate numbers in log\n3. No unauthorized vehicles past boom gate\n4. Escort all delivery vehicles", "active"),
    ("Emergency Evacuation Plan", "1. Sound alarm immediately\n2. Direct occupants to Assembly Point A\n3. Do headcount using daily register\n4. Report to control room\n5. Do NOT re-enter building", "active"),
    ("Key Management Protocol", "1. Keys issued only against signed register\n2. Master keys never leave control room\n3. Lost keys: report immediately to supervisor\n4. Monthly key audit required", "active"),
    ("Visitor Management", "1. All visitors sign in at reception\n2. Issue visitor badge with photo\n3. Escort visitors to meeting rooms\n4. Collect badge on departure", "draft"),
]
for title, content, status in post_orders:
    site = random.choice(site_ids) if site_ids else None
    result = db.execute(text("""
        INSERT INTO post_orders (org_id, site_id, title, content, version, status,
            requires_acknowledgment, created_by_user_id, effective_from)
        VALUES (:org, :site, :title, :content, 1, :status, true, :usr, :eff) RETURNING post_order_id
    """), {"org": ORG_ID, "site": site, "title": title, "content": content,
           "status": status, "usr": USER_ID, "eff": now - timedelta(days=30)})
    po_id = result.fetchone()[0]

    if status == "active":
        for emp in random.sample(employees, min(5, len(employees))):
            db.execute(text("""
                INSERT INTO post_order_acknowledgments (post_order_id, employee_id, acknowledged_at)
                VALUES (:po, :emp, :ack_at)
            """), {"po": po_id, "emp": emp[0], "ack_at": now - timedelta(days=random.randint(0, 14))})
print(f"  Created {len(post_orders)} post orders with acknowledgments")

# --- 5. PSIRA WAGE RATES ---
print("\n=== Seeding PSIRA Wage Rates ===")
existing = db.execute(text("SELECT COUNT(*) FROM psira_wage_rates")).scalar()
if existing < 10:
    grades = {"A": 38.77, "B": 34.42, "C": 30.07, "D": 27.16, "E": 24.69}
    areas = {1: 1.0, 2: 1.0, 3: 0.9}
    rate_types = {"normal": 1.0, "overtime": 1.5, "sunday": 1.5, "public_holiday": 2.0, "night": 1.1}

    for grade, base in grades.items():
        for area, area_mult in areas.items():
            for rtype, mult in rate_types.items():
                rate = round(base * area_mult * mult, 2)
                monthly = round(rate * 160, 2)
                db.execute(text("""
                    INSERT INTO psira_wage_rates (effective_from, effective_to, grade, area, rate_type, hourly_rate, monthly_minimum)
                    VALUES (:fr, :to, :g, :a, :rt, :hr, :mm)
                """), {"fr": "2025-03-01", "to": "2026-02-28", "g": grade, "a": area,
                       "rt": rtype, "hr": rate, "mm": monthly})
    print("  Seeded 75 PSIRA wage rates")
else:
    print(f"  Already have {existing} rates, skipping")

# --- 6. POPIA CONSENTS ---
print("\n=== Seeding POPIA Consents ===")
consent_types = [
    ("employment", "Employment contract data processing", "Legitimate interest"),
    ("biometric", "Fingerprint attendance tracking", "Consent"),
    ("cctv", "CCTV surveillance monitoring", "Legitimate interest"),
    ("marketing", "Company newsletters and updates", "Consent"),
    ("background_check", "Criminal record verification", "Legal obligation"),
]
for emp in employees[:12]:
    for ctype, purpose, basis in random.sample(consent_types, random.randint(2, 4)):
        db.execute(text("""
            INSERT INTO popia_consents (org_id, employee_id, consent_type, purpose, lawful_basis,
                data_categories, is_active)
            VALUES (:org, :emp, :ctype, :purpose, :basis, :cats, 1)
        """), {"org": ORG_ID, "emp": emp[0], "ctype": ctype, "purpose": purpose,
               "basis": basis, "cats": "personal,employment,biometric"})
print(f"  Created consents for {min(12, len(employees))} employees")

# --- 7. DATA SUBJECT REQUESTS ---
print("\n=== Seeding Data Subject Requests ===")
dsr_data = [
    ("Thabo Mokoena", "thabo.m@email.co.za", "access", "I want to see all data you hold about me", "completed"),
    ("Nomsa Dlamini", "nomsa.d@email.co.za", "erasure", "Please delete my biometric data", "processing"),
    ("Johan van Wyk", "johan.vw@email.co.za", "rectification", "My address is incorrect in your system", "received"),
    ("Palesa Nkosi", "palesa.n@email.co.za", "portability", "Please export my employment records", "received"),
]
for name, email, rtype, desc, status in dsr_data:
    due = now + timedelta(days=30)
    completed = now - timedelta(days=5) if status == "completed" else None
    db.execute(text("""
        INSERT INTO data_subject_requests (org_id, requestor_name, requestor_email, request_type,
            description, status, due_date, completed_at, handled_by_user_id)
        VALUES (:org, :name, :email, :rtype, :desc, :status, :due, :comp, :handler)
    """), {"org": ORG_ID, "name": name, "email": email, "rtype": rtype,
           "desc": desc, "status": status, "due": due.date(),
           "comp": completed, "handler": USER_ID if status != "received" else None})
print(f"  Created {len(dsr_data)} data subject requests")

# --- 8. FIREARMS ---
print("\n=== Seeding Firearms ===")
firearms_data = [
    ("FA-001-2024", "Glock", "17", "9mm", "handgun", "LIC-00123", "2027-06-30", "in_armory"),
    ("FA-002-2024", "Beretta", "92FS", "9mm", "handgun", "LIC-00124", "2027-06-30", "issued"),
    ("FA-003-2024", "Smith & Wesson", "M&P", "9mm", "handgun", "LIC-00125", "2027-06-30", "issued"),
    ("FA-004-2024", "Mossberg", "500", "12ga", "shotgun", "LIC-00126", "2027-06-30", "in_armory"),
    ("FA-005-2024", "Glock", "19", "9mm", "handgun", "LIC-00127", "2026-03-15", "in_armory"),
    ("FA-006-2024", "CZ", "75B", "9mm", "handgun", "LIC-00128", "2027-12-31", "maintenance"),
    ("FA-007-2024", "Taurus", "G3C", "9mm", "handgun", "LIC-00129", "2027-06-30", "issued"),
    ("FA-008-2024", "Remington", "870", "12ga", "shotgun", "LIC-00130", "2026-09-15", "in_armory"),
]
firearm_ids = []
for serial, make, model, cal, ftype, lic, exp, status in firearms_data:
    holder = random.choice(employees)[0] if status == "issued" else None
    result = db.execute(text("""
        INSERT INTO firearms (org_id, serial_number, make, model, caliber, firearm_type,
            license_number, license_expiry, status, current_holder_id, purchase_date)
        VALUES (:org, :sn, :make, :model, :cal, :ftype, :lic, :exp, :status, :holder, :pdate)
        RETURNING firearm_id
    """), {"org": ORG_ID, "sn": serial, "make": make, "model": model, "cal": cal,
           "ftype": ftype, "lic": lic, "exp": exp, "status": status, "holder": holder,
           "pdate": "2024-01-15"})
    fid = result.fetchone()[0]
    firearm_ids.append(fid)

    if status == "issued" and holder:
        db.execute(text("""
            INSERT INTO firearm_issues (firearm_id, employee_id, issued_by_user_id,
                ammunition_issued, condition_on_issue)
            VALUES (:fid, :emp, :usr, :ammo, 'good')
        """), {"fid": fid, "emp": holder, "usr": USER_ID, "ammo": random.choice([10, 15, 20])})

for fid in firearm_ids:
    for months_ago in [6, 3, 0]:
        insp_date = (now - timedelta(days=months_ago * 30)).date()
        passed = 1 if random.random() > 0.1 else 0
        db.execute(text("""
            INSERT INTO firearm_inspections (firearm_id, inspected_by_user_id, inspection_date,
                condition, passed, next_inspection_due, notes)
            VALUES (:fid, :usr, :idate, :cond, :passed, :nxt, :notes)
        """), {"fid": fid, "usr": USER_ID, "idate": insp_date,
               "cond": random.choice(["good", "good", "fair", "excellent"]),
               "passed": passed, "nxt": insp_date + timedelta(days=90),
               "notes": "Routine quarterly inspection" if passed else "Needs servicing"})
print(f"  Created {len(firearms_data)} firearms with issues and inspections")

# --- 9. FORM TEMPLATES & SUBMISSIONS ---
print("\n=== Seeding Form Templates & Submissions ===")
templates = [
    ("Daily Site Inspection", "inspection", [
        {"name": "perimeter_secure", "label": "Perimeter Secure?", "type": "checkbox", "required": True},
        {"name": "cctv_operational", "label": "CCTV Operational?", "type": "checkbox", "required": True},
        {"name": "fire_extinguishers", "label": "Fire Extinguishers Checked?", "type": "checkbox", "required": True},
        {"name": "condition", "label": "Overall Condition", "type": "select", "options": ["Good", "Fair", "Poor"], "required": True},
        {"name": "notes", "label": "Additional Notes", "type": "textarea", "required": False},
    ]),
    ("Incident Report Form", "report", [
        {"name": "incident_type", "label": "Incident Type", "type": "select", "options": ["Theft", "Vandalism", "Trespassing", "Medical", "Fire", "Other"], "required": True},
        {"name": "description", "label": "Description", "type": "textarea", "required": True},
        {"name": "witnesses", "label": "Number of Witnesses", "type": "number", "required": False},
        {"name": "police_called", "label": "Police Called?", "type": "checkbox", "required": True},
    ]),
    ("Vehicle Inspection Checklist", "checklist", [
        {"name": "vehicle_reg", "label": "Vehicle Registration", "type": "text", "required": True},
        {"name": "tires_ok", "label": "Tires in Good Condition?", "type": "checkbox", "required": True},
        {"name": "lights_working", "label": "All Lights Working?", "type": "checkbox", "required": True},
        {"name": "fuel_level", "label": "Fuel Level", "type": "select", "options": ["Full", "3/4", "Half", "1/4", "Empty"], "required": True},
        {"name": "mileage", "label": "Current Mileage", "type": "number", "required": True},
    ]),
    ("Guard Shift Handover", "checklist", [
        {"name": "keys_handed", "label": "All Keys Handed Over?", "type": "checkbox", "required": True},
        {"name": "equipment_check", "label": "Equipment Check Complete?", "type": "checkbox", "required": True},
        {"name": "incidents_reported", "label": "Any Incidents to Report?", "type": "checkbox", "required": True},
        {"name": "handover_notes", "label": "Handover Notes", "type": "textarea", "required": True},
    ]),
]
template_ids = []
for name, ftype, fields in templates:
    result = db.execute(text("""
        INSERT INTO form_templates (org_id, name, form_type, fields, status, requires_signature, created_by_user_id)
        VALUES (:org, :name, :ftype, :fields, 'active', :sig, :usr) RETURNING template_id
    """), {"org": ORG_ID, "name": name, "ftype": ftype, "fields": json.dumps(fields),
           "sig": ftype == "inspection", "usr": USER_ID})
    tid = result.fetchone()[0]
    template_ids.append(tid)

    for k in range(random.randint(3, 8)):
        sub_data = {}
        for f in fields:
            if f["type"] == "checkbox":
                sub_data[f["name"]] = random.choice([True, False])
            elif f["type"] == "select":
                sub_data[f["name"]] = random.choice(f.get("options", ["N/A"]))
            elif f["type"] == "number":
                sub_data[f["name"]] = random.randint(1, 100)
            elif f["type"] == "textarea":
                sub_data[f["name"]] = f"Inspection notes entry {k+1}"
            else:
                sub_data[f["name"]] = f"Value-{k+1}"

        site = random.choice(site_ids) if site_ids else None
        submitted_at = now - timedelta(days=random.randint(0, 30))
        db.execute(text("""
            INSERT INTO form_submissions (template_id, org_id, submitted_by_user_id, site_id,
                data, gps_latitude, gps_longitude, submitted_at)
            VALUES (:tid, :org, :usr, :site, :data, :lat, :lng, :sub_at)
        """), {"tid": tid, "org": ORG_ID, "usr": random.choice(user_ids),
               "site": site, "data": json.dumps(sub_data),
               "lat": -26.2 + random.uniform(-0.05, 0.05),
               "lng": 28.0 + random.uniform(-0.05, 0.05),
               "sub_at": submitted_at})
print(f"  Created {len(templates)} form templates with submissions")

# --- 10. REPORT SCHEDULES ---
print("\n=== Seeding Report Schedules ===")
schedules = [
    ("Daily Activity Summary", "daily_activity", "daily", "07:00"),
    ("Weekly Incident Report", "incident_summary", "weekly", "08:00"),
    ("Monthly Compliance Report", "monthly_compliance", "monthly", "09:00"),
    ("Weekly Patrol Completion", "patrol_report", "weekly", "08:00"),
    ("Daily Guard Attendance", "daily_activity", "daily", "06:00"),
]
for name, rtype, freq, tod in schedules:
    db.execute(text("""
        INSERT INTO report_schedules (org_id, report_type, name, frequency, time_of_day,
            recipients, enabled, created_by_user_id)
        VALUES (:org, :rtype, :name, :freq, :tod, :recipients, true, :usr)
    """), {"org": ORG_ID, "rtype": rtype, "name": name, "freq": freq, "tod": tod,
           "recipients": json.dumps(["ops@testsecurity.co.za", "admin@testsecurity.co.za"]),
           "usr": USER_ID})
print(f"  Created {len(schedules)} report schedules")

# --- 11. LOCATION PINGS ---
print("\n=== Seeding Location Pings ===")
ping_count = 0
for emp in employees[:6]:
    start = now - timedelta(hours=random.randint(1, 8))
    base_lat = -26.2 + random.uniform(-0.05, 0.05)
    base_lng = 28.0 + random.uniform(-0.05, 0.05)
    for minute in range(0, 480, 5):
        ping_time = start + timedelta(minutes=minute)
        if ping_time > now:
            break
        lat = base_lat + random.uniform(-0.002, 0.002)
        lng = base_lng + random.uniform(-0.002, 0.002)
        db.execute(text("""
            INSERT INTO location_pings (employee_id, org_id, latitude, longitude,
                accuracy, battery_level, is_moving, timestamp)
            VALUES (:emp, :org, :lat, :lng, :acc, :bat, :moving, :ts)
        """), {"emp": emp[0], "org": ORG_ID, "lat": lat, "lng": lng,
               "acc": random.uniform(3, 20), "bat": max(10, 100 - minute / 5),
               "moving": random.choice([True, False]), "ts": ping_time})
        ping_count += 1
print(f"  Created {ping_count} location pings for 6 guards")

# --- COMMIT ---
db.commit()
db.close()

print("\n========================================")
print("  ALL TEST DATA SEEDED SUCCESSFULLY!")
print("========================================")
print(f"""
Summary:
  - 8 emergency alerts (active, acknowledged, dispatched, resolved, false_alarm)
  - 8 lone worker sessions (active, overdue, escalated, ended)
  - 5 chat channels with messages
  - 5 post orders with acknowledgments
  - 75 PSIRA wage rates (5 grades x 3 areas x 5 rate types)
  - ~36 POPIA consent records
  - 4 data subject requests
  - 8 firearms with issue records & inspections
  - 4 form templates with ~20 submissions
  - 5 report schedules
  - ~{ping_count} GPS location pings
  - Subscription: ACTIVE until 2027-02-23
""")
