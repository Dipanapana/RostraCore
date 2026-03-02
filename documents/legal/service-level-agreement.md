# RostraCore Service Level Agreement (SLA)

**Effective Date:** 1 March 2026
**Version:** 1.0
**Provider:** Blaq Cooperation (Pty) Ltd ("RostraCore", "Provider")
**Registration:** Republic of South Africa
**Address:** Johannesburg, Gauteng, South Africa

---

## 1. Definitions

- **"Platform"** means the RostraCore cloud-based workforce management application accessible at app.rostracore.com, including all APIs, mobile applications, and associated services.
- **"Client"** means the security company or organisation subscribing to the Platform.
- **"Service Hours"** means 24 hours per day, 7 days per week, 365 days per year.
- **"Downtime"** means any period during which the Platform is unavailable to the Client, excluding Scheduled Maintenance and Force Majeure Events.
- **"Scheduled Maintenance"** means planned maintenance windows communicated at least 48 hours in advance.
- **"Incident"** means any unplanned interruption to, or reduction in the quality of, a service.

---

## 2. Service Description

RostraCore provides a Software-as-a-Service (SaaS) platform for security workforce management, including:

- AI-powered roster generation and optimisation (OR-Tools CP-SAT solver)
- Employee and guard management with PSIRA compliance tracking
- Shift scheduling and pattern management
- Time and attendance with GPS verification
- Payroll calculation (BCEA, SARS tax compliant)
- Client and site management
- Invoicing and financial reporting
- Document management
- Incident reporting and tracking
- Mobile application for guards

---

## 3. Service Availability

### 3.1 Uptime Guarantee

The Provider guarantees a monthly uptime percentage of **99.5%** for the Platform, measured as:

```
Uptime % = ((Total Minutes in Month - Downtime Minutes) / Total Minutes in Month) x 100
```

### 3.2 Exclusions from Downtime Calculation

The following are excluded from Downtime calculations:

- **Scheduled Maintenance:** Up to 4 hours per month, conducted during low-usage windows (typically Sundays 02:00-06:00 SAST)
- **Emergency Maintenance:** Critical security patches or infrastructure updates, with best-effort advance notice
- **Force Majeure Events:** As defined in Section 9
- **Client-side issues:** Internet connectivity, browser compatibility, client firewall or network configuration
- **Third-party service outages:** Payment gateway (PayFast), email delivery, SMS providers

### 3.3 Monitoring

The Provider continuously monitors Platform availability and performance using automated systems. Status updates are published at the Provider's discretion via email notification.

---

## 4. Support Services

### 4.1 Support Channels

| Channel | Availability | Contact |
|---------|-------------|---------|
| Email | 24/7 (response within SLA) | support@rostracore.co.za |
| In-app Support | Business hours (08:00-17:00 SAST, Mon-Fri) | Platform help widget |
| Phone | Business hours (08:00-17:00 SAST, Mon-Fri) | By arrangement |

### 4.2 Incident Priority and Response Times

| Priority | Description | Response Time | Resolution Target |
|----------|------------|---------------|-------------------|
| **P1 - Critical** | Platform completely unavailable; roster generation fails for all users; data loss or security breach | 4 hours | 8 hours |
| **P2 - High** | Major feature unavailable (e.g., payroll export, attendance tracking); significant performance degradation | 8 hours | 24 hours |
| **P3 - Medium** | Minor feature issue; workaround available; cosmetic defects affecting usability | 24 hours | 5 business days |
| **P4 - Low** | Feature request; documentation query; general enquiry | 48 hours | Best effort |

### 4.3 Escalation

If the Client believes an Incident is not being resolved within the agreed timeframes, escalation may be directed to:

1. **Level 1:** Support Team — support@rostracore.co.za
2. **Level 2:** Technical Lead — escalation@rostracore.co.za
3. **Level 3:** Managing Director — info@rostracore.co.za

---

## 5. Data Management

### 5.1 Data Backup

- **Frequency:** Automated daily backups of all Client data
- **Retention:** 30 calendar days of rolling backups
- **Location:** Backups stored in geographically separate infrastructure within secure hosting environments
- **Encryption:** All backups encrypted at rest using AES-256 encryption

