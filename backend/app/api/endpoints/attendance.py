"""Attendance API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.attendance import Attendance
from app.models.shift import Shift
from app.models.employee import Employee

router = APIRouter()

class ClockInRequest(BaseModel):
    shift_id: int
    employee_id: int
    notes: Optional[str] = None

class ClockOutRequest(BaseModel):
    attend_id: int
    notes: Optional[str] = None

@router.get("/")
async def get_attendance(
    employee_id: Optional[int] = None,
    shift_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Attendance)
    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
    if shift_id:
        query = query.filter(Attendance.shift_id == shift_id)
    attendances = query.order_by(Attendance.clock_in.desc()).offset(skip).limit(limit).all()
    
    result = []
    for a in attendances:
        employee = db.query(Employee).filter(Employee.employee_id == a.employee_id).first()
        shift = db.query(Shift).filter(Shift.shift_id == a.shift_id).first()
        result.append({
            "attend_id": a.attend_id,
            "shift_id": a.shift_id,
            "employee_id": a.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "clock_in": a.clock_in.isoformat() if a.clock_in else None,
            "clock_out": a.clock_out.isoformat() if a.clock_out else None,
            "variance_minutes": a.variance_minutes,
            "notes": a.notes
        })
    return result

@router.post("/clock-in")
async def clock_in(request: ClockInRequest, db: Session = Depends(get_db)):
    shift = db.query(Shift).filter(Shift.shift_id == request.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    existing = db.query(Attendance).filter(Attendance.shift_id == request.shift_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already clocked in")
    
    now = datetime.utcnow()
    variance_minutes = int((now - shift.start_time).total_seconds() / 60)
    
    attendance = Attendance(
        shift_id=request.shift_id,
        employee_id=request.employee_id,
        clock_in=now,
        variance_minutes=variance_minutes,
        notes=request.notes
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    
    return {
        "attend_id": attendance.attend_id,
        "clock_in": attendance.clock_in.isoformat(),
        "message": "Clocked in successfully"
    }

@router.post("/clock-out")
async def clock_out(request: ClockOutRequest, db: Session = Depends(get_db)):
    attendance = db.query(Attendance).filter(Attendance.attend_id == request.attend_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    if attendance.clock_out:
        raise HTTPException(status_code=400, detail="Already clocked out")
    
    attendance.clock_out = datetime.utcnow()
    if request.notes:
        attendance.notes = request.notes
    db.commit()
    
    return {"attend_id": attendance.attend_id, "message": "Clocked out successfully"}

@router.delete("/{attend_id}")
async def delete_attendance(attend_id: int, db: Session = Depends(get_db)):
    attendance = db.query(Attendance).filter(Attendance.attend_id == attend_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    db.delete(attendance)
    db.commit()
    return {"message": "Attendance deleted successfully"}
