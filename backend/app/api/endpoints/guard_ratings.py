"""Guard rating endpoints - Rate employees after employment."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app.models.guard_rating import GuardRating
from app.models.employee import Employee
from pydantic import BaseModel, Field

router = APIRouter()


# Schemas
class RatingCreate(BaseModel):
    employee_id: int
    job_id: Optional[int] = None

    overall_rating: int = Field(..., ge=1, le=5)
    punctuality_rating: Optional[int] = Field(None, ge=1, le=5)
    professionalism_rating: Optional[int] = Field(None, ge=1, le=5)
    competence_rating: Optional[int] = Field(None, ge=1, le=5)
    reliability_rating: Optional[int] = Field(None, ge=1, le=5)

    comments: Optional[str] = None
    strengths: Optional[str] = None
    areas_for_improvement: Optional[str] = None
    would_rehire: Optional[bool] = None


class RatingResponse(BaseModel):
    rating_id: int
    employee_id: int
    rated_by: Optional[int]
    job_id: Optional[int]

    overall_rating: int
    punctuality_rating: Optional[int]
    professionalism_rating: Optional[int]
    competence_rating: Optional[int]
    reliability_rating: Optional[int]

    comments: Optional[str]
    strengths: Optional[str]
    areas_for_improvement: Optional[str]
    would_rehire: Optional[bool]

    created_at: str

    class Config:
        from_attributes = True


@router.post("/", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
async def create_rating(
    rating_data: RatingCreate,
    supervisor_id: int,
    db: Session = Depends(get_db)
):
    """Create a rating for an employee (by supervisor)."""

    # Check if employee exists
    employee = db.query(Employee).filter(
        Employee.employee_id == rating_data.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    # Create rating
    rating = GuardRating(
        employee_id=rating_data.employee_id,
        rated_by=supervisor_id,
        job_id=rating_data.job_id,
        overall_rating=rating_data.overall_rating,
        punctuality_rating=rating_data.punctuality_rating,
        professionalism_rating=rating_data.professionalism_rating,
        competence_rating=rating_data.competence_rating,
        reliability_rating=rating_data.reliability_rating,
        comments=rating_data.comments,
        strengths=rating_data.strengths,
        areas_for_improvement=rating_data.areas_for_improvement,
        would_rehire=rating_data.would_rehire
    )

    db.add(rating)
    db.flush()

    # Update employee's average rating
    avg_rating = db.query(func.avg(GuardRating.overall_rating)).filter(
        GuardRating.employee_id == rating_data.employee_id
    ).scalar()

    total_ratings = db.query(func.count(GuardRating.rating_id)).filter(
        GuardRating.employee_id == rating_data.employee_id
    ).scalar()

    employee.average_rating = round(float(avg_rating), 2) if avg_rating else None
    employee.total_ratings = total_ratings

    db.commit()
    db.refresh(rating)

    return rating


@router.get("/", response_model=List[RatingResponse])
async def list_ratings(
    employee_id: Optional[int] = None,
    supervisor_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List guard ratings."""

    query = db.query(GuardRating)

    if employee_id:
        query = query.filter(GuardRating.employee_id == employee_id)

    if supervisor_id:
        query = query.filter(GuardRating.rated_by == supervisor_id)

    query = query.order_by(GuardRating.created_at.desc())

    ratings = query.offset(skip).limit(limit).all()
    return ratings


@router.get("/{rating_id}", response_model=RatingResponse)
async def get_rating(rating_id: int, db: Session = Depends(get_db)):
    """Get rating by ID."""
    rating = db.query(GuardRating).filter(GuardRating.rating_id == rating_id).first()

    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rating not found"
        )

    return rating


@router.get("/employee/{employee_id}/stats")
async def get_employee_rating_stats(employee_id: int, db: Session = Depends(get_db)):
    """Get rating statistics for an employee."""

    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    # Get all ratings
    ratings = db.query(GuardRating).filter(GuardRating.employee_id == employee_id).all()

    if not ratings:
        return {
            "employee_id": employee_id,
            "average_overall": None,
            "average_punctuality": None,
            "average_professionalism": None,
            "average_competence": None,
            "average_reliability": None,
            "total_ratings": 0,
            "would_rehire_count": 0,
            "would_rehire_percentage": None
        }

    # Calculate averages
    overall_ratings = [r.overall_rating for r in ratings]
    punctuality_ratings = [r.punctuality_rating for r in ratings if r.punctuality_rating is not None]
    professionalism_ratings = [r.professionalism_rating for r in ratings if r.professionalism_rating is not None]
    competence_ratings = [r.competence_rating for r in ratings if r.competence_rating is not None]
    reliability_ratings = [r.reliability_rating for r in ratings if r.reliability_rating is not None]

    would_rehire_count = sum(1 for r in ratings if r.would_rehire is True)
    would_rehire_total = sum(1 for r in ratings if r.would_rehire is not None)

    return {
        "employee_id": employee_id,
        "average_overall": round(sum(overall_ratings) / len(overall_ratings), 2),
        "average_punctuality": round(sum(punctuality_ratings) / len(punctuality_ratings), 2) if punctuality_ratings else None,
        "average_professionalism": round(sum(professionalism_ratings) / len(professionalism_ratings), 2) if professionalism_ratings else None,
        "average_competence": round(sum(competence_ratings) / len(competence_ratings), 2) if competence_ratings else None,
        "average_reliability": round(sum(reliability_ratings) / len(reliability_ratings), 2) if reliability_ratings else None,
        "total_ratings": len(ratings),
        "would_rehire_count": would_rehire_count,
        "would_rehire_percentage": round((would_rehire_count / would_rehire_total * 100), 1) if would_rehire_total > 0 else None
    }
