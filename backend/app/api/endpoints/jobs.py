"""
Async Job Management API
Provides endpoints for starting background tasks and tracking their progress
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, date
from celery.result import AsyncResult

from app.database import get_db
from app.celery_app import celery_app
from app.models.schemas import RosterGenerateRequest


router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class RosterJobRequest(BaseModel):
    """Request model for starting a roster generation job"""
    start_date: date
    end_date: date
    site_ids: Optional[list] = None
    algorithm: str = 'production'
    budget_limit: Optional[float] = None
    user_id: Optional[int] = None
    org_id: Optional[int] = None


class JobStatusResponse(BaseModel):
    """Response model for job status"""
    job_id: str
    status: str  # PENDING, STARTED, PROGRESS, SUCCESS, FAILURE
    progress: int  # 0-100
    status_message: Optional[str] = None
    stage: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ============================================
# ROSTER GENERATION JOBS
# ============================================

@router.post("/roster/generate", response_model=Dict[str, str])
async def start_roster_generation_job(
    request: RosterJobRequest,
    db: Session = Depends(get_db)
):
    """
    Start a roster generation job in the background

    **Non-blocking:** Returns immediately with job_id for status tracking

    **Usage:**
    ```python
    POST /api/v1/jobs/roster/generate
    {
        "start_date": "2025-11-10",
        "end_date": "2025-11-16",
        "site_ids": [1, 2, 3],
        "algorithm": "production",
        "user_id": 1,
        "org_id": 1
    }
    ```

    **Returns:**
    ```json
    {
        "job_id": "abc123...",
        "status": "pending",
        "message": "Roster generation started. Use job_id to check status."
    }
    ```

    **Next Step:** Poll `/api/v1/jobs/status/{job_id}` every 2 seconds
    """
    try:
        from app.tasks.roster_tasks import generate_roster_task

        # Start background task
        task = generate_roster_task.delay(
            start_date=request.start_date.isoformat(),
            end_date=request.end_date.isoformat(),
            site_ids=request.site_ids,
            algorithm=request.algorithm,
            budget_limit=request.budget_limit,
            user_id=request.user_id,
            org_id=request.org_id
        )

        return {
            "job_id": task.id,
            "status": "pending",
            "message": "Roster generation started. Use job_id to check status.",
            "poll_url": f"/api/v1/jobs/status/{task.id}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start job: {str(e)}")


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """
    Get the status of a background job

    **Job States:**
    - **PENDING**: Job queued, not started yet
    - **STARTED**: Job has begun execution
    - **PROGRESS**: Job is running (check progress field for %)
    - **SUCCESS**: Job completed successfully (result available)
    - **FAILURE**: Job failed (error available)

    **Polling Recommendations:**
    - Poll every 2 seconds during execution
    - Stop polling when status is SUCCESS or FAILURE
    - Show progress bar using `progress` field (0-100)
    - Display `status_message` to user

    **Example:**
    ```
    GET /api/v1/jobs/status/abc123...
    ```

    **Response (in progress):**
    ```json
    {
        "job_id": "abc123...",
        "status": "PROGRESS",
        "progress": 65,
        "status_message": "Optimizing shift assignments...",
        "stage": "optimization"
    }
    ```

    **Response (completed):**
    ```json
    {
        "job_id": "abc123...",
        "status": "SUCCESS",
        "progress": 100,
        "status_message": "Optimization complete",
        "result": {
            "assignments": [...],
            "summary": {...}
        },
        "completed_at": "2025-11-06T10:30:00Z"
    }
    ```
    """
    try:
        task = AsyncResult(job_id, app=celery_app)

        # Build response based on task state
        response = {
            "job_id": job_id,
            "status": task.state,
            "progress": 0,
            "status_message": None,
            "stage": None,
            "result": None,
            "error": None,
            "started_at": None,
            "completed_at": None
        }

        if task.state == 'PENDING':
            response["status_message"] = "Job queued, waiting to start..."
            response["progress"] = 0

        elif task.state == 'STARTED':
            response["status_message"] = "Job started..."
            response["progress"] = 5

        elif task.state == 'PROGRESS':
            # Get progress info from task metadata
            info = task.info or {}
            response["progress"] = info.get('progress', 50)
            response["status_message"] = info.get('status', 'Processing...')
            response["stage"] = info.get('stage', 'running')

        elif task.state == 'SUCCESS':
            # Task completed successfully
            result = task.result or {}
            response["progress"] = 100
            response["status_message"] = "Optimization complete"
            response["result"] = result.get('result', {})
            response["completed_at"] = result.get('completed_at')

        elif task.state == 'FAILURE':
            # Task failed
            info = task.info or {}
            response["progress"] = 0
            response["status_message"] = "Job failed"
            response["error"] = str(task.info) if task.info else "Unknown error"
            response["stage"] = "failed"

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {str(e)}")


@router.delete("/cancel/{job_id}")
async def cancel_job(job_id: str):
    """
    Cancel a running background job

    **Note:** This will attempt to terminate the job gracefully.
    Jobs that are in the middle of critical operations may not cancel immediately.

    **Example:**
    ```
    DELETE /api/v1/jobs/cancel/abc123...
    ```

    **Response:**
    ```json
    {
        "success": true,
        "message": "Job cancellation requested",
        "job_id": "abc123..."
    }
    ```
    """
    try:
        task = AsyncResult(job_id, app=celery_app)

        if task.state in ['PENDING', 'STARTED', 'PROGRESS']:
            task.revoke(terminate=True)
            return {
                "success": True,
                "message": "Job cancellation requested",
                "job_id": job_id
            }
        else:
            return {
                "success": False,
                "message": f"Job cannot be cancelled (current state: {task.state})",
                "job_id": job_id
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel job: {str(e)}")


@router.get("/list")
async def list_jobs(limit: int = 20):
    """
    List recent jobs

    **Note:** This is a basic implementation. For production, consider using
    Celery Flower or a proper job queue UI.

    **Example:**
    ```
    GET /api/v1/jobs/list?limit=10
    ```
    """
    # This is a simplified version
    # In production, you'd want to store job metadata in a database
    # and query from there for better filtering and persistence

    return {
        "message": "Use Celery Flower for comprehensive job monitoring",
        "flower_url": "http://localhost:5555",
        "note": "Start Flower with: celery -A app.celery_app flower"
    }
