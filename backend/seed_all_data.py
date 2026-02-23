"""
Comprehensive seed data script for RostraCore.

Populates ALL empty modules with realistic South African security industry data.
Uses existing org_id=18, user_id=25 and references existing employees, clients, sites.

Run from backend directory: python seed_all_data.py
"""

import sys
import random
from datetime import datetime, timedelta, date, time, timezone

sys.path.append('.')

from sqlalchemy import text
from app.database import SessionLocal
from app.models.certification import Certification, PSIRAGrade, FirearmCompetencyType
from app.models.incident import Incident, IncidentSeverity, IncidentStatus
from app.models.patrol import PatrolTour, PatrolCheckpoint, PatrolRun, PatrolScan, PatrolRunStatus
from app.models.training import TrainingCourse, TrainingRecord, TrainingStatus, TrainingCategory
from app.models.asset import Asset, AssetHistory, AssetStatus, AssetCategory
from app.models.document import Document
from app.models.comm_log import CommLog, CommType, CommPriority
from app.models.occurrence_book import OccurrenceEntry, OccurrenceCategory
from app.models.sla_compliance import SLARecord, SLAStatus
from app.models.client_report import ClientReport
from app.models.client_satisfaction import ClientSatisfaction
from app.models.inspection import InspectionTemplate, Inspection, InspectionStatus
from app.models.geofence import GeofenceViolation, ViolationType
from app.models.deployment_history import DeploymentRecord
from app.models.notification import Notification, NotificationType
from app.models.site import Site

# ── Constants ──────────────────────────────────────────────────────────────────
ORG_ID = 18
USER_ID = 25
NOW = datetime.now(timezone.utc)
TODAY = date.today()

random.seed(42)  # Reproducible data


def get_existing_ids(db):
    """Fetch existing entity IDs from the database."""
    emp_rows = db.execute(
        text("SELECT employee_id FROM employees WHERE org_id = :org_id"),
        {"org_id": ORG_ID}
    ).fetchall()
    employee_ids = [r[0] for r in emp_rows]

    site_rows = db.execute(
        text("SELECT site_id, site_name, gps_lat, gps_lng FROM sites WHERE org_id = :org_id"),
        {"org_id": ORG_ID}
    ).fetchall()
    sites = [(r[0], r[1], r[2], r[3]) for r in site_rows]
    site_ids = [r[0] for r in site_rows]

    client_rows = db.execute(
        text("SELECT client_id, client_name FROM clients WHERE org_id = :org_id"),
        {"org_id": ORG_ID}
    ).fetchall()
    clients = [(r[0], r[1]) for r in client_rows]
    client_ids = [r[0] for r in client_rows]

    shift_rows = db.execute(
        text("SELECT shift_id FROM shifts WHERE org_id = :org_id ORDER BY shift_id DESC LIMIT 100"),
        {"org_id": ORG_ID}
    ).fetchall()
    shift_ids = [r[0] for r in shift_rows]

    return employee_ids, sites, site_ids, clients, client_ids, shift_ids


def random_date_in_range(start_days_ago, end_days_ago=0):
    """Return a random date between start_days_ago and end_days_ago."""
    days = random.randint(end_days_ago, start_days_ago)
    return TODAY - timedelta(days=days)


def random_datetime_in_range(start_days_ago, end_days_ago=0):
    """Return a random datetime between start_days_ago and end_days_ago."""
    d = random_date_in_range(start_days_ago, end_days_ago)
    hour = random.randint(0, 23)
    minute = random.choice([0, 15, 30, 45])
    return datetime(d.year, d.month, d.day, hour, minute, tzinfo=timezone.utc)


# ── 1. Certifications ─────────────────────────────────────────────────────────
def seed_certifications(db, employee_ids):
    """Create PSIRA, firearms, and first aid certifications."""
    print("\n1. Seeding certifications...")
    count = 0
    grades = [PSIRAGrade.GRADE_A, PSIRAGrade.GRADE_B, PSIRAGrade.GRADE_C]
    grade_weights = [0.3, 0.4, 0.3]

    for emp_id in employee_ids:
        grade = random.choices(grades, weights=grade_weights)[0]

        # PSIRA registration for everyone
        days_ago = random.randint(30, 700)
        issue = TODAY - timedelta(days=days_ago)
        # Some expiring soon, some expired for cert-alerts testing
        if random.random() < 0.1:
            expiry = TODAY - timedelta(days=random.randint(1, 30))  # Expired
        elif random.random() < 0.15:
            expiry = TODAY + timedelta(days=random.randint(1, 30))  # Expiring soon
        else:
            expiry = TODAY + timedelta(days=random.randint(60, 365))

        db.add(Certification(
            employee_id=emp_id,
            cert_type=f"PSIRA Grade {grade.value}",
            cert_number=f"PSR-{random.randint(100000, 999999)}",
            issue_date=issue,
            expiry_date=expiry,
            verified=random.random() > 0.1,
            issuing_authority="PSiRA",
            psira_grade=grade,
        ))
        count += 1

        # Firearms competency for Grade A (armed)
        if grade == PSIRAGrade.GRADE_A:
            f_issue = TODAY - timedelta(days=random.randint(60, 500))
            if random.random() < 0.08:
                f_expiry = TODAY - timedelta(days=random.randint(1, 20))
            else:
                f_expiry = TODAY + timedelta(days=random.randint(90, 730))
            db.add(Certification(
                employee_id=emp_id,
                cert_type="Firearms Competency - Handgun",
                cert_number=f"FCC-{random.randint(100000, 999999)}",
                issue_date=f_issue,
                expiry_date=f_expiry,
                verified=True,
                issuing_authority="SAPS Central Firearms Registry",
                firearm_competency=FirearmCompetencyType.HANDGUN,
            ))
            count += 1

        # First Aid Level 1 for ~50% of employees
        if random.random() < 0.5:
            fa_issue = TODAY - timedelta(days=random.randint(30, 600))
            fa_expiry = fa_issue + timedelta(days=730)  # 2 years validity
            db.add(Certification(
                employee_id=emp_id,
                cert_type="First Aid Level 1",
                cert_number=f"FA1-{random.randint(10000, 99999)}",
                issue_date=fa_issue,
                expiry_date=fa_expiry,
                verified=random.random() > 0.2,
                issuing_authority="St John Ambulance SA",
            ))
            count += 1

    db.commit()
    print(f"   + Created {count} certifications")
    return count


