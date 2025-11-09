"""Commission Deduction Service - Automatic salary deductions for marketplace hires."""

from sqlalchemy.orm import Session
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any
from app.models.marketplace_commission import MarketplaceCommission, CommissionStatus
from app.models.employee import Employee


class CommissionDeductionService:
    """
    Handle automatic marketplace commission deductions from payroll.

    Deducts R500 (or configured amount) from hired guard's salary:
    - FULL method: Entire amount on first payroll
    - SPLIT method: Divided over 3 payrolls (default R166.67 each)
    """

    @staticmethod
    def process_commission_deductions(
        db: Session,
        employee_id: int,
        payroll_period_end: date,
        gross_pay: float
    ) -> Dict[str, Any]:
        """
        Process commission deductions for an employee's payroll period.

        Args:
            db: Database session
            employee_id: Employee ID
            payroll_period_end: End date of payroll period
            gross_pay: Gross pay for the period

        Returns:
            Dictionary with deduction details:
            {
                'deduction_amount': 166.67,
                'deduction_applied': True,
                'commission_id': 123,
                'installments_remaining': 2,
                'total_deducted_so_far': 166.67,
                'total_commission': 500.00,
                'notes': '1 of 3 payments deducted'
            }
        """

        # Get employee
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()

        if not employee or not employee.marketplace_commission_id:
            return {
                'deduction_amount': 0.0,
                'deduction_applied': False,
                'notes': 'No marketplace commission to deduct'
            }

        # Get commission
        commission = db.query(MarketplaceCommission).filter(
            MarketplaceCommission.commission_id == employee.marketplace_commission_id
        ).first()

        if not commission:
            return {
                'deduction_amount': 0.0,
                'deduction_applied': False,
                'notes': 'Commission record not found'
            }

        # Check if commission is already fully paid
        if commission.status == CommissionStatus.PAID:
            return {
                'deduction_amount': 0.0,
                'deduction_applied': False,
                'notes': 'Commission already fully paid'
            }

        # Check if commission is waived (sponsored by company)
        if commission.status == CommissionStatus.WAIVED:
            return {
                'deduction_amount': 0.0,
                'deduction_applied': False,
                'notes': 'Commission waived (sponsored by company)'
            }

        # Check if all installments are paid
        if commission.is_fully_paid:
            # Update status to PAID
            commission.status = CommissionStatus.PAID
            commission.paid_at = payroll_period_end
            employee.marketplace_commission_status = 'completed'
            db.commit()

            return {
                'deduction_amount': 0.0,
                'deduction_applied': False,
                'notes': 'Commission fully paid'
            }

        # Calculate deduction amount
        if not commission.amount_per_installment:
            # Error - invalid commission setup
            return {
                'deduction_amount': 0.0,
                'deduction_applied': False,
                'notes': 'Invalid commission configuration'
            }

        deduction_amount = float(commission.amount_per_installment)

        # Validate sufficient gross pay
        if gross_pay < deduction_amount:
            return {
                'deduction_amount': 0.0,
                'deduction_applied': False,
                'notes': f'Insufficient gross pay (R{gross_pay:.2f}) for deduction (R{deduction_amount:.2f})',
                'warning': True
            }

        # Apply deduction
        commission.installments_paid += 1
        commission.next_deduction_date = payroll_period_end + timedelta(days=30)  # Next month

        # Update status
        if commission.installments_paid >= commission.installments:
            commission.status = CommissionStatus.PAID
            commission.paid_at = payroll_period_end
            employee.marketplace_commission_status = 'completed'
        else:
            commission.status = CommissionStatus.IN_PROGRESS
            employee.marketplace_commission_status = 'in_progress'

        db.commit()
        db.refresh(commission)

        installments_remaining = commission.installments - commission.installments_paid
        total_deducted = float(commission.amount_per_installment) * commission.installments_paid

        return {
            'deduction_amount': deduction_amount,
            'deduction_applied': True,
            'commission_id': commission.commission_id,
            'installments_remaining': installments_remaining,
            'total_deducted_so_far': total_deducted,
            'total_commission': float(commission.amount),
            'notes': f'Payment {commission.installments_paid} of {commission.installments} deducted',
            'status': commission.status
        }

    @staticmethod
    def get_employee_pending_commission(db: Session, employee_id: int) -> Optional[Dict[str, Any]]:
        """
        Get pending commission details for an employee.

        Args:
            db: Database session
            employee_id: Employee ID

        Returns:
            Commission details or None
        """

        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()

        if not employee or not employee.marketplace_commission_id:
            return None

        commission = db.query(MarketplaceCommission).filter(
            MarketplaceCommission.commission_id == employee.marketplace_commission_id
        ).first()

        if not commission or commission.status in [CommissionStatus.PAID, CommissionStatus.WAIVED]:
            return None

        return {
            'commission_id': commission.commission_id,
            'total_amount': float(commission.amount),
            'amount_per_installment': float(commission.amount_per_installment) if commission.amount_per_installment else 0,
            'installments': commission.installments,
            'installments_paid': commission.installments_paid,
            'installments_remaining': commission.installments - commission.installments_paid,
            'amount_remaining': commission.amount_remaining,
            'deduction_method': commission.deduction_method,
            'status': commission.status,
            'description': commission.description
        }

    @staticmethod
    def calculate_net_pay_with_commission(
        gross_pay: float,
        expenses: float,
        commission_deduction: float
    ) -> float:
        """
        Calculate net pay after commission deduction.

        Args:
            gross_pay: Gross salary
            expenses: Reimbursable expenses
            commission_deduction: Marketplace commission deduction

        Returns:
            Net pay (gross + expenses - commission)
        """

        return gross_pay + expenses - commission_deduction

    @staticmethod
    def get_commission_summary_for_organization(db: Session, organization_id: int) -> Dict[str, Any]:
        """
        Get commission summary for an organization.

        Shows total revenue from marketplace commissions.

        Args:
            db: Database session
            organization_id: Organization ID

        Returns:
            Summary statistics
        """

        from sqlalchemy import func

        # Total commissions for this org
        total_commissions = db.query(func.sum(MarketplaceCommission.amount)).filter(
            MarketplaceCommission.organization_id == organization_id,
            MarketplaceCommission.commission_type == 'hire'
        ).scalar() or 0

        # Pending commissions
        pending = db.query(func.sum(MarketplaceCommission.amount)).filter(
            MarketplaceCommission.organization_id == organization_id,
            MarketplaceCommission.commission_type == 'hire',
            MarketplaceCommission.status == CommissionStatus.PENDING
        ).scalar() or 0

        # In progress commissions
        in_progress = db.query(func.sum(MarketplaceCommission.amount)).filter(
            MarketplaceCommission.organization_id == organization_id,
            MarketplaceCommission.commission_type == 'hire',
            MarketplaceCommission.status == CommissionStatus.IN_PROGRESS
        ).scalar() or 0

        # Fully paid commissions
        paid = db.query(func.sum(MarketplaceCommission.amount)).filter(
            MarketplaceCommission.organization_id == organization_id,
            MarketplaceCommission.commission_type == 'hire',
            MarketplaceCommission.status == CommissionStatus.PAID
        ).scalar() or 0

        # Waived (sponsored) commissions
        waived = db.query(func.sum(MarketplaceCommission.amount)).filter(
            MarketplaceCommission.organization_id == organization_id,
            MarketplaceCommission.commission_type == 'hire',
            MarketplaceCommission.status == CommissionStatus.WAIVED
        ).scalar() or 0

        return {
            'total_commissions': float(total_commissions),
            'pending': float(pending),
            'in_progress': float(in_progress),
            'paid': float(paid),
            'waived_by_sponsorship': float(waived),
            'revenue_collected': float(paid)  # Revenue = fully paid commissions
        }
