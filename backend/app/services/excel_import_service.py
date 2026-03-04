"""Excel import service for bulk data uploads. Updated for correct field mapping."""
import logging
import pandas as pd
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from io import BytesIO
from app.models.employee import Employee, EmployeeRole, EmployeeStatus
from app.models.site import Site
from app.models.client import Client
from app.models.certification import Certification

logger = logging.getLogger(__name__)


class ExcelImportService:
    """Service for importing data from Excel files."""

    @staticmethod
    def import_employees(
        db: Session,
        file_content: bytes,
        organization_id: int
    ) -> Dict:
        """
        Import employees from Excel file.

        Expected columns:
        - first_name (required)
        - last_name (required)
        - id_number (required)
        - email
        - phone
        - role (armed/unarmed)
        - psira_number
        - hourly_rate
        - home_address
        - emergency_contact
        - emergency_phone

        Args:
            db: Database session
            file_content: Excel file bytes
            organization_id: Organization ID

        Returns:
            Dict with import results
        """
        try:
            # Read Excel file
            df = pd.read_excel(BytesIO(file_content))

            # Validate required columns
            required_columns = ['first_name', 'last_name', 'id_number']
            missing_columns = [col for col in required_columns if col not in df.columns]

            if missing_columns:
                return {
                    "status": "error",
                    "message": f"Missing required columns: {', '.join(missing_columns)}"
                }

            # Process each row
            imported = []
            errors = []
            skipped = []

            for index, row in df.iterrows():
                try:
                    # Check if ID number already exists
                    existing = db.query(Employee).filter(
                        Employee.id_number == str(row['id_number']).strip()
                    ).first()

                    if existing:
                        skipped.append({
                            "row": index + 2,  # +2 for header and 0-index
                            "id_number": row['id_number'],
                            "reason": "ID number already exists"
                        })
                        continue

                    # Parse role
                    role_str = str(row.get('role', 'unarmed')).strip().lower()
                    if role_str == 'armed':
                        role = EmployeeRole.ARMED
                    else:
                        role = EmployeeRole.UNARMED

                    # Create employee
                    # Map psira_grade from Excel (handles both 'psira_grade' and 'cert_level' columns)
                    psira_grade_val = None
                    if pd.notna(row.get('psira_grade')):
                        psira_grade_val = str(row.get('psira_grade')).strip().upper()
                    elif pd.notna(row.get('cert_level')):
                        psira_grade_val = str(row.get('cert_level')).strip().upper()

                    employee = Employee(
                        org_id=organization_id,
                        first_name=str(row['first_name']).strip(),
                        last_name=str(row['last_name']).strip(),
                        id_number=str(row['id_number']).strip(),
                        email=str(row.get('email', '')).strip() if pd.notna(row.get('email')) else None,
                        phone=str(row.get('phone', '')).strip() if pd.notna(row.get('phone')) else None,
                        role=role,
                        psira_number=str(row.get('psira_number', '')).strip() if pd.notna(row.get('psira_number')) else None,
                        psira_grade=psira_grade_val,
                        hourly_rate=float(row.get('hourly_rate', 50.0)) if pd.notna(row.get('hourly_rate')) else 50.0,
                        address=str(row.get('home_address', '')).strip() if pd.notna(row.get('home_address')) else None,
                        emergency_contact_name=str(row.get('emergency_contact', '')).strip() if pd.notna(row.get('emergency_contact')) else None,
                        emergency_contact_phone=str(row.get('emergency_phone', '')).strip() if pd.notna(row.get('emergency_phone')) else None,
                        status=EmployeeStatus.ACTIVE
                    )

                    db.add(employee)
                    db.flush()  # Get employee_id without committing

                    imported.append({
                        "row": index + 2,
                        "employee_id": employee.employee_id,
                        "name": f"{employee.first_name} {employee.last_name}",
                        "id_number": employee.id_number
                    })

                except Exception as e:
                    errors.append({
                        "row": index + 2,
                        "error": str(e)
                    })
                    logger.error(f"Error importing employee at row {index + 2}: {e}")

            # Commit all successful imports
            if imported:
                db.commit()

            logger.info(
                f"Employee import completed: {len(imported)} imported, "
                f"{len(skipped)} skipped, {len(errors)} errors"
            )

            return {
                "status": "success",
                "imported_count": len(imported),
                "skipped_count": len(skipped),
                "error_count": len(errors),
                "imported": imported,
                "skipped": skipped,
                "errors": errors
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to import employees: {e}")
            return {
                "status": "error",
                "message": f"Failed to import employees: {str(e)}"
            }

    # EasyRoster column name mapping → our column names
    EASYROSTER_COLUMN_MAP = {
        "SURNAME": "last_name",
        "NAME(S)": "first_name",
        "ID NUMBER": "id_number",
        "GENDER": "gender",
        "TAX NUMBER": "tax_number",
        "PSIRA": "psira_number",
        "BANK NAME(S)": "bank_name",
        "ACCOUNT NUMBERS": "account_number",
        "EMPLOYEE NO": "employee_number",
        "RATE P/HR": "hourly_rate",
    }

    @staticmethod
    def detect_easyroster_format(df: pd.DataFrame) -> bool:
        """Check if the DataFrame uses EasyRoster column format."""
        easyroster_markers = {"SURNAME", "NAME(S)", "ID NUMBER", "PSIRA", "EMPLOYEE NO"}
        upper_cols = {str(c).strip().upper() for c in df.columns}
        return easyroster_markers.issubset(upper_cols)

    @staticmethod
    def import_from_easyroster(
        db: Session,
        file_content: bytes,
        organization_id: int
    ) -> Dict:
        """
        Import employees from EasyRoster payroll format (36 columns).

        Auto-detects EasyRoster format by column headers (SURNAME, NAME(S), ID NUMBER, etc.)
        Maps to RostraCore Employee model fields. Creates new or updates existing employees.

        Returns:
            Dict with import results (created, updated, skipped, errors)
        """
        try:
            df = pd.read_excel(BytesIO(file_content))

            # Normalize column names (strip whitespace, trailing periods, uppercase)
            df.columns = [str(c).strip().rstrip('.').strip().upper() for c in df.columns]

            if not ExcelImportService.detect_easyroster_format(df):
                return {
                    "status": "error",
                    "message": "File does not match EasyRoster format. Expected columns: SURNAME, NAME(S), ID NUMBER, PSIRA, EMPLOYEE NO"
                }

            created = []
            updated = []
            skipped = []
            errors = []

            for index, row in df.iterrows():
                try:
                    # Skip empty rows
                    surname = row.get("SURNAME")
                    names = row.get("NAME(S)")
                    if pd.isna(surname) or pd.isna(names):
                        continue

                    surname = str(surname).strip()
                    names = str(names).strip()
                    if not surname or not names:
                        continue

                    # Parse ID number
                    id_number_raw = row.get("ID NUMBER")
                    if pd.isna(id_number_raw):
                        errors.append({
                            "row": index + 2,
                            "name": f"{names} {surname}",
                            "error": "Missing ID number"
                        })
                        continue

                    id_number = str(int(id_number_raw)) if isinstance(id_number_raw, float) else str(id_number_raw).strip()

                    # Check if employee exists (by id_number)
                    existing = db.query(Employee).filter(
                        Employee.org_id == organization_id,
                        Employee.id_number == id_number,
                    ).first()

                    # Parse fields
                    gender_raw = str(row.get("GENDER", "")).strip().upper() if pd.notna(row.get("GENDER")) else None
                    gender_map = {"M": "male", "F": "female", "MALE": "male", "FEMALE": "female"}
                    gender_val = gender_map.get(gender_raw) if gender_raw else None

                    tax_number = str(row.get("TAX NUMBER", "")).strip() if pd.notna(row.get("TAX NUMBER")) else None
                    if tax_number:
                        tax_number = str(int(float(tax_number))) if tax_number.replace(".", "").isdigit() else tax_number

                    psira_raw = row.get("PSIRA")
                    psira_number = str(int(psira_raw)) if pd.notna(psira_raw) and isinstance(psira_raw, (int, float)) else (str(psira_raw).strip() if pd.notna(psira_raw) else None)

                    bank_name = str(row.get("BANK NAME(S)", "")).strip() if pd.notna(row.get("BANK NAME(S)")) else None

                    account_raw = row.get("ACCOUNT NUMBERS")
                    account_number = str(int(account_raw)) if pd.notna(account_raw) and isinstance(account_raw, (int, float)) else (str(account_raw).strip() if pd.notna(account_raw) else None)

                    emp_no_raw = row.get("EMPLOYEE NO")
                    employee_number = str(int(emp_no_raw)) if pd.notna(emp_no_raw) and isinstance(emp_no_raw, (int, float)) else (str(emp_no_raw).strip() if pd.notna(emp_no_raw) else None)

                    hourly_rate_raw = row.get("RATE P/HR")
                    hourly_rate = float(hourly_rate_raw) if pd.notna(hourly_rate_raw) else None

                    if existing:
                        # Update existing employee with new data
                        changed = False
                        if employee_number and existing.employee_number != employee_number:
                            existing.employee_number = employee_number
                            changed = True
                        if tax_number and existing.tax_number != tax_number:
                            existing.tax_number = tax_number
                            changed = True
                        if bank_name and existing.bank_name != bank_name:
                            existing.bank_name = bank_name
                            changed = True
                        if account_number and existing.account_number != account_number:
                            existing.account_number = account_number
                            changed = True
                        if hourly_rate and existing.hourly_rate != hourly_rate:
                            existing.hourly_rate = hourly_rate
                            changed = True
                        if psira_number and existing.psira_number != psira_number:
                            existing.psira_number = psira_number
                            changed = True
                        if gender_val and existing.gender is None:
                            from app.models.employee import Gender
                            existing.gender = Gender(gender_val)
                            changed = True

                        if changed:
                            updated.append({
                                "row": index + 2,
                                "employee_id": existing.employee_id,
                                "name": f"{existing.first_name} {existing.last_name}",
                            })
                        else:
                            skipped.append({
                                "row": index + 2,
                                "name": f"{existing.first_name} {existing.last_name}",
                                "reason": "No changes detected"
                            })
                    else:
                        # Create new employee
                        from app.models.employee import Gender

                        employee = Employee(
                            org_id=organization_id,
                            first_name=names,
                            last_name=surname,
                            id_number=id_number,
                            employee_number=employee_number,
                            role=EmployeeRole.UNARMED,
                            pay_type="hourly",
                            hourly_rate=hourly_rate or 50.0,
                            gender=Gender(gender_val) if gender_val else None,
                            tax_number=tax_number,
                            psira_number=psira_number,
                            bank_name=bank_name,
                            account_number=account_number,
                            status=EmployeeStatus.ACTIVE,
                        )
                        db.add(employee)
                        db.flush()

                        created.append({
                            "row": index + 2,
                            "employee_id": employee.employee_id,
                            "name": f"{names} {surname}",
                            "id_number": id_number,
                        })

                except Exception as e:
                    errors.append({
                        "row": index + 2,
                        "error": str(e)
                    })
                    logger.error(f"EasyRoster import error at row {index + 2}: {e}")

            if created or updated:
                db.commit()

            logger.info(
                f"EasyRoster import: {len(created)} created, {len(updated)} updated, "
                f"{len(skipped)} skipped, {len(errors)} errors"
            )

            return {
                "status": "success",
                "format": "easyroster",
                "created_count": len(created),
                "updated_count": len(updated),
                "skipped_count": len(skipped),
                "error_count": len(errors),
                "created": created[:100],
                "updated": updated[:100],
                "skipped": skipped[:50],
                "errors": errors[:50],
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed EasyRoster import: {e}")
            return {
                "status": "error",
                "message": f"Failed to import from EasyRoster: {str(e)}"
            }

    @staticmethod
    def import_sites(
        db: Session,
        file_content: bytes,
        organization_id: int
    ) -> Dict:
        """
        Import sites from Excel file.

        Expected columns:
        - client_name (required)
        - site_name
        - address (required)
        - city
        - province
        - shift_pattern (day/night/12hr)
        - billing_rate
        - min_staff

        Args:
            db: Database session
            file_content: Excel file bytes
            organization_id: Organization ID

        Returns:
            Dict with import results
        """
        try:
            df = pd.read_excel(BytesIO(file_content))

            required_columns = ['client_name', 'address']
            missing_columns = [col for col in required_columns if col not in df.columns]

            if missing_columns:
                return {
                    "status": "error",
                    "message": f"Missing required columns: {', '.join(missing_columns)}"
                }

            imported = []
            errors = []

            for index, row in df.iterrows():
                try:
                    # Get or create client
                    client_name = str(row['client_name']).strip()
                    client = db.query(Client).filter(
                        Client.organization_id == organization_id,
                        Client.client_name == client_name
                    ).first()

                    if not client:
                        client = Client(
                            organization_id=organization_id,
                            client_name=client_name,
                            contact_email=str(row.get('client_email', '')).strip() if pd.notna(row.get('client_email')) else None,
                            contact_phone=str(row.get('client_phone', '')).strip() if pd.notna(row.get('client_phone')) else None,
                            is_active=True
                        )
                        db.add(client)
                        db.flush()

                    # Create site
                    site = Site(
                        client_id=client.client_id,
                        client_name=client_name,
                        site_name=str(row.get('site_name', '')).strip() if pd.notna(row.get('site_name')) else None,
                        address=str(row['address']).strip(),
                        city=str(row.get('city', '')).strip() if pd.notna(row.get('city')) else None,
                        province=str(row.get('province', '')).strip() if pd.notna(row.get('province')) else None,
                        shift_pattern=str(row.get('shift_pattern', 'day')).strip().lower(),
                        billing_rate=float(row.get('billing_rate', 150.0)) if pd.notna(row.get('billing_rate')) else 150.0,
                        min_staff=int(row.get('min_staff', 1)) if pd.notna(row.get('min_staff')) else 1
                    )

                    db.add(site)
                    db.flush()

                    imported.append({
                        "row": index + 2,
                        "site_id": site.site_id,
                        "client_name": client_name,
                        "site_name": site.site_name or "Main Site",
                        "address": site.address
                    })

                except Exception as e:
                    errors.append({
                        "row": index + 2,
                        "error": str(e)
                    })
                    logger.error(f"Error importing site at row {index + 2}: {e}")

            if imported:
                db.commit()

            logger.info(
                f"Site import completed: {len(imported)} imported, {len(errors)} errors"
            )

            return {
                "status": "success",
                "imported_count": len(imported),
                "error_count": len(errors),
                "imported": imported,
                "errors": errors
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to import sites: {e}")
            return {
                "status": "error",
                "message": f"Failed to import sites: {str(e)}"
            }

    @staticmethod
    def generate_employee_template() -> bytes:
        """
        Generate Excel template for employee import.

        Returns:
            Excel file bytes
        """
        df = pd.DataFrame({
            'first_name': ['John', 'Jane'],
            'last_name': ['Doe', 'Smith'],
            'id_number': ['8001011234567', '9002022345678'],
            'email': ['john.doe@example.com', 'jane.smith@example.com'],
            'phone': ['+27821234567', '+27829876543'],
            'role': ['unarmed', 'armed'],
            'psira_number': ['1234567', '7654321'],
            'psira_grade': ['E', 'B'],
            'hourly_rate': [55.00, 75.00],
            'home_address': ['123 Main St, Johannesburg', '456 Oak Ave, Pretoria'],
            'emergency_contact': ['Mary Doe', 'Bob Smith'],
            'emergency_phone': ['+27831111111', '+27832222222']
        })

        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Employees')

        return output.getvalue()

    @staticmethod
    def generate_site_template() -> bytes:
        """
        Generate Excel template for site import.

        Returns:
            Excel file bytes
        """
        df = pd.DataFrame({
            'client_name': ['ABC Corporation', 'XYZ Ltd'],
            'site_name': ['Main Office', 'Warehouse A'],
            'address': ['123 Business Rd, Sandton', '789 Industrial Pk, Midrand'],
            'city': ['Johannesburg', 'Midrand'],
            'province': ['Gauteng', 'Gauteng'],
            'shift_pattern': ['day', '12hr'],
            'billing_rate': [180.00, 200.00],
            'min_staff': [2, 3],
            'client_email': ['contact@abc.com', 'info@xyz.com'],
            'client_phone': ['+27115551234', '+27115555678']
        })

        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Sites')

        return output.getvalue()