# ── 2. Incidents ───────────────────────────────────────────────────────────────
def seed_incidents(db, employee_ids, site_ids, shift_ids):
    """Create incident reports across sites."""
    print("\n2. Seeding incidents...")
    count = 0

    incident_types = ["theft", "trespassing", "vandalism", "violence", "medical", "fire", "other"]
    descriptions = {
        "theft": [
            "Copper cables stolen from perimeter fence section B.",
            "Employee reported missing equipment from security office.",
            "CCTV footage shows unauthorized removal of metal scrap.",
            "Client reported stolen laptop from reception area during night shift.",
        ],
        "trespassing": [
            "Three individuals found inside perimeter after hours.",
            "Unauthorized vehicle spotted in restricted parking area.",
            "Person climbed over north wall, apprehended by patrol team.",
            "Group of minors found trespassing near storage facility.",
        ],
        "vandalism": [
            "Graffiti sprayed on east boundary wall overnight.",
            "Security camera #4 found damaged, appears deliberate.",
            "Vehicle windshield broken in parking lot.",
            "Fire extinguisher discharged in hallway maliciously.",
        ],
        "violence": [
            "Altercation between two visitors at main entrance.",
            "Security officer assaulted while conducting access control.",
            "Verbal confrontation escalated, SAPS called to assist.",
        ],
        "medical": [
            "Employee collapsed during shift, ambulance dispatched.",
            "Visitor suffered minor cut, first aid administered.",
            "Guard reported chest pains, taken to clinic.",
        ],
        "fire": [
            "Small fire in electrical room, extinguished by on-site team.",
            "Smoke detected from transformer box, JMPD notified.",
        ],
        "other": [
            "Suspicious package found at main gate, bomb squad notified.",
            "Stray dogs entered premises through broken fence.",
            "Power outage lasted 4 hours, backup generator deployed.",
        ],
    }

    severities = ["low", "medium", "high", "critical"]
    sev_weights = [0.3, 0.35, 0.25, 0.1]
    statuses = ["reported", "investigating", "resolved", "closed"]

    for i in range(25):
        inc_type = random.choice(incident_types)
        desc = random.choice(descriptions[inc_type])
        sev = random.choices(severities, weights=sev_weights)[0]
        status = random.choice(statuses)
        reported_at = random_datetime_in_range(90, 0)
        site_id = random.choice(site_ids)
        emp_id = random.choice(employee_ids)

        resolved_at = None
        resolution_notes = None
        if status in ("resolved", "closed"):
            resolved_at = reported_at + timedelta(hours=random.randint(1, 72))
            resolution_notes = random.choice([
                "Matter resolved, SAPS case number obtained.",
                "Situation contained, additional patrols scheduled.",
                "Investigation complete, perpetrators identified.",
                "Client notified, preventive measures implemented.",
                "Repaired damage, increased surveillance in area.",
            ])

        db.execute(text("""
            INSERT INTO incidents (org_id, site_id, shift_id, reported_by_employee_id,
                reported_by_user_id, incident_type, description, severity, status,
                reported_at, resolved_at, resolution_notes)
            VALUES (:org_id, :site_id, :shift_id, :emp_id, :user_id, :inc_type,
                :desc, :sev, :status, :reported_at, :resolved_at, :resolution_notes)
        """), {
            "org_id": ORG_ID,
            "site_id": site_id,
            "shift_id": random.choice(shift_ids) if shift_ids and random.random() > 0.3 else None,
            "emp_id": emp_id,
            "user_id": USER_ID if random.random() > 0.7 else None,
            "inc_type": inc_type,
            "desc": desc,
            "sev": sev,
            "status": status,
            "reported_at": reported_at,
            "resolved_at": resolved_at,
            "resolution_notes": resolution_notes,
        })
        count += 1

    db.commit()
    print(f"   + Created {count} incidents")
    return count


# ── 3. Patrol Tours, Checkpoints, Runs, and Scans ─────────────────────────────
def seed_patrols(db, employee_ids, sites, site_ids):
    """Create patrol tours with checkpoints, runs, and scans."""
    print("\n3. Seeding patrols (tours, checkpoints, runs, scans)...")
    tour_count = 0
    run_count = 0
    scan_count = 0

    checkpoint_names = [
        "Main Gate", "North Perimeter", "East Boundary Wall", "Parking Lot A",
        "Generator Room", "Server Room Entrance", "Loading Bay", "South Gate",
        "Rooftop Access", "Fire Escape Stairwell", "Reception Area",
        "Cafeteria", "Storage Facility", "CCTV Control Room", "West Fence Line",
        "Transformer Box", "Water Pump Station", "Guard House B",
    ]

    for site_id, site_name, gps_lat, gps_lng in sites[:10]:
        # Create 1 tour per site for the first 10 sites
        tour = PatrolTour(
            org_id=ORG_ID,
            site_id=site_id,
            name=f"{site_name} Perimeter Patrol",
            description=f"Standard perimeter patrol route for {site_name}. Cover all access points and key areas.",
            is_active=True,
            created_at=NOW - timedelta(days=random.randint(30, 90)),
        )
        db.add(tour)
        db.flush()
        tour_count += 1

        # Add 4-6 checkpoints per tour
        num_checkpoints = random.randint(4, 6)
        selected_checkpoints = random.sample(checkpoint_names, num_checkpoints)
        checkpoint_objects = []

        for order, cp_name in enumerate(selected_checkpoints, 1):
            lat_offset = random.uniform(-0.002, 0.002) if gps_lat else None
            lng_offset = random.uniform(-0.002, 0.002) if gps_lng else None
            cp = PatrolCheckpoint(
                tour_id=tour.tour_id,
                name=cp_name,
                description=f"Check {cp_name.lower()} for any irregularities.",
                order_num=order,
                qr_code=f"QR-{site_id}-{order:02d}",
                gps_lat=(gps_lat + lat_offset) if gps_lat else None,
                gps_lng=(gps_lng + lng_offset) if gps_lng else None,
                photo_required=random.random() > 0.6,
            )
            db.add(cp)
            checkpoint_objects.append(cp)

        db.flush()

        # Create 3-6 patrol runs per tour over the last 14 days
        num_runs = random.randint(3, 6)
        for _ in range(num_runs):
            emp_id = random.choice(employee_ids)
            started_at = random_datetime_in_range(14, 0)
            status = random.choices(
                ["completed", "in_progress", "abandoned"],
                weights=[0.7, 0.15, 0.15]
            )[0]

            completed_at = None
            if status == "completed":
                completed_at = started_at + timedelta(minutes=random.randint(25, 60))

            run_notes = random.choice([
                None,
                "All clear, no issues found.",
                "Minor issue at north fence, reported.",
                "Lights out at parking lot, maintenance notified.",
            ])
            result = db.execute(text("""
                INSERT INTO patrol_runs (org_id, tour_id, started_by_employee_id, status,
                    started_at, completed_at, notes)
                VALUES (:org_id, :tour_id, :emp_id, :status, :started_at, :completed_at, :notes)
                RETURNING run_id
            """), {
                "org_id": ORG_ID,
                "tour_id": tour.tour_id,
                "emp_id": emp_id,
                "status": status,
                "started_at": started_at,
                "completed_at": completed_at,
                "notes": run_notes,
            })
            run_id = result.fetchone()[0]
            run_count += 1

            # Create scans for completed/in-progress runs
            if status != "abandoned":
                scan_time = started_at
                cps_to_scan = checkpoint_objects if status == "completed" else checkpoint_objects[:random.randint(1, len(checkpoint_objects) - 1)]
                for cp in cps_to_scan:
                    scan_time += timedelta(minutes=random.randint(3, 10))
                    db.execute(text("""
                        INSERT INTO patrol_scans (run_id, checkpoint_id, scanned_at, latitude, longitude, notes)
                        VALUES (:run_id, :cp_id, :scanned_at, :lat, :lng, :notes)
                    """), {
                        "run_id": run_id,
                        "cp_id": cp.checkpoint_id,
                        "scanned_at": scan_time,
                        "lat": cp.gps_lat,
                        "lng": cp.gps_lng,
                        "notes": None if random.random() > 0.2 else "All clear.",
                    })
                    scan_count += 1

    db.commit()
    print(f"   + Created {tour_count} tours, {run_count} runs, {scan_count} scans")
    return tour_count


