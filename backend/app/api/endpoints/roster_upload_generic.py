"""
Generic Roster Upload endpoints.

- POST /detect — auto-detect format + suggest column mapping
- POST /preview — preview import with confirmed mapping (no DB writes)
- POST /import — import roster with confirmed mapping (creates DB records)
- GET /formats — list supported formats
- GET /history — upload history (delegates to existing RosterUploadLog query)
"""

import hashlib
import io
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user
from app.auth.security import get_current_org_id
from app.models.user import User
from app.models.roster_upload_log import RosterUploadLog
from app.services.generic_roster_parser import GenericRosterParser
from app.services.roster_import_service import RosterImportService

logger = logging.getLogger(__name__)

router = APIRouter()
parser = GenericRosterParser()
importer = RosterImportService()


@router.post("/detect")
async def detect_format(
    file: UploadFile = File(..., description="Excel roster file to analyze"),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a roster file and auto-detect its format.
    Returns detected format, confidence, headers, sample rows, and suggested column mapping.
    """
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")

    try:
        contents = await file.read()
        detection = parser.detect_format(contents, file.filename)
        return detection.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Format detection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Format detection failed: {str(e)}")


@router.post("/preview")
async def preview_import(
    file: UploadFile = File(..., description="Excel roster file"),
    column_mapping: str = Form(..., description="JSON column mapping object"),
    default_start_time: str = Form("06:00", description="Default shift start (HH:MM)"),
    default_end_time: str = Form("18:00", description="Default shift end (HH:MM)"),
    site_id: Optional[int] = Form(None, description="Override site ID"),
    client_id: Optional[int] = Form(None, description="Override client ID"),
    site_name: Optional[str] = Form(None, description="Site name from UI"),
    client_name: Optional[str] = Form(None, description="Client name from UI"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    """
    Preview roster import without writing to DB.
    Requires column_mapping as JSON string: {"employee_name": 0, "date": 2, ...}
    Returns employee matches, estimated costs, BCEA suggestions.
    """
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")

    try:
        mapping = json.loads(column_mapping)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid column_mapping JSON")

    try:
        contents = await file.read()

        # Check if it's a known format that should be delegated
        detection = parser.detect_format(contents, file.filename)

        if detection.detected_format == "mafoko_do_grid":
            # Delegate to Mafoko service for preview
            from app.services.mafoko_roster_import_service import MafokoRosterImportService
            mafoko = MafokoRosterImportService()
            result = mafoko.import_roster(
                db=db,
                file_content=contents,
                filename=file.filename,
                org_id=org_id,
                user_id=current_user.user_id,
                site_id_override=site_id,
                client_id_override=client_id,
                shift_start_time=default_start_time,
                shift_end_time=default_end_time,
                dry_run=True,
            )
            result["detected_format"] = "mafoko_do_grid"
            return result

        # Parse with generic parser
        parse_result = parser.parse(
            file_bytes=contents,
            filename=file.filename,
            column_mapping=mapping,
            default_start_time=default_start_time,
            default_end_time=default_end_time,
            default_site_name=site_name,
            default_client_name=client_name,
        )

        if parse_result.errors:
            return {
                "status": "error",
                "message": f"Parsing errors: {len(parse_result.errors)} issues found",
                "errors": parse_result.errors,
                "warnings": parse_result.warnings,
            }

        if not parse_result.entries:
            return {
                "status": "error",
                "message": "No roster entries found in the file with the given column mapping.",
            }

        # Preview import
        file_hash = hashlib.sha256(contents).hexdigest()
        result = importer.preview(
            db=db,
            org_id=org_id,
            entries=parse_result.entries,
            date_range=parse_result.date_range,
            file_hash=file_hash,
            detected_site_name=parse_result.site_name or site_name,
            detected_client_name=parse_result.client_name or client_name,
            site_id_override=site_id,
            client_id_override=client_id,
            default_start_time=default_start_time,
            default_end_time=default_end_time,
        )
        result["detected_format"] = detection.detected_format
        result["parse_warnings"] = parse_result.warnings
        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Preview failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")


@router.post("/import")
async def import_roster(
    file: UploadFile = File(..., description="Excel roster file"),
    column_mapping: str = Form(..., description="JSON column mapping object"),
    default_start_time: str = Form("06:00", description="Default shift start (HH:MM)"),
    default_end_time: str = Form("18:00", description="Default shift end (HH:MM)"),
    site_id: Optional[int] = Form(None, description="Override site ID"),
    client_id: Optional[int] = Form(None, description="Override client ID"),
    site_name: Optional[str] = Form(None, description="Site name from UI"),
    client_name: Optional[str] = Form(None, description="Client name from UI"),
    auto_create_site: bool = Form(False, description="Auto-create site if not found"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    """
    Import roster from Excel file using confirmed column mapping.
    Creates Roster, Shifts, ShiftAssignments in DB.
    """
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")

    try:
        mapping = json.loads(column_mapping)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid column_mapping JSON")

    try:
        contents = await file.read()

        # Check if it's Mafoko format — delegate
        detection = parser.detect_format(contents, file.filename)

        if detection.detected_format == "mafoko_do_grid":
            from app.services.mafoko_roster_import_service import MafokoRosterImportService
            mafoko = MafokoRosterImportService()
            result = mafoko.import_roster(
                db=db,
                file_content=contents,
                filename=file.filename,
                org_id=org_id,
                user_id=current_user.user_id,
                site_id_override=site_id,
                client_id_override=client_id,
                shift_start_time=default_start_time,
                shift_end_time=default_end_time,
                auto_create_site=auto_create_site,
            )
            result["detected_format"] = "mafoko_do_grid"
            return result

        # Parse with generic parser
        parse_result = parser.parse(
            file_bytes=contents,
            filename=file.filename,
            column_mapping=mapping,
            default_start_time=default_start_time,
            default_end_time=default_end_time,
            default_site_name=site_name,
            default_client_name=client_name,
        )

        if parse_result.errors:
            return {
                "status": "error",
                "message": f"Parsing errors: {len(parse_result.errors)} issues found",
                "errors": parse_result.errors,
                "warnings": parse_result.warnings,
            }

        if not parse_result.entries:
            return {
                "status": "error",
                "message": "No roster entries found in the file with the given column mapping.",
            }

        # Import
        result = importer.import_roster(
            db=db,
            org_id=org_id,
            user_id=current_user.user_id,
            entries=parse_result.entries,
            date_range=parse_result.date_range,
            file_bytes=contents,
            filename=file.filename,
            detected_format=detection.detected_format,
            detected_site_name=parse_result.site_name or site_name,
            detected_client_name=parse_result.client_name or client_name,
            site_id_override=site_id,
            client_id_override=client_id,
            auto_create_site=auto_create_site,
            default_start_time=default_start_time,
            default_end_time=default_end_time,
        )
        result["detected_format"] = detection.detected_format
        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Import failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/formats")
async def list_formats(current_user: User = Depends(get_current_user)):
    """List supported roster formats with descriptions."""
    return {
        "formats": [
            {
                "id": "mafoko_do_grid",
                "name": "Mafoko D/o Grid",
                "description": "Mafoko Security's site roster format with D/o (Duty/off) grid columns for each day of the month.",
                "auto_detected": True,
                "columns": "Pers No, Grade, Name, Contact, Worked, Day 1-31 (D/o values)",
            },
            {
                "id": "rostracore_template",
                "name": "RostraCore Template",
                "description": "RostraCore's standard roster template. Download from Roster Templates page.",
                "auto_detected": True,
                "columns": "Date, Day, Shift Start, Shift End, Guard Name, Employee ID, PSIRA Number, Grade, Notes",
            },
            {
                "id": "generic",
                "name": "Generic Excel",
                "description": "Any Excel file with roster data. System will suggest column mappings or you can map manually.",
                "auto_detected": False,
                "columns": "Minimum required: Employee Name/ID + Date. Optional: Start/End Time, Site, Client, Grade, PSIRA, Notes.",
            },
        ]
    }


@router.get("/history")
async def upload_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    """Get roster upload history for this organization."""
    logs = (
        db.query(RosterUploadLog)
        .filter(RosterUploadLog.org_id == org_id)
        .order_by(RosterUploadLog.uploaded_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    total = db.query(RosterUploadLog).filter(RosterUploadLog.org_id == org_id).count()

    return {
        "total": total,
        "items": [
            {
                "upload_id": log.upload_id,
                "roster_id": log.roster_id,
                "filename": log.filename,
                "upload_format": log.upload_format,
                "uploaded_at": log.uploaded_at.isoformat() if log.uploaded_at else None,
                "status": log.status,
                "parsed_site_name": log.parsed_site_name,
                "parsed_client": log.parsed_client,
                "parsed_start_date": log.parsed_start_date.isoformat() if log.parsed_start_date else None,
                "parsed_end_date": log.parsed_end_date.isoformat() if log.parsed_end_date else None,
                "employees_matched": log.employees_matched,
                "employees_unmatched": log.employees_unmatched,
                "shifts_created": log.shifts_created,
                "assignments_created": log.assignments_created,
                "total_cost": log.total_cost,
            }
            for log in logs
        ],
    }
