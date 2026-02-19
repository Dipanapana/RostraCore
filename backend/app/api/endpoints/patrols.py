"""Patrol tour endpoints — admin tour management and guard scan submission."""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.models.patrol import PatrolCheckpoint, PatrolRun, PatrolRunStatus, PatrolScan, PatrolTour
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CheckpointIn(BaseModel):
    name: str
    description: Optional[str] = None
    order_num: int
    qr_code: Optional[str] = None
    nfc_tag: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    photo_required: bool = False


class TourCreate(BaseModel):
    name: str
    description: Optional[str] = None
    site_id: Optional[int] = None
    checkpoints: List[CheckpointIn] = []


class CheckpointOut(BaseModel):
    checkpoint_id: int
    order_num: int
    name: str
    description: Optional[str]
    qr_code: Optional[str]
    nfc_tag: Optional[str]
    gps_lat: Optional[float]
    gps_lng: Optional[float]
    photo_required: bool

    class Config:
        from_attributes = True


class TourOut(BaseModel):
    tour_id: int
    org_id: int
    site_id: Optional[int]
    name: str
    description: Optional[str]
    is_active: bool
    checkpoints: List[CheckpointOut] = []

    class Config:
        from_attributes = True


class StartRunIn(BaseModel):
    tour_id: int
    assignment_id: Optional[int] = None


class ScanIn(BaseModel):
    checkpoint_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    # Guard scans either a QR value or NFC tag — backend resolves checkpoint
    scanned_value: Optional[str] = None  # QR or NFC raw value (alternative to checkpoint_id)


class ScanOut(BaseModel):
    scan_id: int
    run_id: int
    checkpoint_id: int
    checkpoint_name: str
    scanned_at: str
    latitude: Optional[float]
    longitude: Optional[float]
    photo_url: Optional[str]


class RunOut(BaseModel):
    run_id: int
    tour_id: int
    tour_name: str
    status: str
    started_at: str
    completed_at: Optional[str]
    total_checkpoints: int
    scans_completed: int
    scans: List[ScanOut] = []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_employee(db: Session, current_user: User, org_id: int) -> Optional[Employee]:
    return db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()


def _run_to_out(run: PatrolRun) -> RunOut:
    return RunOut(
        run_id=run.run_id,
        tour_id=run.tour_id,
        tour_name=run.tour.name if run.tour else "",
        status=run.status.value if hasattr(run.status, "value") else run.status,
        started_at=run.started_at.isoformat(),
        completed_at=run.completed_at.isoformat() if run.completed_at else None,
        total_checkpoints=len(run.tour.checkpoints) if run.tour else 0,
        scans_completed=len(run.scans),
        scans=[
            ScanOut(
                scan_id=s.scan_id,
                run_id=s.run_id,
                checkpoint_id=s.checkpoint_id,
                checkpoint_name=s.checkpoint.name if s.checkpoint else "",
                scanned_at=s.scanned_at.isoformat(),
                latitude=s.latitude,
                longitude=s.longitude,
                photo_url=s.photo_url,
            )
            for s in run.scans
        ],
    )


# ---------------------------------------------------------------------------
# Tour management (admin)
# ---------------------------------------------------------------------------