# ── 4. Training Courses & Records ─────────────────────────────────────────────
def seed_training(db, employee_ids):
    """Create training courses and training records."""
    print("\n4. Seeding training courses and records...")

    courses_data = [
        ("Firearms Handling & Safety", TrainingCategory.FIREARMS.value, "PSiRA Accredited Training", 40, 24),
        ("First Aid Level 1", TrainingCategory.FIRST_AID.value, "St John Ambulance SA", 16, 24),
        ("Fire Safety & Prevention", TrainingCategory.FIRE_SAFETY.value, "Fire Protection Assoc SA", 8, 12),
        ("PSIRA Grade Refresher", TrainingCategory.PSIRA.value, "PSiRA Training Academy", 24, 12),
        ("Access Control Procedures", TrainingCategory.ACCESS_CONTROL.value, "In-house Training Dept", 8, None),
        ("Crowd Management", TrainingCategory.CUSTOMER_SERVICE.value, "SA Security Academy", 16, 24),
        ("Report Writing Skills", TrainingCategory.OTHER.value, "In-house Training Dept", 4, None),
        ("Advanced Surveillance Techniques", TrainingCategory.CCTV.value, "Surveillance Training SA", 24, 36),
    ]

    courses = []
    for name, category, provider, hours, validity in courses_data:
        c = TrainingCourse(
            org_id=ORG_ID,
            name=name,
            category=category,
            provider=provider,
            duration_hours=hours,
            validity_months=validity,
            is_active=True,
        )
        db.add(c)
        courses.append(c)

    db.flush()
    print(f"   + Created {len(courses)} training courses")

    record_count = 0
    statuses_weights = [
        (TrainingStatus.COMPLETED, 0.50),
        (TrainingStatus.IN_PROGRESS, 0.15),
        (TrainingStatus.SCHEDULED, 0.20),
        (TrainingStatus.FAILED, 0.05),
        (TrainingStatus.CANCELLED, 0.10),
    ]
    statuses = [s for s, _ in statuses_weights]
    weights = [w for _, w in statuses_weights]

    # Give each employee 1-3 training records
    for emp_id in employee_ids:
        num_records = random.randint(1, 3)
        chosen_courses = random.sample(courses, min(num_records, len(courses)))

        for course in chosen_courses:
            status = random.choices(statuses, weights=weights)[0]
            scheduled = random_date_in_range(180, 0)
            completed = None
            score = None
            cert_num = None
            expires_at = None

            if status == TrainingStatus.COMPLETED:
                completed = scheduled + timedelta(days=random.randint(0, 5))
                score = round(random.uniform(60, 100), 1)
                cert_num = f"TR-{random.randint(10000, 99999)}"
                if course.validity_months:
                    expires_at = datetime.combine(
                        completed + timedelta(days=course.validity_months * 30),
                        time(0, 0),
                        tzinfo=timezone.utc
                    )
            elif status == TrainingStatus.FAILED:
                completed = scheduled + timedelta(days=random.randint(0, 3))
                score = round(random.uniform(20, 49), 1)
            elif status == TrainingStatus.CANCELLED:
                pass  # No completion data for cancelled records

            db.add(TrainingRecord(
                org_id=ORG_ID,
                course_id=course.course_id,
                employee_id=emp_id,
                status=status.value,
                scheduled_date=datetime.combine(scheduled, time(8, 0), tzinfo=timezone.utc),
                completed_date=datetime.combine(completed, time(16, 0), tzinfo=timezone.utc) if completed else None,
                score=score,
                certificate_number=cert_num,
                expires_at=expires_at,
            ))
            record_count += 1

    db.commit()
    print(f"   + Created {record_count} training records")
    return record_count


# ── 5. Assets ──────────────────────────────────────────────────────────────────
def seed_assets(db, employee_ids):
    """Create security equipment inventory."""
    print("\n5. Seeding assets...")
    count = 0

    assets_data = [
        ("Motorola DP4800 Radio", AssetCategory.RADIO, 4500),
        ("Motorola DP4400 Radio", AssetCategory.RADIO, 3200),
        ("Kenwood TK-3501 Radio", AssetCategory.RADIO, 2800),
        ("Maglite ML300LX Torch", AssetCategory.TORCH, 850),
        ("LED Lenser P7R Torch", AssetCategory.TORCH, 1200),
        ("Tonfa Side-Handle Baton", AssetCategory.BATON, 450),
        ("Expandable Baton 21\"", AssetCategory.BATON, 380),
        ("Hinged Handcuffs S&W", AssetCategory.HANDCUFFS, 650),
        ("Chain Link Handcuffs", AssetCategory.HANDCUFFS, 420),
        ("Stab Vest Level II", AssetCategory.VEST, 2800),
        ("Bullet Resistant Vest IIIA", AssetCategory.VEST, 6500),
        ("SABRE Red Pepper Spray 120ml", AssetCategory.OTHER, 180),
        ("Mace Pepper Spray 80g", AssetCategory.OTHER, 150),
        ("Motorola DP4800 Radio (B)", AssetCategory.RADIO, 4500),
        ("LED Lenser P7R Torch (B)", AssetCategory.TORCH, 1200),
        ("Expandable Baton 26\"", AssetCategory.BATON, 420),
        ("Stab Vest Level II (B)", AssetCategory.VEST, 2800),
        ("Motorola DP4400 Radio (B)", AssetCategory.RADIO, 3200),
        ("Maglite ML300LX Torch (B)", AssetCategory.TORCH, 850),
        ("SABRE Red Pepper Spray 60ml", AssetCategory.OTHER, 120),
        ("Kenwood TK-3501 Radio (B)", AssetCategory.RADIO, 2800),
        ("Chain Link Handcuffs (B)", AssetCategory.HANDCUFFS, 420),
        ("Tonfa Side-Handle Baton (B)", AssetCategory.BATON, 450),
        ("Bullet Resistant Vest IIIA (B)", AssetCategory.VEST, 6500),
        ("Motorola DP4800 Radio (C)", AssetCategory.RADIO, 4500),
        ("LED Lenser P7R Torch (C)", AssetCategory.TORCH, 1200),
        ("Hinged Handcuffs S&W (B)", AssetCategory.HANDCUFFS, 650),
        ("Expandable Baton 21\" (B)", AssetCategory.BATON, 380),
        ("Stab Vest Level II (C)", AssetCategory.VEST, 2800),
        ("Mace Pepper Spray 80g (B)", AssetCategory.OTHER, 150),
    ]

    statuses_weights = [
        (AssetStatus.AVAILABLE, 0.3),
        (AssetStatus.ISSUED, 0.45),
        (AssetStatus.MAINTENANCE, 0.1),
        (AssetStatus.DISPOSED, 0.05),
        (AssetStatus.LOST, 0.05),
        (AssetStatus.DAMAGED, 0.05),
    ]
    statuses_list = [s for s, _ in statuses_weights]
    s_weights = [w for _, w in statuses_weights]

    conditions = ["new", "good", "fair", "poor"]
    cond_weights = [0.2, 0.4, 0.3, 0.1]

    for i, (name, category, cost) in enumerate(assets_data):
        status = random.choices(statuses_list, weights=s_weights)[0]
        assigned_emp = None

        if status == AssetStatus.ISSUED:
            assigned_emp = random.choice(employee_ids)

        acquired = random_date_in_range(730, 30)

        db.add(Asset(
            org_id=ORG_ID,
            name=name,
            asset_number=f"AST-{random.randint(10000, 99999)}",
            serial_number=f"SN{random.randint(100000, 999999)}",
            category=category.value,
            status=status.value,
            assigned_to_employee_id=assigned_emp,
            acquired_date=datetime.combine(acquired, time(0, 0)),
            purchase_cost=cost,
            condition=random.choices(conditions, weights=cond_weights)[0],
            notes=None if random.random() > 0.3 else random.choice([
                "Annual service due next month.",
                "Minor cosmetic damage, fully functional.",
                "Battery replacement scheduled.",
                "Recently serviced, in excellent condition.",
            ]),
        ))
        count += 1

    db.commit()
    print(f"   + Created {count} assets")
    return count


