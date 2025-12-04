from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()

users = db.query(User).all()
print(f"Found {len(users)} users:")
for user in users:
    print(f"  - Email: {user.email}, Role: {user.role}")

db.close()
