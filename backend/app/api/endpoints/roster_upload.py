"""
Roster Upload endpoints — Mafoko site roster format.

- POST /mafoko/preview: Dry run, parse and return suggestions without creating records
- POST /mafoko: Parse and create Roster + Shifts + ShiftAssignments
- POST /mafoko/bulk: Process multiple files at once
- GET /history: List past uploads for this organization
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.database import get_db
from app.api.deps import get_current_user
from app.auth.security import get_current_org_id
from app.models.user import User
from app.models.roster_upload_log import RosterUploadLog
from app.services.mafoko_roster_import_service import MafokoRosterImportService

logger = logging.getLogger(__name__)

router = APIRouter()
service = MafokoRosterImportService()


@router.post("/mafoko/preview")
async def preview_mafoko_roster(
    file: UploadFile = File(..., description="Mafoko site roster Excel file"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    """
    Preview a Mafoko site roster upload. Parses the file and returns
    header info, employee matching, suggestions — without creating any DB records.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx)")

    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {str(e)}")

    result = service.import_roster(
        db=db,
        file_content=contents,
        filename=file.filename,
        org_id=org_id,
        user_id=current_user.user_id,
        dry_run=True,
    )

    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message", "Import failed"))

    return result


@router.post("/mafoko")
async def upload_mafoko_roster(
    file: UploadFile = File(..., description="Mafoko site roster Excel file"),
    site_id: Optional[int] = Query(None, description="Override site ID"),
    client_id: Optional[int] = Query(None, description="Override client ID"),
    shift_start: str = Query("06:00", description="Shift start time (HH:MM)"),
    shift_end: str = Query("18:00", description="Shift end time (HH:MM)"),
    auto_create_site: bool = Query(False, description="Auto-create site if not found"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    """
    Upload a Mafoko site roster Excel file.
    Parses the D/o grid format and creates Roster + Shifts + ShiftAssignments.
    Returns import summary with suggestions.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx)")

    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {str(e)}")

    result = service.import_roster(
        db=db,
        file_content=contents,
        filename=file.filename,
        org_id=org_id,
        user_id=current_user.user_id,
        site_id_override=site_id,
        client_id_override=client_id,
        shift_start_time=shift_start,
        shift_end_time=shift_end,
        auto_create_site=auto_create_site,
        dry_run=False,
    )

    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message", "Import failed"))

    if result.get("status") == "duplicate":
        raise HTTPException(status_code=409, detail=result.get("message", "Duplicate upload"))

    return result


@router.post("/mafoko/bulk")
async def upload_mafoko_roster_bulk(
    files: List[UploadFile] = File(..., description="Multiple Mafoko site roster files"),
    shift_start: str = Query("06:00", description="Shift start time (HH:MM)"),
    shift_end: str = Query("18:00", description="Shift end time (HH:MM)"),
    auto_create_site: bool = Query(False, description="Auto-create sites if not found"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    """
    Upload multiple Mafoko site roster files at once (one per site).
    Processes each file independently and returns a list of results.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    if len(files) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 files per bulk upload")

    results = []
    for file in files:
        if not file.filename.endswith((".xlsx", ".xls")):
            results.append({
                "filename": file.filename,
                "status": "error",
                "message": "Not an Excel file",
            })
            continue

        try:
            contents = await file.read()
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "error",
                "message": f"Could not read file: {str(e)}",
            })
            continue

        result = service.import_roster(
            db=db,
            file_content=contents,
            filename=file.filename,
            org_id=org_id,
            user_id=current_user.user_id,
            shift_start_time=shift_start,
            shift_end_time=shift_end,
            auto_create_site=auto_create_site,
            dry_run=False,
        )
        result["filename"] = file.filename
        results.append(result)

    # Summary
    total = len(results)
    success = sum(1 for r in results if r.get("status") == "success")
    failed = sum(1 for r in results if r.get("status") == "error")
    duplicates = sum(1 for r in results if r.get("status") == "duplicate")

    return {
        "status": "completed",
        "total_files": total,
        "successful": success,
        "failed": failed,
        "duplicates": duplicates,
        "results": results,
    }


@router.get("/history")
async def get_upload_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    """List past roster uploads for this organization."""
    query = db.query(RosterUploadLog).filter(
        RosterUploadLog.org_id == org_id,
    ).order_by(RosterUploadLog.uploaded_at.desc())

    total = query.count()
    logs = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "uploads": [
            {
                "upload_id": log.upload_id,
                "filename": log.filename,
                "upload_format": log.upload_format,
                "uploaded_at": log.uploaded_at.isoformat() if log.uploaded_at else None,
                "status": log.status,
                "parsed_province": log.parsed_province,
                "parsed_client": log.parsed_client,
                "parsed_site_name": log.parsed_site_name,
                "parsed_start_date": log.parsed_start_date.isoformat() if log.parsed_start_date else None,
                "parsed_end_date": log.parsed_end_date.isoformat() if log.parsed_end_date else None,
                "roster_id": log.roster_id,
                "site_id": log.site_id,
                "employees_matched": log.employees_matched,
                "employees_unmatched": log.employees_unmatched,
                "shifts_created": log.shifts_created,
                "assignments_created": log.assignments_created,
                "total_cost": log.total_cost,
            }
            for log in logs
        ],
    }