# ── 6. Documents ───────────────────────────────────────────────────────────────
def seed_documents(db, employee_ids):
    """Create employee documents."""
    print("\n6. Seeding documents...")
    count = 0

    # (doc_name, document_type_value, mime_type, approx_size, has_expiry)
    doc_types = [
        ("Employment Contract", "contract", "application/pdf", 245000, False),
        ("PSIRA Certificate", "certificate", "application/pdf", 180000, True),
        ("ID Copy (Front)", "id_document", "image/jpeg", 520000, False),
        ("ID Copy (Back)", "id_document", "image/jpeg", 480000, False),
        ("Medical Fitness Certificate", "certificate", "application/pdf", 150000, True),
        ("Firearms Competency Certificate", "certificate", "application/pdf", 200000, True),
        ("First Aid Certificate", "certificate", "application/pdf", 170000, True),
        ("CV / Resume", "other", "application/pdf", 320000, False),
        ("Tax Certificate (IRP5)", "other", "application/pdf", 95000, False),
        ("Driver's License Copy", "id_document", "image/jpeg", 410000, True),
    ]

    for emp_id in employee_ids:
        # Each employee gets 1-4 documents
        num_docs = random.randint(1, 4)
        chosen = random.sample(doc_types, min(num_docs, len(doc_types)))

        for doc_name, doc_type, mime, size, has_expiry in chosen:
            uploaded = random_datetime_in_range(365, 0)
            expires = None
            if has_expiry:
                expires = uploaded + timedelta(days=random.randint(180, 730))

            s3_key = f"org-{ORG_ID}/employees/{emp_id}/{doc_name.lower().replace(' ', '_').replace('/', '_')}_{random.randint(10000, 99999)}.pdf"
            db.add(Document(
                org_id=ORG_ID,
                employee_id=emp_id,
                filename=f"{doc_name.lower().replace(' ', '_').replace('/', '_')}_{emp_id}.pdf",
                file_size=size + random.randint(-20000, 20000),
                mime_type=mime,
                s3_key=s3_key,
                document_type=doc_type,
                tags=[doc_name.split()[0].lower(), "employee"],
                expires_at=expires,
                uploaded_by_user_id=USER_ID,
                uploaded_at=uploaded,
            ))
            count += 1

    db.commit()
    print(f"   + Created {count} documents")
    return count


# ── 7. Communication Log ──────────────────────────────────────────────────────
def seed_comm_log(db, employee_ids, site_ids):
    """Create communication log entries."""
    print("\n7. Seeding communication log...")
    count = 0

    entries = [
        ("Client complaint about late shift change", CommType.PHONE, CommPriority.URGENT,
         "Client called regarding guards arriving 20 minutes late for shift change at main gate.",
         "Mr. Johnson (Client)", "Control Room"),
        ("Equipment request for radios", CommType.EMAIL, CommPriority.NORMAL,
         "Requesting 3 additional radios for the new site deployment starting next week.",
         "Site Supervisor Dlamini", "Operations Manager"),
        ("Emergency response coordination", CommType.RADIO, CommPriority.URGENT,
         "Armed robbery reported at neighbouring property. All guards on high alert. SAPS en route.",
         "Guard Post Alpha", "All Units"),
        ("Shift swap confirmation", CommType.WHATSAPP, CommPriority.NORMAL,
         "Confirming shift swap between Nkosi and Mabaso for Saturday night shift approved.",
         "HR Department", "S. Nkosi, M. Mabaso"),
        ("Monthly report submission", CommType.EMAIL, CommPriority.NORMAL,
         "Monthly security report for January submitted to client for review and approval.",
         "Operations Manager", "Client - Parks Dept"),
        ("Guard welfare check", CommType.PHONE, CommPriority.NORMAL,
         "Called to check on guard working solo night shift. All well, no concerns reported.",
         "Control Room", "Guard K. Khumalo"),
        ("CCTV malfunction report", CommType.RADIO, CommPriority.URGENT,
         "Camera 7 at parking lot not recording. Technician dispatched for repair.",
         "CCTV Operator", "Maintenance Team"),
        ("Training schedule update", CommType.EMAIL, CommPriority.NORMAL,
         "Updated firearms requalification schedule sent to all Grade A guards.",
         "Training Coordinator", "All Grade A Guards"),
        ("Access card deactivation request", CommType.EMAIL, CommPriority.URGENT,
         "Urgent: Please deactivate access card #4521 for terminated employee effective immediately.",
         "HR Manager", "Access Control Team"),
        ("Daily briefing notes", CommType.RADIO, CommPriority.NORMAL,
         "Morning briefing completed. Key points: VIP visit at 14:00, increased patrols in Lot B.",
         "Shift Supervisor", "All Day Shift Guards"),
        ("Incident follow-up call", CommType.PHONE, CommPriority.NORMAL,
         "Follow-up call with SAPS regarding case #2024/0891. Investigation ongoing.",
         "Operations Manager", "Det. Sgt. van Wyk, SAPS"),
        ("Vehicle breakdown notification", CommType.WHATSAPP, CommPriority.URGENT,
         "Response vehicle broken down on N1. Requesting backup vehicle for mobile patrol.",
         "Mobile Patrol Officer", "Fleet Manager"),
        ("New guard orientation schedule", CommType.EMAIL, CommPriority.NORMAL,
         "Three new guards starting Monday. Orientation scheduled for 07:00 at head office.",
         "Training Coordinator", "Site Supervisors"),
        ("Power outage notification", CommType.RADIO, CommPriority.URGENT,
         "Eskom load-shedding Stage 4. All sites switching to backup power. Generator checks required.",
         "Control Room", "All Sites"),
        ("Client meeting confirmation", CommType.EMAIL, CommPriority.NORMAL,
         "Confirming quarterly review meeting with Ekurhuleni Metro for Friday 10:00.",
         "Account Manager", "D. Mokhele (Client)"),
        ("Overtime approval request", CommType.WHATSAPP, CommPriority.NORMAL,
         "Requesting overtime approval for 3 guards covering sick leave at Germiston site.",
         "Site Supervisor", "Operations Manager"),
        ("Guard uniform replacement", CommType.EMAIL, CommPriority.NORMAL,
         "Requesting uniform replacements for 5 guards - sizes submitted in attachment.",
         "Site Supervisor", "Procurement"),
        ("Late night disturbance report", CommType.RADIO, CommPriority.URGENT,
         "Noise disturbance reported at east boundary. Patrol dispatched to investigate.",
         "Guard Post Bravo", "Shift Supervisor"),
        ("Payroll query from employee", CommType.PHONE, CommPriority.NORMAL,
         "Employee Shabalala called about missing overtime on last payslip. Forwarded to payroll.",
         "HR Helpdesk", "Payroll Department"),
        ("Site handover briefing", CommType.RADIO, CommPriority.NORMAL,
         "Night to day shift handover complete. No outstanding issues. All posts manned.",
         "Night Shift Supervisor", "Day Shift Supervisor"),
    ]

    for subject, comm_type, priority, message, from_name, to_name in entries:
        created_at = random_datetime_in_range(30, 0)
        db.add(CommLog(
            org_id=ORG_ID,
            site_id=random.choice(site_ids),
            comm_type=comm_type.value,
            priority=priority.value,
            subject=subject,
            message=message,
            from_name=from_name,
            to_name=to_name,
            employee_id=random.choice(employee_ids) if random.random() > 0.4 else None,
            resolved=random.choice(["resolved", "resolved", "open", "escalated"]),
            created_at=created_at,
        ))
        count += 1

    db.commit()
    print(f"   + Created {count} communication log entries")
    return count


