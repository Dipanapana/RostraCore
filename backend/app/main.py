"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.endpoints import employees, sites, shifts, availability, certifications, payroll, roster, dashboard, auth, exports, settings as settings_endpoint, organizations, organization_approval, organization_users, organization_settings, clients, payments, superadmin_analytics, subscriptions, subscription_plans, dashboards, superadmin_auth, invoices, reports, roster_preferences, superadmin, staffing_profiles, availability_patterns, system_settings, shift_patterns, leave, payroll_deductions, test_data, attendance, incidents, notifications, patrols, guard_restrictions, exceptions, performance, shift_swaps, inspections, assets, geofence, visitors, key_holding, comm_log, cert_alerts, occurrence_book, documents, training, contract_values, fleet, daily_activity, disciplinary, announcements, maintenance, sla_compliance, deployment_history, overtime
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
    redoc_url="/redoc",
    redirect_slashes=False,
)


# ---------------------------------------------------------------------------
# Trailing-slash middleware — silently add trailing slash for API routes.
#
# When behind a reverse proxy (Next.js dev rewrites, Vercel), the proxy may
# strip trailing slashes from URLs. FastAPI's built-in redirect_slashes would
# reply with a 307 containing the *backend* hostname, causing the browser to
# redirect cross-origin and drop the Authorization header.
#
# This middleware silently rewrites the path in-process (no redirect) so
# router-root endpoints like @router.get("/") match correctly.
# ---------------------------------------------------------------------------
from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.routing import Match


class TrailingSlashMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            path = scope["path"]
            # Only process paths that don't already end with / and don't look
            # like a file (no dot in the last segment).
            if (
                not path.endswith("/")
                and "." not in path.rsplit("/", 1)[-1]
                and path.startswith("/api/")
            ):
                # Check if the path-with-slash would match a route
                slash_path = path + "/"
                for route in app.routes:
                    match, _ = route.matches({"type": "http", "path": slash_path, "method": scope.get("method", "GET")})
                    if match == Match.FULL:
                        scope = dict(scope, path=slash_path)
                        break
        await self.app(scope, receive, send)


app.add_middleware(TrailingSlashMiddleware)

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

# Test Data Generation (Admin Only)
app.include_router(test_data.router, prefix=f"{settings.API_V1_PREFIX}/test-data", tags=["test-data"])

# Mobile App Support
app.include_router(attendance.router, prefix=f"{settings.API_V1_PREFIX}/attendance", tags=["attendance"])
app.include_router(incidents.router, prefix=f"{settings.API_V1_PREFIX}/incidents", tags=["incidents"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_PREFIX}/notifications", tags=["notifications"])
app.include_router(patrols.router, prefix=f"{settings.API_V1_PREFIX}/patrols", tags=["patrols"])

# Personnel Management
app.include_router(guard_restrictions.router, prefix=f"{settings.API_V1_PREFIX}/guard-restrictions", tags=["guard-restrictions"])
app.include_router(performance.router, prefix=settings.API_V1_PREFIX, tags=["performance"])

# Exception Workflow
app.include_router(exceptions.router, prefix=f"{settings.API_V1_PREFIX}/exceptions", tags=["exceptions"])

# Shift Swaps
app.include_router(shift_swaps.router, prefix=f"{settings.API_V1_PREFIX}/shift-swaps", tags=["shift-swaps"])

# Site Inspections
app.include_router(inspections.router, prefix=f"{settings.API_V1_PREFIX}/inspections", tags=["inspections"])

# Asset / Equipment Management
app.include_router(assets.router, prefix=f"{settings.API_V1_PREFIX}/assets", tags=["assets"])

# Geofencing
app.include_router(geofence.router, prefix=f"{settings.API_V1_PREFIX}/geofence", tags=["geofence"])

# Visitor Management
app.include_router(visitors.router, prefix=f"{settings.API_V1_PREFIX}/visitors", tags=["visitors"])

# Key Holding / Access Management
app.include_router(key_holding.router, prefix=f"{settings.API_V1_PREFIX}/keys", tags=["key-holding"])

# Control Room / Communication Log
app.include_router(comm_log.router, prefix=f"{settings.API_V1_PREFIX}/comm-log", tags=["comm-log"])

# Certification Expiry Alerts
app.include_router(cert_alerts.router, prefix=f"{settings.API_V1_PREFIX}/cert-alerts", tags=["cert-alerts"])

# Daily Occurrence Book
app.include_router(occurrence_book.router, prefix=f"{settings.API_V1_PREFIX}/occurrence-book", tags=["occurrence-book"])

# Document Management
app.include_router(documents.router, prefix=f"{settings.API_V1_PREFIX}/documents", tags=["documents"])

# Training Management
app.include_router(training.router, prefix=f"{settings.API_V1_PREFIX}/training", tags=["training"])

# Contract Values
app.include_router(contract_values.router, prefix=f"{settings.API_V1_PREFIX}/contract-values", tags=["contract-values"])

# Fleet / Vehicle Management
app.include_router(fleet.router, prefix=f"{settings.API_V1_PREFIX}/fleet", tags=["fleet"])

# Daily Activity Reports
app.include_router(daily_activity.router, prefix=f"{settings.API_V1_PREFIX}/daily-activity", tags=["daily-activity"])

# Disciplinary Records
app.include_router(disciplinary.router, prefix=f"{settings.API_V1_PREFIX}/disciplinary", tags=["disciplinary"])

# Company Announcements
app.include_router(announcements.router, prefix=f"{settings.API_V1_PREFIX}/announcements", tags=["announcements"])

# Maintenance Requests
app.include_router(maintenance.router, prefix=f"{settings.API_V1_PREFIX}/maintenance", tags=["maintenance"])

# SLA Compliance Tracking
app.include_router(sla_compliance.router, prefix=f"{settings.API_V1_PREFIX}/sla", tags=["sla-compliance"])

# Guard Deployment History
app.include_router(deployment_history.router, prefix=f"{settings.API_V1_PREFIX}/deployments", tags=["deployments"])

# Overtime Management
app.include_router(overtime.router, prefix=f"{settings.API_V1_PREFIX}/overtime", tags=["overtime"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
