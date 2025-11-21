# Phase 6: Payroll & Billable Hours Tracking - COMPLETE ✓

## Overview
Implemented comprehensive payroll and client billing system with profit/loss tracking, invoice generation, and financial reporting.

## What Was Implemented

### 1. Fixed Critical Payroll Bugs
**File**: `backend/app/api/endpoints/payroll.py`

**Issues Fixed**:
- Line 118: Replaced invalid `Shift.assigned_employee_id` query (removed in Phase 2) with `ShiftAssignment` queries
- Lines 187-188: Removed undefined `commission_deduction` and `commission_notes` variables (marketplace leftovers)
- Refactored to use Phase 2's ShiftAssignment model for accurate cost tracking

**Enhancements**:
- Now aggregates costs from ShiftAssignment records
- Includes breakdown: regular pay, overtime pay, night premium, weekend premium, travel reimbursement
- Properly calculates total hours (regular + overtime)
- Returns detailed pay component breakdown in response

### 2. Client Billing Models
**File**: `backend/app/models/client_invoice.py`

Created two new models:

#### **ClientInvoice**
Tracks invoices sent to clients for billable hours.

**Fields**:
- `invoice_number` - Unique identifier (format: INV-ORGID-CLIENTID-YYYYMMDD-SEQ)
- `period_start/period_end` - Billing period
- `total_hours` - Billable hours to client
- `total_shifts` - Number of shifts billed
- `subtotal` - Before tax
- `tax_amount` - 15% VAT (South African standard)
- `total_amount` - After tax
- `status` - draft, sent, paid, overdue, cancelled
- `paid_date` - Payment tracking
- `payment_reference` - Payment proof

#### **InvoiceLineItem**
Individual line items per site/service.

**Fields**:
- `description` - "Security services at [Site Name]"
- `hours` - Hours worked at this site
- `shifts` - Number of shifts
- `rate_per_hour` - Client billing rate
- `amount` - hours × rate_per_hour

**Database Migration**: `68edf8c1ee2d_add_client_invoice_tables.py`

### 3. Invoice Management Endpoints
**File**: `backend/app/api/endpoints/invoices.py`

#### **GET /api/v1/invoices**
List all invoices with filters (client_id, status, pagination)

#### **GET /api/v1/invoices/{invoice_id}**
Get detailed invoice with line items and site breakdown

#### **POST /api/v1/invoices/generate**
Auto-generate invoice for a client/period:
1. Fetches all confirmed shift assignments
2. Groups by site
3. Calculates hours × billing rate per site
4. Creates line items
5. Applies 15% VAT
6. Generates unique invoice number

**Request**:
```json
{
  "client_id": 1,
  "period_start": "2025-01-01",
  "period_end": "2025-01-31",
  "due_date": "2025-02-15",
  "notes": "January 2025 security services"
}
```

**Response**:
```json
{
  "invoice_id": 1,
  "invoice_number": "INV-13-1-20250117-001",
  "client_name": "City of Johannesburg - Parks Department",
  "total_hours": 336.0,
  "total_shifts": 56,
  "subtotal": 40320.00,
  "tax_amount": 6048.00,
  "total_amount": 46368.00,
  "status": "draft",
  "line_items": [
    {
      "site_name": "Zoo Lake Entrance Gate",
      "hours": 168.0,
      "shifts": 28,
      "rate_per_hour": 120.00,
      "amount": 20160.00
    }
  ]
}
```

#### **PATCH /api/v1/invoices/{invoice_id}/status**
Update invoice status (draft → sent → paid)

**Query Parameters**:
- `new_status` - draft | sent | paid | overdue | cancelled
- `payment_reference` - Optional payment proof

#### **DELETE /api/v1/invoices/{invoice_id}**
Delete draft invoices only

#### **GET /api/v1/invoices/stats/summary**
Invoice summary statistics:
- Total invoices
- Total amount
- Breakdown by status (draft, sent, paid, overdue)
- Outstanding balance
- Revenue (paid invoices)