### 5.2 Disaster Recovery

- **Recovery Time Objective (RTO):** 4 hours — the target time to restore Platform services following a major failure
- **Recovery Point Objective (RPO):** 24 hours — the maximum acceptable data loss measured in time
- **Testing:** Disaster recovery procedures tested quarterly

### 5.3 Data Ownership

All data entered by the Client into the Platform remains the sole property of the Client. The Provider acts as an Operator (as defined in POPIA) on behalf of the Client.

### 5.4 Data Export

The Client may export their data at any time through:

- Built-in export features (Excel, CSV, PDF)
- API access (where available under the subscription plan)
- Written request to the Provider (fulfilled within 10 business days)

---

## 6. Service Credits

### 6.1 Eligibility

If the monthly uptime percentage falls below 99.5%, the Client is entitled to service credits as follows:

| Monthly Uptime | Service Credit (% of Monthly Subscription) |
|---------------|---------------------------------------------|
| 99.0% - 99.49% | 10% |
| 95.0% - 98.99% | 25% |
| 90.0% - 94.99% | 50% |
| Below 90.0% | 100% |

### 6.2 Claiming Credits

- Credits must be claimed within 30 days of the affected month
- Claims must be submitted in writing to support@rostracore.co.za
- Credits are applied against future invoices and are not redeemable for cash
- Maximum credit in any month shall not exceed 100% of that month's subscription fee

### 6.3 Limitation

Service credits are the Client's sole and exclusive remedy for any failure to meet the uptime guarantee.

---

## 7. Client Responsibilities

The Client agrees to:

1. Provide accurate and complete data for guard profiles, certifications, and site requirements
2. Maintain current PSIRA registration details for all guards
3. Ensure authorised users protect their login credentials
4. Report Incidents promptly via the designated support channels
5. Maintain a compatible web browser and internet connection
6. Comply with the Acceptable Use Policy
7. Ensure compliance with applicable South African labour legislation (BCEA, LRA) in their use of generated rosters

---

## 8. Performance Reporting

The Provider shall make available:

- Platform availability statistics upon reasonable request
- Incident reports for P1 and P2 incidents within 5 business days of resolution
- Quarterly summary reports upon request

---

## 9. Force Majeure

Neither party shall be liable for failure to perform obligations under this SLA due to events beyond reasonable control, including but not limited to:

- Natural disasters, acts of God
- War, terrorism, civil unrest
- Government actions or regulations
- Widespread internet or telecommunications failures
- National power grid failures (including Eskom load-shedding beyond generator/UPS capacity)
- Pandemics or epidemics declared by the WHO or South African government

The affected party shall notify the other party within 48 hours of a Force Majeure Event and use reasonable efforts to mitigate its effects.

---

## 10. Term and Termination

### 10.1 Term

This SLA is effective for the duration of the Client's active subscription to the Platform.

### 10.2 Termination

Either party may terminate this SLA:

- With 30 days' written notice for convenience
- Immediately upon material breach not remedied within 14 days of written notice
- Immediately if the other party becomes insolvent or enters business rescue proceedings

### 10.3 Transition Assistance

Upon termination or expiry:

1. The Provider shall make all Client data available for export for a period of **30 calendar days** following the effective termination date
2. Data shall be available in standard formats (CSV, Excel, PDF)
3. After the 30-day period, the Provider shall securely delete all Client data in accordance with the Data Processing Agreement
4. The Provider shall provide reasonable assistance to facilitate migration to an alternative provider, subject to agreement on fees for professional services

---

## 11. Amendments

This SLA may be amended by the Provider with 30 days' written notice to the Client. Continued use of the Platform after the effective date of any amendment constitutes acceptance.

---

## 12. Governing Law

This SLA shall be governed by and construed in accordance with the laws of the Republic of South Africa. Any disputes arising from this SLA shall be subject to the jurisdiction of the Gauteng Division of the High Court of South Africa.

---

**Blaq Cooperation (Pty) Ltd**
Johannesburg, South Africa
info@rostracore.co.za | www.rostracore.com
