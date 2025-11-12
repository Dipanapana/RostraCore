"""
Celery tasks for roster generation
Handles long-running optimization jobs in the background
"""

from celery import Task
from app.celery_app import celery_app
from app.database import SessionLocal
from app.algorithms.production_optimizer import ProductionRosterOptimizer, OptimizationConfig
from app.algorithms.milp_roster_generator import MILPRosterGenerator
from app.algorithms.roster_generator import RosterGenerator
from app.services.analytics_service import track
from datetime import datetime
import logging
import time

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """
    Base task that manages database sessions
    """
    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(bind=True, base=DatabaseTask, name='app.tasks.roster_tasks.generate_roster')
def generate_roster_task(
    self,
    start_date: str,
    end_date: str,
    site_ids: list,
    algorithm: str = 'production',
    budget_limit: float = None,
    user_id: int = None,
    org_id: int = None
):
    """
    Background task for roster generation

    Args:
        self: Celery task instance (bind=True)
        start_date: Start date (ISO format string)
        end_date: End date (ISO format string)
        site_ids: List of site IDs
        algorithm: Algorithm to use ('production', 'milp', 'hungarian')
        budget_limit: Optional budget limit
        user_id: User who initiated the generation
        org_id: Organization ID

    Returns:
        Dict with roster results
    """
    try:
        # Update state to STARTED
        self.update_state(
            state='STARTED',
            meta={'progress': 0, 'status': 'Initializing optimization...', 'stage': 'setup'}
        )

        # Convert date strings to datetime objects
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)

        logger.info(f"Starting roster generation: {start_dt} to {end_dt}, algorithm={algorithm}")

        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'progress': 10, 'status': 'Loading shifts and employees...', 'stage': 'data_loading'}
        )

        # Select and configure algorithm
        if algorithm == 'production':
            config = OptimizationConfig(
                time_limit_seconds=180
            )
            optimizer = ProductionRosterOptimizer(self.db, config=config)

            self.update_state(
                state='PROGRESS',
                meta={'progress': 20, 'status': 'Analyzing constraints...', 'stage': 'constraint_analysis'}
            )

            # Run optimization
            result = optimizer.optimize(
                start_date=start_dt,
                end_date=end_dt,
                site_ids=site_ids if site_ids else None
            )

        elif algorithm == 'milp':
            self.update_state(
                state='PROGRESS',
                meta={'progress': 20, 'status': 'Building MILP model...', 'stage': 'model_building'}
            )

            generator = MILPRosterGenerator(self.db)
            result = generator.generate(
                start_date=start_dt,
                end_date=end_dt,
                site_ids=site_ids
            )

        elif algorithm == 'hungarian':
            self.update_state(
                state='PROGRESS',
                meta={'progress': 20, 'status': 'Running Hungarian algorithm...', 'stage': 'optimization'}
            )

            generator = RosterGenerator(self.db)
            result = generator.generate(
                start_date=start_dt,
                end_date=end_dt,
                site_ids=site_ids
            )

        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")

        # Update progress to finalizing
        self.update_state(
            state='PROGRESS',
            meta={'progress': 90, 'status': 'Finalizing assignments...', 'stage': 'finalization'}
        )

        # Track event in analytics
        if user_id and org_id:
            try:
                track(
                    db=self.db,
                    event_name='roster_generated',
                    user_id=user_id,
                    org_id=org_id,
                    fill_rate=result.get('summary', {}).get('fill_rate', 0),
                    algorithm=algorithm,
                    shift_count=result.get('summary', {}).get('total_shifts', 0)
                )
            except Exception as e:
                logger.warning(f"Failed to track analytics event: {e}")

        logger.info(f"Roster generation completed successfully: {len(result.get('assignments', []))} assignments")

        # Return final result
        return {
            'status': 'completed',
            'progress': 100,
            'result': result,
            'algorithm': algorithm,
            'completed_at': datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Roster generation failed: {str(e)}", exc_info=True)

        # Update state to FAILURE
        self.update_state(
            state='FAILURE',
            meta={
                'progress': 0,
                'status': f'Optimization failed: {str(e)}',
                'error': str(e),
                'stage': 'failed'
            }
        )

        # Re-raise to mark task as failed
        raise


@celery_app.task(name='app.tasks.roster_tasks.confirm_roster')
def confirm_roster_task(
    assignments: list,
    user_id: int = None,
    org_id: int = None
):
    """
    Background task for confirming roster assignments

    Args:
        assignments: List of shift assignments
        user_id: User who confirmed
        org_id: Organization ID

    Returns:
        Dict with confirmation results
    """
    db = SessionLocal()

    try:
        from app.services.shift_service import ShiftService
        from app.services.cache_service import CacheInvalidator

        confirmed_count = 0
        for assignment in assignments:
            shift = ShiftService.assign_employee(
                db,
                assignment["shift_id"],
                assignment["employee_id"]
            )
            if shift:
                confirmed_count += 1

        # Invalidate caches
        CacheInvalidator.invalidate_dashboard(org_id)
        CacheInvalidator.invalidate_roster(org_id)
        CacheInvalidator.invalidate_shifts(org_id)

        # Track event
        if user_id and org_id:
            try:
                track(
                    db=db,
                    event_name='roster_confirmed',
                    user_id=user_id,
                    org_id=org_id,
                    shift_count=confirmed_count
                )
            except Exception as e:
                logger.warning(f"Failed to track analytics event: {e}")

        logger.info(f"Roster confirmed: {confirmed_count} shifts assigned")

        return {
            'success': True,
            'confirmed_shifts': confirmed_count,
            'total_assignments': len(assignments)
        }

    except Exception as e:
        logger.error(f"Roster confirmation failed: {str(e)}", exc_info=True)
        raise

    finally:
        db.close()
