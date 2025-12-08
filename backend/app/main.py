"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.endpoints import employees, sites, shifts, availability, certifications, payroll, roster, dashboard, auth, exports, settings as settings_endpoint, organizations, organization_approval, organization_users, organization_settings, clients, payments, superadmin_analytics, subscriptions, subscription_plans, dashboards, superadmin_auth, invoices, reports, roster_preferences, superadmin, staffing_profiles, availability_patterns, system_settings, shift_patterns, leave, payroll_deductions
from app.middleware import RateLimitMiddleware, ForceHTTPSRedirectMiddleware

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
    # Note: redirect_slashes=True (default) works correctly because
    # Procfile now has --proxy-headers which tells Uvicorn to trust
    # X-Forwarded-Proto from Railway, generating correct HTTPS redirects
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

# HTTPS redirect middleware - Forces HTTPS in redirect Location headers
# This fixes Mixed Content errors when behind Railway's SSL termination proxy
app.add_middleware(ForceHTTPSRedirectMiddleware)


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
    Simple health check endpoint for Railway/container orchestration.
    Returns OK if the app is running.
    """
    return {"status": "healthy", "message": "RostraCore API is running"}


@app.get("/health/detailed")
async def detailed_health_check():
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
# Core Features
app.include_router(auth.router, prefix=settings.API_V1_PREFIX, tags=["auth"])
app.include_router(organizations.router, prefix=f"{settings.API_V1_PREFIX}/organizations", tags=["organizations"])
app.include_router(organization_approval.router, prefix=f"{settings.API_V1_PREFIX}/organizations", tags=["organization-approval"])
app.include_router(organization_users.router, prefix=f"{settings.API_V1_PREFIX}/organization", tags=["organization-users"])
app.include_router(organization_settings.router, prefix=f"{settings.API_V1_PREFIX}/organization-settings", tags=["organization-settings"])
app.include_router(employees.router, prefix=f"{settings.API_V1_PREFIX}/employees", tags=["employees"])
app.include_router(certifications.router, prefix=f"{settings.API_V1_PREFIX}/certifications", tags=["certifications"])
app.include_router(clients.router, prefix=f"{settings.API_V1_PREFIX}/clients", tags=["clients"])
app.include_router(sites.router, prefix=f"{settings.API_V1_PREFIX}/sites", tags=["sites"])
app.include_router(shifts.router, prefix=f"{settings.API_V1_PREFIX}/shifts", tags=["shifts"])
app.include_router(availability.router, prefix=f"{settings.API_V1_PREFIX}/availability", tags=["availability"])
app.include_router(roster.router, prefix=f"{settings.API_V1_PREFIX}/roster", tags=["roster"])
app.include_router(payroll.router, prefix=f"{settings.API_V1_PREFIX}/payroll", tags=["payroll"])
app.include_router(payroll_deductions.router, prefix=f"{settings.API_V1_PREFIX}/payroll-deductions", tags=["payroll-deductions"])
app.include_router(invoices.router, prefix=f"{settings.API_V1_PREFIX}/invoices", tags=["invoices"])
app.include_router(reports.router, prefix=f"{settings.API_V1_PREFIX}/reports", tags=["reports"])

# Dashboard & Settings
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX, tags=["dashboard"])
app.include_router(dashboards.router, tags=["dashboards"])
app.include_router(settings_endpoint.router, prefix=f"{settings.API_V1_PREFIX}/settings", tags=["settings"])
app.include_router(system_settings.router, prefix=f"{settings.API_V1_PREFIX}/system-settings", tags=["system-settings"])
app.include_router(roster_preferences.router, prefix=f"{settings.API_V1_PREFIX}/roster-preferences", tags=["roster-preferences"])
app.include_router(staffing_profiles.router, prefix=settings.API_V1_PREFIX, tags=["staffing-profiles"])
app.include_router(availability_patterns.router, prefix=settings.API_V1_PREFIX, tags=["availability-patterns"])
app.include_router(shift_patterns.router, prefix=f"{settings.API_V1_PREFIX}/shift-patterns", tags=["shift-patterns"])
app.include_router(leave.router, prefix=f"{settings.API_V1_PREFIX}/leave", tags=["leave"])
app.include_router(exports.router, prefix=settings.API_V1_PREFIX, tags=["exports"])

# Subscriptions & Payments
app.include_router(subscriptions.router, prefix=f"{settings.API_V1_PREFIX}/subscriptions", tags=["subscriptions"])
app.include_router(subscription_plans.router, prefix=f"{settings.API_V1_PREFIX}/subscription-plans", tags=["subscription-plans"])
app.include_router(payments.router, prefix=f"{settings.API_V1_PREFIX}/payments", tags=["payments"])

# SuperAdmin
app.include_router(superadmin_auth.router, prefix=f"{settings.API_V1_PREFIX}/superadmin", tags=["superadmin-auth"])
app.include_router(superadmin_analytics.router, prefix=f"{settings.API_V1_PREFIX}/superadmin/analytics", tags=["superadmin-analytics"])
app.include_router(superadmin.router, prefix=f"{settings.API_V1_PREFIX}/superadmin", tags=["superadmin"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
