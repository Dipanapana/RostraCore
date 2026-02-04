# Phase 1: Biometric Integration Foundation - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-modal attendance verification system supporting:
1. **Hardware option**: Fingerprint scanners at designated sites
2. **Phone option**: Camera-based facial recognition (no hardware required)
3. **Budget option**: Phone app + GPS-only (geofence validation, no biometric)

Attendance logged with timestamp, biometric confidence score, GPS coordinates, and device type. Payroll system pulls verified attendance records (not manual sheets).

**Out of scope**: Payroll calculation changes, shift scheduling, employee management beyond attendance verification.

</domain>

<decisions>
## Implementation Decisions

### Enrollment Flow
- **HR-initiated enrollment**: HR adds employee to system, then guides them through biometric enrollment during onboarding
- **Single photo for facial recognition**: One clear front-facing photo sufficient for phone-based enrollment (simpler UX over multiple angles)
- **HR-only biometric updates**: Employees cannot modify their own biometric data - prevents tampering, HR must approve and perform any re-enrollment
- **Temporary manual clock-ins on enrollment failure**: If biometric capture fails (blurry photo, poor lighting), employee can use manual clock-ins for grace period while enrollment is resolved

### Verification Thresholds
- **85% confidence minimum**: Baseline threshold for all biometric types (phone facial, fingerprint hardware)
- **Same threshold across all modalities**: No differentiation between hardware vs phone - consistent 85% for simplicity
- **Allow with warnings below threshold**: Clock-ins between 70-84% confidence succeed but flag for HR review with notification
- **Adaptive per-employee thresholds**: System tracks individual verification history and can relax threshold for employees with consistently high-confidence verifications (e.g., 10+ successful 90%+ verifications might lower their minimum to 80%)

### Claude's Discretion
- Exact implementation of adaptive threshold algorithm (learning rate, history window)
- GPS geofence validation logic (how strict, error handling)
- Biometric data storage format and encryption approach
- Error messages and user guidance during enrollment
- Progress indicators during verification

</decisions>

<specifics>
## Specific Ideas

- Grace period for failed enrollment should be reasonable (suggest 3-5 days) to avoid blocking employees from working
- Confidence score history useful for detecting patterns (e.g., always fails at night = poor lighting at site)
- Hardware fingerprint scanners assumed to be more reliable than phone cameras in practice
- Adaptive thresholds prevent frustration for employees who consistently verify well

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-biometric-integration-foundation*
*Context gathered: 2026-02-05*
