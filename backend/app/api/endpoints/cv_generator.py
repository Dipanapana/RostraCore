"""CV Generator API endpoints - R60 CV generation service."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date
from app.database import get_db
from app.models.guard_applicant import GuardApplicant
from app.models.cv_generation import CVPurchase, GeneratedCV, PaymentStatus, CVTemplate, CVFormat
from app.services.cv_generator_service import CVGeneratorService
from pydantic import BaseModel, Field
import os

router = APIRouter()


# Schemas
class CVPurchaseCreate(BaseModel):
    applicant_id: int
    payment_method: str = Field(..., pattern="^(card|eft|cash|voucher)$")
    payment_reference: Optional[str] = None


class CVGenerateRequest(BaseModel):
    applicant_id: int
    purchase_id: int
    template_name: str = Field(..., pattern="^(professional|modern|classic)$")
    format: str = Field(default="pdf", pattern="^(pdf|docx)$")


class CVPurchaseResponse(BaseModel):
    purchase_id: int
    applicant_id: int
    amount: float
    payment_method: str
    payment_status: str
    paid_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class GeneratedCVResponse(BaseModel):
    cv_id: int
    applicant_id: int
    template_name: str
    format: str
    file_url: str
    download_count: int
    generated_at: datetime

    class Config:
        from_attributes = True


@router.post("/purchase", response_model=CVPurchaseResponse, status_code=status.HTTP_201_CREATED)
async def create_cv_purchase(
    purchase_data: CVPurchaseCreate,
    db: Session = Depends(get_db)
):
    """
    Initiate CV purchase - R60 one-time fee.

    Guards who don't have a CV can pay R60 to generate a professional CV.
    """

    # Check if applicant exists
    applicant = db.query(GuardApplicant).filter(
        GuardApplicant.applicant_id == purchase_data.applicant_id
    ).first()

    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guard applicant not found"
        )

    # Check if already has a paid CV purchase
    existing_purchase = db.query(CVPurchase).filter(
        CVPurchase.applicant_id == purchase_data.applicant_id,
        CVPurchase.payment_status == PaymentStatus.COMPLETED
    ).first()

    if existing_purchase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CV service already purchased. You can generate unlimited CVs with different templates."
        )

    # Create purchase record
    purchase = CVPurchase(
        applicant_id=purchase_data.applicant_id,
        amount=60.00,
        payment_method=purchase_data.payment_method,
        payment_reference=purchase_data.payment_reference,
        payment_status=PaymentStatus.PENDING
    )

    db.add(purchase)
    db.commit()
    db.refresh(purchase)

    return purchase


@router.post("/purchase/{purchase_id}/confirm", response_model=CVPurchaseResponse)
async def confirm_payment(
    purchase_id: int,
    payment_reference: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Confirm payment for CV purchase.

    This would typically be called by a payment gateway webhook or admin confirmation.
    """

    purchase = db.query(CVPurchase).filter(CVPurchase.purchase_id == purchase_id).first()

    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )

    if purchase.payment_status == PaymentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment already confirmed"
        )

    # Update purchase
    purchase.payment_status = PaymentStatus.COMPLETED
    purchase.paid_at = datetime.utcnow()
    if payment_reference:
        purchase.payment_reference = payment_reference

    # Update applicant
    applicant = db.query(GuardApplicant).filter(
        GuardApplicant.applicant_id == purchase.applicant_id
    ).first()
    applicant.cv_purchase_id = purchase_id

    db.commit()
    db.refresh(purchase)

    return purchase


