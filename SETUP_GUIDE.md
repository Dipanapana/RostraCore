# RostraCore v1 - Setup Guide

Complete step-by-step guide to set up the RostraCore algorithmic roster and budget engine.

---

## 📋 Prerequisites

- **Node.js** (v18+ recommended)
- **Python** (v3.9+)
- **PostgreSQL** (v14+)
- **Git**
- **GitHub Account**
- **Code Editor** (VS Code recommended)

---


## 🚀 Step-by-Step Setup

### 1. GitHub Integration & Repository Setup

#### 1.1 Initialize Git Repository
```bash
cd C:\Users\CPS\Documents\dotroster
git init
```

#### 1.2 Create .gitignore
Create a `.gitignore` file with:
```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
build/
dist/
*.egg-info/

# Node
node_modules/
.next/
out/
build/
dist/

# Environment variables
.env
.env.local
.env.production

# Database
*.db
*.sqlite
postgres-data/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/
```

#### 1.3 Create GitHub Repository
```bash
# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/rostracore.git
git branch -M main
git add .
git commit -m "Initial commit: RostraCore v1 project structure"
git push -u origin main
```

---

### 2. Project Structure Setup

#### 2.1 Create Directory Structure
```bash
mkdir backend frontend docs scripts
cd backend
mkdir app app/models app/services app/api app/utils app/algorithms migrations tests
cd ..
```

#### 2.2 Expected Structure
```
dotroster/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Configuration
│   │   ├── database.py          # DB connection
│   │   ├── models/              # SQLAlchemy models
│   │   ├── api/                 # API endpoints
│   │   ├── services/            # Business logic
│   │   ├── algorithms/          # Rostering algorithms
│   │   └── utils/               # Helper functions
│   ├── migrations/              # Database migrations
│   ├── tests/                   # Backend tests
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   └── .env.example
├── docs/
├── scripts/
├── spec.md
├── SETUP_GUIDE.md
└── README.md
```

---

### 3. Backend Setup (Python + FastAPI + PostgreSQL)

#### 3.1 Set Up Python Virtual Environment
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

#### 3.2 Create requirements.txt
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.12.1
pydantic==2.5.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
scipy==1.11.4
numpy==1.26.2
pulp==2.7.0
reportlab==4.0.7
pandas==2.1.3
python-dotenv==1.0.0
pytest==7.4.3
httpx==0.25.2
```

#### 3.3 Install Dependencies
```bash
pip install -r requirements.txt
```

#### 3.4 PostgreSQL Database Setup

**Option A: Local PostgreSQL**
1. Install PostgreSQL from https://www.postgresql.org/download/
2. Create database:
```bash
psql -U postgres
CREATE DATABASE rostracore;
CREATE USER rostracore_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rostracore TO rostracore_user;
\q
```

**Option B: Docker (Recommended)**
```bash
# Create docker-compose.yml in backend/
```

Create `backend/docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    container_name: rostracore_db
    environment:
      POSTGRES_DB: rostracore
      POSTGRES_USER: rostracore_user
      POSTGRES_PASSWORD: your_secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Start PostgreSQL:
```bash
docker-compose up -d
```

#### 3.5 Configure Environment Variables

Create `backend/.env`:
```env
# Database
DATABASE_URL=postgresql://rostracore_user:your_secure_password@localhost:5432/rostracore

# API
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# Security
SECRET_KEY=your-secret-key-here-generate-with-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Rostering Constraints
MAX_HOURS_WEEK=48
MIN_REST_HOURS=8
OT_MULTIPLIER=1.5
MAX_DISTANCE_KM=50

# Frontend
FRONTEND_URL=http://localhost:3000
```

Create `backend/.env.example` (same as above but with placeholder values)

---

### 4. Database Schema & Migrations

#### 4.1 Initialize Alembic
```bash
cd backend
alembic init migrations
```

#### 4.2 Configure Alembic
Edit `backend/alembic.ini`:
```ini
# Change this line:
sqlalchemy.url = postgresql://rostracore_user:your_secure_password@localhost:5432/rostracore
```