# ── 8. Occurrence Book ─────────────────────────────────────────────────────────
def seed_occurrence_book(db, employee_ids, site_ids, shift_ids):
    """Create occurrence book entries."""
    print("\n8. Seeding occurrence book entries...")
    count = 0

    entries = [
        (OccurrenceCategory.INCIDENT, "Suspicious vehicle circling the premises spotted at 22:15. Registration noted: GP ABC 123.",
         "Patrol increased, client and SAPS notified."),
        (OccurrenceCategory.VISITOR, "Mr. R. Petersen from Telkom arrived for scheduled maintenance on comms tower.",
         "ID verified, escorted to technical area."),
        (OccurrenceCategory.ACCESS_CONTROL, "Employee J. Dlamini forgot access card. Identity verified manually.",
         "Temporary access granted, HR notified for card replacement."),
        (OccurrenceCategory.GENERAL, "Load-shedding Stage 6 from 20:00 to 22:30. Generator activated.",
         "All systems operational on backup power."),
        (OccurrenceCategory.MAINTENANCE, "Main gate motor seized. Manual operation required.",
         "Maintenance team notified, temporary manual access control."),
        (OccurrenceCategory.INCIDENT, "Attempted break-in at warehouse section C. Fence cut found during patrol.",
         "SAPS called. Scene preserved for investigation. Additional guard posted."),
        (OccurrenceCategory.VISITOR, "Delivery of 50 boxes office supplies by Courier-It, driver M. Sibanyoni.",
         "Delivery verified against purchase order, signed for and stored."),
        (OccurrenceCategory.ACCESS_CONTROL, "Tailgating attempt at vehicle boom gate. Unauthorized vehicle turned away.",
         "Driver details recorded. Security awareness notice issued."),
        (OccurrenceCategory.GENERAL, "Heavy thunderstorm from 16:00. Outdoor cameras 3 and 7 temporarily offline.",
         "Indoor cameras compensating. Maintenance will check after storm."),
        (OccurrenceCategory.MAINTENANCE, "Air conditioning unit in control room not working. Temperature 32°C.",
         "Logged maintenance request. Portable fan placed temporarily."),
        (OccurrenceCategory.INCIDENT, "Guard found sleeping on duty at Post B during 03:00 inspection.",
         "Written warning issued. Shift supervisor informed."),
        (OccurrenceCategory.VISITOR, "SAPS Constable N. Mthethwa visited for routine follow-up on case #2024/1203.",
         "Accompanied to admin office. Case file provided."),
        (OccurrenceCategory.ACCESS_CONTROL, "Panic button activated at reception. False alarm - accidental press.",
         "System reset, incident logged, staff reminded of procedures."),
        (OccurrenceCategory.GENERAL, "Water leak detected in basement parking. Building manager contacted.",
         "Affected area cordoned off. Plumber arriving within 2 hours."),
        (OccurrenceCategory.INCIDENT, "Minor vehicle accident in parking lot B. Two vehicles, no injuries.",
         "Drivers exchanged details. Photos taken for insurance."),
        (OccurrenceCategory.MAINTENANCE, "Perimeter floodlight #12 not working. Dark spot on north boundary.",
         "Temporary portable light installed. Electrician booked for tomorrow."),
        (OccurrenceCategory.VISITOR, "Group of 8 school learners for educational tour, Teacher: Mrs. Govender.",
         "Visitor passes issued. Escorted by supervisor throughout visit."),
        (OccurrenceCategory.ACCESS_CONTROL, "Unknown individual attempted to use expired contractor pass.",
         "Access denied. Individual escorted off premises. Pass confiscated."),
        (OccurrenceCategory.GENERAL, "New shift roster effective from Monday. All guards acknowledged receipt.",
         "Roster displayed in guard room. Copies issued to all staff."),
        (OccurrenceCategory.INCIDENT, "Graffiti discovered on south wall during morning patrol.",
         "Photos taken, cleaning company contacted. Estimated cost R2,500."),
        (OccurrenceCategory.MAINTENANCE, "Fire alarm panel showing fault on Zone 3. Testing required.",
         "Fire safety company contacted. Maintenance scheduled for tomorrow morning."),
        (OccurrenceCategory.VISITOR, "Insurance assessor Mr. B. van der Merwe arrived to inspect damage claim.",
         "ID verified, escorted to damage site. Report compiled."),
        (OccurrenceCategory.GENERAL, "Monthly fire drill conducted at 10:00. Building evacuated in 4 min 30 sec.",
         "Assembly point procedures followed. Two staff unaccounted for initially - resolved."),
        (OccurrenceCategory.ACCESS_CONTROL, "Biometric scanner at entrance 2 malfunctioning. Manual log implemented.",
         "IT support contacted. Expected repair by end of business."),
        (OccurrenceCategory.INCIDENT, "Employee reported harassment by a visitor. Visitor removed from premises.",
         "Incident documented. Employee offered support. Client HR notified."),
        (OccurrenceCategory.MAINTENANCE, "CCTV DVR storage 95% full. Recording may stop within 24 hours.",
         "IT notified. Older footage being archived to external storage."),
        (OccurrenceCategory.GENERAL, "Guard dog handler K9 unit completed routine check. Dog healthy and alert.",
         "K9 log updated. Next vet visit scheduled for end of month."),
        (OccurrenceCategory.VISITOR, "City Power technicians arrived for meter reading. 3 personnel.",
         "IDs verified, escorted to electrical room."),
        (OccurrenceCategory.INCIDENT, "Cash-in-transit vehicle armed robbery on adjacent road. Lockdown initiated.",
         "Full lockdown for 45 minutes. SAPS helicopter response. All clear given at 11:45."),
        (OccurrenceCategory.GENERAL, "End of month stock count completed for all security equipment.",
         "All items accounted for. Report filed with operations manager."),
    ]

    for category, description, action in entries:
        occurred_at = random_datetime_in_range(30, 0)
        db.add(OccurrenceEntry(
            org_id=ORG_ID,
            site_id=random.choice(site_ids),
            category=category.value,
            description=description,
            action_taken=action,
            employee_id=random.choice(employee_ids),
            shift_id=random.choice(shift_ids) if shift_ids and random.random() > 0.4 else None,
            occurred_at=occurred_at,
        ))
        count += 1

    db.commit()
    print(f"   + Created {count} occurrence book entries")
    return count


