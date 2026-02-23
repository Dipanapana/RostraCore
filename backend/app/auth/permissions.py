"""
Permission key taxonomy and default role-permission mappings.

Permission keys follow the pattern: module.action
Organised by category for the frontend matrix UI.
"""

# ---------------------------------------------------------------------------
# Permission Categories — used by the /role-permissions/keys endpoint
# to build the settings matrix UI.
# ---------------------------------------------------------------------------

PERMISSION_CATEGORIES = {
    "dashboard": {
        "label": "Dashboard",
        "permissions": {
            "dashboard.view": "View main dashboard",
            "ops_summary.view": "View operations summary",
            "command_center.view": "View command center",
        },
    },
    "workforce": {
        "label": "Workforce Management",
        "permissions": {
            "employees.view": "View employees",
            "employees.manage": "Create/edit/delete employees",
            "certifications.view": "View certifications",
            "certifications.manage": "Manage certifications",
            "training.view": "View training records",
            "training.manage": "Manage training",
            "disciplinary.view": "View disciplinary records",
            "disciplinary.manage": "Manage disciplinary records",
            "leave.view": "View leave requests",
            "leave.manage": "Approve/manage leave",
            "attendance.view": "View attendance records",
            "attendance.analytics": "View attendance analytics",
            "availability.view": "View availability",
            "availability.manage": "Manage availability",
            "hr_analytics.view": "View HR analytics",
            "performance.view": "View performance dashboard",
            "skills_matrix.view": "View skills matrix",
            "employee_turnover.view": "View employee turnover",
            "employee_grades.view": "View employee grades",
            "employee_restrictions.view": "View guard restrictions",
        },
    },
    "scheduling": {
        "label": "Scheduling & Roster",
        "permissions": {
            "roster.view": "View roster / schedule",
            "roster.generate": "Generate rosters",
            "roster.manage": "Manage roster (confirm, edit)",
            "shifts.view": "View shifts",
            "shifts.manage": "Create/edit shifts",
            "shift_swaps.view": "View shift swaps",
            "shift_swaps.manage": "Approve / manage shift swaps",
            "spare_pool.view": "View spare pool",
            "exceptions.view": "View exception log",
            "exceptions.manage": "Manage exceptions",
            "shift_handovers.view": "View shift handovers",
            "calendar.view": "View calendar",
        },
    },
    "operations": {
        "label": "Operations",
        "permissions": {
            "clients.view": "View clients",
            "clients.manage": "Manage clients",
            "sites.view": "View sites",
            "sites.manage": "Manage sites",
            "patrols.view": "View patrols",
            "patrols.manage": "Manage patrol tours",
            "incidents.view": "View incidents",
            "incidents.manage": "Manage / update incidents",
            "inspections.view": "View inspections",
            "inspections.manage": "Manage inspections",
            "assets.view": "View assets",
            "assets.manage": "Manage assets",
            "firearms.view": "View firearms register",
            "firearms.manage": "Manage firearms",
            "geofencing.view": "View geofencing",
            "geofencing.manage": "Configure geofencing",
            "visitors.view": "View visitor log",
            "visitors.manage": "Manage visitors",
            "documents.view": "View documents",
            "documents.manage": "Manage documents",
            "occurrence_book.view": "View occurrence book",
            "occurrence_book.manage": "Write in occurrence book",
            "announcements.view": "View announcements",
            "announcements.manage": "Manage announcements",
            "emergency.view": "View emergency alerts",
            "emergency.trigger": "Trigger emergency / panic",
            "lone_worker.view": "View lone worker monitoring",
            "messaging.view": "View messaging",
            "messaging.manage": "Send messages",
            "post_orders.view": "View post orders",
            "post_orders.manage": "Manage post orders",
            "keys.view": "View key register",
            "keys.manage": "Manage keys",
            "comm_log.view": "View communication log",
            "comm_log.manage": "Manage communication log",
            "daily_activity.view": "View daily activity reports",
            "daily_activity.manage": "Manage daily activity reports",
            "fleet.view": "View fleet / vehicles",
            "fleet.manage": "Manage fleet",
            "maintenance.view": "View maintenance requests",
            "maintenance.manage": "Manage maintenance",
            "deployments.view": "View guard deployments",
            "forms.view": "View custom forms",
            "forms.manage": "Manage custom forms",
            "client_portal.view": "View client portal",
        },
    },
    "finance": {
        "label": "Finance",
        "permissions": {
            "payroll.view": "View payroll",
            "payroll.generate": "Generate / run payroll",
            "payroll.export": "Export payroll data",
            "invoices.view": "View invoices",
            "invoices.manage": "Create / manage invoices",
            "reports.view": "View financial reports",
            "budgets.view": "View budgets",
            "budgets.manage": "Manage budgets",
            "revenue.view": "View revenue dashboard",
            "site_profitability.view": "View site profitability",
            "contract_values.view": "View contract values",
            "contract_values.manage": "Manage contract values",
            "overtime.view": "View overtime",
            "overtime.manage": "Manage overtime",
            "shift_costs.view": "View shift costs",
            "iod.view": "View injury on duty records",
            "iod.manage": "Manage IOD records",
        },
    },
    "compliance": {
        "label": "Compliance",
        "permissions": {
            "psira_compliance.view": "View PSIRA wage compliance",
            "popia.view": "View POPIA dashboard",
            "popia.manage": "Manage POPIA consent / requests",
            "bcea_compliance.view": "View BCEA compliance",
            "sla_compliance.view": "View SLA compliance",
            "contract_compliance.view": "View contract compliance",
            "compliance_calendar.view": "View compliance calendar",
        },
    },
    "settings": {
        "label": "Settings & Admin",
        "permissions": {
            "settings.view": "View settings",
            "settings.manage": "Manage settings",
            "users.view": "View user management",
            "users.manage": "Manage users (invite, remove)",
            "roles_permissions.manage": "Configure role permissions",
            "company_profile.manage": "Manage company profile",
            "hourly_rates.manage": "Manage hourly rates",
            "shift_patterns.manage": "Manage shift patterns",
        },
    },
}


