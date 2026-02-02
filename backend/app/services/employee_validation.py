"""
Employee validation service for Phase 1 multi-type HR platform.

Validates employment type combinations and ensures SARS/BCEA compliance.
"""

from typing import List, Optional
from pydantic import BaseModel
from app.models.employee import EmploymentType, WorkPatternType, EmployeeRole


class ValidationError(BaseModel):
    """Validation error model."""
    field: str
    message: str
    severity: str = "error"  # error, warning


class EmployeeValidationResult(BaseModel):
    """Validation result."""
    is_valid: bool
    errors: List[ValidationError] = []
    warnings: List[ValidationError] = []


class EmployeeValidator:
    """Validates employee data for different employment types."""

    @staticmethod
    def validate_consultant(
        contract_start_date: Optional[str],
        contract_end_date: Optional[str],
        daily_rate: Optional[float],
        hourly_rate: Optional[float],
        is_independent_contractor: bool,
        tax_number: Optional[str],
    ) -> EmployeeValidationResult:
        """
        Validate consultant/independent contractor setup.

        SARS Rules for Independent Contractors:
        - Must have tax number for tax compliance
        - Must have contract dates (start/end)
        - Must have rate (daily_rate OR hourly_rate)
        - Must be marked as independent contractor
        - Cannot receive PAYE/UIF/SDL deductions
        """
        errors = []
        warnings = []

        # Hard requirements
        if not contract_start_date:
            errors.append(ValidationError(
                field="contract_start_date",
                message="Contract start date is required for consultants",
                severity="error"
            ))

        if not contract_end_date:
            errors.append(ValidationError(
                field="contract_end_date",
                message="Contract end date is required for consultants",
                severity="error"
            ))

        if not daily_rate and not hourly_rate:
            errors.append(ValidationError(
                field="daily_rate",
                message="Either daily_rate or hourly_rate must be specified for consultants",
                severity="error"
            ))

        if not is_independent_contractor:
            errors.append(ValidationError(
                field="is_independent_contractor",
                message="Consultants must be marked as independent contractors for SARS compliance",
                severity="error"
            ))

        # Warnings (non-blocking)
        if not tax_number:
            warnings.append(ValidationError(
                field="tax_number",
                message="Tax number recommended for independent contractors (SARS compliance)",
                severity="warning"
            ))

        return EmployeeValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    @staticmethod
    def validate_part_time(
        max_hours_week: Optional[int],
        max_hours_month: Optional[int],
    ) -> EmployeeValidationResult:
        """
        Validate part-time employee setup.

        BCEA Rules for Part-Time Workers:
        - Must have hour limits defined (weekly or monthly)
        - Pro-rata leave entitlement
        - BCEA protections apply proportionally
        """
        errors = []
        warnings = []

        if not max_hours_week and not max_hours_month:
            warnings.append(ValidationError(
                field="max_hours_week",
                message="Consider setting max_hours_week or max_hours_month for part-time employees",
                severity="warning"
            ))

        if max_hours_week and max_hours_week >= 45:
            warnings.append(ValidationError(
                field="max_hours_week",
                message="Part-time employees typically work <45 hours/week. Consider full-time classification.",
                severity="warning"
            ))

        return EmployeeValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    @staticmethod
    def validate_office_hours(
        standard_work_hours_start: Optional[str],
        standard_work_hours_end: Optional[str],
        work_pattern_type: WorkPatternType,
    ) -> EmployeeValidationResult:
        """
        Validate office hours configuration.

        BCEA Rules for Office Workers:
        - Maximum 45 hours/week ordinary time (vs 48 for shift workers)
        - Standard business hours typically Mon-Fri
        """
        errors = []
        warnings = []

        if work_pattern_type == WorkPatternType.OFFICE_HOURS:
            if not standard_work_hours_start or not standard_work_hours_end:
                warnings.append(ValidationError(
                    field="standard_work_hours_start",
                    message="Standard work hours (start/end) recommended for office_hours pattern",
                    severity="warning"
                ))

        return EmployeeValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    @staticmethod
    def validate_work_pattern_role_combination(
        role: EmployeeRole,
        work_pattern_type: WorkPatternType,
    ) -> EmployeeValidationResult:
        """
        Validate that role and work pattern are compatible.

        Business Rules:
        - Security guards (armed/unarmed) should be shift_based
        - Office staff should be office_hours, flexible, or custom
        - Contractors/consultants typically project_based
        """
        errors = []
        warnings = []

        # Security guards should be shift-based
        if role in [EmployeeRole.ARMED, EmployeeRole.UNARMED]:
            if work_pattern_type not in [WorkPatternType.SHIFT_BASED]:
                warnings.append(ValidationError(
                    field="work_pattern_type",
                    message=f"Security guards ({role.value}) are typically shift_based, not {work_pattern_type.value}",
                    severity="warning"
                ))

        # Office staff should not be shift-based
        if role == EmployeeRole.OFFICE_STAFF:
            if work_pattern_type == WorkPatternType.SHIFT_BASED:
                warnings.append(ValidationError(
                    field="work_pattern_type",
                    message="Office staff typically use office_hours or flexible patterns, not shift_based",
                    severity="warning"
                ))

        # Contractors/consultants typically project-based
        if role in [EmployeeRole.CONTRACTOR, EmployeeRole.CONSULTANT]:
            if work_pattern_type == WorkPatternType.SHIFT_BASED:
                warnings.append(ValidationError(
                    field="work_pattern_type",
                    message="Contractors/consultants typically use project_based or flexible patterns",
                    severity="warning"
                ))

        return EmployeeValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    @classmethod
    def validate_employee(
        cls,
        employment_type: EmploymentType,
        work_pattern_type: WorkPatternType,
        role: EmployeeRole,
        **kwargs
    ) -> EmployeeValidationResult:
        """
        Main validation method for employee data.

        Runs all relevant validations based on employment type.
        """
        all_errors = []
        all_warnings = []

        # Validate consultant-specific requirements
        if employment_type == EmploymentType.CONSULTANT:
            result = cls.validate_consultant(
                contract_start_date=kwargs.get("contract_start_date"),
                contract_end_date=kwargs.get("contract_end_date"),
                daily_rate=kwargs.get("daily_rate"),
                hourly_rate=kwargs.get("hourly_rate"),
                is_independent_contractor=kwargs.get("is_independent_contractor", False),
                tax_number=kwargs.get("tax_number"),
            )
            all_errors.extend(result.errors)
            all_warnings.extend(result.warnings)

        # Validate part-time requirements
        if employment_type == EmploymentType.PART_TIME:
            result = cls.validate_part_time(
                max_hours_week=kwargs.get("max_hours_week"),
                max_hours_month=kwargs.get("max_hours_month"),
            )
            all_errors.extend(result.errors)
            all_warnings.extend(result.warnings)

        # Validate office hours configuration
        result = cls.validate_office_hours(
            standard_work_hours_start=kwargs.get("standard_work_hours_start"),
            standard_work_hours_end=kwargs.get("standard_work_hours_end"),
            work_pattern_type=work_pattern_type,
        )
        all_errors.extend(result.errors)
        all_warnings.extend(result.warnings)

        # Validate role and work pattern combination
        result = cls.validate_work_pattern_role_combination(
            role=role,
            work_pattern_type=work_pattern_type,
        )
        all_errors.extend(result.errors)
        all_warnings.extend(result.warnings)

        return EmployeeValidationResult(
            is_valid=len(all_errors) == 0,
            errors=all_errors,
            warnings=all_warnings
        )
