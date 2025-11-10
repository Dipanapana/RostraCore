# RostraCore Backend

FastAPI backend for RostraCore - Algorithmic Roster & Budget Engine for Security Guards.

## Quick Start

### Windows

1. **Open Command Prompt or PowerShell**
2. **Navigate to the backend directory:**
   ```cmd
   cd backend
   ```

3. **Run the startup script:**
   ```cmd
   run_server.bat
   ```

### Linux/Mac

1. **Open Terminal**
2. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

3. **Run the startup script:**
   ```bash
   ./run_server.sh
   ```

### Manual Method (All Platforms)

If the scripts don't work, you can start the server manually:

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Activate virtual environment:**
   - **Windows:**
     ```cmd
     venv\Scripts\activate
     ```
   - **Linux/Mac:**
     ```bash
     source venv/bin/activate
     ```

3. **Start uvicorn server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## Accessing the Server

Once running, the server will be available at:

- **API Base URL:** http://localhost:8000
- **Interactive API Docs (Swagger):** http://localhost:8000/docs
- **Alternative API Docs (ReDoc):** http://localhost:8000/redoc

## Common Issues

### Issue: `ModuleNotFoundError: No module named 'app'`

**Solution:** Make sure you're running uvicorn from the `backend` directory (not the root RostraCore directory).

```bash
# WRONG - Running from root directory
cd RostraCore
uvicorn app.main:app

# CORRECT - Running from backend directory
cd RostraCore/backend
uvicorn app.main:app --reload
```

### Issue: `No module named 'fastapi'` or similar import errors

**Solution:** Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

### Issue: Database connection errors

**Solution:** Make sure PostgreSQL is running and the DATABASE_URL in `.env` is correct:

```bash
# Check if PostgreSQL is running (Windows)
tasklist | findstr postgres

# Check if PostgreSQL is running (Linux/Mac)
ps aux | grep postgres

# Test database connection
psql -U postgres -d rostracore_db -c "SELECT version();"
```

### Issue: `ALLOWED_ORIGINS` parsing error

**Solution:** Make sure your `.env` file has the correct format:

```env
# Single origin
ALLOWED_ORIGINS=http://localhost:3000

# Multiple origins (comma-separated, no spaces)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## Environment Configuration

Copy `.env.example` to `.env` and update with your configuration:

```bash
cp .env.example .env
```

Key environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key (generate with `openssl rand -hex 32`)
- `FRONTEND_URL` - Frontend application URL
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

## Development

### Running Tests

```bash
pytest tests/ -v
```

### Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Code Formatting

```bash
# Format code with black
black app/

# Sort imports
isort app/
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration settings
│   ├── api/
│   │   └── endpoints/       # API route handlers
│   ├── models/              # SQLAlchemy database models
│   ├── auth/                # Authentication & authorization
│   ├── services/            # Business logic services
│   ├── algorithms/          # Rostering algorithms
│   ├── tasks/               # Celery background tasks
│   └── utils/               # Utility functions
├── tests/                   # Test files
├── migrations/              # Alembic database migrations
├── requirements.txt         # Python dependencies
├── .env.example            # Example environment variables
├── run_server.bat          # Windows startup script
└── run_server.sh           # Linux/Mac startup script
```

## Tech Stack

- **Framework:** FastAPI 0.104+
- **Database:** PostgreSQL + SQLAlchemy ORM
- **Authentication:** JWT tokens
- **Task Queue:** Celery + Redis
- **Optimization:** PuLP (Linear Programming)
- **Monitoring:** Sentry (optional)
- **Validation:** Pydantic

## Support

For issues and questions:
- Check the main project documentation: `../docs/`
- Review setup guide: `../docs/SETUP_DEPLOYMENT_GUIDE.md`
- Open an issue on GitHub
