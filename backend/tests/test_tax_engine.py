"""
Test suite for TaxEngine - Generic tax calculation engine.

Tests tax calculations for multiple countries using config-driven approach.
Expected to FAIL initially (RED phase) - implementation comes after.
"""

import pytest
from decimal import Decimal
from app.services.country_service import CountryService
from app.services.tax_engine import TaxEngine


class TestSouthAfricaTax:
    """Test SA PAYE calculations - must match existing sa_payroll_service.py output."""

    @pytest.fixture
    def za_config(self):
        return CountryService.load_config("ZA")

    @pytest.fixture
    def za_engine(self, za_config):
        return TaxEngine(za_config)

    def test_below_threshold_no_tax(self, za_engine):
        """R0/month gross should have R0 PAYE."""
        result = za_engine.calculate_net_pay(Decimal("0"), age=35)
        assert result["income_tax"] == Decimal("0")
        assert result["net_pay"] == Decimal("0")

    def test_low_income_below_threshold(self, za_engine):
        """R7,000/month is below threshold (R7,979.17) - no tax."""
        result = za_engine.calculate_net_pay(Decimal("7000"), age=35)
        assert result["income_tax"] == Decimal("0")

    def test_medium_income_paye(self, za_engine):
        """R10,000/month should calculate PAYE correctly."""
        result = za_engine.calculate_net_pay(Decimal("10000"), age=35)
        # Annual: 120,000
        # Tax: (120000 * 0.18) = 21,600 - rebate 17,235 = 4,365/year = 363.75/month
        assert result["income_tax"] == Decimal("363.75")

    def test_higher_income_paye(self, za_engine):
        """R25,000/month should calculate PAYE through multiple brackets."""
        result = za_engine.calculate_net_pay(Decimal("25000"), age=35)
        # Annual: 300,000
        # Tax through brackets:
        # 0-237,100: 42,678
        # 237,101-300,000: (300,000-237,100)*0.26 = 16,354
        # Total: 59,032 - rebate 17,235 = 41,797/year = 3,483.08/month
        assert abs(result["income_tax"] - Decimal("3483.08")) < Decimal("1.00")

    def test_high_income_paye(self, za_engine):
        """R50,000/month should hit higher brackets."""
        result = za_engine.calculate_net_pay(Decimal("50000"), age=35)
        # Annual: 600,000
        # Complex bracket calculation expected
        assert result["income_tax"] > Decimal("10000")  # Sanity check

    def test_very_high_income_top_bracket(self, za_engine):
        """R200,000/month should hit top 45% bracket."""
        result = za_engine.calculate_net_pay(Decimal("200000"), age=35)
        # Annual: 2,400,000 -> top bracket
        assert result["income_tax"] > Decimal("74000")  # Sanity check

    def test_senior_citizen_rebate(self, za_engine):
        """Age 70 should get secondary rebate (primary + secondary)."""
        result = za_engine.calculate_net_pay(Decimal("25000"), age=70)
        # Additional rebate = 9,444/year = 787/month
        # Tax should be lower than age 35
        result_young = za_engine.calculate_net_pay(Decimal("25000"), age=35)
        assert result["income_tax"] < result_young["income_tax"]

    def test_elderly_rebate(self, za_engine):
        """Age 80 should get all three rebates."""
        result = za_engine.calculate_net_pay(Decimal("25000"), age=80)
        # Additional rebate = 9,444 + 3,145 = 12,589/year
        result_senior = za_engine.calculate_net_pay(Decimal("25000"), age=70)
        assert result["income_tax"] < result_senior["income_tax"]

    def test_uif_calculation(self, za_engine):
        """UIF should be 1% of gross, capped at R17,712 earnings."""
        result = za_engine.calculate_net_pay(Decimal("10000"))
        contributions = result.get("social_contributions", [])
        uif = next((c for c in contributions if c["name"] == "UIF"), None)
        assert uif is not None
        assert uif["employee_amount"] == Decimal("100.00")  # 1% of 10,000

    def test_uif_capped(self, za_engine):
        """UIF should cap at R177.12 (1% of R17,712)."""
        result = za_engine.calculate_net_pay(Decimal("20000"))
        contributions = result.get("social_contributions", [])
        uif = next((c for c in contributions if c["name"] == "UIF"), None)
        assert uif["employee_amount"] == Decimal("177.12")  # Capped


