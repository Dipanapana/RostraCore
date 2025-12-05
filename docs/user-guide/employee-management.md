# Employee Management Guide

This guide covers managing security guards (employees) in RostraCore.

## Overview

The Employees section allows you to:
- Add new guards to your organization
- Track PSIRA certifications
- Manage availability
- View assignment history

## Adding a New Employee

### Step 1: Navigate to Employees
1. Click **Employees** in the sidebar
2. Click the **+ Add Employee** button

### Step 2: Enter Basic Information
Fill in the required fields:

| Field | Description | Required |
|-------|-------------|----------|
| First Name | Guard's first name | Yes |
| Last Name | Guard's surname | Yes |
| Email | Contact email | Yes |
| Phone | Contact number | No |
| ID Number | SA ID number | Recommended |
| Address | Physical address | No |

### Step 3: Employment Details
| Field | Description |
|-------|-------------|
| Hourly Rate | Base pay rate (R/hour) |
| Employment Type | Full-time, Part-time, Contract |
| Start Date | Employment start date |
| Status | Active, Inactive, Suspended |

### Step 4: Save
Click **Save Employee** to create the record.

## PSIRA Certification

### Adding Certification
1. Open the employee's profile
2. Click the **Certifications** tab
3. Click **+ Add Certification**

### Certification Details
| Field | Description |
|-------|-------------|
| PSIRA Number | Official registration number |
| Grade | A, B, C, D, or E |
| Issue Date | When the certification was issued |
| Expiry Date | Certification expiry |
| Verified | Whether verified with PSIRA |

### PSIRA Grade Hierarchy
```
Grade A (Armed Response) - Highest
Grade B (Armed Guard)
Grade C (Access Control)
Grade D (General Guarding)
Grade E (In-House Security) - Lowest
```

**Important**: Employees can only be assigned to shifts requiring their grade or lower.

### Certification Alerts
The system will alert you when:
- A certification expires in 30 days (yellow warning)
- A certification is expired (red alert)
- PSIRA verification is pending

## Managing Availability

### Setting Availability
1. Go to employee profile
2. Click **Availability** tab
3. Select dates on the calendar
4. Set available time ranges

### Availability Types
- **Available**: Can be assigned to shifts
- **Unavailable**: Cannot be scheduled
- **Preferred Off**: Available but prefers not to work

### Pattern-Based Availability
For guards on shift patterns (e.g., 4-on-4-off):
1. Go to Settings → Shift Patterns
2. Assign employee to a pattern
3. Select rotation group (A, B, C, or D)
4. System auto-generates availability

## Viewing Employee Details

### Profile Information
- Basic details
- Employment history
- Current assignments

### Certification Status
- Active certifications
- Expiry dates
- Verification status

### Assignment History
- Past shift assignments
- Hours worked
- Sites covered

## Bulk Operations

### Import Employees
1. Click **Import** button
2. Download the Excel template
3. Fill in employee data
4. Upload completed file
5. Review and confirm

### Export Employee List
1. Click **Export** button
2. Select format (Excel, CSV)
3. Choose fields to include
4. Download file

## Best Practices

1. **Keep certifications updated** - Check for expiring certs weekly
2. **Verify PSIRA numbers** - Always verify with official database
3. **Maintain accurate contact info** - Ensure phone/email are current
4. **Set hourly rates** - Required for accurate payroll
5. **Track availability** - Helps roster generation
