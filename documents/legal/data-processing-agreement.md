# RostraCore Data Processing Agreement (DPA)

**Effective Date:** 1 March 2026
**Version:** 1.0

This Data Processing Agreement ("DPA") forms part of the Terms and Conditions between Blaq Cooperation (Pty) Ltd ("Operator", "RostraCore") and the subscribing entity ("Responsible Party", "Client").

This DPA is entered into in compliance with the Protection of Personal Information Act 4 of 2013 ("POPIA"), specifically Sections 19-22.

---

## 1. Definitions

Terms used in this DPA have the same meaning as in POPIA, unless otherwise defined:

- **"Responsible Party"** means the Client, who determines the purpose of and means for processing Personal Information of its guards, employees, and other data subjects.
- **"Operator"** means RostraCore, who processes Personal Information on behalf of the Responsible Party under the terms of this DPA.
- **"Data Subject"** means the identifiable natural person to whom the Personal Information relates (e.g., security guards, employees, client contacts).
- **"Personal Information"** has the meaning ascribed in POPIA Section 1.
- **"Processing"** has the meaning ascribed in POPIA Section 1.
- **"Security Compromise"** means any unauthorised access to or acquisition of Personal Information.
- **"Sub-processor"** means a third party engaged by the Operator to process Personal Information on behalf of the Responsible Party.

---

## 2. Scope and Purpose

### 2.1 Purpose of Processing

The Operator processes Personal Information solely for the purpose of providing the RostraCore Platform services, including:

- Guard and employee profile management
- Shift roster generation and optimisation
- Time and attendance tracking
- Payroll calculation
- PSIRA compliance tracking
- Client and site management
- Invoicing and financial reporting
- Document management
- Mobile application services

### 2.2 Categories of Data Subjects

- Security guards and officers
- Administrative employees
- Client contacts and representatives
- Site managers

### 2.3 Categories of Personal Information

| Category | Examples |
|----------|---------|
| Identity information | Full name, ID number, date of birth, photograph |
| Contact information | Phone number, email address, physical address |
| Employment information | Job title, start date, department, rate of pay, employment status |
| Regulatory information | PSIRA registration number, grade, firearm competency, certification expiry dates |
| Financial information | Banking details, tax reference number, payroll data |
| Location data | GPS coordinates (for attendance verification) |
| Biometric data | Fingerprint templates (where enabled by Client) |
| Health information | Fitness certificates (where applicable to security roles) |
| Emergency contacts | Next of kin name, relationship, contact number |

### 2.4 Duration

Processing continues for the duration of the Client's active Subscription, plus the data retention period specified in the Privacy Policy and Section 8 of this DPA.

---

## 3. Obligations of the Responsible Party (Client)

The Responsible Party shall:

3.1 Ensure that the processing of Personal Information through the Platform is lawful and complies with POPIA.

3.2 Obtain all necessary consents from Data Subjects before entering their Personal Information into the Platform, including:
- Consent for GPS location tracking
- Consent for biometric data processing (where applicable)
- Consent for banking details processing

3.3 Provide Data Subjects with notice of processing as required by POPIA Section 18.

3.4 Ensure that Personal Information entered into the Platform is accurate, complete, and up to date.

3.5 Respond to Data Subject requests (access, correction, deletion, objection) in the first instance, with reasonable assistance from the Operator where required.

3.6 Notify the Operator promptly of any changes to processing instructions or requirements.

---

## 4. Obligations of the Operator (RostraCore)

The Operator shall:

### 4.1 Processing Instructions

4.1.1 Process Personal Information only on the documented instructions of the Responsible Party, as set out in this DPA and the Terms and Conditions.

4.1.2 Not process Personal Information for any purpose other than providing the Platform services, unless required by law (in which case, the Operator shall notify the Responsible Party before processing, unless prohibited by law).

### 4.2 Confidentiality

4.2.1 Ensure that all personnel with access to Personal Information are bound by confidentiality obligations.

4.2.2 Limit access to Personal Information to personnel who require access to perform their duties.

### 4.3 Security Measures (POPIA s19)

The Operator shall implement and maintain appropriate technical and organisational measures to protect Personal Information against:
- Loss
- Damage
- Unauthorised destruction
- Unlawful access
- Unlawful processing

These measures include:

**Technical Measures:**
- Encryption in transit (TLS 1.2 or higher)
- Encryption at rest (AES-256)
- Secure password hashing (bcrypt with salt)
- JWT-based authentication with configurable token expiry
- Role-based access control (RBAC) with principle of least privilege
- Network segmentation and firewall protection
- Automated daily backups with 30-day retention
- Database access restricted to application layer
- Automated vulnerability scanning and dependency monitoring
- Regular security patching

**Organisational Measures:**
- Access control policies and procedures
- Security awareness training for all personnel
- Background checks for personnel with data access
- Incident response procedures and playbooks
- Regular security reviews and audits
- Documented change management process

### 4.4 Data Subject Requests

4.4.1 The Operator shall promptly notify the Responsible Party of any Data Subject requests received directly.

4.4.2 The Operator shall provide reasonable technical assistance to the Responsible Party in fulfilling Data Subject requests, including:
- Providing data export functionality (CSV, Excel, PDF)
- Facilitating data correction through the Platform interface
- Supporting data deletion requests within the Platform

---

## 5. Sub-processors

### 5.1 Authorised Sub-processors

The Responsible Party hereby authorises the Operator to engage the following Sub-processors:

