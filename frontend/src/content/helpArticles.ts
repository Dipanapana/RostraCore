export interface HelpArticle {
  slug: string
  title: string
  description: string
  category: string
  categoryLabel: string
  permissionKey: string
  content: string
  order: number
}

export const HELP_CATEGORIES = [
  { key: 'getting-started', label: 'Getting Started', icon: 'Rocket' },
  { key: 'workforce', label: 'Workforce Management', icon: 'Users' },
  { key: 'scheduling', label: 'Scheduling & Roster', icon: 'CalendarClock' },
  { key: 'operations', label: 'Operations', icon: 'Building2' },
  { key: 'finance', label: 'Finance', icon: 'Wallet' },
  { key: 'compliance', label: 'Compliance', icon: 'Shield' },
  { key: 'admin', label: 'Administration', icon: 'Settings' },
]

export const helpArticles: HelpArticle[] = [
  // ── Getting Started ──────────────────────────────────────────────
  {
    slug: 'getting-started-onboarding',
    title: 'First Steps After Registration',
    description: 'Set up your organisation, invite your team, and get familiar with the RostraCore dashboard.',
    category: 'getting-started',
    categoryLabel: 'Getting Started',
    permissionKey: 'help.getting-started',
    order: 1,
    content: `
      <h2>Welcome to RostraCore</h2>
      <p>After registering your organisation, you will land on the main dashboard. This is your operational command centre for managing your private security workforce across South Africa.</p>

      <h3>Step 1: Complete Your Company Profile</h3>
      <p>Navigate to <strong>Settings &gt; Company Profile</strong> to enter your organisation details:</p>
      <ul>
        <li>Company name and registration number (CIPC)</li>
        <li>PSIRA registration number (mandatory for all private security employers)</li>
        <li>VAT number (if registered)</li>
        <li>Physical and postal addresses</li>
        <li>Banking details for payroll processing</li>
        <li>Upload your company logo</li>
      </ul>

      <h3>Step 2: Invite Your Team</h3>
      <p>Go to <strong>Settings &gt; Users</strong> and invite admin staff, operations managers, and site supervisors. Each user receives an email invitation with a secure sign-up link.</p>

      <h3>Step 3: Add Clients and Sites</h3>
      <p>Under <strong>Operations &gt; Clients</strong>, create your client records and then add their physical sites. Each site can have specific staffing requirements, shift patterns, and post orders.</p>

      <h3>Step 4: Register Your Security Officers</h3>
      <p>Add your guards under <strong>Workforce &gt; Employees</strong>. You will need their ID number, PSIRA registration number, grade, and contact details. RostraCore will automatically track certification expiry dates.</p>

      <h3>Step 5: Explore the Dashboard</h3>
      <p>The dashboard shows key metrics at a glance:</p>
      <ul>
        <li><strong>Operational Readiness Score</strong> &mdash; a composite metric measuring staffing, compliance, and incident status</li>
        <li><strong>Shift Fill Rate</strong> &mdash; percentage of shifts with assigned officers</li>
        <li><strong>Compliance Status</strong> &mdash; PSIRA registration and certification health</li>
        <li><strong>Live Activity Feed</strong> &mdash; real-time check-ins, patrol completions, and alerts</li>
      </ul>
    `,
  },
  {
    slug: 'getting-started-navigation',
    title: 'Navigating the Platform',
    description: 'Understand the sidebar, top header, role-based menu visibility, and quick actions.',
    category: 'getting-started',
    categoryLabel: 'Getting Started',
    permissionKey: 'help.getting-started',
    order: 2,
    content: `
      <h2>Platform Navigation</h2>
      <p>RostraCore uses a collapsible sidebar for primary navigation and a top header bar for quick actions, notifications, and user settings.</p>

      <h3>Sidebar Menu</h3>
      <p>The sidebar is organised into logical sections:</p>
      <ul>
        <li><strong>Dashboard</strong> &mdash; your operational overview</li>
        <li><strong>Workforce</strong> &mdash; employees, certifications, leave, attendance, training</li>
        <li><strong>Scheduling</strong> &mdash; roster, shifts, availability, swaps</li>
        <li><strong>Operations</strong> &mdash; clients, sites, patrols, incidents, post orders</li>
        <li><strong>Finance</strong> &mdash; payroll, invoices, budgets, revenue</li>
        <li><strong>Compliance</strong> &mdash; PSIRA, POPIA, contract compliance</li>
        <li><strong>Reports</strong> &mdash; operational summaries and exports</li>
        <li><strong>Settings</strong> &mdash; company profile, users, hourly rates, shift patterns</li>
      </ul>

      <h3>Role-Based Visibility</h3>
      <p>Menu items are shown or hidden based on your assigned role. For example:</p>
      <ol>
        <li><strong>Super Admin</strong> sees everything, including multi-organisation management</li>
        <li><strong>Org Admin</strong> sees all features within their organisation</li>
        <li><strong>Manager</strong> sees workforce, scheduling, and operations but not billing or admin settings</li>
        <li><strong>Supervisor</strong> sees attendance, patrols, and incidents for their assigned sites</li>
        <li><strong>Guard (Mobile)</strong> accesses check-in, patrol, and shift information via the mobile app</li>
      </ol>

      <h3>Top Header</h3>
      <p>The top header bar provides:</p>
      <ul>
        <li>Notification bell with unread count</li>
        <li>User avatar and quick profile access</li>
        <li>Organisation switcher (for super admins managing multiple companies)</li>
      </ul>

      <h3>Collapsing the Sidebar</h3>
      <p>Click the chevron arrow at the bottom of the sidebar to collapse it into icon-only mode. This gives you more screen space for data tables and reports. The sidebar auto-collapses on mobile devices and can be opened with the hamburger menu.</p>
    `,
  },
  {
    slug: 'getting-started-role-permissions',
    title: 'Roles and Permissions',
    description: 'Learn how role-based access control works and how admins configure permissions.',
    category: 'getting-started',
    categoryLabel: 'Getting Started',
    permissionKey: 'help.getting-started',
    order: 3,
    content: `
      <h2>Understanding Roles and Permissions</h2>
      <p>RostraCore uses a role-based access control (RBAC) system to ensure each user only sees and does what they are authorised to. This is critical in the private security industry where sensitive client and personnel data must be protected.</p>

      <h3>Built-in Roles</h3>
      <ul>
        <li><strong>Super Admin</strong> &mdash; Platform-level access. Can manage multiple organisations, configure system settings, and view all data across tenants.</li>
        <li><strong>Org Admin</strong> &mdash; Full access within a single organisation. Can manage users, payroll, clients, compliance, and all operational data.</li>
        <li><strong>Manager</strong> &mdash; Manages day-to-day operations: scheduling, attendance, incidents, and workforce. Cannot access billing or admin settings.</li>
        <li><strong>Supervisor</strong> &mdash; Site-level access. Manages attendance, patrols, and incidents for assigned sites only.</li>
        <li><strong>Client User</strong> &mdash; Read-only access to reports, incidents, and patrol data for their contracted sites.</li>
      </ul>

      <h3>How Permissions Are Applied</h3>
      <ol>
        <li>Each role has a set of permission keys (e.g., <strong>payroll.view</strong>, <strong>roster.edit</strong>, <strong>incidents.create</strong>).</li>
        <li>When a user logs in, their permissions are loaded and the UI adjusts automatically &mdash; hiding menu items and disabling actions they cannot perform.</li>
        <li>The API also enforces permissions server-side, so even direct API calls are protected.</li>
      </ol>

      <h3>Assigning Roles</h3>
      <p>To change a user's role, navigate to <strong>Settings &gt; Users</strong>, find the user, and click <strong>Edit</strong>. Select the new role from the dropdown and save. Changes take effect on the user's next login or page refresh.</p>

      <h3>Best Practices</h3>
      <ul>
        <li>Follow the principle of least privilege &mdash; give users the minimum role they need.</li>
        <li>Use the <strong>Supervisor</strong> role for site-level staff who only need to manage their own location.</li>
        <li>Assign <strong>Client User</strong> roles to your customers so they can view their own reports without seeing your internal data.</li>
      </ul>
    `,
  },

  // ── Workforce Management ─────────────────────────────────────────
  {
    slug: 'workforce-employees',
    title: 'Managing Employees',
    description: 'Add, edit, and manage security officers including PSIRA grades, ID numbers, and contact details.',
    category: 'workforce',
    categoryLabel: 'Workforce Management',
    permissionKey: 'help.workforce',
    order: 4,
    content: `
      <h2>Employee Management</h2>
      <p>The Employees module is the core of your workforce data. Every security officer, supervisor, and control room operator must be registered here before they can be assigned to shifts or appear on the roster.</p>

      <h3>Adding a New Employee</h3>
      <ol>
        <li>Navigate to <strong>Workforce &gt; Employees</strong> and click <strong>Add Employee</strong>.</li>
        <li>Enter their full name, South African ID number, and contact details (phone, email).</li>
        <li>Enter their <strong>PSIRA registration number</strong> and select their <strong>PSIRA grade</strong> (A, B, C, D, or E).</li>
        <li>Set their employment status (active, inactive, suspended, terminated).</li>
        <li>Optionally upload a profile photo and add emergency contact information.</li>
        <li>Click <strong>Save</strong> to create the employee record.</li>
      </ol>

      <h3>PSIRA Grades</h3>
      <p>South African private security officers are classified by PSIRA into grades that determine their permitted duties and minimum wage:</p>
      <ul>
        <li><strong>Grade A</strong> &mdash; Security manager / director level</li>
        <li><strong>Grade B</strong> &mdash; Security supervisor / site manager</li>
        <li><strong>Grade C</strong> &mdash; Access controller, reaction officer</li>
        <li><strong>Grade D</strong> &mdash; General guarding officer</li>
        <li><strong>Grade E</strong> &mdash; Entry-level guarding officer</li>
      </ul>

      <h3>Bulk Actions</h3>
      <p>Use the search and filter tools to find employees by name, PSIRA number, grade, or status. You can export filtered results to Excel or PDF for external reporting.</p>

      <h3>Employee Profile</h3>
      <p>Clicking on an employee opens their full profile showing:</p>
      <ul>
        <li>Personal and contact information</li>
        <li>Certification history and expiry dates</li>
        <li>Shift assignment history</li>
        <li>Attendance records and check-in data</li>
        <li>Leave balances and history</li>
        <li>Disciplinary records</li>
      </ul>
    `,
  },
  {
    slug: 'workforce-certifications',
    title: 'Certifications & PSIRA Compliance',
    description: 'Track PSIRA certificates, expiry alerts, grade requirements, and training qualifications.',
    category: 'workforce',
    categoryLabel: 'Workforce Management',
    permissionKey: 'help.workforce',
    order: 5,
    content: `
      <h2>Certification Management</h2>
      <p>All private security officers in South Africa must hold a valid PSIRA registration. RostraCore tracks certifications, sends expiry alerts, and prevents non-compliant officers from being assigned to shifts.</p>

      <h3>Adding a Certification</h3>
      <ol>
        <li>Go to <strong>Workforce &gt; Certifications</strong> and click <strong>Add Certification</strong>.</li>
        <li>Select the employee from the dropdown.</li>
        <li>Choose the certification type: PSIRA Registration, Firearm Competency, First Aid, Fire Fighting, or a custom type.</li>
        <li>Enter the certificate number, issue date, and expiry date.</li>
        <li>Optionally upload a scanned copy of the certificate.</li>
        <li>Click <strong>Save</strong>.</li>
      </ol>

      <h3>Expiry Alerts</h3>
      <p>RostraCore automatically monitors certification expiry dates and generates alerts:</p>
      <ul>
        <li><strong>90 days before expiry</strong> &mdash; yellow warning appears on the employee profile and the Cert Alerts page</li>
        <li><strong>30 days before expiry</strong> &mdash; orange alert, manager notification sent</li>
        <li><strong>Expired</strong> &mdash; red alert, employee flagged as non-compliant, blocked from new shift assignments</li>
      </ul>

      <h3>PSIRA Grade Requirements</h3>
      <p>When generating a roster, RostraCore checks that each site's grade requirement is met. For example, if a site requires a Grade B supervisor, only employees with an active Grade B (or higher) PSIRA registration can be assigned to that post.</p>

      <h3>Certification Dashboard</h3>
      <p>The certifications overview page shows:</p>
      <ul>
        <li>Total active certifications</li>
        <li>Number expiring within 30, 60, and 90 days</li>
        <li>Currently expired certifications requiring immediate action</li>
        <li>Filterable table with search by employee, type, or status</li>
      </ul>
    `,
  },
  {
    slug: 'workforce-leave',
    title: 'Leave Management',
    description: 'Request leave, approve requests, track leave balances, and manage leave types.',
    category: 'workforce',
    categoryLabel: 'Workforce Management',
    permissionKey: 'help.workforce',
    order: 6,
    content: `
      <h2>Leave Management</h2>
      <p>RostraCore handles leave requests in compliance with the South African Basic Conditions of Employment Act (BCEA), which governs annual leave, sick leave, family responsibility leave, and maternity leave.</p>

      <h3>Leave Types</h3>
      <ul>
        <li><strong>Annual Leave</strong> &mdash; 21 consecutive days (15 working days) per year as per BCEA</li>
        <li><strong>Sick Leave</strong> &mdash; 30 days over a 3-year cycle. A medical certificate is required for absences exceeding 2 consecutive days.</li>
        <li><strong>Family Responsibility Leave</strong> &mdash; 3 days per year for birth of a child, illness of a child, or death of close family</li>
        <li><strong>Maternity Leave</strong> &mdash; 4 consecutive months, starting at least 4 weeks before expected date of birth</li>
        <li><strong>Unpaid Leave</strong> &mdash; additional leave without pay, subject to manager approval</li>
      </ul>

      <h3>Requesting Leave</h3>
      <ol>
        <li>Navigate to <strong>Workforce &gt; Leave</strong>.</li>
        <li>Click <strong>Request Leave</strong>.</li>
        <li>Select the leave type, start date, and end date.</li>
        <li>Add an optional note explaining the reason.</li>
        <li>Click <strong>Submit</strong>. Your manager will be notified.</li>
      </ol>

      <h3>Approving Leave</h3>
      <p>Managers and admins see pending leave requests in the Leave page. They can approve or reject each request. Approved leave is automatically reflected in the roster &mdash; the system will flag unfilled shifts that result from the leave.</p>

      <h3>Leave Balances</h3>
      <p>Each employee's leave balance is tracked automatically. The balance card on the Leave page shows remaining days for each leave type. Balances reset according to the employment anniversary date or the organisation's configured leave cycle.</p>
    `,
  },
  {
    slug: 'workforce-attendance',
    title: 'Attendance & Check-In',
    description: 'GPS-verified check-ins, photo capture, attendance analytics, and exception reports.',
    category: 'workforce',
    categoryLabel: 'Workforce Management',
    permissionKey: 'help.workforce',
    order: 7,
    content: `
      <h2>Attendance Management</h2>
      <p>RostraCore provides a digital attendance system that replaces paper sign-in registers. Guards check in via the mobile app with GPS verification and optional photo capture to prove presence at the correct site.</p>

      <h3>How Check-In Works</h3>
      <ol>
        <li>The guard opens the RostraCore mobile app at the start of their shift.</li>
        <li>They tap <strong>Check In</strong>, which captures their GPS coordinates and compares them to the assigned site's geofence.</li>
        <li>If GPS is within range, the check-in is recorded as <strong>on-site</strong>. If outside the geofence, it is flagged as <strong>off-site</strong> for review.</li>
        <li>A selfie photo can be captured to provide visual proof of identity and presence.</li>
        <li>At the end of the shift, the guard taps <strong>Check Out</strong> to record their departure time.</li>
      </ol>

      <h3>Attendance Dashboard</h3>
      <p>The web-based attendance page shows:</p>
      <ul>
        <li>Real-time check-in status for all active shifts</li>
        <li>Late arrivals and early departures highlighted in amber</li>
        <li>No-shows highlighted in red</li>
        <li>GPS verification status (on-site / off-site)</li>
      </ul>

      <h3>Attendance Analytics</h3>
      <p>Navigate to <strong>Attendance &gt; Analytics</strong> for historical reports:</p>
      <ul>
        <li>Attendance rate by site, employee, or date range</li>
        <li>Punctuality trends over time</li>
        <li>Most common late-arrival patterns</li>
        <li>Export data to Excel or PDF for client reporting</li>
      </ul>

      <h3>Exception Handling</h3>
      <p>Supervisors can manually adjust attendance records when a guard had a legitimate reason for an anomaly (e.g., GPS inaccuracy, phone malfunction). All manual adjustments are logged in the audit trail.</p>
    `,
  },
  {
    slug: 'workforce-training',
    title: 'Training Management',
    description: 'Create training courses, assign employees, and track completion rates.',
    category: 'workforce',
    categoryLabel: 'Workforce Management',
    permissionKey: 'help.workforce',
    order: 8,
    content: `
      <h2>Training Management</h2>
      <p>Keeping your security officers trained and up to date is both a legal requirement and an operational necessity. RostraCore helps you manage training courses, track completions, and identify skill gaps.</p>

      <h3>Creating a Training Course</h3>
      <ol>
        <li>Navigate to <strong>Workforce &gt; Training</strong>.</li>
        <li>Click <strong>Add Course</strong>.</li>
        <li>Enter the course name (e.g., "PSIRA Grade C Refresher", "First Aid Level 1", "Firearm Handling").</li>
        <li>Set the provider, duration, and whether a certificate is issued on completion.</li>
        <li>If the course leads to a certification, link it to the certification type so records update automatically.</li>
        <li>Click <strong>Save</strong>.</li>
      </ol>

      <h3>Assigning Employees to Training</h3>
      <p>From the course detail page, click <strong>Assign Employees</strong>. You can select individual officers or use bulk selection by grade, site, or department. Assigned employees will receive a notification with the training date and details.</p>

      <h3>Tracking Completions</h3>
      <p>After training is completed, mark each attendee as <strong>Passed</strong>, <strong>Failed</strong>, or <strong>Absent</strong>. Passed employees will have their certification records updated automatically if the course is linked to a certification type.</p>

      <h3>Training Reports</h3>
      <ul>
        <li><strong>Completion Rate</strong> &mdash; percentage of assigned employees who completed the course</li>
        <li><strong>Skill Matrix</strong> &mdash; a cross-reference of employees and their qualifications (accessible under Workforce &gt; Skills Matrix)</li>
        <li><strong>Upcoming Training</strong> &mdash; calendar view of scheduled courses</li>
        <li><strong>Overdue Training</strong> &mdash; employees who missed their scheduled training date</li>
      </ul>

      <h3>PSIRA Requirements</h3>
      <p>PSIRA requires that all registered security officers undergo periodic re-training. RostraCore tracks these intervals and alerts you when officers are due for refresher courses.</p>
    `,
  },

  // ── Scheduling & Roster ──────────────────────────────────────────
  {
    slug: 'scheduling-roster-generation',
    title: 'Roster Auto-Generation',
    description: 'How the roster engine works, constraints it respects, and how to review generated rosters.',
    category: 'scheduling',
    categoryLabel: 'Scheduling & Roster',
    permissionKey: 'help.scheduling',
    order: 9,
    content: `
      <h2>Roster Auto-Generation</h2>
      <p>RostraCore's roster engine automatically assigns security officers to shifts based on multiple constraints, saving hours of manual scheduling while ensuring legal and operational compliance.</p>

      <h3>How It Works</h3>
      <ol>
        <li>Navigate to <strong>Scheduling &gt; Roster &gt; Generate</strong>.</li>
        <li>Select the date range for the roster period (typically one week or one month).</li>
        <li>Choose which sites and shifts to include.</li>
        <li>Click <strong>Generate Roster</strong>. The engine will process all constraints and produce an optimised assignment.</li>
        <li>Review the draft roster and make any manual adjustments before publishing.</li>
      </ol>

      <h3>Constraints the Engine Respects</h3>
      <ul>
        <li><strong>BCEA Compliance</strong> &mdash; maximum 45 ordinary hours per week, mandatory rest periods (12 hours between shifts, one full day off per week)</li>
        <li><strong>PSIRA Grade Matching</strong> &mdash; officers can only be assigned to posts matching their grade or higher</li>
        <li><strong>Certification Validity</strong> &mdash; officers with expired PSIRA registration or required certifications are excluded</li>
        <li><strong>Employee Availability</strong> &mdash; respects declared unavailability and approved leave</li>
        <li><strong>Site Skills</strong> &mdash; matches required skills (e.g., armed response, access control, CCTV monitoring) to employee qualifications</li>
        <li><strong>Overtime Limits</strong> &mdash; configurable maximum overtime hours per employee per period</li>
      </ul>

      <h3>Reviewing the Draft</h3>
      <p>The generated roster displays as a calendar grid. Each cell shows the assigned officer, shift time, and any warnings. Unfilled shifts appear in red. Click any cell to swap the assignment or mark it as requiring a spare pool officer.</p>

      <h3>Publishing</h3>
      <p>Once you are satisfied, click <strong>Publish</strong>. All assigned officers receive push notifications with their shift details. The roster is locked from further auto-generation but can still be edited manually.</p>
    `,
  },
  {
    slug: 'scheduling-shifts',
    title: 'Shifts & Shift Patterns',
    description: 'Create shifts, define shift patterns, set recurring templates, and manage shift costs.',
    category: 'scheduling',
    categoryLabel: 'Scheduling & Roster',
    permissionKey: 'help.scheduling',
    order: 10,
    content: `
      <h2>Shifts & Shift Patterns</h2>
      <p>Shifts are the building blocks of your roster. Each shift defines a time window at a specific site that needs to be staffed by a security officer.</p>

      <h3>Creating a Shift</h3>
      <ol>
        <li>Navigate to <strong>Scheduling &gt; Shifts</strong> and click <strong>Add Shift</strong>.</li>
        <li>Select the site and post (e.g., "Main Gate", "Control Room", "Patrol").</li>
        <li>Set the start time, end time, and date.</li>
        <li>Specify the required PSIRA grade and any additional skills.</li>
        <li>Set the billing rate and cost rate if different from defaults.</li>
        <li>Click <strong>Save</strong>.</li>
      </ol>

      <h3>Shift Patterns</h3>
      <p>Instead of creating shifts one by one, define reusable shift patterns under <strong>Settings &gt; Shift Patterns</strong>:</p>
      <ul>
        <li><strong>Day Shift</strong> &mdash; e.g., 06:00 to 18:00</li>
        <li><strong>Night Shift</strong> &mdash; e.g., 18:00 to 06:00</li>
        <li><strong>Split Shift</strong> &mdash; e.g., 06:00-12:00, then 16:00-20:00</li>
        <li><strong>Custom</strong> &mdash; any time configuration</li>
      </ul>
      <p>Patterns can be applied to sites in bulk, generating all the individual shift records for a selected period automatically.</p>

      <h3>Recurring Shifts</h3>
      <p>Mark a shift as recurring to automatically regenerate it daily, weekly, or on specific days of the week. This is ideal for sites with fixed staffing schedules.</p>

      <h3>Shift Costs</h3>
      <p>Each shift calculates costs based on:</p>
      <ul>
        <li>Hourly rate for the assigned officer's PSIRA grade</li>
        <li>Overtime multipliers (1.5x for first 3 hours, 2x thereafter as per BCEA)</li>
        <li>Sunday and public holiday rates (2x as per Sectoral Determination)</li>
        <li>Night shift allowances where applicable</li>
      </ul>
    `,
  },
  {
    slug: 'scheduling-shift-swaps',
    title: 'Shift Swaps',
    description: 'How officers request shift swaps, the approval workflow, and swap policies.',
    category: 'scheduling',
    categoryLabel: 'Scheduling & Roster',
    permissionKey: 'help.scheduling',
    order: 11,
    content: `
      <h2>Shift Swaps</h2>
      <p>Shift swaps allow officers to exchange assigned shifts with colleagues, subject to manager approval and compliance checks.</p>

      <h3>Requesting a Swap</h3>
      <ol>
        <li>The officer navigates to their upcoming shifts (on mobile or web).</li>
        <li>They select the shift they want to swap and tap <strong>Request Swap</strong>.</li>
        <li>They choose a colleague who is available during that time slot.</li>
        <li>Both parties must confirm the swap request.</li>
        <li>The request is sent to the supervisor or manager for final approval.</li>
      </ol>

      <h3>Approval Checks</h3>
      <p>Before a swap is approved, RostraCore verifies:</p>
      <ul>
        <li><strong>Grade compatibility</strong> &mdash; the replacement officer must hold the required PSIRA grade for the site</li>
        <li><strong>Certification validity</strong> &mdash; the replacement must have valid, non-expired certifications</li>
        <li><strong>Hours compliance</strong> &mdash; the swap must not push either officer over the BCEA weekly hour limit</li>
        <li><strong>Rest period</strong> &mdash; ensures the 12-hour minimum rest between shifts is maintained for both officers</li>
        <li><strong>Skills match</strong> &mdash; the replacement must possess any special skills required by the site (e.g., armed response, first aid)</li>
      </ul>

      <h3>Managing Swaps</h3>
      <p>Managers can view all pending swap requests under <strong>Scheduling &gt; Swaps</strong>. Each request shows both officers, the affected shifts, and any compliance warnings. Managers can approve or reject with an optional comment.</p>

      <h3>Swap History</h3>
      <p>All swap transactions are recorded for audit purposes. You can filter swap history by date, officer, site, or status (approved, rejected, cancelled).</p>
    `,
  },
  {
    slug: 'scheduling-availability',
    title: 'Guard Availability',
    description: 'Set availability windows, recurring patterns, and how availability feeds into roster generation.',
    category: 'scheduling',
    categoryLabel: 'Scheduling & Roster',
    permissionKey: 'help.scheduling',
    order: 12,
    content: `
      <h2>Guard Availability</h2>
      <p>The availability system lets officers declare when they are available or unavailable for shifts. This data feeds directly into the roster auto-generation engine.</p>

      <h3>Setting Availability</h3>
      <ol>
        <li>Navigate to <strong>Scheduling &gt; Availability</strong>.</li>
        <li>Select the employee (or view your own if you are an officer).</li>
        <li>Click on calendar days to mark them as available or unavailable.</li>
        <li>For partial-day availability, set specific time windows (e.g., "Available 06:00-14:00 only").</li>
        <li>Click <strong>Save</strong> to update the availability records.</li>
      </ol>

      <h3>Recurring Availability Patterns</h3>
      <p>For officers with consistent schedules, define a recurring pattern:</p>
      <ul>
        <li><strong>Example:</strong> "Available Monday to Friday, 06:00-18:00, unavailable weekends"</li>
        <li><strong>Example:</strong> "Available for night shifts only (18:00-06:00), any day"</li>
        <li><strong>Example:</strong> "Available 4 days on, 2 days off rotation"</li>
      </ul>
      <p>Patterns repeat automatically until changed. They can be overridden for specific dates (e.g., a public holiday or personal appointment).</p>

      <h3>Availability Heatmap</h3>
      <p>The <strong>Availability &gt; Heatmap</strong> view shows a colour-coded grid of all officers across a date range. This helps managers quickly identify:</p>
      <ul>
        <li>Days with low staffing availability</li>
        <li>Officers who are consistently unavailable</li>
        <li>Periods requiring additional hiring or overtime authorisation</li>
      </ul>

      <h3>How It Affects Rostering</h3>
      <p>The roster engine will never assign an officer to a shift during a period they have marked as unavailable. If too few officers are available for a given shift, the system flags it as <strong>unfilled</strong> and suggests spare pool officers or overtime assignments.</p>
    `,
  },

  // ── Operations ───────────────────────────────────────────────────
  {
    slug: 'operations-clients-sites',
    title: 'Clients & Sites',
    description: 'Manage client accounts, add physical sites, configure staffing requirements and billing.',
    category: 'operations',
    categoryLabel: 'Operations',
    permissionKey: 'help.operations',
    order: 13,
    content: `
      <h2>Client & Site Management</h2>
      <p>RostraCore organises your operations around clients and their physical sites. Each client can have multiple sites, and each site has its own staffing requirements, shift patterns, and billing configuration.</p>

      <h3>Adding a Client</h3>
      <ol>
        <li>Navigate to <strong>Operations &gt; Clients</strong> and click <strong>Add Client</strong>.</li>
        <li>Enter the client name, contact person, email, and phone number.</li>
        <li>Set the contract start and end dates.</li>
        <li>Configure billing rate (hourly or monthly) and target margin percentage.</li>
        <li>Add notes about special requirements or service level agreements.</li>
        <li>Click <strong>Save</strong>.</li>
      </ol>

      <h3>Adding a Site</h3>
      <ol>
        <li>Open a client record and click <strong>Add Site</strong>.</li>
        <li>Enter the site name and physical address.</li>
        <li>Set GPS coordinates for geofence check-in verification.</li>
        <li>Define the geofence radius (how close an officer must be to check in).</li>
        <li>Configure staffing requirements: number of posts, PSIRA grade per post, required skills.</li>
        <li>Assign shift patterns that apply to this site.</li>
      </ol>

      <h3>Site Staffing Profiles</h3>
      <p>Each site has a staffing profile that defines:</p>
      <ul>
        <li>Number of guards per shift (day/night)</li>
        <li>Minimum PSIRA grade required</li>
        <li>Special skills (armed response, K9, access control, CCTV)</li>
        <li>Supervisor requirements</li>
        <li>Equipment needs (radios, torches, firearms)</li>
      </ul>

      <h3>Client Portal Access</h3>
      <p>You can invite client contacts as <strong>Client Users</strong> so they can log in to view their own sites' data: patrol reports, incident logs, attendance records, and invoices. They cannot see data from other clients.</p>
    `,
  },
  {
    slug: 'operations-patrols',
    title: 'Patrol Tours & Checkpoints',
    description: 'Set up patrol routes, QR-based checkpoints, and monitor patrol completions in real time.',
    category: 'operations',
    categoryLabel: 'Operations',
    permissionKey: 'help.operations',
    order: 14,
    content: `
      <h2>Patrol Management</h2>
      <p>RostraCore's patrol system ensures guards are conducting their rounds as required. Patrol routes are defined with checkpoints that guards scan using QR codes or NFC tags via the mobile app.</p>

      <h3>Setting Up a Patrol Route</h3>
      <ol>
        <li>Navigate to <strong>Operations &gt; Patrols</strong> and click <strong>Create Patrol Route</strong>.</li>
        <li>Select the site where the patrol will take place.</li>
        <li>Name the route (e.g., "Perimeter Patrol", "Building Interior Check").</li>
        <li>Add checkpoints in the order they should be visited. Each checkpoint has a name and location description.</li>
        <li>Set the expected duration for the full patrol and time windows between checkpoints.</li>
        <li>Configure the patrol frequency (e.g., every 2 hours, 3 times per shift).</li>
      </ol>

      <h3>QR Code Checkpoints</h3>
      <p>Each checkpoint is assigned a unique QR code. Print these codes and affix them at the physical locations. When a guard scans a QR code:</p>
      <ul>
        <li>The timestamp is recorded</li>
        <li>GPS coordinates are captured</li>
        <li>The guard can add notes or flag issues</li>
        <li>A photo can be taken if required</li>
      </ul>

      <h3>Monitoring Patrols</h3>
      <p>The patrol dashboard shows real-time status:</p>
      <ul>
        <li><strong>In Progress</strong> &mdash; patrol started, checkpoints being scanned</li>
        <li><strong>Completed</strong> &mdash; all checkpoints scanned within time window</li>
        <li><strong>Missed</strong> &mdash; patrol was not started or checkpoints were skipped</li>
        <li><strong>Late</strong> &mdash; patrol completed but outside the expected time window</li>
      </ul>

      <h3>Patrol Analytics</h3>
      <p>Under <strong>Patrols &gt; Analytics</strong>, view completion rates, average patrol duration, missed checkpoint patterns, and officer performance rankings. This data can be included in client reports.</p>
    `,
  },
  {
    slug: 'operations-incidents',
    title: 'Incident Reporting',
    description: 'Report security incidents, set severity levels, track investigations, and generate reports.',
    category: 'operations',
    categoryLabel: 'Operations',
    permissionKey: 'help.operations',
    order: 15,
    content: `
      <h2>Incident Reporting</h2>
      <p>The incident management system provides a structured workflow for reporting, investigating, and resolving security incidents at your client sites.</p>

      <h3>Reporting an Incident</h3>
      <ol>
        <li>Navigate to <strong>Operations &gt; Incidents</strong> and click <strong>Report Incident</strong> (also available via the mobile app).</li>
        <li>Select the site where the incident occurred.</li>
        <li>Choose the incident type: theft, break-in, assault, fire, medical emergency, suspicious activity, equipment damage, or other.</li>
        <li>Set the severity level: <strong>Low</strong>, <strong>Medium</strong>, <strong>High</strong>, or <strong>Critical</strong>.</li>
        <li>Provide a detailed description of what happened, including time, location within the site, and persons involved.</li>
        <li>Attach photos, video, or documents as evidence.</li>
        <li>Click <strong>Submit</strong>.</li>
      </ol>

      <h3>Severity Levels</h3>
      <ul>
        <li><strong>Low</strong> &mdash; minor issues, no immediate threat (e.g., faulty lighting, minor policy violation)</li>
        <li><strong>Medium</strong> &mdash; requires attention within 24 hours (e.g., attempted break-in, suspicious vehicle)</li>
        <li><strong>High</strong> &mdash; significant incident requiring immediate response (e.g., theft in progress, assault)</li>
        <li><strong>Critical</strong> &mdash; life-threatening emergency (e.g., armed robbery, fire, medical emergency)</li>
      </ul>

      <h3>Investigation Workflow</h3>
      <p>After submission, incidents follow a workflow:</p>
      <ol>
        <li><strong>Reported</strong> &mdash; initial submission, pending review</li>
        <li><strong>Under Investigation</strong> &mdash; assigned to an investigator, evidence being gathered</li>
        <li><strong>Resolved</strong> &mdash; investigation complete, outcome documented</li>
        <li><strong>Closed</strong> &mdash; final review and archival</li>
      </ol>

      <h3>Incident Analytics</h3>
      <p>The <strong>Incidents &gt; Analytics</strong> page provides trend analysis, heatmaps by site, incident type distribution, and resolution time metrics. Use this data to identify problem sites and improve security measures.</p>
    `,
  },
  {
    slug: 'operations-post-orders',
    title: 'Post Orders & Site Instructions',
    description: 'Create site-specific instructions for guards, require acknowledgement, and track compliance.',
    category: 'operations',
    categoryLabel: 'Operations',
    permissionKey: 'help.operations',
    order: 16,
    content: `
      <h2>Post Orders</h2>
      <p>Post orders are the detailed written instructions that security officers must follow at each site. RostraCore digitises post orders so they are always accessible, up to date, and trackable.</p>

      <h3>Creating Post Orders</h3>
      <ol>
        <li>Navigate to the site detail page and click <strong>Post Orders</strong>.</li>
        <li>Click <strong>Add Post Order</strong>.</li>
        <li>Enter a title (e.g., "Main Gate Access Control Procedure").</li>
        <li>Write the detailed instructions covering entry/exit procedures, visitor management, emergency protocols, and reporting requirements.</li>
        <li>Attach any reference documents (site maps, emergency contact lists, key register).</li>
        <li>Set the effective date and review date.</li>
        <li>Click <strong>Publish</strong>.</li>
      </ol>

      <h3>Guard Acknowledgement</h3>
      <p>When post orders are published or updated, all officers assigned to that site receive a notification. They must read and acknowledge each post order via the mobile app. The system records:</p>
      <ul>
        <li>Who acknowledged and when</li>
        <li>Who has not yet acknowledged (follow-up alerts are sent)</li>
        <li>Version history of acknowledgements</li>
      </ul>

      <h3>Accessing Post Orders on Duty</h3>
      <p>Officers can access their current site's post orders at any time through the mobile app. This eliminates the need for printed binders and ensures guards always have the latest version.</p>

      <h3>Review and Updates</h3>
      <p>Post orders should be reviewed regularly. RostraCore tracks the review date and alerts site managers when a review is due. When updating a post order, a new version is created and the acknowledgement cycle restarts for all assigned officers.</p>
    `,
  },

  // ── Finance ──────────────────────────────────────────────────────
  {
    slug: 'finance-payroll',
    title: 'Payroll Processing',
    description: 'Run payroll with SA tax tables, UIF, PSIRA levies, and BCEA-compliant overtime calculations.',
    category: 'finance',
    categoryLabel: 'Finance',
    permissionKey: 'help.finance',
    order: 17,
    content: `
      <h2>Payroll Processing</h2>
      <p>RostraCore generates payroll based on actual shift hours worked, applying South African tax legislation, UIF contributions, and PSIRA sectoral determination wage rates.</p>

      <h3>Running Payroll</h3>
      <ol>
        <li>Navigate to <strong>Finance &gt; Payroll</strong> and click <strong>Generate Payroll</strong>.</li>
        <li>Select the payroll period (e.g., 1-28 February 2026).</li>
        <li>The system calculates earnings based on actual hours from attendance records.</li>
        <li>Review the payroll summary showing gross pay, deductions, and net pay for each employee.</li>
        <li>Make any manual adjustments (allowances, ad-hoc deductions, bonuses).</li>
        <li>Click <strong>Approve &amp; Finalise</strong> to lock the payroll run.</li>
      </ol>

      <h3>South African Tax Calculations</h3>
      <p>Payroll automatically applies:</p>
      <ul>
        <li><strong>PAYE</strong> &mdash; Pay As You Earn income tax, calculated using the latest SARS annual tax tables and brackets</li>
        <li><strong>UIF</strong> &mdash; Unemployment Insurance Fund, 1% employee contribution plus 1% employer contribution</li>
        <li><strong>SDL</strong> &mdash; Skills Development Levy, 1% of total payroll (employer cost)</li>
      </ul>

      <h3>Overtime Rates</h3>
      <p>As per the BCEA and Private Security Sectoral Determination:</p>
      <ul>
        <li><strong>Overtime (weekday)</strong> &mdash; 1.5x the normal hourly rate</li>
        <li><strong>Sunday work</strong> &mdash; 2x the normal hourly rate</li>
        <li><strong>Public holiday work</strong> &mdash; 2x the normal hourly rate</li>
        <li><strong>Night shift allowance</strong> &mdash; configurable percentage above base rate</li>
      </ul>

      <h3>Payslips</h3>
      <p>After finalising payroll, generate individual payslips in PDF format. Payslips show a breakdown of hours worked, rates applied, gross earnings, each deduction line, and net pay. They can be downloaded or emailed to employees.</p>

      <h3>Exports</h3>
      <p>Export payroll data to Excel for bank payment files or accounting system imports. The export includes employee banking details, net pay amounts, and payment references.</p>
    `,
  },
  {
    slug: 'finance-invoices',
    title: 'Client Invoicing',
    description: 'Create invoices for clients based on contracted hours, billing rates, and service levels.',
    category: 'finance',
    categoryLabel: 'Finance',
    permissionKey: 'help.finance',
    order: 18,
    content: `
      <h2>Client Invoicing</h2>
      <p>RostraCore generates professional invoices for your clients based on actual staffing hours, billing rates, and any additional charges.</p>

      <h3>Creating an Invoice</h3>
      <ol>
        <li>Navigate to <strong>Finance &gt; Invoices</strong> and click <strong>New Invoice</strong>.</li>
        <li>Select the client to invoice.</li>
        <li>Choose the billing period (e.g., 1-28 February 2026).</li>
        <li>The system auto-populates line items based on actual shift hours worked at each site.</li>
        <li>Review and adjust line items if needed (add ad-hoc charges, apply discounts).</li>
        <li>VAT is calculated automatically at 15% if your organisation is VAT-registered.</li>
        <li>Click <strong>Generate Invoice</strong>.</li>
      </ol>

      <h3>Invoice Line Items</h3>
      <p>Each line item typically includes:</p>
      <ul>
        <li>Site name</li>
        <li>Service description (e.g., "Grade C Guarding - Day Shift")</li>
        <li>Number of hours or shifts</li>
        <li>Hourly or per-shift rate</li>
        <li>Line total (excl. VAT)</li>
      </ul>

      <h3>Invoice Workflow</h3>
      <ul>
        <li><strong>Draft</strong> &mdash; editable, not yet sent</li>
        <li><strong>Sent</strong> &mdash; emailed or downloaded, payment pending</li>
        <li><strong>Paid</strong> &mdash; payment received, marked as settled</li>
        <li><strong>Overdue</strong> &mdash; past payment terms, highlighted for follow-up</li>
      </ul>

      <h3>Recurring Invoices</h3>
      <p>For clients on fixed monthly contracts, set up recurring invoices that generate automatically at the start of each billing cycle. You will receive a notification to review and send them.</p>

      <h3>Profitability Tracking</h3>
      <p>Compare invoice revenue against payroll costs per site to calculate actual profit margins. This data is available on the <strong>Site Profitability</strong> page.</p>
    `,
  },

  // ── Compliance ───────────────────────────────────────────────────
  {
    slug: 'compliance-psira',
    title: 'PSIRA Compliance',
    description: 'PSIRA wage compliance, grade requirements, minimum wage rates, and regulatory reporting.',
    category: 'compliance',
    categoryLabel: 'Compliance',
    permissionKey: 'help.compliance',
    order: 19,
    content: `
      <h2>PSIRA Compliance</h2>
      <p>The Private Security Industry Regulatory Authority (PSIRA) governs the South African private security sector. RostraCore helps you stay compliant with PSIRA regulations, wage determinations, and registration requirements.</p>

      <h3>Registration Requirements</h3>
      <p>Both your company and every individual security officer must be registered with PSIRA:</p>
      <ul>
        <li><strong>Company registration</strong> &mdash; your security business must hold a valid PSIRA business registration</li>
        <li><strong>Individual registration</strong> &mdash; every officer must hold a valid PSIRA certificate for their grade</li>
        <li><strong>Annual renewal</strong> &mdash; registrations must be renewed annually; RostraCore tracks renewal dates</li>
      </ul>

      <h3>Minimum Wage Compliance</h3>
      <p>PSIRA publishes minimum wages for each grade under the Sectoral Determination for the Private Security Sector. RostraCore stores current wage rates and validates that your payroll meets or exceeds these minimums:</p>
      <ul>
        <li><strong>Area A</strong> (major metro) &mdash; higher minimum rates</li>
        <li><strong>Area B</strong> (other areas) &mdash; slightly lower minimum rates</li>
      </ul>
      <p>If any employee is being paid below the minimum for their grade and area, the system raises a compliance warning during payroll processing.</p>

      <h3>Grade Requirements by Site</h3>
      <p>PSIRA regulations specify which grades can perform certain duties. RostraCore enforces this during roster generation: a Grade E officer cannot be placed on an armed response post that requires Grade C.</p>

      <h3>Compliance Dashboard</h3>
      <p>The <strong>Compliance &gt; PSIRA</strong> page shows:</p>
      <ul>
        <li>Overall compliance score for your organisation</li>
        <li>Officers with expired or expiring registrations</li>
        <li>Wage compliance status per employee</li>
        <li>Grade distribution across your workforce</li>
        <li>Audit-ready reports for PSIRA inspections</li>
      </ul>
    `,
  },
  {
    slug: 'compliance-popia',
    title: 'POPIA Compliance',
    description: 'Manage consent records, handle data subject requests, and maintain POPIA compliance.',
    category: 'compliance',
    categoryLabel: 'Compliance',
    permissionKey: 'help.compliance',
    order: 20,
    content: `
      <h2>POPIA Compliance</h2>
      <p>The Protection of Personal Information Act (POPIA) is South Africa's data protection law. RostraCore includes tools to help you comply with POPIA when processing employee and client personal information.</p>

      <h3>Consent Management</h3>
      <p>RostraCore tracks consent for the collection and processing of personal information:</p>
      <ul>
        <li>When employees are onboarded, they can provide consent via the mobile app or a signed consent form uploaded to the system.</li>
        <li>Consent records show what data is collected, the purpose, and the date consent was given.</li>
        <li>Employees can withdraw consent, triggering a review of what data must be retained for legal obligations (e.g., tax records) versus what can be deleted.</li>
      </ul>

      <h3>Data Subject Requests</h3>
      <p>Under POPIA, individuals have the right to:</p>
      <ol>
        <li><strong>Access</strong> &mdash; request a copy of all personal information held about them</li>
        <li><strong>Correction</strong> &mdash; request correction of inaccurate personal information</li>
        <li><strong>Deletion</strong> &mdash; request deletion of personal information (subject to retention obligations)</li>
        <li><strong>Objection</strong> &mdash; object to the processing of their personal information</li>
      </ol>
      <p>Navigate to <strong>Compliance &gt; POPIA</strong> to view and process data subject requests. Each request is tracked with a status (received, in progress, completed) and must be responded to within a reasonable time.</p>

      <h3>Data Retention</h3>
      <p>RostraCore applies configurable retention policies. Certain records must be retained for statutory periods:</p>
      <ul>
        <li><strong>Payroll records</strong> &mdash; 5 years (Income Tax Act)</li>
        <li><strong>Employment records</strong> &mdash; 3 years after termination (BCEA)</li>
        <li><strong>PSIRA records</strong> &mdash; duration of employment plus 3 years</li>
      </ul>

      <h3>Information Officer</h3>
      <p>Your organisation must designate an Information Officer responsible for POPIA compliance. Their details are recorded in RostraCore and included on all data processing notifications sent to employees and clients.</p>
    `,
  },

  // ── Administration ───────────────────────────────────────────────
  {
    slug: 'admin-user-management',
    title: 'User Management',
    description: 'Invite users, assign roles, manage access for internal staff and client contacts.',
    category: 'admin',
    categoryLabel: 'Administration',
    permissionKey: 'help.admin',
    order: 21,
    content: `
      <h2>User Management</h2>
      <p>The User Management page allows organisation administrators to invite new users, assign roles, and control access to the platform.</p>

      <h3>Inviting a New User</h3>
      <ol>
        <li>Navigate to <strong>Settings &gt; Users</strong> and click <strong>Invite User</strong>.</li>
        <li>Enter the user's email address.</li>
        <li>Select their role: Org Admin, Manager, Supervisor, or Client User.</li>
        <li>For Client User roles, select which client they belong to (they will only see that client's data).</li>
        <li>Click <strong>Send Invitation</strong>.</li>
        <li>The user receives an email with a registration link. They set their own password during registration.</li>
      </ol>

      <h3>Managing Existing Users</h3>
      <p>The users table shows all active and invited users. For each user you can:</p>
      <ul>
        <li><strong>Edit</strong> &mdash; change their role or associated client</li>
        <li><strong>Deactivate</strong> &mdash; disable their access without deleting their account (useful when someone leaves the company but you want to retain audit history)</li>
        <li><strong>Reactivate</strong> &mdash; re-enable a previously deactivated account</li>
        <li><strong>Resend Invitation</strong> &mdash; if the original invitation email expired or was lost</li>
      </ul>

      <h3>Security Best Practices</h3>
      <ul>
        <li>Limit the number of Org Admin accounts &mdash; most staff should be Managers or Supervisors</li>
        <li>Deactivate accounts immediately when someone leaves the organisation</li>
        <li>Review user access quarterly to ensure roles are still appropriate</li>
        <li>Encourage all users to enable strong passwords</li>
      </ul>

      <h3>Audit Trail</h3>
      <p>All user management actions (invitations, role changes, deactivations) are logged in the audit trail with the acting admin's details and timestamp. This is important for POPIA compliance and security governance.</p>
    `,
  },
  {
    slug: 'admin-company-profile',
    title: 'Company Profile Setup',
    description: 'Configure your organisation details, VAT registration, banking information, and company logo.',
    category: 'admin',
    categoryLabel: 'Administration',
    permissionKey: 'help.admin',
    order: 22,
    content: `
      <h2>Company Profile</h2>
      <p>Your company profile contains the core information used across RostraCore for payroll, invoicing, compliance reporting, and branding.</p>

      <h3>Organisation Details</h3>
      <ol>
        <li>Navigate to <strong>Settings &gt; Company Profile</strong>.</li>
        <li>Enter or update the following:</li>
      </ol>
      <ul>
        <li><strong>Company Name</strong> &mdash; your registered business name</li>
        <li><strong>Registration Number</strong> &mdash; CIPC company registration number</li>
        <li><strong>PSIRA Business Registration</strong> &mdash; your company's PSIRA registration number (required for all private security businesses in South Africa)</li>
        <li><strong>Trading As</strong> &mdash; if different from the registered name</li>
        <li><strong>Physical Address</strong> and <strong>Postal Address</strong></li>
        <li><strong>Phone Number</strong> and <strong>Email Address</strong></li>
      </ul>

      <h3>Tax and Financial Details</h3>
      <ul>
        <li><strong>VAT Number</strong> &mdash; enter your VAT registration number if your business is VAT-registered. This will be printed on all invoices and enables 15% VAT calculation.</li>
        <li><strong>Income Tax Number</strong> &mdash; your SARS income tax reference</li>
        <li><strong>UIF Reference Number</strong> &mdash; for UIF returns</li>
        <li><strong>SDL Number</strong> &mdash; for Skills Development Levy returns</li>
      </ul>

      <h3>Banking Details</h3>
      <p>Enter your company's bank account details for payroll processing:</p>
      <ul>
        <li>Bank name</li>
        <li>Branch code (or universal code)</li>
        <li>Account number</li>
        <li>Account type (current, savings)</li>
      </ul>

      <h3>Branding</h3>
      <p>Upload your company logo (PNG or JPG, recommended 200x200px). This logo appears on:</p>
      <ul>
        <li>Generated payslips</li>
        <li>Client invoices</li>
        <li>Exported reports</li>
        <li>The platform header (for your users)</li>
      </ul>

      <h3>Saving Changes</h3>
      <p>Click <strong>Save Profile</strong> after making changes. Some fields (like VAT number) trigger a re-validation of existing invoices, so changes are logged in the audit trail.</p>
    `,
  },
]
