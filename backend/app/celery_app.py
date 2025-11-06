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
    # Analytics & Health Scoring
    'calculate-customer-health-scores': {
        'task': 'app.tasks.prediction_tasks.calculate_all_customer_health_scores',
        'schedule': 86400.0,  # Run daily at midnight
        'options': {'queue': 'analytics'}
    },

    # Churn Prediction
    'calculate-churn-predictions': {
        'task': 'app.tasks.prediction_tasks.calculate_all_churn_predictions',
        'schedule': 86400.0,  # Run daily
        'options': {'queue': 'predictions'}
    },

    # Daily Alerts
    'generate-daily-alerts': {
        'task': 'app.tasks.prediction_tasks.generate_daily_alerts',
        'schedule': 21600.0,  # Run every 6 hours
        'options': {'queue': 'alerts'}
    },

    # Pattern Analysis
    'analyze-shift-patterns': {
        'task': 'app.tasks.prediction_tasks.analyze_shift_patterns',
        'schedule': 604800.0,  # Run weekly (every 7 days)
        'options': {'queue': 'analytics'}
    }
}
