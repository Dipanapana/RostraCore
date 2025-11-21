# GuardianOS API Documentation

**Base URL**: `http://localhost:8000` (Development) | `https://yourdomain.com` (Production)
**API Version**: v1
**Prefix**: `/api/v1`

## Table of Contents
1. [Authentication](#authentication)
2. [Organizations](#organizations)
3. [Employees](#employees)
4. [Clients & Sites](#clients--sites)
5. [Shifts & Roster](#shifts--roster)
6. [Payroll](#payroll)
7. [Invoices](#invoices)
8. [Reports](#reports)
9. [SuperAdmin](#superadmin)
10. [Error Handling](#error-handling)

---

## Authentication

### Login
```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=admin&password=SecurePassword123!
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": 1,
  "username": "admin",
  "email": "admin@company.com",
  "role": "admin",
  "org_id": 13
}
```

### Using JWT Token
All authenticated endpoints require the JWT token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Organizations

### Register New Organization
```http
POST /api/v1/organizations/register
Content-Type: application/json

{
  "org_code": "ACME001",
  "company_name": "ACME Security Services",
  "psira_company_registration": "PSR789456",
  "billing_email": "billing@acme.co.za",
  "subscription_tier": "professional",
  "admin_username": "admin",
  "admin_email": "admin@acme.co.za",
  "admin_password": "SecurePassword123!",
  "admin_full_name": "John Smith"
}
```

**Response**:
```json
{
  "org_id": 14,
  "message": "Organization registered successfully. Pending approval.",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Organization Details
```http
GET /api/v1/organizations/me
Authorization: Bearer {token}
```

---

## Employees

### List Employees
```http
GET /api/v1/employees?skip=0&limit=50
Authorization: Bearer {token}
```

**Response**:
```json
[
  {
    "employee_id": 1,
    "first_name": "Sipho",
    "last_name": "Dlamini",
    "email": "sipho.dlamini@company.com",
    "phone": "+27810001001",
    "psira_grade": "A",
    "hourly_rate": 85.00,
    "role": "armed",
    "status": "active",
    "org_id": 13
  }
]
```

### Create Employee
```http
POST /api/v1/employees
Authorization: Bearer {token}
Content-Type: application/json

{
  "first_name": "Thabo",
  "last_name": "Mbeki",
  "id_number": "8901015800083",
  "email": "thabo.mbeki@company.com",
  "phone": "+27810002002",
  "psira_grade": "B",
  "hourly_rate": 75.00,
  "role": "unarmed",
  "address": "123 Main St, Johannesburg",
  "province": "Gauteng"
}
```

### Get Employee Details
```http
GET /api/v1/employees/{employee_id}
Authorization: Bearer {token}
```

### Update Employee
```http
PUT /api/v1/employees/{employee_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "hourly_rate": 90.00,
  "status": "active"
}
```

---

## Clients & Sites

### List Clients
```http
GET /api/v1/clients?skip=0&limit=50
Authorization: Bearer {token}
```

**Response**:
```json
[
  {
    "client_id": 1,
    "client_name": "City of Johannesburg - Parks Department",
    "contact_person": "Sarah Johnson",
    "contact_email": "sarah.johnson@joburg.org.za",
    "billing_rate": 120.00,
    "status": "active",
    "org_id": 13
  }
]
```

### Create Client
```http
POST /api/v1/clients
Authorization: Bearer {token}
Content-Type: application/json

{
  "client_name": "Ekurhuleni Metro",
  "contact_person": "David Mokhele",
  "contact_email": "david@ekurhuleni.gov.za",
  "contact_phone": "+27119990000",
  "billing_rate": 130.00,
  "address": "1 Germiston Road, Germiston"
}
```

### List Sites
```http
GET /api/v1/sites?client_id=1
Authorization: Bearer {token}
```

**Response**:
```json
[
  {
    "site_id": 1,
    "client_id": 1,
    "site_name": "Zoo Lake Entrance Gate",
    "address": "Zoo Lake, Jan Smuts Avenue, Johannesburg",
    "city": "Johannesburg",
    "province": "Gauteng",
    "shift_pattern": "12hr",
    "required_skill": "unarmed",
    "billing_rate": 120.00,
    "min_staff": 2,
    "org_id": 13
  }
]
```

### Create Site
```http
POST /api/v1/sites
Authorization: Bearer {token}
Content-Type: application/json

{
  "client_id": 1,
  "site_name": "Botanical Gardens Gate",
  "address": "Botanical Ave, Johannesburg",
  "city": "Johannesburg",
  "province": "Gauteng",
  "shift_pattern": "12hr",
  "required_skill": "unarmed",
  "billing_rate": 115.00,
  "min_staff": 1
}
```

---

## Shifts & Roster

### List Shifts
```http
GET /api/v1/shifts?site_id=1&status=planned&start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer {token}
```

**Response**:
```json
[
  {
    "shift_id": 1,
    "site_id": 1,
    "start_time": "2025-01-17T06:00:00",
    "end_time": "2025-01-17T18:00:00",
    "required_staff": 2,
    "required_skill": "unarmed",
    "status": "planned",
    "org_id": 13
  }
]
```

### Create Shift
```http
POST /api/v1/shifts
Authorization: Bearer {token}
Content-Type: application/json

{
  "site_id": 1,
  "start_time": "2025-01-20T06:00:00",
  "end_time": "2025-01-20T18:00:00",
  "required_staff": 2,
  "required_skill": "unarmed",
  "notes": "Day shift"
}
```

### Assign Guard to Shift
```http
POST /api/v1/shifts/{shift_id}/assign/{employee_id}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "assignment_id": 1,
  "shift_id": 1,
  "employee_id": 1,
  "status": "pending",
  "regular_hours": 12.0,
  "overtime_hours": 0.0,
  "regular_pay": 1020.00,
  "night_premium": 0.00,
  "weekend_premium": 0.00,
  "travel_reimbursement": 40.00,
  "total_cost": 1060.00
}
```

### Confirm Shift Assignment
```http
POST /api/v1/shifts/{shift_id}/assignments/{assignment_id}/confirm
Authorization: Bearer {token}
```

### Generate Roster
```http
POST /api/v1/roster/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "start_date": "2025-01-20",
  "end_date": "2025-01-26",
  "site_ids": [1, 2, 3],
  "algorithm": "auto"
}
```

**Response**:
```json
{
  "roster_id": 1,
  "status": "success",
  "assignments_count": 84,
  "fill_rate": 95.2,
  "total_cost": 71400.00,
  "message": "Roster generated successfully"
}
```

---

## Payroll

### Generate Payroll for Employee
```http
POST /api/v1/payroll/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "employee_id": 1,
  "period_start": "2025-01-01",
  "period_end": "2025-01-31"
}
```

**Response**:
```json
{
  "payroll_id": 1,
  "employee_id": 1,
  "period_start": "2025-01-01",
  "period_end": "2025-01-31",
  "total_hours": 168.0,
  "regular_hours": 160.0,
  "overtime_hours": 8.0,
  "regular_pay": 13600.00,
  "overtime_pay": 1020.00,
  "night_premium": 680.00,
  "weekend_premium": 1020.00,
  "travel_reimbursement": 560.00,
  "gross_pay": 16880.00,
  "expenses_total": 560.00,
  "net_pay": 16880.00,
  "shift_count": 14
}
```

### Get Current Period Payroll Summary
```http
GET /api/v1/payroll/current-period
Authorization: Bearer {token}
```

**Response**:
```json
{
  "period_start": "2025-01-01",
  "period_end": "2025-01-31",
  "employee_count": 10,
  "total_hours": 1680.0,
  "total_gross_pay": 142800.00,
  "total_expenses": 5600.00,
  "total_net_pay": 142800.00
}
```

---

## Invoices

### List Invoices
```http
GET /api/v1/invoices?client_id=1&status=sent&skip=0&limit=50
Authorization: Bearer {token}
```

**Response**:
```json
[
  {
    "invoice_id": 1,
    "client_id": 1,
    "client_name": "City of Johannesburg - Parks Department",
    "invoice_number": "INV-13-1-20250117-001",
    "invoice_date": "2025-01-17",
    "period_start": "2025-01-01",
    "period_end": "2025-01-31",
    "due_date": "2025-02-15",
    "total_hours": 336.0,
    "total_shifts": 56,
    "subtotal": 40320.00,
    "tax_amount": 6048.00,
    "total_amount": 46368.00,
    "status": "sent",
    "paid_date": null,
    "created_at": "2025-01-17T10:30:00"
  }
]
```

### Get Invoice Details
```http
GET /api/v1/invoices/{invoice_id}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "invoice_id": 1,
  "client_name": "City of Johannesburg",
  "invoice_number": "INV-13-1-20250117-001",
  "total_amount": 46368.00,
  "status": "sent",
  "line_items": [
    {
      "line_item_id": 1,
      "site_id": 1,
      "site_name": "Zoo Lake Entrance Gate",
      "description": "Security services at Zoo Lake Entrance Gate",
      "hours": 168.0,
      "shifts": 28,
      "rate_per_hour": 120.00,
      "amount": 20160.00
    },
    {
      "line_item_id": 2,
      "site_id": 2,
      "site_name": "Emmarentia Dam Security Post",
      "description": "Security services at Emmarentia Dam Security Post",
      "hours": 168.0,
      "shifts": 28,
      "rate_per_hour": 120.00,
      "amount": 20160.00
    }
  ]
}
```

### Generate Invoice
```http
POST /api/v1/invoices/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "client_id": 1,
  "period_start": "2025-01-01",
  "period_end": "2025-01-31",
  "due_date": "2025-02-15",
  "notes": "January 2025 security services"
}
```

**Response**: Same as Get Invoice Details

### Update Invoice Status
```http
PATCH /api/v1/invoices/{invoice_id}/status?new_status=paid&payment_reference=PAY123456
Authorization: Bearer {token}
```

**Response**:
```json
{
  "message": "Invoice status updated to paid",
  "invoice_id": 1
}
```

**Valid Statuses**: `draft`, `sent`, `paid`, `overdue`, `cancelled`

### Get Invoice Summary
```http
GET /api/v1/invoices/stats/summary?period_start=2025-01-01&period_end=2025-01-31
Authorization: Bearer {token}
```

**Response**:
```json
{
  "period_start": "2025-01-01",
  "period_end": "2025-01-31",
  "total_invoices": 5,
  "total_amount": 231840.00,
  "by_status": {
    "draft": {"count": 1, "amount": 46368.00},
    "sent": {"count": 2, "amount": 92736.00},
    "paid": {"count": 2, "amount": 92736.00},
    "overdue": {"count": 0, "amount": 0.00}
  },
  "outstanding": 92736.00,
  "revenue": 92736.00
}
```

---

## Reports

### Profitability Report
```http
GET /api/v1/reports/profitability?period_start=2025-01-01&period_end=2025-01-31
Authorization: Bearer {token}
```

**Response**:
```json
{
  "period_start": "2025-01-01",
  "period_end": "2025-01-31",
  "total_revenue": 231840.00,
  "total_costs": 162888.00,
  "gross_profit": 68952.00,
  "profit_margin": 29.74
}
```

### Site Performance Report
```http
GET /api/v1/reports/site-performance?period_start=2025-01-01&period_end=2025-01-31
Authorization: Bearer {token}
```

**Response**:
```json
[
  {
    "site_id": 1,
    "site_name": "Zoo Lake Entrance Gate",
    "client_name": "City of Johannesburg",
    "shifts_count": 28,
    "hours_worked": 336.0,
    "revenue": 40320.00,
    "cost": 28560.00,
    "profit": 11760.00,
    "margin": 29.17
  }
]
```

### Employee Payroll Report
```http
GET /api/v1/reports/employee-payroll?period_start=2025-01-01&period_end=2025-01-31
Authorization: Bearer {token}
```

**Response**:
```json
[
  {
    "employee_id": 1,
    "employee_name": "Sipho Dlamini",
    "total_hours": 168.0,
    "regular_hours": 160.0,
    "overtime_hours": 8.0,
    "gross_pay": 16880.00,
    "shifts_worked": 14
  }
]
```

### Revenue vs Cost Comparison
```http
GET /api/v1/reports/revenue-vs-cost?period_start=2025-01-01&period_end=2025-01-31&group_by=month
Authorization: Bearer {token}
```

**Query Parameters**:
- `group_by`: `month`, `week`, or `client`

**Response** (grouped by month):
```json
{
  "group_by": "month",
  "period_start": "2025-01-01",
  "period_end": "2025-01-31",
  "data": [
    {
      "period": "2025-01",
      "revenue": 231840.00,
      "cost": 162888.00,
      "profit": 68952.00,
      "margin": 29.74
    }
  ]
}
```

**Response** (grouped by client):
```json
{
  "group_by": "client",
  "data": [
    {
      "group": "City of Johannesburg",
      "revenue": 151200.00,
      "cost": 106920.00,
      "profit": 44280.00,
      "margin": 29.29
    },
    {
      "group": "Ekurhuleni Metro",
      "revenue": 80640.00,
      "cost": 55968.00,
      "profit": 24672.00,
      "margin": 30.60
    }
  ]
}
```

### Outstanding Invoices Report
```http
GET /api/v1/reports/outstanding-invoices
Authorization: Bearer {token}
```

**Response**:
```json
{
  "total_outstanding": 92736.00,
  "clients_count": 2,
  "total_invoices": 3,
  "clients": [
    {
      "client_id": 1,
      "client_name": "City of Johannesburg",
      "total_outstanding": 46368.00,
      "invoices_count": 2,
      "oldest_invoice_date": "2025-01-01",
      "invoices": [
        {
          "invoice_id": 1,
          "invoice_number": "INV-13-1-20250117-001",
          "invoice_date": "2025-01-17",
          "due_date": "2025-02-15",
          "amount": 46368.00,
          "status": "sent",
          "days_overdue": 0
        }
      ]
    }
  ]
}
```

---

## SuperAdmin

### SuperAdmin Login
```http
POST /api/v1/superadmin/login
Content-Type: application/x-www-form-urlencoded

username=superadmin&password=SuperSecurePassword123!
```

### Register SuperAdmin (Requires Secret Token)
```http
POST /api/v1/superadmin/register
Content-Type: application/json
X-SuperAdmin-Token: YOUR_SECRET_TOKEN

{
  "username": "superadmin",
  "email": "admin@guardianos.co.za",
  "password": "SuperSecurePassword123!",
  "full_name": "System Administrator"
}
```

### Platform Analytics
```http
GET /api/v1/superadmin/analytics/platform-overview
Authorization: Bearer {superadmin_token}
```

**Response**:
```json
{
  "total_organizations": 25,
  "active_organizations": 22,
  "trial_organizations": 8,
  "total_users": 342,
  "total_employees": 1580,
  "total_mrr": 71100.00,
  "arr": 853200.00,
  "organizations_by_tier": {
    "starter": 12,
    "professional": 8,
    "enterprise": 2
  },
  "organizations_by_status": {
    "trial": 8,
    "active": 14,
    "cancelled": 3
  }
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "detail": "Error message here"
}
```

### HTTP Status Codes
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

### Authentication Errors
```json
{
  "detail": "Could not validate credentials"
}
```

### Validation Errors
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

---

## Pagination

Most list endpoints support pagination:

**Query Parameters**:
- `skip`: Number of items to skip (default: 0)
- `limit`: Number of items to return (default: 50, max: 100)

**Example**:
```http
GET /api/v1/employees?skip=0&limit=20
```

---

## Rate Limiting

- **60 requests per minute** per IP address
- **1000 requests per hour** per IP address

Exceeded limits return `429 Too Many Requests`.

---

## Interactive API Documentation

Visit the following URLs for interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

**Last Updated**: 2025-01-17
**API Version**: 1.0.0
