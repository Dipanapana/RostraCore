from app.database import engine, Base
from app.models.shift_assignment import ShiftAssignment
# Import other models to ensure they are registered
from app.models.shift import Shift
from app.models.employee import Employee
from app.models.roster import Roster

def init_db():
    print("Creating missing tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

if __name__ == "__main__":
    init_db()