@router.post("/tours", response_model=TourOut, status_code=status.HTTP_201_CREATED)
def create_tour(
    data: TourCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Create a patrol tour with its checkpoints."""
    tour = PatrolTour(
        org_id=org_id,
        site_id=data.site_id,
        name=data.name,
        description=data.description,
    )
    db.add(tour)
    db.flush()  # Get tour_id before adding checkpoints

    for cp in data.checkpoints:
        db.add(PatrolCheckpoint(
            tour_id=tour.tour_id,
            name=cp.name,
            description=cp.description,
            order_num=cp.order_num,
            qr_code=cp.qr_code,
            nfc_tag=cp.nfc_tag,
            gps_lat=cp.gps_lat,
            gps_lng=cp.gps_lng,
            photo_required=cp.photo_required,
        ))

    db.commit()
    db.refresh(tour)
    return tour


@router.get("/tours", response_model=List[TourOut])
def list_tours(
    site_id: Optional[int] = None,
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List patrol tours for the organisation."""
    query = db.query(PatrolTour).filter(PatrolTour.org_id == org_id)
    if active_only:
        query = query.filter(PatrolTour.is_active == True)
    if site_id:
        query = query.filter(PatrolTour.site_id == site_id)
    return query.order_by(PatrolTour.name).all()


@router.get("/tours/{tour_id}", response_model=TourOut)
def get_tour(
    tour_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get a patrol tour with all its checkpoints."""
    tour = db.query(PatrolTour).filter(
        PatrolTour.tour_id == tour_id,
        PatrolTour.org_id == org_id,
    ).first()
    if not tour:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tour not found.")
    return tour


@router.delete("/tours/{tour_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tour(
    tour_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Deactivate a patrol tour (soft delete)."""
    tour = db.query(PatrolTour).filter(
        PatrolTour.tour_id == tour_id,
        PatrolTour.org_id == org_id,
    ).first()
    if not tour:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tour not found.")
    tour.is_active = False
    db.commit()


# ---------------------------------------------------------------------------
# Patrol runs (guard mobile)
# ---------------------------------------------------------------------------

@router.post("/runs/start", response_model=RunOut, status_code=status.HTTP_201_CREATED)
def start_patrol_run(
    data: StartRunIn,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Start a new patrol run.

    Creates a PatrolRun record in IN_PROGRESS status. The guard then
    calls POST /runs/{run_id}/scan for each checkpoint they visit.
    """
    tour = db.query(PatrolTour).filter(
        PatrolTour.tour_id == data.tour_id,
        PatrolTour.org_id == org_id,
        PatrolTour.is_active == True,
    ).first()
    if not tour:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tour not found.")

    employee = _resolve_employee(db, current_user, org_id)

    run = PatrolRun(
        org_id=org_id,
        tour_id=tour.tour_id,
        assignment_id=data.assignment_id,
        started_by_employee_id=employee.employee_id if employee else None,
        status=PatrolRunStatus.IN_PROGRESS,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return _run_to_out(run)


@router.post("/runs/{run_id}/scan", response_model=ScanOut, status_code=status.HTTP_201_CREATED)
def scan_checkpoint(
    run_id: int,
    data: ScanIn,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Record a checkpoint scan within an active patrol run.

    Guards can identify the checkpoint either by `checkpoint_id` directly
    or by the raw `scanned_value` (QR code text or NFC tag ID).
    """
    run = db.query(PatrolRun).filter(
        PatrolRun.run_id == run_id,
        PatrolRun.org_id == org_id,
    ).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found.")
    if run.status != PatrolRunStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Run is already {run.status.value}.",
        )

    # Resolve checkpoint
    checkpoint = None
    if data.checkpoint_id:
        checkpoint = db.query(PatrolCheckpoint).filter(
            PatrolCheckpoint.checkpoint_id == data.checkpoint_id,
            PatrolCheckpoint.tour_id == run.tour_id,
        ).first()
    elif data.scanned_value:
        checkpoint = db.query(PatrolCheckpoint).filter(
            PatrolCheckpoint.tour_id == run.tour_id,
            (PatrolCheckpoint.qr_code == data.scanned_value) |
            (PatrolCheckpoint.nfc_tag == data.scanned_value),
        ).first()

    if not checkpoint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkpoint not found.")

    # Prevent duplicate scans within the same run
    already = db.query(PatrolScan).filter(
        PatrolScan.run_id == run_id,
        PatrolScan.checkpoint_id == checkpoint.checkpoint_id,
    ).first()
    if already:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Checkpoint already scanned in this run.",
        )

    scan = PatrolScan(
        run_id=run_id,
        checkpoint_id=checkpoint.checkpoint_id,
        latitude=data.latitude,
        longitude=data.longitude,
        photo_url=data.photo_url,
        notes=data.notes,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    return ScanOut(
        scan_id=scan.scan_id,
        run_id=scan.run_id,
        checkpoint_id=scan.checkpoint_id,
        checkpoint_name=checkpoint.name,
        scanned_at=scan.scanned_at.isoformat(),
        latitude=scan.latitude,
        longitude=scan.longitude,
        photo_url=scan.photo_url,
    )


@router.post("/runs/{run_id}/complete", response_model=RunOut)
def complete_patrol_run(
    run_id: int,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Mark a patrol run as complete.

    Calculates completion percentage and records the finish time.
    """
    run = db.query(PatrolRun).filter(
        PatrolRun.run_id == run_id,
        PatrolRun.org_id == org_id,
    ).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found.")
    if run.status != PatrolRunStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Run is already {run.status.value}.",
        )

    run.status = PatrolRunStatus.COMPLETED
    run.completed_at = datetime.utcnow()
    if notes:
        run.notes = notes
    db.commit()
    db.refresh(run)
    return _run_to_out(run)


@router.post("/runs/{run_id}/abandon", response_model=RunOut)
def abandon_patrol_run(
    run_id: int,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Mark a patrol run as abandoned (guard had to leave mid-tour)."""
    run = db.query(PatrolRun).filter(
        PatrolRun.run_id == run_id,
        PatrolRun.org_id == org_id,
    ).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found.")
    if run.status != PatrolRunStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Run is already {run.status.value}.",
        )

    run.status = PatrolRunStatus.ABANDONED
    run.completed_at = datetime.utcnow()
    if notes:
        run.notes = notes
    db.commit()
    db.refresh(run)
    return _run_to_out(run)


# ---------------------------------------------------------------------------
# Run history
# ---------------------------------------------------------------------------

@router.get("/runs/mine", response_model=List[RunOut])
def get_my_runs(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Return the current guard's recent patrol runs."""
    employee = _resolve_employee(db, current_user, org_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No employee record found.")

    runs = (
        db.query(PatrolRun)
        .filter(
            PatrolRun.org_id == org_id,
            PatrolRun.started_by_employee_id == employee.employee_id,
        )
        .order_by(PatrolRun.started_at.desc())
        .limit(limit)
        .all()
    )
    return [_run_to_out(r) for r in runs]


@router.get("/runs", response_model=List[RunOut])
def list_runs(
    tour_id: Optional[int] = None,
    run_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all patrol runs for the organisation (admin/scheduler)."""
    query = db.query(PatrolRun).filter(PatrolRun.org_id == org_id)
    if tour_id:
        query = query.filter(PatrolRun.tour_id == tour_id)
    if run_status:
        query = query.filter(PatrolRun.status == run_status)
    runs = query.order_by(PatrolRun.started_at.desc()).offset(skip).limit(limit).all()
    return [_run_to_out(r) for r in runs]