@router.post("/generate", response_model=GeneratedCVResponse, status_code=status.HTTP_201_CREATED)
async def generate_cv(
    cv_request: CVGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a professional CV for the guard.

    Requires a completed CV purchase. Guards can generate multiple CVs
    with different templates using the same purchase.
    """

    # Check if purchase is completed
    purchase = db.query(CVPurchase).filter(
        CVPurchase.purchase_id == cv_request.purchase_id,
        CVPurchase.applicant_id == cv_request.applicant_id
    ).first()

    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )

    if purchase.payment_status != PaymentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment not completed. Please complete payment first."
        )

    # Get applicant data
    applicant = db.query(GuardApplicant).filter(
        GuardApplicant.applicant_id == cv_request.applicant_id
    ).first()

    # Prepare CV data
    cv_data = {
        'full_name': applicant.full_name,
        'email': applicant.email,
        'phone': applicant.phone,
        'psira_number': applicant.psira_number,
        'psira_grade': applicant.psira_grade,
        'psira_expiry_date': str(applicant.psira_expiry_date) if applicant.psira_expiry_date else 'N/A',
        'date_of_birth': str(applicant.date_of_birth) if applicant.date_of_birth else 'N/A',
        'gender': applicant.gender,
        'id_number': applicant.id_number,
        'street_address': applicant.street_address,
        'suburb': applicant.suburb,
        'city': applicant.city,
        'province': applicant.province,
        'postal_code': applicant.postal_code,
        'provinces_willing_to_work': applicant.provinces_willing_to_work or [applicant.province],
        'available_for_work': applicant.available_for_work,
        'hourly_rate_expectation': str(applicant.hourly_rate_expectation) if applicant.hourly_rate_expectation else 'Negotiable',
        'years_experience': applicant.years_experience or 0,
        'skills': applicant.skills or ['Security Patrol', 'Access Control', 'Incident Response'],
        'languages': applicant.languages or ['English'],
        'has_drivers_license': applicant.has_drivers_license,
        'drivers_license_code': applicant.drivers_license_code,
        'has_firearm_competency': applicant.has_firearm_competency,
        'firearm_competency_expiry': str(applicant.firearm_competency_expiry) if applicant.firearm_competency_expiry else None,
        'references': applicant.references
    }

    # Generate HTML
    html_content = CVGeneratorService.get_template_html(cv_request.template_name, cv_data)

    # For now, save as HTML (PDF generation requires weasyprint or similar)
    # In production, you'd convert HTML to PDF here
    filename = f"cv_{applicant.applicant_id}_{cv_request.template_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}.html"

    # You would save to cloud storage (S3, GCS, etc.) in production
    # For now, we'll just return the HTML content reference
    file_url = f"/api/v1/cv-generator/download/{filename}"

    # Create CV record
    generated_cv = GeneratedCV(
        applicant_id=cv_request.applicant_id,
        purchase_id=cv_request.purchase_id,
        template_name=cv_request.template_name,
        format=cv_request.format,
        file_url=file_url,
        cv_data=cv_data,
        download_count=0
    )

    db.add(generated_cv)

    # Update applicant
    applicant.has_generated_cv = True
    applicant.cv_url = file_url

    db.commit()
    db.refresh(generated_cv)

    return generated_cv


@router.get("/preview/{template_name}", response_class=HTMLResponse)
async def preview_template(
    template_name: str,
    db: Session = Depends(get_db)
):
    """
    Preview a CV template with sample data.

    Allows guards to see what each template looks like before purchasing.
    """

    if template_name not in ["professional", "modern", "classic"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid template name. Choose: professional, modern, or classic"
        )

    # Sample data for preview
    sample_data = {
        'full_name': 'Thabo Mbeki',
        'email': 'thabo.mbeki@example.com',
        'phone': '082 345 6789',
        'psira_number': '1234567',
        'psira_grade': 'B',
        'psira_expiry_date': '2026-12-31',
        'date_of_birth': '1985-06-15',
        'gender': 'Male',
        'id_number': '8506155678089',
        'street_address': '123 Main Street',
        'suburb': 'Sandton',
        'city': 'Johannesburg',
        'province': 'Gauteng',
        'postal_code': '2196',
        'provinces_willing_to_work': ['Gauteng', 'North West'],
        'available_for_work': True,
        'hourly_rate_expectation': '45',
        'years_experience': 5,
        'skills': ['Armed Response', 'CCTV Monitoring', 'Access Control', 'Patrol', 'Incident Response'],
        'languages': ['English', 'Zulu', 'Afrikaans'],
        'has_drivers_license': True,
        'drivers_license_code': 'B',
        'has_firearm_competency': True,
        'firearm_competency_expiry': '2025-08-30',
        'references': [
            {'name': 'John Smith', 'company': 'ABC Security', 'position': 'Operations Manager', 'phone': '011 123 4567'},
            {'name': 'Sarah Johnson', 'company': 'XYZ Protection', 'position': 'Site Supervisor', 'phone': '011 987 6543'}
        ]
    }

    html_content = CVGeneratorService.get_template_html(template_name, sample_data)
    return HTMLResponse(content=html_content)


@router.get("/my-cvs/{applicant_id}", response_model=list[GeneratedCVResponse])
async def get_my_cvs(
    applicant_id: int,
    db: Session = Depends(get_db)
):
    """Get all CVs generated by an applicant."""

    cvs = db.query(GeneratedCV).filter(
        GeneratedCV.applicant_id == applicant_id
    ).order_by(GeneratedCV.generated_at.desc()).all()

    return cvs


@router.get("/download/{cv_id}")
async def download_cv(
    cv_id: int,
    db: Session = Depends(get_db)
):
    """
    Download generated CV.

    Tracks download count for analytics.
    """

    cv = db.query(GeneratedCV).filter(GeneratedCV.cv_id == cv_id).first()

    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )

    # Update download stats
    cv.download_count += 1
    cv.last_downloaded = datetime.utcnow()
    db.commit()

    # Regenerate CV HTML on-the-fly
    html_content = CVGeneratorService.get_template_html(cv.template_name, cv.cv_data)

    return HTMLResponse(
        content=html_content,
        headers={
            "Content-Disposition": f"attachment; filename=CV_{cv.applicant_id}_{cv.template_name}.html"
        }
    )


@router.get("/templates")
async def list_templates():
    """
    List available CV templates with descriptions.
    """

    return {
        "templates": [
            {
                "name": "professional",
                "title": "Professional",
                "description": "Clean and corporate design with blue header. Perfect for formal applications.",
                "preview_url": "/api/v1/cv-generator/preview/professional"
            },
            {
                "name": "modern",
                "title": "Modern",
                "description": "Bold contemporary design with purple gradient sidebar. Stand out from the crowd.",
                "preview_url": "/api/v1/cv-generator/preview/modern"
            },
            {
                "name": "classic",
                "title": "Classic",
                "description": "Traditional formal layout in Times New Roman. Timeless and professional.",
                "preview_url": "/api/v1/cv-generator/preview/classic"
            }
        ],
        "price": 60.00,
        "currency": "ZAR",
        "features": [
            "Generate unlimited CVs with different templates",
            "Professional PSIRA-focused design",
            "Download as PDF or Word document",
            "Update anytime with your latest information"
        ]
    }