### 4. Financial Reporting Endpoints
**File**: `backend/app/api/endpoints/reports.py`

#### **GET /api/v1/reports/profitability**
Revenue vs cost analysis for period.

**Parameters**: `period_start`, `period_end`

**Response**:
```json
{
  "period_start": "2025-01-01",
  "period_end": "2025-01-31",
  "total_revenue": 46368.00,
  "total_costs": 32550.00,
  "gross_profit": 13818.00,
  "profit_margin": 29.81
}
```

**Formula**:
- Revenue = Sum of all invoices
- Costs = Sum of ShiftAssignment.total_cost (guard pay)
- Gross Profit = Revenue - Costs
- Margin = (Profit / Revenue) × 100

#### **GET /api/v1/reports/site-performance**
Performance metrics per site showing profitability.

**Response**:
```json
[
  {
    "site_id": 1,
    "site_name": "Zoo Lake Entrance Gate",
    "client_name": "City of Johannesburg",
    "shifts_count": 28,
    "hours_worked": 168.0,
    "revenue": 20160.00,
    "cost": 14280.00,
    "profit": 5880.00,
    "margin": 29.17
  }
]
```

**Use Case**: Identify most/least profitable sites.

#### **GET /api/v1/reports/employee-payroll**
Payroll summary per employee for period.

**Response**:
```json
[
  {
    "employee_id": 1,
    "employee_name": "Sipho Dlamini",
    "total_hours": 84.0,
    "regular_hours": 72.0,
    "overtime_hours": 12.0,
    "gross_pay": 7650.00,
    "shifts_worked": 14
  }
]
```

#### **GET /api/v1/reports/revenue-vs-cost**
Trend analysis grouped by month/week/client.

**Parameters**:
- `period_start`, `period_end`
- `group_by` - month | week | client

**Response (group_by=month)**:
```json
{
  "group_by": "month",
  "data": [
    {
      "period": "2025-01",
      "revenue": 46368.00,
      "cost": 32550.00,
      "profit": 13818.00,
      "margin": 29.81
    }
  ]
}
```

**Response (group_by=client)**:
```json
{
  "group_by": "client",
  "data": [
    {
      "group": "City of Johannesburg",
      "revenue": 30240.00,
      "cost": 21420.00,
      "profit": 8820.00,
      "margin": 29.17
    }
  ]
}
```

#### **GET /api/v1/reports/outstanding-invoices**
Report of unpaid invoices grouped by client.

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
          "invoice_number": "INV-13-1-20250117-001",
          "amount": 46368.00,
          "status": "sent",
          "days_overdue": 0
        }
      ]
    }
  ]
}
```

## Business Logic

### Revenue Calculation
```
Billable Hours × Client Billing Rate = Revenue
```

**Example**:
- Site: Zoo Lake Entrance Gate
- Billing Rate: R120/hour
- Hours: 168 hours (7 days × 2 shifts × 12 hours)
- Revenue: 168 × R120 = R20,160

### Cost Calculation
Guard pay is calculated in `ShiftAssignment.calculate_cost()`:
```python
Regular Pay = Regular Hours × Hourly Rate
Overtime Pay = Overtime Hours × Hourly Rate × 1.5
Night Premium = Night Hours × Hourly Rate × 0.10
Weekend Premium = Weekend Hours × Hourly Rate × 0.15
Travel = R40 per shift (default)

