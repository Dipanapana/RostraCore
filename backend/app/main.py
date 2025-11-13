"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.endpoints import employees, sites, shifts, availability, certifications, expenses, attendance, payroll, roster, dashboard, auth, exports, settings as settings_endpoint, organizations, organization_approval, organization_users, shift_groups, analytics, jobs, dashboards, predictions, clients, leave_requests, employee_portal, incident_reports, daily_reports, marketplace_guards, marketplace_jobs, marketplace_applications, guard_ratings, cv_generator, payments, marketplace_revenue, marketplace_settings, superadmin_analytics, subscriptions
from app.middleware import RateLimitMiddleware

# Initialize Sentry for error tracking and performance monitoring
if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        profiles_sample_rate=settings.SENTRY_PROFILES_SAMPLE_RATE,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            CeleryIntegration(monitor_beat_tasks=True),
            RedisIntegration(),
            SqlalchemyIntegration(),
        ],
        # Set custom tags for better filtering
        before_send=lambda event, hint: event,
        release=f"guardianos@1.0.0",
        # Capture 100% of errors, but only sample rate of performance transactions
        enable_tracing=True,
    )

app = FastAPI(
    title="GuardianOS API",
    description="AI-Powered Security Workforce Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware (Option B Security - MVP)
app.add_middleware(RateLimitMiddleware)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "RostraCore API v1.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """
    Comprehensive health check endpoint

    Checks:
    - Database connectivity
    - Redis cache status
    - Celery worker availability

    Returns overall system health status
    """
    from app.services.monitoring_service import HealthMonitor

    health_status = HealthMonitor.check_system_health()

    return health_status


# Include routers
app.include_router(employees.router, prefix=f"{settings.API_V1_PREFIX}/employees", tags=["employees"])
app.include_router(sites.router, prefix=f"{settings.API_V1_PREFIX}/sites", tags=["sites"])
app.include_router(shifts.router, prefix=f"{settings.API_V1_PREFIX}/shifts", tags=["shifts"])
app.include_router(availability.router, prefix=f"{settings.API_V1_PREFIX}/availability", tags=["availability"])
app.include_router(certifications.router, prefix=f"{settings.API_V1_PREFIX}/certifications", tags=["certifications"])
app.include_router(expenses.router, prefix=f"{settings.API_V1_PREFIX}/expenses", tags=["expenses"])
app.include_router(attendance.router, prefix=f"{settings.API_V1_PREFIX}/attendance", tags=["attendance"])
app.include_router(payroll.router, prefix=f"{settings.API_V1_PREFIX}/payroll", tags=["payroll"])
app.include_router(roster.router, prefix=f"{settings.API_V1_PREFIX}/roster", tags=["roster"])
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX, tags=["dashboard"])
app.include_router(auth.router, prefix=settings.API_V1_PREFIX, tags=["auth"])
app.include_router(exports.router, prefix=settings.API_V1_PREFIX, tags=["exports"])
app.include_router(settings_endpoint.router, prefix=f"{settings.API_V1_PREFIX}/settings", tags=["settings"])
app.include_router(organizations.router, prefix=f"{settings.API_V1_PREFIX}/organizations", tags=["organizations"])
app.include_router(organization_approval.router, prefix=f"{settings.API_V1_PREFIX}/organizations", tags=["organization-approval"])
app.include_router(organization_users.router, prefix=f"{settings.API_V1_PREFIX}/organizations", tags=["organization-users"])
app.include_router(shift_groups.router, prefix=f"{settings.API_V1_PREFIX}/shift-groups", tags=["shift-groups"])
app.include_router(analytics.router, tags=["analytics"])
app.include_router(jobs.router, tags=["jobs"])
app.include_router(dashboards.router, tags=["dashboards"])
app.include_router(predictions.router, tags=["predictions"])
app.include_router(clients.router, prefix=f"{settings.API_V1_PREFIX}/clients", tags=["clients"])
app.include_router(leave_requests.router, prefix=f"{settings.API_V1_PREFIX}/leave-requests", tags=["leave-requests"])
app.include_router(employee_portal.router, prefix=f"{settings.API_V1_PREFIX}/employee-portal", tags=["employee-portal"])
app.include_router(incident_reports.router, prefix=f"{settings.API_V1_PREFIX}/incident-reports", tags=["incident-reports"])
app.include_router(daily_reports.router, prefix=f"{settings.API_V1_PREFIX}/daily-reports", tags=["daily-reports"])

# Job Marketplace routes
app.include_router(marketplace_guards.router, prefix=f"{settings.API_V1_PREFIX}/marketplace/guards", tags=["marketplace-guards"])
app.include_router(marketplace_jobs.router, prefix=f"{settings.API_V1_PREFIX}/marketplace/jobs", tags=["marketplace-jobs"])
app.include_router(marketplace_applications.router, prefix=f"{settings.API_V1_PREFIX}/marketplace/applications", tags=["marketplace-applications"])
app.include_router(guard_ratings.router, prefix=f"{settings.API_V1_PREFIX}/guard-ratings", tags=["guard-ratings"])
app.include_router(cv_generator.router, prefix=f"{settings.API_V1_PREFIX}/cv-generator", tags=["cv-generator"])
app.include_router(payments.router, prefix=f"{settings.API_V1_PREFIX}/payments", tags=["payments"])
app.include_router(subscriptions.router, prefix=f"{settings.API_V1_PREFIX}/subscriptions", tags=["subscriptions"])
app.include_router(marketplace_revenue.router, prefix=f"{settings.API_V1_PREFIX}/marketplace/revenue", tags=["marketplace-revenue"])
app.include_router(marketplace_settings.router, prefix=f"{settings.API_V1_PREFIX}/marketplace/settings", tags=["marketplace-settings"])
app.include_router(superadmin_analytics.router, prefix=f"{settings.API_V1_PREFIX}/superadmin/analytics", tags=["superadmin-analytics"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
