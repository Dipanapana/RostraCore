"""Database models - MVP Core Tables Only."""

from app.models.user import User
from app.models.employee import Employee
from app.models.site import Site
from app.models.shift import Shift
from app.models.availability import Availability
from app.models.certification import Certification
from app.models.payroll import PayrollSummary
from app.models.shift_template import ShiftTemplate
from app.models.roster import Roster
from app.models.shift_assignment import ShiftAssignment
from app.models.organization import Organization
from app.models.client import Client
from app.models.subscription_plan import SubscriptionPlan
from app.models.client_invoice import ClientInvoice, InvoiceLineItem
from app.models.roster_preferences import RosterPreferences, EmergencyShiftRequest
from app.models.site_staffing_profile import SiteStaffingProfile, PeriodType, DayType, PSIRAGradeRequirement
from app.models.availability_pattern import AvailabilityPattern, PatternType
from app.models.default_hourly_rate import DefaultHourlyRate
from app.models.superadmin_invitation import SuperadminInvitation
from app.models.shift_pattern_template import ShiftPatternTemplate, PatternType as ShiftPatternType
from app.models.leave import LeaveRequest, LeaveBalance, LeaveType, LeaveStatus
from app.models.refresh_token import RefreshToken
from app.models.performance import EmployeeEvaluation, DisciplinaryCase
from app.models.shift_exception import ShiftException
from app.models.shift_swap import ShiftSwap, SwapStatus
from app.models.inspection import InspectionTemplate, Inspection, InspectionStatus
from app.models.asset import Asset, AssetHistory, AssetStatus, AssetCategory
from app.models.geofence import GeofenceViolation, ViolationType
from app.models.visitor import Visitor, VisitorStatus
from app.models.key_register import KeyRegister, KeyLog, KeyStatus
from app.models.comm_log import CommLog, CommType, CommPriority
from app.models.occurrence_book import OccurrenceEntry, OccurrenceCategory
from app.models.document import Document, DocumentCategory
from app.models.training import TrainingCourse, TrainingRecord, TrainingStatus, TrainingCategory
from app.models.contract_value import ContractValue, BillingFrequency
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.daily_activity import DailyActivityReport, DARStatus
from app.models.announcement import Announcement, AnnouncementPriority
from app.models.maintenance import MaintenanceRequest, MaintenancePriority, MaintenanceStatus
from app.models.sla_compliance import SLARecord, SLAStatus
from app.models.deployment_history import DeploymentRecord
from app.models.overtime import OvertimeRecord, OvertimeStatus
from app.models.client_report import ClientReport
from app.models.budget import Budget
from app.models.emergency_contact import EmergencyContact
from app.models.iod_record import IODRecord
from app.models.shift_handover import ShiftHandover
from app.models.client_satisfaction import ClientSatisfaction
from app.models.organization_payroll_config import OrganizationPayrollConfig
from app.models.audit_log import AuditLog
from app.models.roster_snapshot import RosterSnapshot
from app.models.attendance_photo import AttendancePhoto
from app.models.biometric_template import BiometricTemplate
from app.models.incident import Incident, IncidentSeverity, IncidentStatus
from app.models.notification import Notification, NotificationType
from app.models.patrol import PatrolTour, PatrolCheckpoint, PatrolRun, PatrolScan
from app.models.guard_restriction import GuardRestriction
from app.models.emergency_alert import EmergencyAlert, AlertType, AlertStatus
from app.models.lone_worker import LoneWorkerSession, LoneWorkerStatus
from app.models.messaging import ChatChannel, ChannelMember, ChatMessage, ChannelType
from app.models.report_schedule import ReportSchedule, ReportFrequency, ReportType
from app.models.post_order import PostOrder, PostOrderAcknowledgment, PostOrderStatus
from app.models.psira_wage_rate import PSIRAWageRate
from app.models.firearm import Firearm, FirearmIssue, FirearmInspection, FirearmStatus
from app.models.location_ping import LocationPing
from app.models.popia import POPIAConsent, DataSubjectRequest, ConsentType, RequestType, RequestStatus
from app.models.custom_form import FormTemplate, FormSubmission, FormStatus

__all__ = [
    "User",
    "Employee",
    "Site",
    "Shift",
    "Availability",
    "Certification",
    "PayrollSummary",
    "ShiftTemplate",
    "Roster",
    "ShiftAssignment",
    "Organization",
    "Client",
    "SubscriptionPlan",
    "ClientInvoice",
    "InvoiceLineItem",
    "RosterPreferences",
    "EmergencyShiftRequest",
    "SiteStaffingProfile",
    "PeriodType",
    "DayType",
    "PSIRAGradeRequirement",
    "AvailabilityPattern",
    "PatternType",
    "DefaultHourlyRate",
    "SuperadminInvitation",
    "ShiftPatternTemplate",
    "ShiftPatternType",
    "LeaveRequest",
    "LeaveBalance",
    "LeaveType",
    "LeaveStatus",
    "RefreshToken",
    "EmployeeEvaluation",
    "DisciplinaryCase",
    "ShiftException",
    "ShiftSwap",
    "SwapStatus",
    "InspectionTemplate",
    "Inspection",
    "InspectionStatus",
    "Asset",
    "AssetHistory",
    "AssetStatus",
    "AssetCategory",
    "GeofenceViolation",
    "ViolationType",
    "Visitor",
    "VisitorStatus",
    "KeyRegister",
    "KeyLog",
    "KeyStatus",
    "CommLog",
    "CommType",
    "CommPriority",
    "OccurrenceEntry",
    "OccurrenceCategory",
    "Document",
    "DocumentCategory",
    "TrainingCourse",
    "TrainingRecord",
    "TrainingStatus",
    "TrainingCategory",
    "ContractValue",
    "BillingFrequency",
    "Vehicle",
    "VehicleStatus",
    "DailyActivityReport",
    "DARStatus",
    "Announcement",
    "AnnouncementPriority",
    "MaintenanceRequest",
    "MaintenancePriority",
    "MaintenanceStatus",
    "SLARecord",
    "SLAStatus",
    "DeploymentRecord",
    "OvertimeRecord",
    "OvertimeStatus",
    "ClientReport",
    "Budget",
    "EmergencyContact",
    "IODRecord",
    "ShiftHandover",
    "ClientSatisfaction",
    "OrganizationPayrollConfig",
    "AuditLog",
    "RosterSnapshot",
    "AttendancePhoto",
    "BiometricTemplate",
    "Incident",
    "IncidentSeverity",
    "IncidentStatus",
    "Notification",
    "NotificationType",
    "PatrolTour",
    "PatrolCheckpoint",
    "PatrolRun",
    "PatrolScan",
    "GuardRestriction",
    "EmergencyAlert",
    "AlertType",
    "AlertStatus",
    "LoneWorkerSession",
    "LoneWorkerStatus",
    "ChatChannel",
    "ChannelMember",
    "ChatMessage",
    "ChannelType",
    "ReportSchedule",
    "ReportFrequency",
    "ReportType",
    "PostOrder",
    "PostOrderAcknowledgment",
    "PostOrderStatus",
    "PSIRAWageRate",
    "Firearm",
    "FirearmIssue",
    "FirearmInspection",
    "FirearmStatus",
    "LocationPing",
    "POPIAConsent",
    "DataSubjectRequest",
    "ConsentType",
    "RequestType",
    "RequestStatus",
    "FormTemplate",
    "FormSubmission",
    "FormStatus",
]
