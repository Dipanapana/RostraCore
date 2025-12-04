
import sys
import os

# Add the current directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from app.services.monitoring_service import HealthMonitor
from sqlalchemy import text

print("Testing HealthMonitor...")
try:
    health = HealthMonitor.check_system_health()
    print("Health Status:", health)
except Exception as e:
    print("Error running health check:", e)
    import traceback
    traceback.print_exc()
