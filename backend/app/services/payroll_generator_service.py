"""Comprehensive Payroll Generator Service.

Generates payroll for employees based on shift assignments for a date range.
Integrates SA deductions (PAYE, UIF, SDL) and premium calculations.

Based on client format: ATHOPASI SECURITY SERVICES payroll template.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Optional, Tuple
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.employee import Employee, EmployeeStatus
from app.models.shift import Shift
from app.models.shift_assignment import ShiftAssignment
from app.models.client import Client
from app.models.site import Site
from app.services.sa_payroll_service import SAPayrollService


class PayrollPeriod:
    """Represents a payroll period type."""
    WEEKLY = "weekly"
    BI_WEEKLY = "bi_weekly"
    MONTHLY = "monthly"


class PayrollEmployeeRecord:
    """Complete payroll record for a single employee."""

    def __init__(
        self,
        employee: Employee,
        period_start: date,
        period_end: date
    ):
        self.employee = employee
        self.period_start = period_start
        self.period_end = period_end

        # Employee details
        self.employee_id = employee.employee_id
        self.surname = employee.last_name
        self.names = employee.first_name
        self.id_number = employee.id_number
        self.gender = employee.gender.value if employee.gender else ""
        self.tax_number = employee.tax_number or ""
        self.psira_number = employee.psira_number or ""
        self.employee_no = f"EMP{str(employee.employee_id).zfill(4)}"

        # Banking
        self.bank_name = employee.bank_name or ""
        self.account_number = employee.account_number or ""

        # Hours tracking
        self.total_days_worked = 0
        self.normal_hours = Decimal("0")
        self.sunday_hours = Decimal("0")
        self.holiday_hours = Decimal("0")
        self.extra_hours = Decimal("0")  # Overtime
        self.total_hours_worked = Decimal("0")

        # Rate and earnings
        self.rate_per_hour = Decimal(str(employee.hourly_rate or 0))
        self.total_hours_wage = Decimal("0")
        self.night_allowance = Decimal("0")
        self.supervisor_allowance = Decimal("0")
        self.funeral_allowance = Decimal("0")
        self.gun_allowance = Decimal("0")
        self.bonus = Decimal("0")
        self.cleaning_allowance = Decimal("0")
        self.overtime_pay = Decimal("0")
        self.sick_pay = Decimal("0")
        self.gross_salary = Decimal("0")

        # Deductions
        self.uif = Decimal("0")
        self.psira_deduction = Decimal("0")
        self.bargaining_council = Decimal("0")
        self.paye = Decimal("0")
        self.provident_fund = Decimal("0")
        self.nucaaw = Decimal("0")
        self.hospital_cover = Decimal("0")
        self.defect = Decimal("0")
        self.total_deductions = Decimal("0")

        # Final
        self.net_salary = Decimal("0")

        # Status
        self.status = "ACTIVE"  # or "LEAVE", "RELIEVER"
        self.is_reliever = False

        # Shift details
        self.shifts_worked: List[Dict] = []


class PayrollGeneratorService:
    """Service for generating comprehensive payroll from shift assignments."""

    # SA Public Holidays 2025
    SA_HOLIDAYS_2025 = [
        date(2025, 1, 1),   # New Year's Day
        date(2025, 3, 21),  # Human Rights Day
        date(2025, 4, 18),  # Good Friday
        date(2025, 4, 21),  # Family Day
        date(2025, 4, 27),  # Freedom Day
        date(2025, 5, 1),   # Workers' Day
        date(2025, 6, 16),  # Youth Day
        date(2025, 8, 9),   # National Women's Day
        date(2025, 9, 24),  # Heritage Day
        date(2025, 12, 16), # Day of Reconciliation
        date(2025, 12, 25), # Christmas Day
        date(2025, 12, 26), # Day of Goodwill
    ]

    # Premium rates
    NIGHT_SHIFT_PREMIUM = Decimal("0.10")  # 10% extra
    SUNDAY_PREMIUM = Decimal("0.50")  # 1.5x (50% extra)
    HOLIDAY_PREMIUM = Decimal("1.00")  # 2x (100% extra)
    OVERTIME_PREMIUM = Decimal("0.50")  # 1.5x for overtime

    @classmethod
    def generate_payroll(
        cls,
        db: Session,
        org_id: int,
        start_date: date,
        end_date: date,
        employee_ids: Optional[List[int]] = None,
        client_ids: Optional[List[int]] = None,
        include_deductions: bool = True,
        period_type: str = PayrollPeriod.MONTHLY
    ) -> Dict:
        """
        Generate payroll for all or selected employees for a date range.

        Args:
            db: Database session
            org_id: Organization ID
            start_date: Period start date
            end_date: Period end date
            employee_ids: Optional list of specific employee IDs
            client_ids: Optional list of client IDs to filter by site
            include_deductions: Whether to calculate SA deductions
            period_type: weekly, bi_weekly, or monthly

        Returns:
            Complete payroll data structure
        """
        # Get employees
        employee_query = db.query(Employee).filter(
            Employee.org_id == org_id,
            Employee.status == EmployeeStatus.ACTIVE
        )

        if employee_ids:
            employee_query = employee_query.filter(Employee.employee_id.in_(employee_ids))

        employees = employee_query.all()

        if not employees:
            return {
                "status": "error",
                "message": "No active employees found for this organization"
            }

        # Get site IDs if filtering by client
        site_ids = None
        if client_ids:
            sites = db.query(Site.site_id).filter(Site.client_id.in_(client_ids)).all()
            site_ids = [s.site_id for s in sites]

        # Process each employee
        payroll_records: List[PayrollEmployeeRecord] = []
        employees_with_no_shifts: List[str] = []

        for employee in employees:
            record = cls._process_employee_payroll(
                db=db,
                employee=employee,
                start_date=start_date,
                end_date=end_date,
                site_ids=site_ids,
                include_deductions=include_deductions
            )

            # Only include employees who worked at least one shift
            if record.total_hours_worked > 0:
                payroll_records.append(record)
            else:
                employees_with_no_shifts.append(f"{employee.first_name} {employee.last_name}")

        # If no employees had shifts, return an error with helpful message
        if not payroll_records:
            return {
                "status": "error",
                "message": f"No employees worked shifts in the period {start_date} to {end_date}. "
                           f"Please create shifts and assign guards first, or select a period with confirmed shifts.",
                "employees_checked": len(employees),
                "employees_with_no_shifts": employees_with_no_shifts[:20]  # Show first 20
            }

        # Calculate summary
        summary = cls._calculate_summary(payroll_records)

        # Generate payroll ID
        payroll_id = f"PAY-ORG{str(org_id).zfill(3)}-{start_date.strftime('%Y%m')}-001"

        return {
            "payroll_id": payroll_id,
            "organization_id": org_id,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "type": period_type
            },
            "generated_at": datetime.utcnow().isoformat(),
            "employees": [cls._record_to_dict(r) for r in payroll_records],
            "summary": summary,
            "status": "draft"
        }

    @classmethod
    def _process_employee_payroll(
        cls,
        db: Session,
        employee: Employee,
        start_date: date,
        end_date: date,
        site_ids: Optional[List[int]] = None,
        include_deductions: bool = True
    ) -> PayrollEmployeeRecord:
        """Process payroll for a single employee."""

        record = PayrollEmployeeRecord(employee, start_date, end_date)

        # Get shift assignments for this employee in the date range
        assignment_query = db.query(ShiftAssignment).join(Shift).filter(
            ShiftAssignment.employee_id == employee.employee_id,
            Shift.start_time >= datetime.combine(start_date, datetime.min.time()),
            Shift.end_time <= datetime.combine(end_date, datetime.max.time()),
            ShiftAssignment.status.in_(["confirmed", "completed"])
        )

        if site_ids:
            assignment_query = assignment_query.filter(Shift.site_id.in_(site_ids))

        assignments = assignment_query.all()

        # Track unique days worked
        days_worked = set()

        for assignment in assignments:
            shift = assignment.shift

            # Calculate shift duration
            shift_start = shift.start_time
            shift_end = shift.end_time
            duration_hours = Decimal(str((shift_end - shift_start).total_seconds() / 3600))

            # Track day worked
            days_worked.add(shift_start.date())

            # Determine shift type and calculate hours
            shift_date = shift_start.date()
            is_holiday = shift_date in cls.SA_HOLIDAYS_2025
            is_sunday = shift_date.weekday() == 6
            is_night = cls._is_night_shift(shift_start, shift_end)

            # Categorize hours
            if is_holiday:
                record.holiday_hours += duration_hours
            elif is_sunday:
                record.sunday_hours += duration_hours
            else:
                record.normal_hours += duration_hours

            # Night shift premium hours
            if is_night:
                record.night_allowance += (duration_hours * record.rate_per_hour * cls.NIGHT_SHIFT_PREMIUM)

            # Store shift details
            record.shifts_worked.append({
                "shift_id": shift.shift_id,
                "date": shift_date.isoformat(),
                "start_time": shift_start.isoformat(),
                "end_time": shift_end.isoformat(),
                "hours": float(duration_hours),
                "is_night": is_night,
                "is_sunday": is_sunday,
                "is_holiday": is_holiday
            })

        # Calculate totals
        record.total_days_worked = len(days_worked)
        record.total_hours_worked = record.normal_hours + record.sunday_hours + record.holiday_hours

        # Check for overtime (over 45 hours for the period)
        max_regular_hours = Decimal("45") if (end_date - start_date).days <= 7 else Decimal("180")
        if record.total_hours_worked > max_regular_hours:
            record.extra_hours = record.total_hours_worked - max_regular_hours

        # Calculate earnings
        record.total_hours_wage = record.normal_hours * record.rate_per_hour

        # Sunday premium (50% extra)
        sunday_premium = record.sunday_hours * record.rate_per_hour * cls.SUNDAY_PREMIUM
        record.total_hours_wage += record.sunday_hours * record.rate_per_hour + sunday_premium

        # Holiday premium (100% extra)
        holiday_premium = record.holiday_hours * record.rate_per_hour * cls.HOLIDAY_PREMIUM
        record.total_hours_wage += record.holiday_hours * record.rate_per_hour + holiday_premium

        # Overtime pay
        record.overtime_pay = record.extra_hours * record.rate_per_hour * (Decimal("1") + cls.OVERTIME_PREMIUM)

        # Supervisor allowance if applicable
        if employee.is_supervisor:
            record.supervisor_allowance = Decimal("500")  # Fixed supervisor allowance

        # Gross salary
        record.gross_salary = (
            record.total_hours_wage +
            record.night_allowance +
            record.supervisor_allowance +
            record.overtime_pay +
            record.bonus +
            record.sick_pay
        ).quantize(Decimal("0.01"))

        # Calculate deductions if requested
        if include_deductions:
            cls._calculate_deductions(record)

        # Net salary
        record.net_salary = (record.gross_salary - record.total_deductions).quantize(Decimal("0.01"))

        return record

    @classmethod
    def _calculate_deductions(cls, record: PayrollEmployeeRecord):
        """Calculate all SA deductions for an employee."""

        gross = record.gross_salary

        # UIF (1% of gross, capped at R177.12)
        uif_result = SAPayrollService.calculate_uif(gross)
        record.uif = uif_result["employee_contribution"]

        # PAYE (based on annualized salary)
        # Estimate age from ID number if available
        age = 35  # Default
        if record.id_number and len(record.id_number) >= 6:
            try:
                year_str = record.id_number[:2]
                year = int(year_str)
                birth_year = 1900 + year if year > 24 else 2000 + year
                age = date.today().year - birth_year
            except:
                pass

        paye_result = SAPayrollService.calculate_paye(gross, age)
        record.paye = paye_result["paye"]

        # PSIRA deduction (example fixed amount)
        record.psira_deduction = Decimal("50")  # Adjust based on actual rates

        # Bargaining Council (example)
        record.bargaining_council = Decimal("25")

        # Provident Fund (example 5% of gross)
        record.provident_fund = (gross * Decimal("0.05")).quantize(Decimal("0.01"))

        # Total deductions
        record.total_deductions = (
            record.uif +
            record.paye +
            record.psira_deduction +
            record.bargaining_council +
            record.provident_fund +
            record.nucaaw +
            record.hospital_cover +
            record.defect
        ).quantize(Decimal("0.01"))

    @classmethod
    def _is_night_shift(cls, start: datetime, end: datetime) -> bool:
        """Determine if a shift is a night shift (significant hours between 18:00-06:00)."""
        night_start = 18  # 6 PM
        night_end = 6     # 6 AM

        start_hour = start.hour
        end_hour = end.hour

        # If shift starts at or after 18:00, or ends at or before 06:00
        if start_hour >= night_start or end_hour <= night_end:
            return True

        # Check if shift spans midnight
        if end.date() > start.date():
            return True

        return False

    @classmethod
    def _calculate_summary(cls, records: List[PayrollEmployeeRecord]) -> Dict:
        """Calculate summary totals for all payroll records."""

        total_gross = sum(r.gross_salary for r in records)
        total_deductions = sum(r.total_deductions for r in records)
        total_net = sum(r.net_salary for r in records)
        total_hours = sum(r.total_hours_worked for r in records)
        total_normal_hours = sum(r.normal_hours for r in records)
        total_overtime_hours = sum(r.extra_hours for r in records)
        total_sunday_hours = sum(r.sunday_hours for r in records)
        total_holiday_hours = sum(r.holiday_hours for r in records)

        # Employer contributions
        total_employer_uif = sum(SAPayrollService.calculate_uif(r.gross_salary)["employer_contribution"] for r in records)

        return {
            "total_employees": len(records),
            "total_hours_worked": float(total_hours),
            "total_normal_hours": float(total_normal_hours),
            "total_overtime_hours": float(total_overtime_hours),
            "total_sunday_hours": float(total_sunday_hours),
            "total_holiday_hours": float(total_holiday_hours),
            "total_gross_pay": float(total_gross),
            "total_deductions": float(total_deductions),
            "total_net_pay": float(total_net),
            "employer_contributions": {
                "uif": float(total_employer_uif),
                "sdl": float(total_gross * Decimal("0.01"))  # 1% SDL on total payroll
            },
            "cost_to_company": float(total_gross + total_employer_uif + total_gross * Decimal("0.01"))
        }

    @classmethod
    def _record_to_dict(cls, record: PayrollEmployeeRecord) -> Dict:
        """Convert PayrollEmployeeRecord to dictionary."""

        # Mask account number for security (show last 4 digits only)
        masked_account = ""
        if record.account_number:
            masked_account = "****" + record.account_number[-4:] if len(record.account_number) >= 4 else "****"

        return {
            "employee_id": record.employee_id,
            "employee_no": record.employee_no,
            "surname": record.surname,
            "names": record.names,
            "id_number": record.id_number,
            "gender": record.gender,
            "tax_number": record.tax_number,
            "psira_number": record.psira_number,
            "bank_name": record.bank_name,
            "account_number": masked_account,  # Masked for security
            "account_number_full": record.account_number,  # For payslip PDF only
            "status": record.status,

            # Hours
            "total_days_worked": record.total_days_worked,
            "normal_hours": float(record.normal_hours),
            "sunday_hours": float(record.sunday_hours),
            "holiday_hours": float(record.holiday_hours),
            "extra_hours": float(record.extra_hours),
            "total_hours_worked": float(record.total_hours_worked),

            # Earnings
            "rate_per_hour": float(record.rate_per_hour),
            "total_hours_wage": float(record.total_hours_wage),
            "night_allowance": float(record.night_allowance),
            "supervisor_allowance": float(record.supervisor_allowance),
            "funeral_allowance": float(record.funeral_allowance),
            "gun_allowance": float(record.gun_allowance),
            "bonus": float(record.bonus),
            "cleaning_allowance": float(record.cleaning_allowance),
            "overtime_pay": float(record.overtime_pay),
            "sick_pay": float(record.sick_pay),
            "gross_salary": float(record.gross_salary),

            # Deductions
            "uif": float(record.uif),
            "psira_deduction": float(record.psira_deduction),
            "bargaining_council": float(record.bargaining_council),
            "paye": float(record.paye),
            "provident_fund": float(record.provident_fund),
            "nucaaw": float(record.nucaaw),
            "hospital_cover": float(record.hospital_cover),
            "defect": float(record.defect),
            "total_deductions": float(record.total_deductions),

            # Final
            "net_salary": float(record.net_salary),

            # Shift details
            "shifts_worked": record.shifts_worked
        }


# =============================================================================
# PAYROLL EXCEL COLUMN MAPPING
# =============================================================================

EXCEL_COLUMNS = {
    "NO.": "employee_no",
    "SURNAME": "surname",
    "NAME(S)": "names",
    "ID NUMBER": "id_number",
    "GENDER": "gender",
    "TAX NUMBER": "tax_number",
    "PSIRA": "psira_number",
    "BANK NAME(S)": "bank_name",
    "ACCOUNT NUMBERS": "account_number_full",
    "EMPLOYEE NO.": "employee_no",
    "TOTAL DAYS W": "total_days_worked",
    "NORMAL HRS": "normal_hours",
    "SUNDAY HRS": "sunday_hours",
    "HOLIDAY HRS": "holiday_hours",
    "EXTRA HRS": "extra_hours",
    "TOTAL HRS W": "total_hours_worked",
    "RATE P/HR": "rate_per_hour",
    "TOTAL HRS WAGE": "total_hours_wage",
    "NIGHT S/ALL": "night_allowance",
    "SUPERVISOR": "supervisor_allowance",
    "FUNERAL": "funeral_allowance",
    "GUN": "gun_allowance",
    "BONUS": "bonus",
    "CLEANING": "cleaning_allowance",
    "OVERTIME": "overtime_pay",
    "SICK": "sick_pay",
    "GROSS SALARY": "gross_salary",
    "UIF": "uif",
    "PSIRA": "psira_deduction",
    "BARGAINING": "bargaining_council",
    "PAYE": "paye",
    "PROFIDENT FUND": "provident_fund",
    "NUCAAW": "nucaaw",
    "HOSP COVER": "hospital_cover",
    "DEFFECT": "defect",
    "NET SALARY": "net_salary",
}
