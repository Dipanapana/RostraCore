import sys
import os

# Add backend directory to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.models.shift import Shift

def test_shift_attributes():
    print("Testing Shift attributes...")
    try:
        print(f"Shift.shift_assignments: {Shift.shift_assignments}")
    except AttributeError as e:
        print(f"Error accessing Shift.shift_assignments: {e}")

    try:
        print(f"Shift.assignments: {Shift.assignments}")
        print("SUCCESS: Shift.assignments exists!")
    except AttributeError as e:
        print(f"FAILURE: Shift.assignments does NOT exist: {e}")

if __name__ == "__main__":
    test_shift_attributes()
