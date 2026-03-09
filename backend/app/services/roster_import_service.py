"""
Roster Import Service — orchestrator for creating DB records from parsed roster data.

Takes ParseResult from GenericRosterParser and creates:
- Roster record
- Shift records (grouped by site + date + time)
- ShiftAssignment records with BCEA-compliant cost calculation
- RosterUploadLog for audit trail
"""

import hashlib
import logging
import uuid
from datetime import date, datetime, time, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.employee import Employee, EmployeeStatus
from app.models.roster import Roster
from app.models.roster_upload_log import RosterUploadLog
from app.models.shift import Shift, ShiftStatus
from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
from app.models.site import Site

logger = logging.getLogger(__name__)


class RosterImportService:
    """Creates Roster + Shift + ShiftAssignment records from parsed roster entries."""

    def preview(
        self,
        db: Session,
        org_id: int,
        entries: list,
        date_range: tuple,
        file_hash: str,
        detected_site_name: Optional[str] = None,
        detected_client_name: Optional[str] = None,
        site_id_override: Optional[int] = None,
        client_id_override: Optional[int] = None,
        default_start_time: str = "06:00",
        default_end_time: str = "18:00",
    ) -> dict:
        """
        Preview import without writing to DB.
        Returns employee matches, cost estimates, BCEA suggestions.
        """
        # Match employees
        employee_map, unmatched = self._match_employees(db, org_id, entries)

        # Resolve site/client
        site, client = self._resolve_site_client(
            db, org_id,
            site_name=detected_site_name,
            client_name=detected_client_name,
            site_id=site_id_override,
            client_id=client_id_override,
            auto_create=False,
        )

        # Calculate estimated costs
        start_date, end_date = date_range
        total_cost = 0.0
        assignments_count = 0

        try:
            def_start = datetime.strptime(default_start_time, "%H:%M").time()
        except ValueError:
            def_start = time(6, 0)
        try:
            def_end = datetime.strptime(default_end_time, "%H:%M").time()
        except ValueError:
            def_end = time(18, 0)

        for entry in entries:
            emp = employee_map.get(entry.employee_identifier) or employee_map.get(entry.employee_id)
            if not emp:
                continue
            assignments_count += 1
            # Estimate cost: hours * hourly_rate
            s_time = entry.start_time or def_start
            e_time = entry.end_time or def_end
            if e_time <= s_time:
                hours = ((datetime.combine(date.today(), e_time) + timedelta(days=1)) -
                         datetime.combine(date.today(), s_time)).total_seconds() / 3600
            else:
                hours = (datetime.combine(date.today(), e_time) -
                         datetime.combine(date.today(), s_time)).total_seconds() / 3600
            total_cost += hours * (emp.hourly_rate or 0)

        # Collect unique sites from entries
        entry_sites = set()
        for e in entries:
            if e.site_name:
                entry_sites.add(e.site_name)

        # Build BCEA suggestions using existing service
        roster_data_for_suggestions = self._entries_to_roster_data(entries, employee_map, start_date)

        suggestions = []
        if roster_data_for_suggestions and start_date and end_date:
            try:
                from app.services.roster_suggestion_service import RosterSuggestionService
                suggestions = RosterSuggestionService.analyze(
                    roster_data=roster_data_for_suggestions,
                    employee_map={e.employee_identifier: employee_map[e.employee_identifier]
                                  for e in entries if e.employee_identifier in employee_map},
                    start_date=start_date,
                    end_date=end_date,
                    site=site,
                    db=db,
                    org_id=org_id,
                )
            except Exception as ex:
                logger.warning(f"BCEA analysis failed: {ex}")

        return {
            "status": "preview",
            "period": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None,
            },
            "site_resolved": {
                "site_id": site.site_id if site else None,
                "site_name": site.site_name if site else detected_site_name,
                "client_id": client.client_id if client else None,
                "client_name": client.client_name if client else detected_client_name,
            },
            "summary": {
                "total_entries": len(entries),
                "employees_matched": len(employee_map),
                "employees_unmatched": len(unmatched),
                "total_assignments": assignments_count,
                "estimated_cost": round(total_cost, 2),
                "unique_dates": len(set(e.shift_date for e in entries if e.shift_date)),
                "unique_sites": list(entry_sites),
            },
            "unmatched_employees": unmatched[:50],
            "suggestions": suggestions[:50],
        }

    def import_roster(
        self,
        db: Session,
        org_id: int,
        user_id: int,
        entries: list,
        date_range: tuple,
        file_bytes: bytes,
        filename: str,
        detected_format: str,
        detected_site_name: Optional[str] = None,
        detected_client_name: Optional[str] = None,
        site_id_override: Optional[int] = None,
        client_id_override: Optional[int] = None,
        auto_create_site: bool = False,
        default_start_time: str = "06:00",
        default_end_time: str = "18:00",
    ) -> dict:
        """
        Import roster entries into the database.
        Creates Roster, Shifts, ShiftAssignments, and upload log.
        """
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        # Check for duplicate upload
        existing = db.query(RosterUploadLog).filter(
            RosterUploadLog.org_id == org_id,
            RosterUploadLog.file_hash == file_hash,
            RosterUploadLog.status.in_(["completed", "processing"]),
        ).first()
        if existing:
            return {
                "status": "duplicate",
                "message": f"This file was already uploaded (upload_id={existing.upload_id})",
                "existing_upload_id": existing.upload_id,
                "existing_roster_id": existing.roster_id,
            }

        # Match employees
        employee_map, unmatched = self._match_employees(db, org_id, entries)
        warnings = [f"Employee not found: {u['identifier']} ({u['name']})" for u in unmatched[:20]]

        # Resolve site/client
        site, client = self._resolve_site_client(
            db, org_id,
            site_name=detected_site_name,
            client_name=detected_client_name,
            site_id=site_id_override,
            client_id=client_id_override,
            auto_create=auto_create_site,
        )

        if not site and not auto_create_site:
            # Try per-entry sites
            site_names_in_entries = set(e.site_name for e in entries if e.site_name)
            if site_names_in_entries:
                warnings.append(f"Sites from file: {', '.join(site_names_in_entries)}. No matching site found in system.")

        start_date, end_date = date_range
        if not start_date or not end_date:
            return {"status": "error", "message": "Could not determine date range from file."}

        # Parse default times
        try:
            def_start = datetime.strptime(default_start_time, "%H:%M").time()
        except ValueError:
            def_start = time(6, 0)
        try:
            def_end = datetime.strptime(default_end_time, "%H:%M").time()
        except ValueError:
            def_end = time(18, 0)

        now = datetime.utcnow()
        roster_code = f"R-UPLOAD-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        # Create Roster record
        roster = Roster(
            org_id=org_id,
            roster_code=roster_code,
            name=f"Uploaded Roster {start_date.strftime('%d %b')} - {end_date.strftime('%d %b %Y')}",
            start_date=datetime.combine(start_date, time.min),
            end_date=datetime.combine(end_date, time.max),
            client_id=client.client_id if client else None,
            status="published",
            total_shifts=0,
            assigned_shifts=0,
            unassigned_shifts=0,
            total_cost=0.0,
            regular_pay_cost=0.0,
            overtime_cost=0.0,
            premium_cost=0.0,
            algorithm_used=f"generic_upload_{detected_format}",
            created_by=user_id,
            published_at=now,
            published_by=user_id,
        )
        db.add(roster)
        db.flush()

        # Group entries by (site_id, date, start_time, end_time) to create shared Shifts
        shifts_created = 0
        assignments_created = 0
        total_cost = 0.0
        regular_cost = 0.0
        overtime_cost = 0.0
        premium_cost = 0.0
        errors = []

        # Build site lookup for per-entry site names
        site_cache = {}
        if site:
            site_cache["_default"] = site

        for entry in entries:
            emp = employee_map.get(entry.employee_identifier) or employee_map.get(entry.employee_id)
            if not emp:
                continue

            # Resolve site for this entry
            entry_site = site_cache.get("_default")
            if entry.site_name and entry.site_name not in site_cache:
                found_site = db.query(Site).filter(
                    Site.org_id == org_id,
                    Site.site_name.ilike(f"%{entry.site_name}%"),
                ).first()
                if found_site:
                    site_cache[entry.site_name] = found_site
                elif auto_create_site:
                    new_site = Site(
                        org_id=org_id,
                        client_id=client.client_id if client else None,
                        client_name=client.client_name if client else entry.client_name,
                        site_name=entry.site_name,
                        address=entry.site_name,
                    )
                    db.add(new_site)
                    db.flush()
                    site_cache[entry.site_name] = new_site
                else:
                    site_cache[entry.site_name] = None

            if entry.site_name:
                entry_site = site_cache.get(entry.site_name) or entry_site

            if not entry_site:
                errors.append(f"Row {entry.row_number}: No site resolved for '{entry.site_name or 'unknown'}'")
                continue

            # Calculate shift times
            s_time = entry.start_time or def_start
            e_time = entry.end_time or def_end

            shift_start_dt = datetime.combine(entry.shift_date, s_time)
            if e_time <= s_time:
                shift_end_dt = datetime.combine(entry.shift_date + timedelta(days=1), e_time)
            else:
                shift_end_dt = datetime.combine(entry.shift_date, e_time)

            # Find or create Shift
            existing_shift = db.query(Shift).filter(
                Shift.site_id == entry_site.site_id,
                Shift.org_id == org_id,
                Shift.start_time == shift_start_dt,
                Shift.end_time == shift_end_dt,
            ).first()

            if existing_shift:
                shift = existing_shift
                shift.required_staff = (shift.required_staff or 0) + 1
            else:
                shift = Shift(
                    org_id=org_id,
                    site_id=entry_site.site_id,
                    start_time=shift_start_dt,
                    end_time=shift_end_dt,
                    required_staff=1,
                    status=ShiftStatus.CONFIRMED,
                    notes=entry.notes or "",
                )
                db.add(shift)
                db.flush()
                shifts_created += 1

            # Check for existing assignment (idempotency)
            existing_assignment = db.query(ShiftAssignment).filter(
                ShiftAssignment.shift_id == shift.shift_id,
                ShiftAssignment.employee_id == emp.employee_id,
            ).first()
            if existing_assignment:
                continue

            # Create ShiftAssignment
            assignment = ShiftAssignment(
                shift_id=shift.shift_id,
                employee_id=emp.employee_id,
                roster_id=roster.roster_id,
                status=AssignmentStatus.CONFIRMED.value,
                is_confirmed=True,
                confirmation_datetime=now,
                assigned_by=user_id,
            )

            try:
                assignment.calculate_cost(shift, emp)
            except Exception as e:
                logger.warning(f"Cost calculation failed for row {entry.row_number}: {e}")
                duration = (shift_end_dt - shift_start_dt).total_seconds() / 3600
                assignment.regular_hours = duration
                assignment.regular_pay = duration * (emp.hourly_rate or 0)
                assignment.total_cost = assignment.regular_pay

            total_cost += assignment.total_cost
            regular_cost += assignment.regular_pay
            overtime_cost += assignment.overtime_pay
            premium_cost += (assignment.sunday_premium + assignment.holiday_premium + assignment.night_premium)

            db.add(assignment)
            assignments_created += 1

        # Update roster stats
        roster.total_shifts = shifts_created
        roster.assigned_shifts = assignments_created
        roster.unassigned_shifts = max(0, shifts_created - assignments_created)
        roster.total_cost = total_cost
        roster.regular_pay_cost = regular_cost
        roster.overtime_cost = overtime_cost
        roster.premium_cost = premium_cost

        # Create upload log
        upload_log = RosterUploadLog(
            org_id=org_id,
            roster_id=roster.roster_id,
            filename=filename,
            file_hash=file_hash,
            upload_format=detected_format,
            uploaded_by=user_id,
            uploaded_at=now,
            parsed_site_name=detected_site_name,
            parsed_client=detected_client_name,
            parsed_start_date=start_date,
            parsed_end_date=end_date,
            client_id=client.client_id if client else None,
            site_id=site.site_id if site else None,
            status="completed",
            employees_matched=len(employee_map),
            employees_unmatched=len(unmatched),
            shifts_created=shifts_created,
            assignments_created=assignments_created,
            total_cost=total_cost,
            warnings=warnings[:50] if warnings else None,
            errors=errors[:50] if errors else None,
        )
        db.add(upload_log)

        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Roster import commit failed: {e}")
            return {"status": "error", "message": f"Failed to save roster: {str(e)}"}

        # Generate BCEA suggestions
        suggestions = []
        try:
            roster_data = self._entries_to_roster_data(entries, employee_map, start_date)
            if roster_data:
                from app.services.roster_suggestion_service import RosterSuggestionService
                suggestions = RosterSuggestionService.analyze(
                    roster_data=roster_data,
                    employee_map={e.employee_identifier: employee_map[e.employee_identifier]
                                  for e in entries if e.employee_identifier in employee_map},
                    start_date=start_date,
                    end_date=end_date,
                    site=site,
                    db=db,
                    org_id=org_id,
                )
        except Exception as ex:
            logger.warning(f"BCEA analysis failed: {ex}")

        return {
            "status": "success",
            "upload_id": upload_log.upload_id,
            "roster_id": roster.roster_id,
            "roster_code": roster.roster_code,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            },
            "site_resolved": {
                "site_id": site.site_id if site else None,
                "site_name": site.site_name if site else None,
                "client_id": client.client_id if client else None,
                "client_name": client.client_name if client else None,
            },
            "summary": {
                "total_entries": len(entries),
                "employees_matched": len(employee_map),
                "employees_unmatched": len(unmatched),
                "shifts_created": shifts_created,
                "assignments_created": assignments_created,
                "total_cost": round(total_cost, 2),
                "regular_cost": round(regular_cost, 2),
                "overtime_cost": round(overtime_cost, 2),
                "premium_cost": round(premium_cost, 2),
            },
            "unmatched_employees": unmatched[:50],
            "suggestions": suggestions[:50],
            "warnings": warnings[:50],
            "errors": errors[:50],
        }

    # ── Private helpers ──────────────────────────────────────────────────────

    def _match_employees(
        self, db: Session, org_id: int, entries: list
    ) -> tuple[dict, list[dict]]:
        """
        Match roster entries to Employee records using multiple strategies.
        Returns (matched_map: {identifier: Employee}, unmatched_list).
        """
        employees = db.query(Employee).filter(
            Employee.org_id == org_id,
            Employee.status == EmployeeStatus.ACTIVE,
        ).all()

        # Build lookup maps
        by_emp_number = {}
        for e in employees:
            if e.employee_number:
                by_emp_number[e.employee_number.strip().upper()] = e

        by_id = {e.employee_id: e for e in employees}

        by_name = {}
        for e in employees:
            if e.first_name and e.last_name:
                full = f"{e.first_name} {e.last_name}".lower().strip()
                by_name[full] = e
                # Also reversed
                by_name[f"{e.last_name} {e.first_name}".lower().strip()] = e
                # Surname,Initial format (Mafoko style)
                key = f"{e.last_name},{e.first_name[0]}".upper().strip()
                by_name[key] = e
                by_name[key.replace(" ", "")] = e

        by_psira = {}
        for e in employees:
            if e.psira_number:
                by_psira[e.psira_number.strip().upper()] = e

        matched = {}
        unmatched = []
        seen_identifiers = set()

        for entry in entries:
            identifier = entry.employee_identifier
            emp_id_str = entry.employee_id

            if identifier in matched or identifier in seen_identifiers:
                continue
            seen_identifiers.add(identifier)

            employee = None

            # Strategy 1: Match by employee_id (numeric DB ID)
            if emp_id_str:
                try:
                    employee = by_id.get(int(emp_id_str))
                except (ValueError, TypeError):
                    pass

            # Strategy 2: Match by employee_number (MSP#####, etc.)
            if not employee and emp_id_str:
                employee = by_emp_number.get(emp_id_str.strip().upper())

            if not employee and identifier:
                employee = by_emp_number.get(identifier.strip().upper())

            # Strategy 3: Match by full name
            if not employee and identifier:
                employee = by_name.get(identifier.lower().strip())
                if not employee:
                    # Try SURNAME,INITIAL format
                    employee = by_name.get(identifier.upper().strip().replace(" ", ""))

            # Strategy 4: Match by PSIRA number
            if not employee and entry.psira_number:
                employee = by_psira.get(entry.psira_number.strip().upper())

            if employee:
                matched[identifier] = employee
                if emp_id_str and emp_id_str != identifier:
                    matched[emp_id_str] = employee
            else:
                unmatched.append({
                    "identifier": identifier,
                    "employee_id": emp_id_str,
                    "name": identifier,
                    "grade": entry.grade,
                    "row_number": entry.row_number,
                })

        return matched, unmatched

    def _resolve_site_client(
        self,
        db: Session,
        org_id: int,
        site_name: Optional[str] = None,
        client_name: Optional[str] = None,
        site_id: Optional[int] = None,
        client_id: Optional[int] = None,
        auto_create: bool = False,
    ) -> tuple[Optional[Site], Optional[Client]]:
        """Resolve site and client from names or IDs."""
        site = None
        client = None

        # Direct ID lookup
        if site_id:
            site = db.query(Site).filter(Site.site_id == site_id, Site.org_id == org_id).first()
            if site and site.client_id:
                client = db.query(Client).filter(Client.client_id == site.client_id).first()
            return site, client

        if client_id:
            client = db.query(Client).filter(Client.client_id == client_id, Client.org_id == org_id).first()

        # Name-based matching
        if not client and client_name:
            client = db.query(Client).filter(
                Client.org_id == org_id,
                Client.client_name.ilike(f"%{client_name}%"),
            ).first()

        if site_name:
            query = db.query(Site).filter(
                Site.org_id == org_id,
                Site.site_name.ilike(f"%{site_name}%"),
            )
            if client:
                query = query.filter(Site.client_id == client.client_id)
            site = query.first()

        # Auto-create
        if auto_create and not client and client_name:
            client = Client(
                org_id=org_id,
                client_name=client_name,
                client_code=client_name[:20],
                status="active",
            )
            db.add(client)
            db.flush()

        if auto_create and not site and site_name:
            site = Site(
                org_id=org_id,
                client_id=client.client_id if client else None,
                client_name=client.client_name if client else client_name,
                site_name=site_name,
                address=site_name,
            )
            db.add(site)
            db.flush()

        # Fallback: use first site in org
        if not site:
            site = db.query(Site).filter(Site.org_id == org_id).first()
            if site and not client and site.client_id:
                client = db.query(Client).filter(Client.client_id == site.client_id).first()

        return site, client

    def _entries_to_roster_data(
        self, entries: list, employee_map: dict, start_date: Optional[date]
    ) -> list[dict]:
        """
        Convert entries to the roster_data format expected by RosterSuggestionService.
        Each dict has: pers_no, name, grade, working_days (0-indexed offsets), worked_count, row_number.
        """
        if not start_date:
            return []

        # Group entries by employee identifier
        emp_entries: dict[str, list] = {}
        for e in entries:
            key = e.employee_identifier
            if key not in emp_entries:
                emp_entries[key] = []
            emp_entries[key].append(e)

        result = []
        for identifier, entry_list in emp_entries.items():
            working_days = []
            for e in entry_list:
                if e.shift_date:
                    offset = (e.shift_date - start_date).days
                    if offset >= 0:
                        working_days.append(offset)

            first = entry_list[0]
            result.append({
                "pers_no": identifier,
                "name": identifier,
                "grade": first.grade or "",
                "contact": "",
                "worked_count": len(working_days),
                "working_days": sorted(working_days),
                "row_number": first.row_number,
            })

        return result