Or better, in `backend/migrations/env.py`, load from .env:
```python
from app.config import settings
config.set_main_option('sqlalchemy.url', settings.DATABASE_URL)
```

#### 4.3 Create Initial Migration
```bash
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

---

### 5. Backend Application Setup

#### 5.1 Create Basic FastAPI App

Create `backend/app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(
    title="RostraCore API",
    description="Algorithmic Roster & Budget Engine",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "RostraCore API v1.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

#### 5.2 Test Backend
```bash
cd backend
uvicorn app.main:app --reload
```

Visit: http://localhost:8000/docs (Swagger UI)

---

### 6. Frontend Setup (Next.js + React)

#### 6.1 Create Next.js App
```bash
cd ..
npx create-next-app@latest frontend
# Select:
# - TypeScript: Yes
# - ESLint: Yes
# - Tailwind CSS: Yes
# - src/ directory: Yes
# - App Router: Yes
# - Turbopack: No
# - import alias: Yes (@/*)
```

#### 6.2 Install Additional Dependencies
```bash
cd frontend
npm install axios @tanstack/react-query date-fns recharts react-hook-form zod
npm install -D @types/node
```

#### 6.3 Configure Environment Variables

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### 6.4 Test Frontend
```bash
npm run dev
```

Visit: http://localhost:3000

---

### 7. Initialize Git & Push to GitHub

```bash
cd C:\Users\CPS\Documents\dotroster

# Add all files
git add .

# Commit
git commit -m "feat: Initial project setup with backend and frontend structure"

# Push to GitHub
git push -u origin main
```

---

### 8. Development Workflow

#### 8.1 Start Backend
```bash
cd backend
venv\Scripts\activate  # Windows
uvicorn app.main:app --reload
```

#### 8.2 Start Frontend
```bash
cd frontend
npm run dev
```

#### 8.3 Database Migrations (when schema changes)
```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

---

### 9. Verify Setup

✅ **Checklist:**
- [ ] Git repository initialized
- [ ] GitHub remote configured
- [ ] PostgreSQL database running
- [ ] Backend virtual environment created
- [ ] Backend dependencies installed
- [ ] Backend server runs on http://localhost:8000
- [ ] Frontend dependencies installed
- [ ] Frontend runs on http://localhost:3000
- [ ] Environment variables configured
- [ ] Database migrations applied

---

### 10. Next Steps

After setup is complete:

1. **Implement Database Models** (employees, sites, shifts, etc.)
2. **Create API Endpoints** (CRUD for all entities)
3. **Build Rostering Algorithm** (constraint solver + optimizer)
4. **Create Admin Dashboard UI** (React components)
5. **Add Authentication** (JWT-based)
6. **Generate Reports** (PDF export)
7. **Write Tests** (pytest for backend, Jest for frontend)
8. **Deploy** (Docker + Cloud platform)

---

### 📚 Useful Commands

```bash
# Backend
cd backend
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
alembic upgrade head
pytest

# Frontend
cd frontend
npm install
npm run dev
npm run build
npm run lint

# Database
docker-compose up -d        # Start PostgreSQL
docker-compose down         # Stop PostgreSQL
psql -U rostracore_user -d rostracore  # Connect to DB

# Git
git status
git add .
git commit -m "message"
git push
```

---

### 🆘 Troubleshooting

**PostgreSQL Connection Error:**
- Check if PostgreSQL is running: `docker-compose ps`
- Verify credentials in `.env`
- Test connection: `psql -U rostracore_user -d rostracore`

**Port Already in Use:**
- Backend (8000): Change `API_PORT` in `.env`
- Frontend (3000): Run `npm run dev -- -p 3001`

**Module Import Errors:**
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt` again

---

### 📞 Support

- **Documentation:** See `spec.md` for product requirements
- **Issues:** Create GitHub issues for bugs/features
- **Database Schema:** Refer to spec.md Part 1

---

**Ready to build! 🚀**
