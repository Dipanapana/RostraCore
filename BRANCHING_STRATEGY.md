# RostraCore Branching Strategy

## Overview

RostraCore uses **Git Flow** to maintain two parallel versions:
1. **Production (v1.x)** - Current stable version for existing clients
2. **Development (v2.x)** - Transformation features (Phases 01-15)

## Branch Structure

```
production (frozen at v1.0-stable)     ← Current clients stay here
  └─ hotfix/v1.0.x                     ← Production bug fixes only

develop (transformation)               ← All new transformation work
  └─ feature/phase-XX-*                ← Individual phases/features

main (legacy)                          ← Can be retired or synced with production
```

## Branches

### `production`
- **Purpose**: Production code (v1.x) for current clients
- **Source**: Created from `v1.0-stable` tag
- **Deployments**:
  - Railway: `rostracore-production` project
  - Vercel: Production deployment
- **Updates**: Hotfixes only (critical bugs)
- **Protection**: Requires 2 PR approvals, no force push

### `develop`
- **Purpose**: Transformation development (v2.x)
- **Source**: Created from `main` (includes all transformation work)
- **Deployments**:
  - Railway: `rostracore-dev` project
  - Vercel: Preview deployment
- **Updates**: All Phase 01-15 transformation work
- **Protection**: Requires 1 PR approval

### `main` (legacy)
- **Status**: Can be retired or kept in sync with `production`
- **Recommendation**: Work from `develop` going forward

## Workflows

### New Features (Transformation)

```bash
# Always work from develop branch
git checkout develop
git pull origin develop

# Create feature branch for a phase
git checkout -b feature/phase-01-biometric

# Work on implementation
# ... make changes ...

# Commit and push
git add <files>
git commit -m "feat(01): implement biometric authentication"
git push origin feature/phase-01-biometric

# Create PR: feature/phase-01-biometric → develop
# After approval, merge to develop
```

### Production Hotfixes (Emergency Bugs)

```bash
# Create hotfix from production
git checkout production
git pull origin production
git checkout -b hotfix/v1.0.1-payroll-bug

# Fix the bug (minimal changes only)
# ... make fix ...

# Commit and push
git add <files>
git commit -m "fix(payroll): correct overtime calculation"
git push origin hotfix/v1.0.1-payroll-bug

# Create PR: hotfix/v1.0.1-payroll-bug → production
# After merge, cherry-pick to develop

git checkout develop
git cherry-pick <hotfix-commit-hash>
git push origin develop
```

### Continuing Transformation Work

```bash
# Work from develop branch
git checkout develop
git pull origin develop

# Continue with GSD workflow
/gsd:execute-phase 1  # Continue Phase 01
# ... implement features ...

# Commits happen automatically via GSD
# Push to develop when ready
git push origin develop
```

## Deployment Configuration

### Railway (Backend)

**Production Project:**
- Name: `rostracore-production`
- Branch: `production`
- Environment: Production
- Database: Production PostgreSQL
- Env File: `.env.production`
- Domain: `api.rostracore.com`

**Development Project:**
- Name: `rostracore-dev`
- Branch: `develop`
- Environment: Development
- Database: Development PostgreSQL (separate instance)
- Env File: `.env.development`
- Domain: `api-dev.rostracore.com`

### Vercel (Frontend)

**Production:**
- Production Branch: `production`
- Domain: `app.rostracore.com`
- Environment: `.env.production`
- Auto-deploy: ✅

**Preview/Development:**
- Preview Branch: `develop`
- Domain: Vercel preview URL or `app-dev.rostracore.com`
- Environment: `.env.development`
- Auto-deploy: ✅

## Environment Configuration

### Backend

- `backend/.env.production` - Production settings (v1.0 features)
- `backend/.env.development` - Development settings (v2.0 features)

Configure Railway environment variables per project.

### Frontend

- `frontend/.env.production` - Production API URL and feature flags (v1.0)
- `frontend/.env.development` - Development API URL and feature flags (v2.0)

Configure Vercel environment variables per deployment.

## Release Strategy

### v1.x Releases (Production Hotfixes)

```bash
# After hotfix merged to production
git checkout production
git pull origin production
git tag -a v1.0.1 -m "Hotfix: Payroll calculation bug"
git push origin v1.0.1
```

### v2.0 Release (Transformation Complete)

```bash
# After all 15 phases complete and tested
git checkout production
git merge develop --no-ff -m "Release v2.0: Universal Transformation"
git tag -a v2.0.0 -m "Universal Workforce Management Platform"
git push origin production --tags

# Update Railway/Vercel production to deploy new version
# Communicate with clients about v2.0 upgrade path
```

## Branch Protection Rules

### On GitHub (Settings → Branches)

**For `production` branch:**
- ✅ Require pull request reviews (2 approvals minimum)
- ✅ Require status checks to pass
- ✅ Require conversation resolution
- ✅ Restrict who can push (only maintainers)
- ✅ Do not allow force pushes
- ✅ Do not allow deletions

**For `develop` branch:**
- ✅ Require pull request reviews (1 approval)
- ✅ Require status checks to pass
- ✅ Allow force pushes (for rebasing features)

## Database Management

### Production Database
- Keep current schema (v1.0)
- Apply only hotfix migrations
- Regular backups scheduled

### Development Database
- Start with v1.0 schema dump
- Apply all transformation migrations (Phases 0.2, 01, 02, etc.)
- Separate instance to avoid conflicts

### Migration Path

```bash
# Export production schema (for development database setup)
pg_dump $PROD_DB_URL > prod_v1.0_schema.sql

# Create dev database with production data
psql $DEV_DB_URL < prod_v1.0_schema.sql

# Apply transformation migrations on dev only
cd backend
alembic upgrade head  # On development database only
```

## Current Status

- **Production Branch**: Created from `v1.0-stable` ✅
- **Develop Branch**: Created from `main` with transformation work ✅
- **Environment Files**: Created (`.env.production`, `.env.development`) ✅
- **Railway Setup**: ⏳ Manual setup required
- **Vercel Setup**: ⏳ Manual setup required
- **Branch Protection**: ⏳ Manual setup required on GitHub

## Team Workflow

**Daily Development (90% of work):**
- Always work from `develop` branch
- Continue transformation (Phase 01-15)
- Push to `develop` regularly
- Test on development deployment

**Production Hotfixes (10% of work):**
- Create hotfix branch from `production`
- Fix bug with minimal changes
- PR to `production` (requires 2 approvals)
- Cherry-pick to `develop` to keep in sync

**Releases:**
- v1.x: Tag on `production` for hotfixes
- v2.0: Merge `develop` → `production` when transformation complete (future)

## Next Steps

1. **Railway Setup** (Manual):
   - Create second Railway project: `rostracore-dev`
   - Point production project to `production` branch
   - Point dev project to `develop` branch
   - Configure environment variables per project

2. **Vercel Setup** (Manual):
   - Configure production deployment: `production` branch
   - Configure preview deployment: `develop` branch
   - Set environment variables per deployment

3. **GitHub Setup** (Manual):
   - Settings → Branches → Add protection rules
   - Protect `production` branch (2 approvals, no force push)
   - Protect `develop` branch (1 approval)

4. **Resume Transformation**:
   - Continue Phase 01 execution from `develop` branch
   - All transformation work stays on `develop`
   - Production clients unaffected

---

*Last updated: 2026-02-05 - Branch structure created*
