"""
Celery application for RostraCore
Handles long-running background tasks like roster optimization
"""

from celery import Celery
import os

# Create Celery app
celery_app = Celery(
    'rostracore',
    broker=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Africa/Johannesburg',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes max
    task_soft_time_limit=540,  # 9 minutes warning
    worker_prefetch_multiplier=1,  # One task at a time
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks
    broker_connection_retry_on_startup=True
)

# Auto-discover tasks
celery_app.autodiscover_tasks(['app.tasks'])

# Celery beat schedule (for periodic tasks)
celery_app.conf.beat_schedule = {
    'calculate-daily-metrics': {
        'task': 'app.tasks.analytics_tasks.calculate_all_daily_metrics',
        'schedule': 86400.0,  # Run daily (every 24 hours)
        'options': {'queue': 'analytics'}
    },
    'calculate-customer-health-scores': {
        'task': 'app.tasks.analytics_tasks.calculate_all_health_scores',
        'schedule': 43200.0,  # Run twice daily (every 12 hours)
        'options': {'queue': 'analytics'}
    },
    'check-expiring-certifications': {
        'task': 'app.tasks.notification_tasks.send_expiry_alerts',
        'schedule': 86400.0,  # Run daily
        'options': {'queue': 'notifications'}
    }
}
