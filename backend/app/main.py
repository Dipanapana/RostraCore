"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.endpoints import employees, sites, shifts, availability, certifications, expenses, attendance, payroll, roster, dashboard, auth, exports, settings as settings_endpoint, organizations, shift_groups, analytics, jobs

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
        release=f"rostracore@1.0.0",
        # Capture 100% of errors, but only sample rate of performance transactions
        enable_tracing=True,
    )

app = FastAPI(
    title="RostraCore API",
    description="Algorithmic Roster & Budget Engine for Security Guards",
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
app.include_router(shift_groups.router, prefix=f"{settings.API_V1_PREFIX}/shift-groups", tags=["shift-groups"])
app.include_router(analytics.router, tags=["analytics"])
app.include_router(jobs.router, tags=["jobs"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