class TestUSFederalTax:
    """Test US Federal tax calculations."""

    @pytest.fixture
    def us_config(self):
        return CountryService.load_config("US")

    @pytest.fixture
    def us_engine(self, us_config):
        return TaxEngine(us_config)

    def test_low_income(self, us_engine):
        """$30,000/year should calculate Federal tax correctly."""
        # Monthly: $2,500
        result = us_engine.calculate_net_pay(Decimal("2500"))
        # Annual: 30,000
        # 0-11,600: 10% = 1,160
        # 11,601-30,000: 12% of 18,400 = 2,208
        # Total: 3,368/year = 280.67/month
        assert abs(result["income_tax"] - Decimal("280.67")) < Decimal("5.00")

    def test_fica_social_security(self, us_engine):
        """Social Security should be 6.2% of gross."""
        result = us_engine.calculate_net_pay(Decimal("5000"))
        contributions = result.get("social_contributions", [])
        ss = next((c for c in contributions if "Social Security" in c["name"]), None)
        assert ss is not None
        assert ss["employee_amount"] == Decimal("310.00")  # 6.2% of 5,000

    def test_fica_medicare(self, us_engine):
        """Medicare should be 1.45% of gross."""
        result = us_engine.calculate_net_pay(Decimal("5000"))
        contributions = result.get("social_contributions", [])
        medicare = next((c for c in contributions if c["name"] == "Medicare"), None)
        assert medicare is not None
        assert abs(medicare["employee_amount"] - Decimal("72.50")) < Decimal("0.10")


class TestUKPAYE:
    """Test UK PAYE and National Insurance calculations."""

    @pytest.fixture
    def gb_config(self):
        return CountryService.load_config("GB")

    @pytest.fixture
    def gb_engine(self, gb_config):
        return TaxEngine(gb_config)

    def test_below_personal_allowance(self, gb_engine):
        """£12,570/year (personal allowance) should have zero tax."""
        # Monthly: £1,047.50
        result = gb_engine.calculate_net_pay(Decimal("1047.50"))
        assert result["income_tax"] == Decimal("0")

    def test_basic_rate_tax(self, gb_engine):
        """£30,000/year should pay 20% on amount above allowance."""
        # Monthly: £2,500
        result = gb_engine.calculate_net_pay(Decimal("2500"))
        # Annual: 30,000
        # 0-12,570: £0 (personal allowance)
        # 12,571-30,000: 20% of 17,430 = 3,486/year = 290.50/month
        assert abs(result["income_tax"] - Decimal("290.50")) < Decimal("5.00")

    def test_national_insurance(self, gb_engine):
        """NI should be 12% on earnings above £12,570."""
        result = gb_engine.calculate_net_pay(Decimal("2500"))
        contributions = result.get("social_contributions", [])
        ni = next((c for c in contributions if "National Insurance" in c["name"]), None)
        assert ni is not None
        # Monthly threshold: 12,570/12 = 1,047.50
        # NI: (2,500 - 1,047.50) * 0.12 = 174.30
        assert abs(ni["employee_amount"] - Decimal("174.30")) < Decimal("5.00")


class TestNetPayCalculations:
    """Test end-to-end net pay calculations for multiple countries."""

    def test_za_net_pay(self):
        """Verify ZA net pay = gross - PAYE - UIF."""
        engine = TaxEngine(CountryService.load_config("ZA"))
        result = engine.calculate_net_pay(Decimal("25000"))

        expected_net = Decimal("25000") - result["income_tax"]
        for contrib in result.get("social_contributions", []):
            expected_net -= contrib["employee_amount"]

        assert result["net_pay"] == expected_net

    def test_us_net_pay(self):
        """Verify US net pay = gross - Federal tax - FICA."""
        engine = TaxEngine(CountryService.load_config("US"))
        result = engine.calculate_net_pay(Decimal("5000"))

        expected_net = Decimal("5000") - result["income_tax"]
        for contrib in result.get("social_contributions", []):
            expected_net -= contrib["employee_amount"]

        assert result["net_pay"] == expected_net

    def test_cost_to_company(self):
        """Verify CTC includes employer contributions."""
        engine = TaxEngine(CountryService.load_config("ZA"))
        result = engine.calculate_cost_to_company(Decimal("25000"))

        # CTC = gross + employer UIF (1% of 17,712 capped)
        assert result["ctc"] >= Decimal("25000")
        assert "employer_contributions" in result
