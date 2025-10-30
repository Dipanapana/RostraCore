"""Script to create an admin user."""

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.auth.security import get_password_hash

def create_admin():
    """Create default admin user."""
    db = SessionLocal()

    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.username == "admin").first()

        if existing_admin:
            print("❌ Admin user already exists!")
            print(f"   Username: {existing_admin.username}")
            print(f"   Email: {existing_admin.email}")
            return

        # Create admin user
        admin = User(
            username="admin",
            email="admin@rostracore.com",
            hashed_password=get_password_hash("admin123"),  # Change this!
            full_name="System Administrator",
            role=UserRole.ADMIN,
            is_active=True
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("✅ Admin user created successfully!")
        print(f"   Username: {admin.username}")
        print(f"   Email: {admin.email}")
        print(f"   Password: admin123")
        print(f"   Role: {admin.role.value}")
        print("\n⚠️  IMPORTANT: Change the admin password after first login!")

    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Creating admin user...\n")
    create_admin()
