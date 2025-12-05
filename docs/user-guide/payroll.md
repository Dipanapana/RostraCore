# Payroll Guide

This guide covers payroll processing in RostraCore, including South African tax calculations.

## Overview

RostraCore's payroll system:
- Calculates hours from confirmed shift assignments
- Applies SA tax deductions (PAYE, UIF)
- Generates detailed payslips
- Supports export for accounting systems

## Pay Periods

### Setting Up Pay Periods
1. Go to **Settings → Payroll**
2. Configure pay frequency:
   - Weekly
   - Bi-weekly
   - Monthly

### Creating a Pay Period
1. Navigate to **Payroll**
2. Click **+ New Pay Period**
3. Select start and end dates
4. Click **Create**

## Processing Payroll

### Step 1: Select Pay Period
Choose the pay period to process

### Step 2: Review Hours
The system automatically calculates:
- Regular hours
- Overtime hours
- Night shift hours
- Weekend hours

### Step 3: Verify Assignments
Check that all worked shifts are:
- Confirmed status
- Correctly assigned to employees
- Within the pay period dates

### Step 4: Calculate Payroll
Click **Calculate Payroll** to:
- Total all hours
- Apply hourly rates
- Calculate premiums
- Compute deductions

## South African Tax Calculations

### PAYE (Pay As You Earn)

RostraCore uses the 2024/2025 tax tables:

| Annual Income | Tax Rate |
|--------------|----------|
| R0 - R237,100 | 18% |
| R237,101 - R370,500 | 26% |
| R370,501 - R512,800 | 31% |
| R512,801 - R673,000 | 36% |
| R673,001 - R857,900 | 39% |
| R857,901 - R1,817,000 | 41% |
| R1,817,001+ | 45% |

**Tax Rebates Applied:**
- Primary rebate: R17,235
- Secondary (65+): R9,444
- Tertiary (75+): R3,145

### UIF (Unemployment Insurance Fund)

| Type | Rate | Cap |
|------|------|-----|
| Employee contribution | 1% | R177.12/month |
| Employer contribution | 1% | R177.12/month |

**Note**: UIF is calculated on remuneration up to R17,712/month.

### SDL (Skills Development Levy)
- 1% of payroll for employers
- Only applies if total payroll > R500,000/year
- Employer responsibility (not deducted from employee)

## Payslip Details

Each payslip shows:

### Earnings Section
- Gross Pay
- Regular hours × rate
- Overtime hours × 1.5x rate
- Night shift premium
- Weekend/holiday premiums

### Deductions Section
- PAYE (income tax)
- UIF (employee portion)
- Other deductions (if any)

### Summary
- Total Earnings
- Total Deductions
- **Net Pay** (take-home)

## Viewing Payslips

### Individual Payslip
1. Go to **Payroll**
2. Select the pay period
3. Click on an employee's row
4. View detailed breakdown

### Print/Download
1. Open payslip detail
2. Click **Print / Download**
3. Choose format (PDF recommended)

## Exporting Payroll

### Export Options
1. **Excel**: Full payroll data
2. **CSV**: For accounting imports
3. **PDF Summary**: Management report

### Bank File Export
For bulk payments:
1. Go to **Payroll → Export**
2. Select **Bank File**
3. Choose your bank format
4. Download file
5. Upload to bank portal

## Reports

### Payroll Summary
- Total gross pay
- Total deductions
- Total net pay
- Employee count

### Tax Report
- PAYE summary
- UIF contributions
- Monthly IRP5 data

### Hours Report
- Regular vs overtime
- Premium hours breakdown
- Per-employee analysis

## Compliance

### Monthly Submissions
- EMP201 (monthly employer declaration)
- UIF contributions

### Annual Submissions
- IRP5 certificates for employees
- EMP501 reconciliation

**Note**: RostraCore provides data exports; actual submissions should be done through SARS eFiling.

## Troubleshooting

### Missing Hours
1. Check shift assignment status
2. Verify shifts are confirmed
3. Ensure dates fall within pay period

### Incorrect Calculations
1. Verify employee hourly rate
2. Check premium configurations
3. Review tax bracket settings

### Tax Questions
1. Refer to SARS documentation
2. Consult with your accountant
3. Contact support for calculation issues

## Best Practices

1. **Process promptly** - Run payroll soon after period ends
2. **Double-check** - Review before finalizing
3. **Keep records** - Export and archive payroll data
4. **Stay updated** - Tax rates change annually
5. **Reconcile** - Compare with time records
