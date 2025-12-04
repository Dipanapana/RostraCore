from app.database import engine
from sqlalchemy import text

def fix_database():
    with engine.connect() as connection:
        try:
            print("Attempting to add assigned_employee_id column...")
            connection.execute(text("ALTER TABLE shifts ADD COLUMN IF NOT EXISTS assigned_employee_id INTEGER REFERENCES employees(employee_id);"))
            connection.commit()
            print("Column added successfully.")
        except Exception as e:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    fix_database()