Total Cost = Regular + Overtime + Night + Weekend + Travel
```

**Example**:
- Guard: Sipho Dlamini (R85/hour, Grade A)
- Shift: 12 hours (6 PM - 6 AM Friday)
- Calculation:
  - Regular: 12 hours × R85 = R1,020
  - Night premium: 12 hours × R85 × 0.10 = R102
  - Weekend premium: 12 hours × R85 × 0.15 = R153
  - Travel: R40
  - **Total Cost: R1,315**

### Profit Calculation
```
Profit = Revenue - Cost
Margin = (Profit / Revenue) × 100
```

**Example**:
- Revenue: R20,160 (168 hours × R120)
- Cost: R14,280 (sum of all guard costs)
- Profit: R5,880
- Margin: 29.17%

## Tax Handling
South African VAT (15%) is applied to all invoices:
```
Subtotal = Sum of line items
Tax = Subtotal × 0.15
Total = Subtotal + Tax
```

## Invoice Number Format
```
INV-{ORG_ID}-{CLIENT_ID}-{YYYYMMDD}-{SEQUENCE}
```

**Example**: `INV-13-1-20250117-001`
- Organization ID: 13
- Client ID: 1
- Date: 2025-01-17
- Sequence: 001 (increments if multiple invoices on same day)

## Multi-Tenancy
All endpoints filtered by `org_id`:
- Invoices only visible to their organization
- Reports only aggregate data for current organization
- Prevents cross-organization data leakage

## Testing Recommendations

### 1. Generate Test Invoice
```bash
POST /api/v1/invoices/generate
{
  "client_id": 1,
  "period_start": "2025-01-01",
  "period_end": "2025-01-07",
  "due_date": "2025-02-01"
}
```

### 2. View Profitability
```bash
GET /api/v1/reports/profitability?period_start=2025-01-01&period_end=2025-01-31
```

### 3. Check Outstanding
```bash
GET /api/v1/reports/outstanding-invoices
```

### 4. Site Performance
```bash
GET /api/v1/reports/site-performance?period_start=2025-01-01&period_end=2025-01-31
```

## Key Features

✅ **Automated Invoice Generation** - Calculates billable hours from confirmed shifts
✅ **Cost Tracking** - Tracks guard pay vs client billing
✅ **Profitability Reports** - Revenue vs cost analysis
✅ **Site Performance** - Identify profitable/unprofitable sites
✅ **Employee Payroll** - Detailed payroll breakdowns
✅ **VAT Calculation** - Automatic 15% tax on invoices
✅ **Multi-Tenancy** - Organization-level data isolation
✅ **Payment Tracking** - Invoice status workflow (draft → sent → paid)

## Database Schema

### New Tables
1. **client_invoices** - Main invoice records
2. **invoice_line_items** - Itemized billing per site

### Modified Tables
None (leverages existing ShiftAssignment cost tracking from Phase 2)

## Files Modified/Created

### Created:
1. `backend/app/models/client_invoice.py` - Invoice models
2. `backend/app/api/endpoints/invoices.py` - Invoice CRUD + generation
3. `backend/app/api/endpoints/reports.py` - Financial reporting
4. `backend/migrations/versions/68edf8c1ee2d_add_client_invoice_tables.py` - Database migration
5. `PHASE_6_SUMMARY.md` - This document

### Modified:
1. `backend/app/api/endpoints/payroll.py` - Fixed bugs, refactored to use ShiftAssignment
2. `backend/app/models/__init__.py` - Added ClientInvoice, InvoiceLineItem
3. `backend/app/models/client.py` - Added invoices relationship
4. `backend/app/main.py` - Registered invoices and reports routers

## Next Steps (Phase 7)

Phase 6 is complete. Recommended next steps:

1. **Frontend Integration** - Build UI for invoice management
2. **PDF Generation** - Export invoices as PDF
3. **Email Invoices** - Send invoices to clients via email
4. **Payment Gateway** - Integrate client payment processing
5. **Automated Reminders** - Send overdue invoice reminders
6. **Analytics Dashboard** - Visualize profitability trends
7. **Export Reports** - CSV/Excel export for reports

## Success Metrics

✅ All endpoints load successfully
✅ Database migration applied without errors
✅ Multi-tenancy enforced on all endpoints
✅ Comprehensive financial reporting available
✅ Revenue and cost tracking functional
✅ Invoice generation automated

---

**Phase 6 Status**: ✅ COMPLETE
**Implementation Date**: January 17, 2025
**Total Endpoints Added**: 12 (5 invoice + 5 reports + 2 payroll enhancements)
