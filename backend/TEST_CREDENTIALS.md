# RostraCore MVP - Test User Credentials

## Development Environment Test Accounts

Created: November 11, 2025
Purpose: MVP Testing & Development

---

## 1. SUPERADMIN ACCOUNT

**Login Credentials:**
```
Username: superadmin
Password: SuperAdmin123!
Email:    superadmin@rostracore.co.za
Role:     SUPERADMIN
```

**Password Hash (bcrypt):**
```
$2b$12$As2zXj.FfkcAwmELdGHZeOQA4q2qeySuyqrTTmwUBlAhaSMz.p4Oa
```

**Capabilities:**
- Approve/reject new organization registrations
- View all pending organizations
- Access superadmin analytics
- Manage system-wide settings
- Not associated with any specific organization

**Test Endpoints:**
- `GET /api/v1/organizations/pending-approval` - View pending orgs
- `POST /api/v1/organizations/{org_id}/approve` - Approve organization
- `POST /api/v1/organizations/{org_id}/reject` - Reject organization

---

## 2. ORGANIZATION ADMIN ACCOUNT

**Login Credentials:**
```
Username: testadmin
Password: TestAdmin123!
Email:    admin@testsecurity.co.za
Role:     COMPANY_ADMIN
```

**Password Hash (bcrypt):**
```
$2b$12$d27M9xa1Wpm9LmraU.jbL.z9Ej3vJJiJL3g5XVVm7sZ3YNN4bEXN6
```

**Associated Organization:**
```
Company Name:  Test Security Company (Pty) Ltd
Org Code:      TEST_SECURITY
PSIRA Number:  PSR-TEST-12345
Status:        Approved (pre-approved for testing)
Subscription:  Trial - Starter Tier
Billing Rate:  R45.00 per guard per month
```

**Capabilities:**
- Manage employees (security guards)
- Create and edit rosters
- Invite new users to the organization
- Manage sites, shifts, and schedules
- View organization-specific analytics

**Test Endpoints:**
- `GET /api/v1/organizations/users` - List organization users
- `POST /api/v1/organizations/users/invite` - Invite new user
- `DELETE /api/v1/organizations/users/{user_id}` - Remove user
- `PATCH /api/v1/organizations/users/{user_id}/role` - Update user role

---

## SQL Commands to Create Users

If users don't exist in database, run these SQL commands:

### Create Superadmin:
```sql
INSERT INTO users (username, email, hashed_password, full_name, role, org_id, is_active, is_email_verified, is_phone_verified, failed_login_attempts, created_at)
VALUES (
    'superadmin',
    'superadmin@rostracore.co.za',
    '$2b$12$As2zXj.FfkcAwmELdGHZeOQA4q2qeySuyqrTTmwUBlAhaSMz.p4Oa',
    'Super Administrator',
    'superadmin',
    NULL,
    TRUE,
    TRUE,
    FALSE,
    0,
    NOW()
);
```

### Create Test Organization:
```sql
INSERT INTO organizations (org_code, company_name, psira_company_registration, subscription_tier, subscription_status, approval_status, billing_email, max_employees, max_sites, max_shifts_per_month, active_guard_count, monthly_rate_per_guard, current_month_cost, is_active, created_at)
VALUES (
    'TEST_SECURITY',
    'Test Security Company (Pty) Ltd',
    'PSR-TEST-12345',
    'starter',
    'trial',
    'approved',
    'billing@testsecurity.co.za',
    30,
    5,
    500,
    0,
    45.00,
    0.00,
    TRUE,
    NOW()
);
```

### Create Organization Admin:
```sql
-- First, get the organization ID
DO $$
DECLARE
    org_id_var INTEGER;
BEGIN
    SELECT org_id INTO org_id_var FROM organizations WHERE org_code = 'TEST_SECURITY';

    -- Create admin user
    INSERT INTO users (username, email, hashed_password, full_name, role, org_id, is_active, is_email_verified, is_phone_verified, failed_login_attempts, created_at)
    VALUES (
        'testadmin',
        'admin@testsecurity.co.za',
        '$2b$12$d27M9xa1Wpm9LmraU.jbL.z9Ej3vJJiJL3g5XVVm7sZ3YNN4bEXN6',
        'Test Admin',
        'company_admin',
        org_id_var,
        TRUE,
        TRUE,
        FALSE,
        0,
        NOW()
    );
END $$;
```

---

## Testing Security Features

### 1. Email Verification
Both accounts are **pre-verified** for testing. In production:
- New users cannot login until email is verified
- Returns HTTP 403: "Please verify your email before logging in"

### 2. Organization Approval
Test organization is **pre-approved** for testing. In production:
- New organizations have status="pending_approval"
- Superadmin must approve before users can fully access system

### 3. Account Lockout
**To test account lockout:**
1. Try logging in with wrong password 5 times
2. Account will be locked for 30 minutes
3. Returns HTTP 423: "Account locked due to too many failed login attempts"

### 4. Rate Limiting
**To test rate limiting:**
1. Send 61 requests within 1 minute to any endpoint
2. 61st request will return HTTP 429: "Rate limit exceeded"
3. Response includes `Retry-After` header

### 5. User Invitation
**To test user invitation:**
1. Login as `testadmin`
2. POST to `/api/v1/organizations/users/invite` with:
```json
{
  "email": "newuser@testsecurity.co.za",
  "full_name": "New User",
  "role": "scheduler",
  "send_email": false
}
```
3. Response will include temporary password
4. New user can login with those credentials

---

## API Testing Examples

### Login (JSON):
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login-json" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "SuperAdmin123!"
  }'
```

### Login (Form Data):
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testadmin&password=TestAdmin123!"
```

### Get Pending Organizations (Superadmin):
```bash
curl -X GET "http://localhost:8000/api/v1/organizations/pending-approval" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

### Invite User (Organization Admin):
```bash
curl -X POST "http://localhost:8000/api/v1/organizations/users/invite" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@testsecurity.co.za",
    "full_name": "New User",
    "role": "scheduler"
  }'
```

---

## Interactive API Documentation

Access the auto-generated Swagger UI at:
```
http://localhost:8000/docs
```

From there you can:
1. Click "Authorize" button
2. Login to get a token
3. Test all endpoints interactively

---

## Notes

- **Security**: These are TEST credentials only. Never use in production!
- **Email**: Both accounts have verified emails for immediate testing
- **Passwords**: Follow strong password requirements (12+ chars, mixed case, numbers, symbols)
- **Development Mode**: Email service logs to console instead of sending emails
- **Database**: All data is stored in `rostracore_db` PostgreSQL database

---

**Ready to Test!** 🚀
