"""Tasks package - imports all Celery tasks for auto-discovery."""

from . import roster_tasks
from . import prediction_tasks
from . import trial_tasks

__all__ = ['roster_tasks', 'prediction_tasks', 'trial_tasks']
