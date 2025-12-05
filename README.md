# RostraCore

**Multi-Tenant Security Guard Management SaaS Platform**

RostraCore is a comprehensive security guard management platform designed for South African security companies. It features AI-powered roster optimization with CP-SAT algorithms, BCEA labor law compliance, PSIRA certification tracking, and integrated payroll with SA tax calculations.

---

## Features

### Core Functionality
- **Multi-Tenant Architecture**: Isolated data per organization with role-based access
- **Employee Management**: Track guards, PSIRA certifications, availability, leave
- **Client & Site Management**: Municipality clients with multiple guard posts
- **AI-Powered Roster Generation**: CP-SAT optimization for optimal shift assignments
- **Payroll Processing**: SA tax calculations (PAYE, UIF) with payslip generation

### Compliance
- **BCEA Compliant**: 48h/week limits, 8h rest between shifts
- **PSIRA Grade Matching**: A, B, C, D, E grade hierarchy enforcement
- **POPIA Ready**: Data protection compliance for South Africa

### Premium Calculations
- Night shift premium (18:00-06:00)
- Weekend rates (Saturday 1.5x, Sunday 2x)
- Public holiday rates (2x)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.0 |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Database | PostgreSQL 14+ with Alembic migrations |
| Optimization | Google OR-Tools CP-SAT solver |
| Auth | JWT with httpOnly cookies, refresh tokens |
| Deployment | Railway.app (backend), Vercel (frontend) |

---

## Project Structure

```
RostraCore/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/    # FastAPI routes
│   │   ├── models/           # SQLAlchemy models
│   │   ├── services/         # Business logic
│   │   ├── algorithms/       # CP-SAT roster optimization
│   │   └── utils/            # Helpers (auth, pagination)
│   ├── migrations/           # Alembic migrations
│   └── tests/                # pytest tests
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # React components
│   │   ├── services/         # API client
│   │   └── types/            # TypeScript types
├── docs/
│   ├── user-guide/           # End-user documentation
│   ├── admin-guide/          # Administrator docs
│   ├── developer/            # API & architecture docs
│   ├── deployment/           # Deployment guides
│   └── compliance/           # BCEA, POPIA, PSIRA docs
├── .claude/
│   └── commands/             # Claude Code agents
├── railway.json              # Railway deployment config
├── vercel.json               # Vercel deployment config
└── .mcp.json                 # MCP server configuration
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 14+

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # Edit with your settings
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local     # Edit with your settings
npm run dev
```

### Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

---

## Documentation

### User Guides
- [Getting Started](docs/user-guide/getting-started.md)
- [Employee Management](docs/user-guide/employee-management.md)
- [Roster Generation](docs/user-guide/roster-generation.md)
- [Payroll](docs/user-guide/payroll.md)

### Developer Docs
- [API Documentation](docs/developer/API_DOCUMENTATION.md)
- [Algorithm Documentation](docs/developer/ALGORITHM_DOCUMENTATION.md)

### Deployment
- [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md)
- [PayFast Integration](docs/deployment/PAYFAST_INTEGRATION_GUIDE.md)

---

## Claude Code Agents

Custom agents are available in `.claude/commands/`:

| Agent | Description |
|-------|-------------|
| `/backend-dev` | FastAPI backend development context |
| `/frontend-dev` | Next.js frontend development context |
| `/testing` | Testing and QA guidance |
| `/debugger` | Debugging and troubleshooting |
| `/devops` | Deployment and infrastructure |

---

## Deployment

### Railway (Backend)
```bash
railway login
railway init
railway up
```

### Vercel (Frontend)
```bash
vercel login
vercel --prod
```

See [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## Environment Variables

### Backend
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/rostracore_db
SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:3000
```

### Frontend
```env
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_APP_NAME=RostraCore
```

---

## API Highlights

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/login` | Authenticate user |
| `GET /api/v1/employees` | List employees |
| `POST /api/v1/roster/generate` | Generate optimized roster |
| `GET /api/v1/payroll` | Get payroll records |

Full API documentation at `/docs` when backend is running.

---

## License

Proprietary - All rights reserved.

---

## Support

- Documentation: See `docs/` folder
- Issues: Contact your administrator

**Built for South African security companies**
