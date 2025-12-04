"""
Monitoring and Error Tracking Service
Provides utilities for Sentry integration and custom error tracking
"""

from typing import Dict, Any, Optional
from functools import wraps
import logging

logger = logging.getLogger(__name__)


class MonitoringService:
    """Service for error tracking and performance monitoring"""

    @staticmethod
    def capture_exception(exception: Exception, context: Optional[Dict[str, Any]] = None):
        """
        Capture an exception and send to Sentry with additional context

        Args:
            exception: The exception to capture
            context: Additional context data (user_id, org_id, operation, etc.)
        """
        try:
            import sentry_sdk

            if context:
                with sentry_sdk.push_scope() as scope:
                    # Add context to Sentry event
                    for key, value in context.items():
                        scope.set_context(key, value)

                    # Add custom tags for filtering
                    if 'user_id' in context:
                        scope.set_tag("user_id", context['user_id'])
                    if 'org_id' in context:
                        scope.set_tag("org_id", context['org_id'])
                    if 'operation' in context:
                        scope.set_tag("operation", context['operation'])

                    sentry_sdk.capture_exception(exception)
            else:
                sentry_sdk.capture_exception(exception)

        except ImportError:
            # Sentry not configured, fall back to logging
            logger.error(f"Exception occurred: {str(exception)}", exc_info=True)
            if context:
                logger.error(f"Context: {context}")

    @staticmethod
    def capture_message(message: str, level: str = "info", context: Optional[Dict[str, Any]] = None):
        """
        Capture a message and send to Sentry

        Args:
            message: The message to capture
            level: Severity level (debug, info, warning, error, fatal)
            context: Additional context data
        """
        try:
            import sentry_sdk

            if context:
                with sentry_sdk.push_scope() as scope:
                    for key, value in context.items():
                        scope.set_context(key, value)
                    sentry_sdk.capture_message(message, level=level)
            else:
                sentry_sdk.capture_message(message, level=level)

        except ImportError:
            logger.log(
                getattr(logging, level.upper(), logging.INFO),
                f"Message: {message}"
            )
            if context:
                logger.info(f"Context: {context}")

    @staticmethod
    def set_user_context(user_id: int, org_id: Optional[int] = None, email: Optional[str] = None):
        """
        Set user context for all subsequent Sentry events in this scope

        Args:
            user_id: User ID
            org_id: Organization ID
            email: User email
        """
        try:
            import sentry_sdk

            sentry_sdk.set_user({
                "id": str(user_id),
                "org_id": str(org_id) if org_id else None,
                "email": email
            })
        except ImportError:
            pass

    @staticmethod
    def track_performance(operation_name: str):
        """
        Decorator to track performance of a function

        Usage:
        @MonitoringService.track_performance("roster_generation")
        def generate_roster(...):
            ...
        """
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                try:
                    import sentry_sdk

                    with sentry_sdk.start_transaction(op=operation_name, name=func.__name__):
                        return func(*args, **kwargs)
                except ImportError:
                    return func(*args, **kwargs)
            return wrapper
        return decorator


class HealthMonitor:
    """Monitor system health and send alerts"""

    @staticmethod
    def check_system_health() -> Dict[str, Any]:
        """
        Check overall system health

        Returns:
            Dict with health status of all components
        """
        from app.services.cache_service import check_redis_health
        from app.database import SessionLocal

        health_status = {
            "overall": "healthy",
            "components": {}
        }

        from sqlalchemy import text
        # Check database
        try:
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
            health_status["components"]["database"] = {
                "status": "healthy",
                "message": "Database connection successful"
            }
        except Exception as e:
            health_status["components"]["database"] = {
                "status": "unhealthy",
                "message": f"Database error: {str(e)}"
            }
            health_status["overall"] = "unhealthy"
            MonitoringService.capture_exception(
                e,
                context={"component": "database", "operation": "health_check"}
            )

        # Check Redis
        redis_health = check_redis_health()
        health_status["components"]["redis"] = redis_health
        if redis_health.get("status") != "healthy":
            health_status["overall"] = "degraded"

        # Check Celery (if configured)
        try:
            from app.celery_app import celery_app
            inspect = celery_app.control.inspect()
            stats = inspect.stats()

            if stats:
                health_status["components"]["celery"] = {
                    "status": "healthy",
                    "workers": len(stats),
                    "message": f"{len(stats)} worker(s) active"
                }
            else:
                health_status["components"]["celery"] = {
                    "status": "unhealthy",
                    "message": "No Celery workers found"
                }
                health_status["overall"] = "degraded"

        except Exception as e:
            health_status["components"]["celery"] = {
                "status": "unknown",
                "message": f"Could not check Celery: {str(e)}"
            }

        return health_status

    @staticmethod
    def alert_if_unhealthy():
        """
        Check system health and send alerts if unhealthy
        Should be run periodically (e.g., every 5 minutes)
        """
        health = HealthMonitor.check_system_health()

        if health["overall"] != "healthy":
            MonitoringService.capture_message(
                f"System health check failed: {health['overall']}",
                level="warning",
                context={"health_status": health}
            )

            # Log details
            for component, status in health["components"].items():
                if status.get("status") != "healthy":
                    logger.warning(
                        f"Component {component} unhealthy: {status.get('message')}"
                    )

        return health


# Convenience functions
def capture_exception(exception: Exception, **context):
    """Convenience function to capture exception"""
    MonitoringService.capture_exception(exception, context or None)


def capture_message(message: str, level: str = "info", **context):
    """Convenience function to capture message"""
    MonitoringService.capture_message(message, level, context or None)


def set_user_context(user_id: int, org_id: Optional[int] = None, email: Optional[str] = None):
    """Convenience function to set user context"""
    MonitoringService.set_user_context(user_id, org_id, email)
