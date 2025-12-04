# Employee Skills & Certifications Guide - RostraCore

**Date**: 2025-11-28
**Version**: 1.0.0

---

## Overview

In RostraCore, **employee skills are managed through the Certifications system**, not as a separate field on the Employee model. This approach ensures compliance tracking, expiry management, and PSIRA regulation adherence.

---

## How Skills Work

### ✅ Current Architecture

```
Employee
  ├── role (armed/unarmed/supervisor) - Primary skill
  ├── certifications[] - Additional skills/qualifications
  │   ├── cert_type (string) - e.g., "First Aid", "Firearm"
  │   ├── psira_grade (A/B/C/D/E) - Security grade
  │   ├── firearm_competency (handgun/shotgun/rifle/automatic)
  │   ├── issue_date
  │   ├── expiry_date
  │   ├── verified (boolean)
  │   └── cert_number
  └── ...
```

### Key Points

1. **Employee.role** = Primary skill (armed, unarmed, supervisor)
2. **Certifications** = Additional skills, licenses, and qualifications
3. **PSIRA Grade** = Security industry grade (A = highest, E = lowest)
4. **Firearm Competency** = Type of firearm certification

---

## How to Assign Skills/Certifications

### Via API Endpoint

**POST** `/api/v1/certifications`

```json
{
  "employee_id": 123,
  "cert_type": "First Aid Level 3",
  "issue_date": "2024-01-15",
  "expiry_date": "2027-01-15",
  "verified": true,
  "cert_number": "FA-2024-001234",
  "issuing_authority": "SETA",
  "psira_grade": "C",
  "firearm_competency": null
}
```

### PSIRA Security Grade Examples

```json
// Grade A - Security Officer (Highest)
{
  "cert_type": "PSIRA Grade A",
  "psira_grade": "A",
  "issue_date": "2023-06-01",
  "expiry_date": "2028-06-01",
  "cert_number": "PSIRA-A-123456"
}

// Grade E - Security Guard (Entry Level)
{
  "cert_type": "PSIRA Grade E",
  "psira_grade": "E",
  "issue_date": "2024-01-01",
  "expiry_date": "2029-01-01",
  "cert_number": "PSIRA-E-789012"
}
```

### Firearm Certifications

```json
{
  "cert_type": "Firearm Competency - Handgun",
  "firearm_competency": "handgun",
  "issue_date": "2023-03-15",
  "expiry_date": "2028-03-15",
  "verified": true,
  "cert_number": "FC-HG-2023-5678",
  "issuing_authority": "SAPS"
}
```

### Common Certification Types

- `"PSIRA Registration"` - Basic security registration
- `"First Aid Level 1/2/3"` - Medical response training
- `"Firearm Competency - Handgun"` - Handgun certification
- `"Firearm Competency - Shotgun"` - Shotgun certification
- `"Firearm Competency - Rifle"` - Rifle certification
- `"Advanced Tactical Training"` - Specialized training
- `"Crowd Control Certification"` - Event security
- `"Fire Safety Officer"` - Fire response training
- `"CCTV Operator License"` - Surveillance systems
- `"Access Control Specialist"` - Entry management

---

## How Skills Are Used

### 1. Roster Generation

The roster generator (`roster_generator.py:185-194`) uses certifications to match guards to shifts:

```python
def _get_employee_skills(self, employee):
    # Start with role as primary skill
    skills = [employee.role.value]  # "armed", "unarmed", "supervisor"

    # Add certifications as skills
    if employee.certifications:
        for cert in employee.certifications:
            if cert.cert_type:
                skills.append(cert.cert_type)

    return skills
```

### 2. Shift Matching

When a shift requires:
- `required_skill: "armed"` → Only employees with `role=armed` can be assigned
- `required_psira_grade: "B"` → Only employees with Grade B or higher (B, A) can be assigned

### 3. Compliance Tracking

Certifications are monitored for:
- **Expiry dates** - Alerts when certifications are expiring
- **Verification status** - Only verified certifications are valid
- **PSIRA compliance** - Ensures legal requirements are met

---

## How to Manage Certifications

### View Employee Certifications

**GET** `/api/v1/certifications?employee_id=123`

