"""Excel import service for bulk data uploads."""
import logging
import pandas as pd
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from io import BytesIO
from app.models.employee import Employee
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
        - role_name (admin/manager/guard)
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

                    # Create employee
                    employee = Employee(
                        organization_id=organization_id,
                        first_name=str(row['first_name']).strip(),
                        last_name=str(row['last_name']).strip(),
                        id_number=str(row['id_number']).strip(),
                        email=str(row.get('email', '')).strip() if pd.notna(row.get('email')) else None,
                        phone=str(row.get('phone', '')).strip() if pd.notna(row.get('phone')) else None,
                        role_name=str(row.get('role_name', 'guard')).strip().lower(),
                        psira_number=str(row.get('psira_number', '')).strip() if pd.notna(row.get('psira_number')) else None,
                        hourly_rate=float(row.get('hourly_rate', 50.0)) if pd.notna(row.get('hourly_rate')) else 50.0,
                        home_address=str(row.get('home_address', '')).strip() if pd.notna(row.get('home_address')) else None,
                        emergency_contact=str(row.get('emergency_contact', '')).strip() if pd.notna(row.get('emergency_contact')) else None,
                        emergency_phone=str(row.get('emergency_phone', '')).strip() if pd.notna(row.get('emergency_phone')) else None,
                        is_active=True,
                        date_hired=datetime.utcnow()
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
            'role_name': ['guard', 'manager'],
            'psira_number': ['1234567', '7654321'],
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