# ── 9. SLA Compliance ─────────────────────────────────────────────────────────
def seed_sla_compliance(db, site_ids):
    """Create SLA compliance records per site per month."""
    print("\n9. Seeding SLA compliance records...")
    count = 0

    # Last 3 months of data for each site
    for site_id in site_ids:
        for months_ago in range(3):
            ref_date = TODAY - timedelta(days=months_ago * 30)
            period_month = ref_date.month
            period_year = ref_date.year

            coverage_target = 98.0
            coverage_actual = round(random.uniform(88, 100), 1)
            resp_target = 15  # minutes
            resp_avg = random.randint(5, 25)
            overall_score = round((coverage_actual * 0.6 + max(0, 100 - (resp_avg - resp_target) * 3) * 0.4), 1)
            overall_score = min(100, max(0, overall_score))

            if overall_score >= 90:
                status_val = SLAStatus.COMPLIANT.value
            elif overall_score >= 75:
                status_val = SLAStatus.AT_RISK.value
            else:
                status_val = SLAStatus.BREACHED.value

            db.add(SLARecord(
                org_id=ORG_ID,
                site_id=site_id,
                period_month=period_month,
                period_year=period_year,
                coverage_target=coverage_target,
                coverage_actual=coverage_actual,
                response_target_mins=resp_target,
                response_avg_mins=resp_avg,
                overall_score=overall_score,
                overall_status=status_val,
            ))
            count += 1

    db.commit()
    print(f"   + Created {count} SLA compliance records")
    return count


