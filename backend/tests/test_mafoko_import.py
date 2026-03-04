"""Tests for Mafoko site roster import service."""

import pytest
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

from app.services.mafoko_roster_import_service import (
    MafokoRosterImportService,
    HEADER_REGEX,
    FILENAME_DATE_REGEX,
)
from app.services.roster_suggestion_service import RosterSuggestionService


class TestHeaderParsing:
    """Test Mafoko header regex parsing."""

    def test_standard_header(self):
        text = "Mafoko Security Services - Gauteng Site Roster for GCIS 001: TSHEDIMOSETSO MON-FRI"
        match = HEADER_REGEX.search(text)
        assert match is not None
        assert match.group("province").strip() == "Gauteng"
        assert match.group("client").strip() == "GCIS"
        assert match.group("site_code") == "001"
        assert match.group("site_name").strip() == "TSHEDIMOSETSO"
        assert match.group("schedule").strip() == "MON-FRI"

    def test_header_with_patrols(self):
        text = "Mafoko Security Patrols - North West Site Roster for SAPS 005: KLERKSDORP MON-SUN"
        match = HEADER_REGEX.search(text)
        assert match is not None
        assert match.group("province").strip() == "North West"
        assert match.group("client").strip() == "SAPS"
        assert match.group("site_code") == "005"

    def test_header_with_em_dash(self):
        text = "Mafoko Security Services \u2014 Limpopo Site Roster for DHA 010: POLOKWANE MON-FRI"
        match = HEADER_REGEX.search(text)
        assert match is not None
        assert match.group("province").strip() == "Limpopo"

    def test_no_match(self):
        text = "Some other company roster"
        match = HEADER_REGEX.search(text)
        assert match is None


class TestDateRangeParsing:
    """Test filename date range extraction."""

    service = MafokoRosterImportService()

    def test_standard_filename(self):
        filename = "CORRECT TSHEDIMOSETSO HOUSE SITE ROSTER 21 MAY TO 20 JUNE 2025.xlsx"
        start, end = self.service.parse_date_range(filename)
        assert start == date(2025, 5, 21)
        assert end == date(2025, 6, 20)

    def test_same_month(self):
        filename = "SITE ROSTER 1 FEB TO 28 FEB 2026.xlsx"
        start, end = self.service.parse_date_range(filename)
        assert start == date(2026, 2, 1)
        assert end == date(2026, 2, 28)

    def test_cross_year(self):
        filename = "ROSTER 15 DEC TO 15 JAN 2026.xlsx"
        start, end = self.service.parse_date_range(filename)
        assert start == date(2025, 12, 15)
        assert end == date(2026, 1, 15)

    def test_full_month_names(self):
        filename = "ROSTER 1 JANUARY TO 31 JANUARY 2026.xlsx"
        start, end = self.service.parse_date_range(filename)
        assert start == date(2026, 1, 1)
        assert end == date(2026, 1, 31)

    def test_no_match(self):
        filename = "random_file.xlsx"
        start, end = self.service.parse_date_range(filename)
        assert start is None
        assert end is None


class TestFileHashComputation:
    """Test SHA-256 hash computation."""

    def test_hash_consistency(self):
        content = b"test content for hashing"
        hash1 = MafokoRosterImportService.compute_file_hash(content)
        hash2 = MafokoRosterImportService.compute_file_hash(content)
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 hex digest

    def test_different_content_different_hash(self):
        hash1 = MafokoRosterImportService.compute_file_hash(b"content A")
        hash2 = MafokoRosterImportService.compute_file_hash(b"content B")
        assert hash1 != hash2