def get_all_permission_keys() -> list[str]:
    """Return a flat list of all permission keys."""
    keys = []
    for cat in PERMISSION_CATEGORIES.values():
        keys.extend(cat["permissions"].keys())
    return keys


ALL_PERMISSION_KEYS = get_all_permission_keys()


# ---------------------------------------------------------------------------
# Default permissions per role — matches current hardcoded behaviour.
# "*" means all permissions.  Specific lists restrict to those keys only.
# ---------------------------------------------------------------------------

DEFAULT_PERMISSIONS: dict[str, list[str]] = {
    # Full access roles — not customisable in UI
    "admin": ["*"],
    "company_admin": ["*"],
    "superadmin": ["*"],

    # Scheduler — workforce + scheduling + ops read
    "scheduler": [
        "dashboard.view",
        "ops_summary.view",
        # Workforce
        "employees.view",
        "employees.manage",
        "certifications.view",
        "certifications.manage",
        "training.view",
        "training.manage",
        "disciplinary.view",
        "leave.view",
        "leave.manage",
        "attendance.view",
        "attendance.analytics",
        "availability.view",
        "availability.manage",
        "performance.view",
        "skills_matrix.view",
        "employee_turnover.view",
        "employee_grades.view",
        "employee_restrictions.view",
        # Scheduling
        "roster.view",
        "roster.generate",
        "roster.manage",
        "shifts.view",
        "shifts.manage",
        "shift_swaps.view",
        "shift_swaps.manage",
        "spare_pool.view",
        "exceptions.view",
        "exceptions.manage",
        "shift_handovers.view",
        "calendar.view",
        # Operations (read + some manage)
        "clients.view",
        "sites.view",
        "patrols.view",
        "patrols.manage",
        "incidents.view",
        "incidents.manage",
        "inspections.view",
        "inspections.manage",
        "assets.view",
        "geofencing.view",
        "visitors.view",
        "visitors.manage",
        "documents.view",
        "occurrence_book.view",
        "occurrence_book.manage",
        "announcements.view",
        "emergency.view",
        "lone_worker.view",
        "messaging.view",
        "messaging.manage",
        "post_orders.view",
        "keys.view",
        "comm_log.view",
        "daily_activity.view",
        "daily_activity.manage",
        "fleet.view",
        "maintenance.view",
        "maintenance.manage",
        "deployments.view",
        "forms.view",
        "forms.manage",
        "client_portal.view",
    ],

    # Finance — financial data + compliance
    "finance": [
        "dashboard.view",
        # Finance
        "payroll.view",
        "payroll.generate",
        "payroll.export",
        "invoices.view",
        "invoices.manage",
        "reports.view",
        "budgets.view",
        "budgets.manage",
        "revenue.view",
        "site_profitability.view",
        "contract_values.view",
        "contract_values.manage",
        "overtime.view",
        "overtime.manage",
        "shift_costs.view",
        "iod.view",
        "iod.manage",
        # Compliance
        "psira_compliance.view",
        "popia.view",
        "bcea_compliance.view",
        "sla_compliance.view",
        "contract_compliance.view",
        "compliance_calendar.view",
        # Limited workforce read
        "employees.view",
        "certifications.view",
        "attendance.view",
    ],

    # Guard — minimal access
    "guard": [
        "dashboard.view",
        "leave.view",
        "availability.view",
        "availability.manage",
        "payroll.view",
        "attendance.view",
        "messaging.view",
        "messaging.manage",
        "emergency.trigger",
        "forms.view",
        "post_orders.view",
        "announcements.view",
        "shifts.view",
        "roster.view",
        "calendar.view",
    ],

    # Client viewer — portal only
    "client_viewer": [
        "dashboard.view",
        "client_portal.view",
    ],
}


# Roles that admins can customise (others always get full access)
CUSTOMISABLE_ROLES = ["scheduler", "finance", "guard", "client_viewer"]