```json
[
  {
    "cert_id": 1,
    "employee_id": 123,
    "cert_type": "PSIRA Grade C",
    "psira_grade": "C",
    "issue_date": "2023-01-15",
    "expiry_date": "2028-01-15",
    "verified": true,
    "cert_number": "PSIRA-C-123456",
    "issuing_authority": "PSIRA"
  },
  {
    "cert_id": 2,
    "employee_id": 123,
    "cert_type": "First Aid Level 3",
    "issue_date": "2024-02-01",
    "expiry_date": "2027-02-01",
    "verified": true,
    "cert_number": "FA-2024-001",
    "issuing_authority": "SETA"
  }
]
```

### Update Certification

**PUT** `/api/v1/certifications/{cert_id}`

```json
{
  "verified": true,
  "expiry_date": "2029-01-15"
}
```

### Delete Certification

**DELETE** `/api/v1/certifications/{cert_id}`

---

## Frontend Integration

### Employee Details Page

When viewing an employee, show their certifications:

```typescript
// Fetch employee certifications
const certifications = await api.get(`/api/v1/certifications?employee_id=${employeeId}`);

// Display certifications table
certifications.map(cert => (
  <tr>
    <td>{cert.cert_type}</td>
    <td>{cert.psira_grade || 'N/A'}</td>
    <td>{cert.expiry_date}</td>
    <td>
      {cert.verified ? (
        <Badge color="green">Verified</Badge>
      ) : (
        <Badge color="yellow">Pending</Badge>
      )}
    </td>
  </tr>
));
```

### Add Certification Form

```typescript
const addCertification = async (data) => {
  await api.post('/api/v1/certifications', {
    employee_id: employeeId,
    cert_type: data.certType,
    issue_date: data.issueDate,
    expiry_date: data.expiryDate,
    verified: false, // Admin must verify
    cert_number: data.certNumber,
    issuing_authority: data.authority,
    psira_grade: data.psiraGrade || null,
    firearm_competency: data.firearmType || null
  });
};
```

---

## Database Schema

### Employees Table

```sql
employees
  ├── employee_id (PK)
  ├── role (armed/unarmed/supervisor) -- Primary skill
  ├── psira_number (deprecated - moved to certifications)
  ├── psira_grade (deprecated - moved to certifications)
  └── ... (other fields)
```

### Certifications Table

```sql
certifications
  ├── cert_id (PK)
  ├── employee_id (FK -> employees)
  ├── cert_type (string) -- "First Aid", "PSIRA Grade C", etc.
  ├── psira_grade (enum: A/B/C/D/E) -- Security grade
  ├── firearm_competency (enum: handgun/shotgun/rifle/automatic)
  ├── issue_date (date)
  ├── expiry_date (date)
  ├── verified (boolean)
  ├── cert_number (string)
  └── issuing_authority (string)
```

---

## Migration Notes

### ❌ Old System (Removed)

```python
# REMOVED: skills field on Employee model
employee.skills  # Does not exist anymore
```

### ✅ New System (Current)

```python
# Use certifications relationship
employee.certifications  # List of Certification objects
employee.role  # Primary skill (armed/unarmed/supervisor)
```

---

## Common Tasks

### 1. Add PSIRA Certification to Employee

```bash
curl -X POST http://localhost:8001/api/v1/certifications \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 123,
    "cert_type": "PSIRA Grade B",
    "psira_grade": "B",
    "issue_date": "2024-01-01",
    "expiry_date": "2029-01-01",
    "verified": true,
    "cert_number": "PSIRA-B-654321",
    "issuing_authority": "PSIRA"
  }'
```

### 2. Check Expiring Certifications

```bash
curl http://localhost:8001/api/v1/certifications/expiring?days=30
```

### 3. Get All Certifications for Export

```bash
curl http://localhost:8001/api/v1/exports/certifications/excel
```

---

## Best Practices

1. **Always verify certifications** - Set `verified: true` only after document validation
2. **Track expiry dates** - Set up alerts for certifications expiring in 30 days
3. **Use standard cert_type names** - Maintain consistency across the system
4. **PSIRA compliance** - Ensure all guards have valid PSIRA registration
5. **Firearm tracking** - Only assign armed shifts to guards with valid firearm competency

---

## Future Enhancements

- [ ] Certification upload (PDF/images)
- [ ] Automatic expiry notifications
- [ ] Bulk certification import
- [ ] Certification verification workflow
- [ ] Integration with PSIRA database

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-28
**Reviewed By**: Claude (AI Assistant)
