# RostraCore v1

**Algorithmic Roster & Budget Engine for Security Guard Management**

RostraCore is a deterministic, AI-free auto-rostering system designed for security companies. It uses constraint logic and optimization algorithms to generate legally compliant, cost-optimized weekly/monthly rosters while enforcing rest periods, certification validity, and client coverage requirements.

---

## Features

- **Auto-Rostering Engine**: Deterministic algorithms (Hungarian Algorithm, ILP) for optimal shift assignments
- **Constraint Enforcement**: Rest periods, weekly hours, certifications, skills matching
- **Budget Optimization**: Minimize costs while meeting all coverage requirements
- **Multi-Site Management**: Handle multiple client locations with different requirements
- **Employee Management**: Track guards, skills, certifications, availability
- **Payroll Integration**: Calculate regular and overtime hours automatically
- **Compliance Tracking**: Monitor certification expiry and legal constraints

---

## Tech Stack

### Backend
- **Python 3.9+** with FastAPI
- **PostgreSQL 14+** for data persistence
- **SQLAlchemy** for ORM
- **Alembic** for database migrations
- **NumPy/SciPy** for optimization algorithms
- **PuLP** for integer linear programming (optional)
- **ReportLab** for PDF reports

### Frontend
- **Next.js 14** with React 18
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Query** for data fetching
- **Recharts** for visualizations

---

## Project Structure

```
dotroster/
├── backend/
│   ├── app/
│   │   ├── models/           # SQLAlchemy models
│   │   ├── api/endpoints/    # FastAPI routes
│   │   ├── services/         # Business logic
│   │   ├── algorithms/       # Rostering algorithms
│   │   ├── utils/            # Helper functions
│   │   ├── config.py         # Configuration
│   │   ├── database.py       # DB connection
│   │   └── main.py           # FastAPI app
│   ├── migrations/           # Alembic migrations
│   ├── tests/                # Backend tests
│   ├── requirements.txt      # Python dependencies
│   ├── docker-compose.yml    # PostgreSQL setup
│   └── alembic.ini           # Migration config
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js app router
│   │   ├── components/       # React components
│   │   ├── services/         # API clients
│   │   └── types/            # TypeScript types
│   ├── public/               # Static assets
│   └── package.json          # Node dependencies
├── docs/                     # Documentation
├── spec.md                   # Product specification
├── SETUP_GUIDE.md            # Detailed setup instructions
└── README.md                 # This file
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL 14+ (or Docker)
- Git

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd dotroster
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Start PostgreSQL (Docker)
docker-compose up -d

# Copy environment file
cp .env.example .env
# Edit .env with your settings

# Run migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload
```

Backend will run at: http://localhost:8000

API docs at: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local if needed

# Start development server
npm run dev
```

Frontend will run at: http://localhost:3000

---

## Database Schema

### Core Tables

- **employees**: Guards/staff with roles, rates, certifications
- **sites**: Client locations with requirements
- **shifts**: Planned work periods with assignments
- **availability**: Employee availability windows
- **certifications**: Training & licenses with expiry tracking
- **expenses**: Variable costs (fuel, meals, etc.)
- **attendance**: Clock-in/out records
- **payroll_summary**: Weekly/monthly payroll totals

### Helper Tables

- **rules_config**: Global rostering constraints
- **shift_templates**: Reusable shift patterns
- **skills_matrix**: Employee skill mappings

See `spec.md` for detailed schema.

---

## Rostering Algorithm

The auto-rostering engine uses a **deterministic algorithmic approach**:

1. **Constraint Definition**: Define shifts and employee constraints
2. **Feasible Pair Generation**: List all valid (employee, shift) combinations
3. **Optimization**: Use Hungarian Algorithm or ILP to minimize cost
4. **Validation**: Ensure all constraints are satisfied
5. **Output**: Generate roster with assignments and budget summary

### Constraints Enforced

- Skill matching (armed/unarmed/supervisor)
- Certification validity (not expired)
- Availability windows
- Weekly hour limits (default 48h)
- Minimum rest periods (default 8h)
- Maximum distance from home (optional)
- Budget caps (optional)

---

## API Endpoints

### Employees
- `GET /api/v1/employees` - List all employees
- `POST /api/v1/employees` - Create employee
- `GET /api/v1/employees/{id}` - Get employee details
- `PUT /api/v1/employees/{id}` - Update employee
- `DELETE /api/v1/employees/{id}` - Delete employee

### Sites
- `GET /api/v1/sites` - List all sites
- `POST /api/v1/sites` - Create site
- (Similar CRUD operations)

### Shifts
- `GET /api/v1/shifts` - List shifts (with filters)
- `POST /api/v1/shifts` - Create shift
- (Similar CRUD operations)

### Roster Generation
- `POST /api/v1/roster/generate` - Generate optimized roster
- `GET /api/v1/roster/preview` - Preview roster
- `POST /api/v1/roster/confirm` - Confirm roster
- `GET /api/v1/roster/budget-summary` - Get budget breakdown
- `GET /api/v1/roster/unfilled-shifts` - Get unfilled shifts
- `GET /api/v1/roster/employee-hours` - Get hours per employee

See http://localhost:8000/docs for full API documentation.

---

## Development Workflow

### Running Backend
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

### Running Frontend
```bash
cd frontend
npm run dev
```

### Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Running Tests
```bash
cd backend
pytest
```

---

## Configuration

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/rostracore
SECRET_KEY=your-secret-key
MAX_HOURS_WEEK=48
MIN_REST_HOURS=8
OT_MULTIPLIER=1.5
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Deployment

### Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run migrations: `alembic upgrade head`
4. Start backend: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
5. Build frontend: `npm run build`
6. Start frontend: `npm start`

---

## Roadmap

### MVP (Current)
- [x] Database models
- [x] API endpoints structure
- [x] Basic rostering algorithm
- [x] Frontend scaffolding
- [ ] Complete CRUD operations
- [ ] Full algorithm implementation
- [ ] Admin dashboard UI
- [ ] PDF report generation

### Future Features
- Predictive demand modeling
- Mobile app for clock-in/out
- Client portal for live visibility
- Advanced analytics & reporting
- Multi-company support
- Dynamic pricing

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

This project is proprietary. All rights reserved.

---

## Support

For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)

For product specification, see [spec.md](./spec.md)

---

**Built with no AI - Pure algorithmic optimization**