class TestSuggestionService:
    """Test BCEA compliance suggestions."""

    def _make_employee(self, pers_no, first_name="Test", last_name="Employee", psira_grade="Grade C", psira_expiry=None):
        emp = MagicMock()
        emp.employee_number = pers_no
        emp.first_name = first_name
        emp.last_name = last_name
        emp.psira_grade = psira_grade
        emp.psira_expiry_date = psira_expiry
        return emp

    def test_consecutive_days_warning(self):
        """Flag >6 consecutive working days."""
        roster_data = [{
            "pers_no": "MSP001",
            "name": "SMITH,J",
            "grade": "C",
            "contact": "",
            "worked_count": 10,
            "working_days": list(range(10)),  # 10 consecutive days
            "row_number": 5,
        }]
        employee_map = {"MSP001": self._make_employee("MSP001")}

        suggestions = RosterSuggestionService._check_consecutive_days(
            roster_data, employee_map, date(2026, 3, 1)
        )
        assert len(suggestions) == 1
        assert suggestions[0]["type"] == "consecutive_days"
        assert suggestions[0]["severity"] == "warning"

    def test_no_consecutive_warning_under_7(self):
        """No warning for 6 or fewer consecutive days."""
        roster_data = [{
            "pers_no": "MSP001",
            "name": "SMITH,J",
            "grade": "C",
            "contact": "",
            "worked_count": 6,
            "working_days": [0, 1, 2, 3, 4, 5],  # 6 consecutive
            "row_number": 5,
        }]
        employee_map = {"MSP001": self._make_employee("MSP001")}

        suggestions = RosterSuggestionService._check_consecutive_days(
            roster_data, employee_map, date(2026, 3, 1)
        )
        assert len(suggestions) == 0

    def test_overtime_alert(self):
        """Flag employees exceeding 48h/week average."""
        roster_data = [{
            "pers_no": "MSP001",
            "name": "SMITH,J",
            "grade": "C",
            "contact": "",
            "worked_count": 28,
            "working_days": list(range(28)),  # 28 days worked in 30-day period
            "row_number": 5,
        }]
        employee_map = {"MSP001": self._make_employee("MSP001")}

        suggestions = RosterSuggestionService._check_overtime(
            roster_data, employee_map, date(2026, 3, 1), date(2026, 3, 30)
        )
        assert len(suggestions) == 1
        assert suggestions[0]["type"] == "overtime_alert"

    def test_grade_mismatch(self):
        """Flag grade differences between file and system."""
        roster_data = [{
            "pers_no": "MSP001",
            "name": "SMITH,J",
            "grade": "C",
            "contact": "",
            "worked_count": 5,
            "working_days": [0, 1, 2, 3, 4],
            "row_number": 5,
        }]
        # System has Grade D, file says C
        employee_map = {"MSP001": self._make_employee("MSP001", psira_grade="Grade D")}

        suggestions = RosterSuggestionService._check_grade_mismatches(
            roster_data, employee_map
        )
        assert len(suggestions) == 1
        assert suggestions[0]["type"] == "grade_mismatch"

    def test_worked_count_mismatch(self):
        """Flag when 'Worked' column doesn't match D cell count."""
        roster_data = [{
            "pers_no": "MSP001",
            "name": "SMITH,J",
            "grade": "C",
            "contact": "",
            "worked_count": 15,  # Says 15
            "working_days": list(range(10)),  # Actually 10
            "row_number": 5,
        }]

        suggestions = RosterSuggestionService._check_worked_count(roster_data)
        assert len(suggestions) == 1
        assert suggestions[0]["type"] == "worked_count_mismatch"

    def test_psira_expiry_during_period(self):
        """Flag PSIRA expiring during roster period."""
        employee_map = {
            "MSP001": self._make_employee("MSP001", psira_expiry=date(2026, 3, 15))
        }

        suggestions = RosterSuggestionService._check_psira_expiry(
            employee_map, date(2026, 3, 1), date(2026, 3, 30)
        )
        assert len(suggestions) == 1
        assert suggestions[0]["type"] == "psira_expiry"
        assert suggestions[0]["severity"] == "warning"

    def test_psira_already_expired(self):
        """Flag PSIRA already expired before roster period."""
        employee_map = {
            "MSP001": self._make_employee("MSP001", psira_expiry=date(2026, 1, 15))
        }

        suggestions = RosterSuggestionService._check_psira_expiry(
            employee_map, date(2026, 3, 1), date(2026, 3, 30)
        )
        assert len(suggestions) == 1
        assert suggestions[0]["severity"] == "error"

    def test_new_employee_detection(self):
        """Flag employees not found in system."""
        roster_data = [
            {"pers_no": "MSP001", "name": "SMITH,J", "grade": "C", "contact": "", "worked_count": 5, "working_days": [0,1,2,3,4], "row_number": 5},
            {"pers_no": "MSP002", "name": "JONES,K", "grade": "D", "contact": "", "worked_count": 3, "working_days": [0,1,2], "row_number": 6},
        ]
        employee_map = {"MSP001": self._make_employee("MSP001")}  # MSP002 not matched

        suggestions = RosterSuggestionService._check_new_employees(roster_data, employee_map)
        assert len(suggestions) == 1
        assert suggestions[0]["employee"] == "MSP002 JONES,K"

    def test_missing_rest_day(self):
        """Flag 7 consecutive days with no rest day."""
        roster_data = [{
            "pers_no": "MSP001",
            "name": "SMITH,J",
            "grade": "C",
            "contact": "",
            "worked_count": 7,
            "working_days": [0, 1, 2, 3, 4, 5, 6],  # 7 consecutive, no rest
            "row_number": 5,
        }]
        employee_map = {"MSP001": self._make_employee("MSP001")}

        suggestions = RosterSuggestionService._check_rest_days(
            roster_data, employee_map, date(2026, 3, 1)
        )
        assert len(suggestions) == 1
        assert suggestions[0]["type"] == "missing_rest_day"
        assert suggestions[0]["severity"] == "error"

    def test_understaffing_detection(self):
        """Flag days with fewer guards than min_staff."""
        site = MagicMock()
        site.min_staff = 5

        roster_data = [
            {"pers_no": f"MSP{i:03d}", "name": f"GUARD{i},G", "grade": "C", "contact": "", "worked_count": 1, "working_days": [0], "row_number": i}
            for i in range(3)  # Only 3 guards on day 0
        ]

        suggestions = RosterSuggestionService._check_understaffing(
            roster_data, site, date(2026, 3, 1), date(2026, 3, 1)
        )
        assert len(suggestions) == 1
        assert suggestions[0]["type"] == "understaffed"

    def test_full_analysis(self):
        """Test the full analyze() method."""
        roster_data = [{
            "pers_no": "MSP001",
            "name": "SMITH,J",
            "grade": "C",
            "contact": "",
            "worked_count": 10,
            "working_days": list(range(10)),
            "row_number": 5,
        }]
        employee_map = {"MSP001": self._make_employee("MSP001")}
        db = MagicMock()

        suggestions = RosterSuggestionService.analyze(
            roster_data=roster_data,
            employee_map=employee_map,
            start_date=date(2026, 3, 1),
            end_date=date(2026, 3, 30),
            site=None,
            db=db,
            org_id=1,
        )
        # Should have at least consecutive_days warning
        types = [s["type"] for s in suggestions]
        assert "consecutive_days" in types


class TestRosterUploadEndpoints:
    """Integration tests for roster upload API endpoints."""

    pytestmark = pytest.mark.integration

    def test_upload_history(self, client, auth_headers):
        response = client.get("/api/v1/roster-upload/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "uploads" in data

    def test_upload_no_auth(self, client):
        response = client.get("/api/v1/roster-upload/history")
        assert response.status_code in [401, 403]

    def test_preview_no_file(self, client, auth_headers):
        response = client.post("/api/v1/roster-upload/mafoko/preview", headers=auth_headers)
        assert response.status_code == 422  # Missing file

    def test_upload_no_file(self, client, auth_headers):
        response = client.post("/api/v1/roster-upload/mafoko", headers=auth_headers)
        assert response.status_code == 422  # Missing file