# ── 10. Client Reports ────────────────────────────────────────────────────────
def seed_client_reports(db, client_ids, site_ids):
    """Create monthly client reports."""
    print("\n10. Seeding client reports...")
    count = 0

    report_types = ["monthly", "quarterly", "incident_summary", "ad_hoc"]
    statuses = ["draft", "published", "archived"]

    for client_id in client_ids:
        for months_ago in range(3):
            ref_date = TODAY - timedelta(days=months_ago * 30)
            period_start = ref_date.replace(day=1)
            if ref_date.month == 12:
                period_end = ref_date.replace(year=ref_date.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                period_end = ref_date.replace(month=ref_date.month + 1, day=1) - timedelta(days=1)

            status = "published" if months_ago > 0 else random.choice(["draft", "published"])

            db.add(ClientReport(
                org_id=ORG_ID,
                client_id=client_id,
                site_id=random.choice(site_ids),
                title=f"Monthly Security Report - {ref_date.strftime('%B %Y')}",
                report_type="monthly",
                period_start=period_start,
                period_end=period_end,
                summary=random.choice([
                    "Overall security posture maintained at satisfactory levels. Minor incidents handled promptly.",
                    "Improved patrol coverage with new checkpoint system. Zero critical incidents this period.",
                    "Some staffing challenges due to leave season. All posts covered with overtime arrangements.",
                    "Excellent performance across all metrics. Client satisfaction score of 4.5/5.",
                    "Several incidents reported and resolved. Enhanced surveillance measures recommended.",
                ]),
                status=status,
                created_at=datetime.combine(period_end, time(10, 0), tzinfo=timezone.utc),
            ))
            count += 1

    db.commit()
    print(f"   + Created {count} client reports")
    return count


# ── 11. Client Satisfaction ───────────────────────────────────────────────────
def seed_client_satisfaction(db, client_ids, site_ids):
    """Create client satisfaction surveys."""
    print("\n11. Seeding client satisfaction surveys...")
    count = 0

    feedback_comments = [
        "Guards are professional and well-presented. Very happy with service.",
        "Good overall but response time could improve during night shifts.",
        "Excellent communication from site supervisor. Issues resolved quickly.",
        "Some concerns about guard rotation frequency. Would prefer consistency.",
        "Very satisfied with the armed response capability and patrol coverage.",
        "Reports are thorough and submitted on time. Keep up the great work.",
        "Had an issue with a guard's attitude but it was resolved after reporting.",
        "The new patrol checkpoint system has improved accountability significantly.",
        "Would like more regular management visits to discuss site-specific concerns.",
        "Outstanding service during the recent break-in attempt. Quick response saved the day.",
        "Satisfied with daytime coverage but night patrols seem less frequent.",
        "Professional team. The monthly reports are very detailed and useful.",
        "Good security service overall. Minor improvements needed in visitor management.",
        "Impressed with the technology upgrades. GPS tracking gives us peace of mind.",
        "The training level of guards is noticeably higher than our previous provider.",
    ]

    for client_id in client_ids:
        # 2-4 surveys per client over time
        num_surveys = random.randint(2, 4)
        for _ in range(num_surveys):
            overall = random.choices([3, 4, 5], weights=[0.15, 0.40, 0.45])[0]
            # Related scores cluster around overall
            def related_score(base):
                return max(1, min(5, base + random.choice([-1, 0, 0, 0, 1])))

            survey_date = random_datetime_in_range(180, 0)
            db.add(ClientSatisfaction(
                org_id=ORG_ID,
                client_id=client_id,
                site_id=random.choice(site_ids),
                overall_rating=overall,
                service_quality=related_score(overall),
                response_time=related_score(overall),
                professionalism=related_score(overall),
                communication=related_score(overall),
                feedback=random.choice(feedback_comments),
                survey_period=f"{survey_date.year}-{survey_date.month:02d}",
                created_at=survey_date,
            ))
            count += 1

    db.commit()
    print(f"   + Created {count} client satisfaction surveys")
    return count


# ── 12. Inspections ───────────────────────────────────────────────────────────
def seed_inspections(db, employee_ids, site_ids):
    """Create inspection templates and inspection records."""
    print("\n12. Seeding inspections...")

    templates_data = [
        ("Standard Site Inspection", [
            {"item": "Guard appearance and uniform", "type": "rating"},
            {"item": "Access control procedures followed", "type": "yes_no"},
            {"item": "Patrol records up to date", "type": "yes_no"},
            {"item": "Equipment condition", "type": "rating"},
            {"item": "CCTV system operational", "type": "yes_no"},
            {"item": "Fire safety equipment present", "type": "yes_no"},
            {"item": "Communication equipment working", "type": "rating"},
            {"item": "Occurrence book entries current", "type": "yes_no"},
        ]),
        ("Night Shift Audit", [
            {"item": "All posts manned", "type": "yes_no"},
            {"item": "Guards alert and vigilant", "type": "rating"},
            {"item": "Perimeter lighting functional", "type": "yes_no"},
            {"item": "Emergency procedures knowledge", "type": "rating"},
            {"item": "Patrol frequency adequate", "type": "yes_no"},
        ]),
        ("Monthly Equipment Check", [
            {"item": "Radios functional and charged", "type": "yes_no"},
            {"item": "Torches working with spare batteries", "type": "yes_no"},
            {"item": "Batons and restraints condition", "type": "rating"},
            {"item": "Protective vests condition", "type": "rating"},
            {"item": "First aid kit fully stocked", "type": "yes_no"},
            {"item": "Fire extinguishers in date", "type": "yes_no"},
        ]),
    ]

    templates = []
    for name, items in templates_data:
        t = InspectionTemplate(
            org_id=ORG_ID,
            name=name,
            description=f"Standard template for {name.lower()}.",
            items=items,
            is_active=True,
        )
        db.add(t)
        templates.append(t)

    db.flush()
    print(f"   + Created {len(templates)} inspection templates")

    inspection_count = 0
    for _ in range(15):
        template = random.choice(templates)
        status = random.choices(
            ["completed", "in_progress", "flagged"],
            weights=[0.65, 0.15, 0.20]
        )[0]

        responses = None
        score = None
        if status in ("completed", "flagged"):
            responses = {}
            yes_count = 0
            total = 0
            for item in template.items:
                total += 1
                if item["type"] == "yes_no":
                    val = random.choice(["yes", "yes", "yes", "no"])
                    responses[item["item"]] = val
                    if val == "yes":
                        yes_count += 1
                else:
                    rating = random.randint(3, 5)
                    responses[item["item"]] = rating
                    if rating >= 4:
                        yes_count += 1
            score = round((yes_count / total) * 100, 1) if total > 0 else 0

        completed_at = random_datetime_in_range(60, 0) if status in ("completed", "flagged") else None
        started_at = (completed_at - timedelta(minutes=random.randint(30, 120))) if completed_at else (random_datetime_in_range(60, 0) if status == "in_progress" else None)

        db.add(Inspection(
            org_id=ORG_ID,
            template_id=template.template_id,
            site_id=random.choice(site_ids),
            employee_id=random.choice(employee_ids),
            status=status,
            responses=responses,
            score_pct=score,
            overall_notes=random.choice([
                None,
                "All satisfactory. Minor recommendation to improve signage.",
                "Guard knowledge of emergency procedures needs refresher training.",
                "Equipment in good condition. One radio battery needs replacement.",
                "Excellent standards maintained. Commendation for site supervisor.",
                "Occurrence book entries need more detail. Training recommended.",
            ]) if status in ("completed", "flagged") else None,
            started_at=started_at,
            completed_at=completed_at,
        ))
        inspection_count += 1

    db.commit()
    print(f"   + Created {inspection_count} inspections")
    return inspection_count


# ── 13. Geofence Configs & Violations ─────────────────────────────────────────
def seed_geofencing(db, employee_ids, sites, site_ids):
    """Enable geofencing on sites and create violation records."""
    print("\n13. Seeding geofence configs and violations...")

    # Enable geofencing on the first 10 sites
    enabled_count = 0
    for site_id, site_name, gps_lat, gps_lng in sites[:10]:
        if gps_lat and gps_lng:
            db.execute(
                text("UPDATE sites SET geofence_enabled = true, geofence_radius = :radius WHERE site_id = :sid"),
                {"radius": random.choice([150, 200, 250, 300]), "sid": site_id}
            )
            enabled_count += 1

    db.commit()
    print(f"   + Enabled geofencing on {enabled_count} sites")

    # Create violation records
    violation_count = 0
    violation_types = ["exit", "entry_outside", "drift"]
    vt_weights = [0.4, 0.35, 0.25]

    for _ in range(12):
        site_id, site_name, gps_lat, gps_lng = random.choice(sites[:10])
        if not gps_lat or not gps_lng:
            continue

        vtype_str = random.choices(violation_types, weights=vt_weights)[0]
        # Offset from site GPS to simulate being outside geofence
        lat_offset = random.uniform(0.003, 0.008) * random.choice([-1, 1])
        lng_offset = random.uniform(0.003, 0.008) * random.choice([-1, 1])

        db.add(GeofenceViolation(
            org_id=ORG_ID,
            site_id=site_id,
            employee_id=random.choice(employee_ids),
            violation_type=vtype_str,
            lat=gps_lat + lat_offset,
            lng=gps_lng + lng_offset,
            distance_from_site=round(random.uniform(250, 800), 1),
            resolved=random.choice(["resolved", "resolved", "open"]),
            created_at=random_datetime_in_range(30, 0),
        ))
        violation_count += 1

    db.commit()
    print(f"   + Created {violation_count} geofence violations")
    return violation_count


# ── 14. Deployment Records ────────────────────────────────────────────────────
def seed_deployments(db, employee_ids, site_ids):
    """Create employee deployment history across sites."""
    print("\n14. Seeding deployment records...")
    count = 0

    roles = ["guard", "supervisor", "armed_response", "access_control", "patrol", "cctv_operator"]
    reasons = [
        "Standard deployment", "Shift coverage", "Client request",
        "Skills match", "Rotation schedule", "Emergency coverage",
        "New site opening", "Additional coverage required",
    ]

    for emp_id in random.sample(employee_ids, min(35, len(employee_ids))):
        num_deployments = random.randint(1, 3)
        for _ in range(num_deployments):
            start = random_date_in_range(180, 10)
            has_end = random.random() > 0.3
            end = start + timedelta(days=random.randint(14, 90)) if has_end else None

            db.add(DeploymentRecord(
                org_id=ORG_ID,
                employee_id=emp_id,
                site_id=random.choice(site_ids),
                start_date=start,
                end_date=end,
                role=random.choice(roles),
                reason=random.choice(reasons),
            ))
            count += 1

    db.commit()
    print(f"   + Created {count} deployment records")
    return count


# ── 15. Notifications ─────────────────────────────────────────────────────────
def seed_notifications(db):
    """Create notification records for the admin user."""
    print("\n15. Seeding notifications...")
    count = 0

    notifications = [
        ("Shift Reminder", "You have a site inspection scheduled for tomorrow at 08:00 at Zoo Lake.",
         "shift_reminder", False),
        ("Certificate Expiring", "PSIRA Grade A certificate for Sipho Dlamini expires in 14 days.",
         "incident", False),
        ("Incident Reported", "New incident reported at Germiston City Hall: suspected trespassing.",
         "incident", False),
        ("Leave Approved", "Leave request for Themba Nkosi (25-28 Feb) has been approved.",
         "leave_update", True),
        ("Shift Change", "Night shift at Boksburg Civic Centre reassigned to Lucky Khumalo.",
         "shift_change", True),
        ("New Guard Deployed", "Nomsa Radebe deployed to Emmarentia Dam effective immediately.",
         "general", True),
        ("Patrol Missed", "Scheduled patrol at Zoo Lake not completed. Guard: Bongani Sithole.",
         "incident", False),
        ("SLA Alert", "SLA compliance score below threshold at 2 sites this month.",
         "general", False),
        ("Training Due", "5 employees due for PSIRA Grade Refresher training next month.",
         "general", False),
        ("Equipment Alert", "3 radios reported as damaged. Replacement request pending.",
         "general", True),
        ("Overtime Approved", "Overtime for Saturday night shift approved for 4 guards.",
         "general", True),
        ("Client Feedback", "New satisfaction survey received from City of Johannesburg: 4.5/5.",
         "general", True),
        ("Geofence Violation", "Guard clock-in detected 500m outside geofence at Germiston site.",
         "incident", False),
        ("Inspection Complete", "Site inspection completed at Boksburg Civic Centre. Score: 92%.",
         "general", True),
        ("Document Expiring", "Medical fitness certificate for Mandla Mokoena expires in 21 days.",
         "general", False),
        ("System Update", "System maintenance scheduled for Sunday 02:00-04:00 SAST.",
         "general", True),
        ("Shift Cancelled", "Day shift at Emmarentia Dam on 1 March cancelled per client request.",
         "shift_cancelled", False),
        ("Leave Request", "New leave request from Zanele Mthembu for 5-7 March pending approval.",
         "leave_update", False),
        ("Report Published", "Monthly security report for January published for Ekurhuleni Metro.",
         "general", True),
        ("Guard of the Month", "Congratulations! Mpho Mabaso nominated as Guard of the Month.",
         "general", True),
    ]

    for title, message, ntype, is_read in notifications:
        created_at = random_datetime_in_range(14, 0)
        db.execute(text("""
            INSERT INTO notifications (user_id, org_id, title, message, notification_type,
                is_read, read_at, created_at)
            VALUES (:user_id, :org_id, :title, :message, :ntype, :is_read, :read_at, :created_at)
        """), {
            "user_id": USER_ID,
            "org_id": ORG_ID,
            "title": title,
            "message": message,
            "ntype": ntype,
            "is_read": is_read,
            "read_at": created_at + timedelta(hours=random.randint(1, 12)) if is_read else None,
            "created_at": created_at,
        })
        count += 1

    db.commit()
    print(f"   + Created {count} notifications")
    return count


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("ROSTRACORE — COMPREHENSIVE SEED DATA")
        print("=" * 60)
        print(f"Target org_id: {ORG_ID}, user_id: {USER_ID}")

        # Clean up any previously seeded data (order matters for FK constraints)
        print("\n0. Cleaning up previous seed data...")
        cleanup_queries = [
            # Child tables without org_id (delete via subquery)
            ("patrol_scans", "DELETE FROM patrol_scans WHERE run_id IN (SELECT run_id FROM patrol_runs WHERE org_id = :org_id)"),
            ("patrol_runs", "DELETE FROM patrol_runs WHERE org_id = :org_id"),
            ("patrol_checkpoints", "DELETE FROM patrol_checkpoints WHERE tour_id IN (SELECT tour_id FROM patrol_tours WHERE org_id = :org_id)"),
            ("patrol_tours", "DELETE FROM patrol_tours WHERE org_id = :org_id"),
            ("asset_history", "DELETE FROM asset_history WHERE asset_id IN (SELECT asset_id FROM assets WHERE org_id = :org_id)"),
            # Tables with org_id
            ("inspections", "DELETE FROM inspections WHERE org_id = :org_id"),
            ("inspection_templates", "DELETE FROM inspection_templates WHERE org_id = :org_id"),
            ("geofence_violations", "DELETE FROM geofence_violations WHERE org_id = :org_id"),
            ("deployment_records", "DELETE FROM deployment_records WHERE org_id = :org_id"),
            ("client_satisfaction", "DELETE FROM client_satisfaction WHERE org_id = :org_id"),
            ("client_reports", "DELETE FROM client_reports WHERE org_id = :org_id"),
            ("sla_records", "DELETE FROM sla_records WHERE org_id = :org_id"),
            ("occurrence_entries", "DELETE FROM occurrence_entries WHERE org_id = :org_id"),
            ("comm_logs", "DELETE FROM comm_logs WHERE org_id = :org_id"),
            ("documents", "DELETE FROM documents WHERE org_id = :org_id"),
            ("assets", "DELETE FROM assets WHERE org_id = :org_id"),
            ("training_records", "DELETE FROM training_records WHERE org_id = :org_id"),
            ("training_courses", "DELETE FROM training_courses WHERE org_id = :org_id"),
            ("incidents", "DELETE FROM incidents WHERE org_id = :org_id"),
            ("certifications", "DELETE FROM certifications WHERE employee_id IN (SELECT employee_id FROM employees WHERE org_id = :org_id)"),
            ("notifications", "DELETE FROM notifications WHERE user_id = :uid AND org_id = :org_id"),
        ]
        for table_name, query in cleanup_queries:
            params = {"org_id": ORG_ID}
            if "uid" in query:
                params["uid"] = USER_ID
            result = db.execute(text(query), params)
            if result.rowcount > 0:
                print(f"   - Deleted {result.rowcount} rows from {table_name}")
        db.commit()
        print("   Cleanup complete.")

        employee_ids, sites, site_ids, clients, client_ids, shift_ids = get_existing_ids(db)
        print(f"\nExisting data found:")
        print(f"  Employees: {len(employee_ids)}")
        print(f"  Sites:     {len(site_ids)}")
        print(f"  Clients:   {len(client_ids)}")
        print(f"  Shifts:    {len(shift_ids)}")

        if not employee_ids or not site_ids:
            print("\n[ERROR] No employees or sites found. Run create_sample_data.py first.")
            return

        totals = {}
        totals["certifications"] = seed_certifications(db, employee_ids)
        totals["incidents"] = seed_incidents(db, employee_ids, site_ids, shift_ids)
        totals["patrols"] = seed_patrols(db, employee_ids, sites, site_ids)
        totals["training"] = seed_training(db, employee_ids)
        totals["assets"] = seed_assets(db, employee_ids)
        totals["documents"] = seed_documents(db, employee_ids)
        totals["comm_log"] = seed_comm_log(db, employee_ids, site_ids)
        totals["occurrence_book"] = seed_occurrence_book(db, employee_ids, site_ids, shift_ids)
        totals["sla_compliance"] = seed_sla_compliance(db, site_ids)
        totals["client_reports"] = seed_client_reports(db, client_ids, site_ids)
        totals["client_satisfaction"] = seed_client_satisfaction(db, client_ids, site_ids)
        totals["inspections"] = seed_inspections(db, employee_ids, site_ids)
        totals["geofencing"] = seed_geofencing(db, employee_ids, sites, site_ids)
        totals["deployments"] = seed_deployments(db, employee_ids, site_ids)
        totals["notifications"] = seed_notifications(db)

        print("\n" + "=" * 60)
        print("SEED DATA COMPLETE!")
        print("=" * 60)
        total = sum(totals.values())
        for name, cnt in totals.items():
            print(f"  {name:<25} {cnt:>5} records")
        print(f"  {'TOTAL':<25} {total:>5} records")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
