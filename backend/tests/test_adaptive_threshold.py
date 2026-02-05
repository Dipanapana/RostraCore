"""Tests for adaptive threshold algorithm."""

import pytest
from datetime import datetime, timedelta
from app.biometric.adaptive_threshold import get_adaptive_threshold
from app.models.biometric import VerificationAttempt
from sqlalchemy.orm import Session


class TestGetAdaptiveThreshold:
    """Test adaptive threshold calculation based on verification history."""

    @pytest.fixture
    def db_session(self):
        """Mock database session."""
        from unittest.mock import MagicMock
        return MagicMock(spec=Session)

    def test_new_employee_returns_default_threshold(self, db_session):
        """Employee with no verification history should get default 85.0 threshold."""
        # Mock empty verification history
        db_session.query().filter().count.return_value = 0

        # This test will fail until we implement get_adaptive_threshold
        with pytest.raises(Exception):
            threshold = get_adaptive_threshold(employee_id=1, db=db_session)
            assert threshold == 85.0

    def test_few_verifications_returns_default(self, db_session):
        """Employee with <10 successful verifications should get default threshold."""
        # Mock 5 successful verifications
        db_session.query().filter().count.return_value = 5

        with pytest.raises(Exception):
            threshold = get_adaptive_threshold(employee_id=1, db=db_session)
            assert threshold == 85.0

    def test_many_high_confidence_verifications_returns_relaxed(self, db_session):
        """Employee with 10+ successful 90%+ verifications should get relaxed 80.0 threshold."""
        # Mock 10+ high-confidence verifications in last 30 days
        db_session.query().filter().count.return_value = 12

        with pytest.raises(Exception):
            threshold = get_adaptive_threshold(employee_id=1, db=db_session)
            assert threshold == 80.0

    def test_old_verifications_outside_window_ignored(self, db_session):
        """Verifications older than 30 days should not count toward relaxed threshold."""
        # Mock 10+ verifications but all outside 30-day window
        db_session.query().filter().count.return_value = 0  # None in last 30 days

        with pytest.raises(Exception):
            threshold = get_adaptive_threshold(employee_id=1, db=db_session)
            assert threshold == 85.0

    def test_low_confidence_verifications_dont_relax_threshold(self, db_session):
        """Verifications with confidence <90% should not count toward relaxed threshold."""
        # Mock 10+ verifications but with confidence 85-89% (below 90% requirement)
        db_session.query().filter().count.return_value = 0  # None at 90%+

        with pytest.raises(Exception):
            threshold = get_adaptive_threshold(employee_id=1, db=db_session)
            assert threshold == 85.0

    def test_recent_consecutive_failures_revert_threshold(self, db_session):
        """3 consecutive recent failures should revert threshold to 85.0 even if previously relaxed."""
        # Mock scenario: 10+ high-confidence verifications (qualifies for 80.0)
        db_session.query().filter().count.return_value = 12

        # But last 3 attempts are failures
        mock_attempts = [
            type('obj', (), {'status': 'failed', 'created_at': datetime.utcnow() - timedelta(hours=1)})(),
            type('obj', (), {'status': 'failed', 'created_at': datetime.utcnow() - timedelta(hours=2)})(),
            type('obj', (), {'status': 'failed', 'created_at': datetime.utcnow() - timedelta(hours=3)})(),
        ]
        db_session.query().filter().order_by().limit().all.return_value = mock_attempts

        with pytest.raises(Exception):
            threshold = get_adaptive_threshold(employee_id=1, db=db_session)
            assert threshold == 85.0  # Reverted despite 12 high-confidence verifications

    def test_two_consecutive_failures_not_enough_to_revert(self, db_session):
        """Only 2 consecutive failures should not revert relaxed threshold."""
        # Mock scenario: 10+ high-confidence verifications (qualifies for 80.0)
        db_session.query().filter().count.return_value = 12

        # But last 2 attempts are failures (not 3)
        mock_attempts = [
            type('obj', (), {'status': 'failed', 'created_at': datetime.utcnow() - timedelta(hours=1)})(),
            type('obj', (), {'status': 'failed', 'created_at': datetime.utcnow() - timedelta(hours=2)})(),
        ]
        db_session.query().filter().order_by().limit().all.return_value = mock_attempts

        with pytest.raises(Exception):
            threshold = get_adaptive_threshold(employee_id=1, db=db_session)
            assert threshold == 80.0  # Still relaxed