| Sub-processor | Service | Location | Data Processed |
|--------------|---------|----------|----------------|
| **Railway** | Cloud hosting, database | Variable (cloud infrastructure) | All Platform data |
| **Vercel** | Frontend hosting, CDN | Global edge network | Session tokens, UI assets (no PII stored) |
| **PayFast** | Payment processing | South Africa | Payment card details, billing information |
| **Email service provider** | Transactional email delivery | Variable | Email addresses, notification content |

### 5.2 New Sub-processors

5.2.1 The Operator shall notify the Responsible Party in writing at least 30 days before engaging a new Sub-processor.

5.2.2 The Responsible Party may object to the engagement of a new Sub-processor within 14 days of notification. If the objection is reasonable and cannot be resolved, either party may terminate the affected services.

### 5.3 Sub-processor Obligations

The Operator shall:
- Impose data protection obligations on Sub-processors no less onerous than those in this DPA
- Remain fully liable for the acts and omissions of its Sub-processors
- Conduct due diligence on Sub-processors before engagement

---

## 6. Security Compromise Notification (POPIA s22)

### 6.1 Notification to Responsible Party

The Operator shall notify the Responsible Party of any Security Compromise without unreasonable delay and no later than **48 hours** after becoming aware of the compromise.

### 6.2 Notification Content

The notification shall include:
- Description of the nature of the Security Compromise
- Categories and approximate number of Data Subjects affected
- Categories and approximate number of Personal Information records affected
- Likely consequences of the Security Compromise
- Measures taken or proposed to address the Security Compromise
- Measures to mitigate possible adverse effects
- Contact details for further information

### 6.3 Cooperation

The Operator shall:
- Cooperate with the Responsible Party in investigating and remediating the Security Compromise
- Assist the Responsible Party in fulfilling its notification obligations to the Information Regulator and affected Data Subjects under POPIA s22
- Maintain a register of all Security Compromises

### 6.4 Responsible Party Notification Obligations

The Responsible Party is responsible for notifying:
- The Information Regulator (within 72 hours of becoming aware)
- Affected Data Subjects (as soon as reasonably possible)

---

## 7. Audit Rights

### 7.1 Audit Entitlement

The Responsible Party may, at its own cost and upon 30 days' written notice:
- Request evidence of the Operator's compliance with this DPA
- Conduct or commission an audit of the Operator's data processing activities, limited to the Personal Information processed on behalf of the Responsible Party

### 7.2 Audit Scope

Audits may include:
- Review of security policies and procedures
- Review of access controls and logs
- Verification of Sub-processor agreements
- Review of breach notification procedures
- Assessment of technical security measures

### 7.3 Audit Frequency

Audits are limited to once per 12-month period, unless a Security Compromise has occurred or there are reasonable grounds to believe non-compliance.

### 7.4 Cooperation

The Operator shall cooperate with reasonable audit requests and provide necessary access and information.

---

## 8. Data Return and Deletion

### 8.1 During the Subscription

The Responsible Party may export Client Data at any time through the Platform's built-in export features.

### 8.2 Upon Termination

Upon termination or expiry of the Subscription:

1. **Export Period:** The Responsible Party has 30 calendar days to export all Client Data
2. **Formats Available:** CSV, Excel (XLSX), PDF, and JSON (via API where available)
3. **Assistance:** The Operator shall provide reasonable assistance with data export upon request

### 8.3 Deletion

After the 30-day export period (or upon earlier written instruction from the Responsible Party):

1. The Operator shall securely delete all Personal Information from active systems within 30 days
2. Personal Information in backups shall be deleted through the normal backup rotation cycle (maximum 30 days)
3. The Operator shall provide written confirmation of deletion upon request

### 8.4 Retention Exceptions

The Operator may retain Personal Information beyond the deletion date where required by:
- South African law (e.g., tax records under the Tax Administration Act)
- A lawful order from a court or regulatory authority
- The Operator's legitimate legal obligations

In such cases, the Operator shall inform the Responsible Party and process the retained data only for the specified legal purpose.

---

## 9. International Transfers

9.1 Where the processing of Personal Information involves transfer outside the Republic of South Africa, the Operator shall ensure compliance with POPIA Section 72 by:

- Ensuring the recipient country or organisation provides an adequate level of protection
- Implementing appropriate contractual safeguards (binding agreements with Sub-processors)
- Transferring only where necessary for the performance of the contract

9.2 The Operator shall maintain records of all international transfers, including the recipient, country, and safeguards in place.

---

## 10. Liability

10.1 The Operator's liability under this DPA is subject to the limitations set out in the Terms and Conditions.

10.2 Each party is liable for damage caused by processing that infringes POPIA, in accordance with POPIA Section 99.

---

## 11. Term and Termination

11.1 This DPA takes effect on the date of the Client's Subscription and continues for the duration of the Subscription.

11.2 Obligations relating to confidentiality, data return/deletion, and Security Compromise notification survive termination.

11.3 Termination of the Subscription automatically triggers the data return and deletion provisions in Section 8.

---

## 12. Governing Law

This DPA shall be governed by the laws of the Republic of South Africa. Disputes shall be resolved in accordance with the dispute resolution provisions in the Terms and Conditions.

---

## 13. Amendments

This DPA may be amended:
- By mutual written agreement of the parties
- By the Operator with 30 days' notice, where amendments are required to comply with changes in law or regulatory guidance

---

**Blaq Cooperation (Pty) Ltd**
Johannesburg, South Africa
privacy@rostracore.co.za | www.rostracore.com
