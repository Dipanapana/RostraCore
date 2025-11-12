# GuardianOS Mobile API Specification
**Version:** 1.0
**Last Updated:** November 12, 2025
**Target:** React Native Expo Guard App

---

## Base URL
```
Production: https://api.guardianos.co.za/api/v1/mobile
Development: http://localhost:8000/api/v1/mobile
```

---

## Authentication

All mobile endpoints require JWT authentication in the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

### 1. Login (Username/Password)
```http
POST /auth/login
```

**Request Body:**
```json
{
  "username": "john.guard",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "employee_id": 123,
    "full_name": "John Guard",
    "email": "john@example.com",
    "role": "guard",
    "psira_number": "1234567",
    "profile_photo_url": "https://..."
  }
}
```

### 2. PIN Login (Quick Re-Auth)
```http
POST /auth/pin-login
```

**Request Body:**
```json
{
  "employee_id": 123,
  "pin": "1234"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

### 3. Setup PIN
```http
POST /auth/setup-pin
```

**Request Body:**
```json
{
  "pin": "1234",
  "confirm_pin": "1234"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "PIN set successfully"
}
```

### 4. Refresh Token
```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

---

## Shifts

### 5. Get Today's Shifts
```http
GET /shifts/today
```

**Response (200 OK):**
```json
{
  "date": "2025-11-12",
  "shifts": [
    {
      "shift_id": 456,
      "site_id": 12,
      "site_name": "Sandton Office Park",
      "site_address": "123 Sandton Dr, Sandton, 2196",
      "client_name": "ABC Security Ltd",
      "start_time": "2025-11-12T18:00:00Z",
      "end_time": "2025-11-13T06:00:00Z",
      "duration_hours": 12,
      "shift_type": "Night Shift",
      "position": "Armed Response",
      "instructions": "Patrol every 2 hours. Check CCTV at start of shift.",
      "supervisor": {
        "employee_id": 789,
        "full_name": "Jane Supervisor",
        "phone": "+27 82 123 4567"
      },
      "check_in_status": null,
      "check_out_status": null,
      "location": {
        "latitude": "-26.107138",
        "longitude": "28.056305"
      }
    }
  ]
}
```

### 6. Get Upcoming Shifts
```http
GET /shifts/upcoming?days=7
```

**Query Parameters:**
- `days` (optional): Number of days ahead to fetch (default: 7, max: 30)

**Response (200 OK):**
```json
{
  "shifts": [
    {
      "shift_id": 457,
      "site_name": "Century City Mall",
      "start_time": "2025-11-13T06:00:00Z",
      "end_time": "2025-11-13T18:00:00Z",
      "shift_type": "Day Shift",
      "status": "scheduled"
    }
  ],
  "total": 5
}
```

### 7. Get Shift Details
```http
GET /shifts/{shift_id}
```

**Response (200 OK):**
```json
{
  "shift_id": 456,
  "site": {
    "site_id": 12,
    "site_name": "Sandton Office Park",
    "address": "123 Sandton Dr, Sandton, 2196",
    "contact_person": "Security Manager",
    "contact_phone": "+27 11 123 4567",
    "emergency_contacts": [
      {
        "name": "Armed Response",
        "phone": "+27 82 999 8888"
      }
    ]
  },
  "shift_details": {
    "start_time": "2025-11-12T18:00:00Z",
    "end_time": "2025-11-13T06:00:00Z",
    "position": "Armed Response",
    "instructions": "Patrol every 2 hours. Check CCTV at start of shift.",
    "equipment_required": ["Radio", "Torch", "Panic Button"]
  },
  "patrol_routes": [
    {
      "route_id": 1,
      "route_name": "Perimeter Check",
      "checkpoints": [
        {"checkpoint_id": 1, "name": "Main Gate", "qr_code": "QR001"},
        {"checkpoint_id": 2, "name": "Back Entrance", "qr_code": "QR002"}
      ]
    }
  ],
  "check_in": null,
  "check_out": null
}
```

---

## Check-In / Check-Out

### 8. Check In to Shift
```http
POST /shifts/{shift_id}/check-in
```

**Request Body:**
```json
{
  "latitude": "-26.107138",
  "longitude": "28.056305",
  "accuracy": "15.2",
  "photo_url": "https://storage.guardianos.co.za/checkins/123_20251112_1800.jpg",
  "notes": "All equipment checked and functional"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "check_in_id": 789,
  "timestamp": "2025-11-12T18:02:35Z",
  "status": "on_time",
  "distance_from_site": 12.5,
  "message": "Checked in successfully"
}
```

**Response (400 Bad Request - Too far from site):**
```json
{
  "success": false,
  "error": "location_too_far",
  "distance_from_site": 350.2,
  "max_distance": 200,
  "message": "You are 350m from the site. Please move closer to check in."
}
```

### 9. Check Out from Shift
```http
POST /shifts/{shift_id}/check-out
```

**Request Body:**
```json
{
  "latitude": "-26.107138",
  "longitude": "28.056305",
  "accuracy": "18.7",
  "photo_url": "https://storage.guardianos.co.za/checkouts/123_20251113_0600.jpg",
  "handover_notes": "All quiet. Handed keys to John Doe.",
  "relieving_guard_id": 124
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "check_out_id": 790,
  "timestamp": "2025-11-13T06:01:15Z",
  "total_hours_worked": 12.02,
  "message": "Checked out successfully"
}
```

---

## OB (Occurrence Book) Entries

### 10. Create OB Entry
```http
POST /ob/entries
```

**Request Body:**
```json
{
  "shift_id": 456,
  "site_id": 12,
  "category": "visitor",
  "description": "Visitor John Doe from ABC Ltd for delivery",
  "entry_data": {
    "name": "John Doe",
    "id_number": "8501015800089",
    "company": "ABC Ltd",
    "time_in": "09:15",
    "time_out": "09:45",
    "purpose": "Delivery"
  },
  "latitude": "-26.107138",
  "longitude": "28.056305",
  "requires_review": false
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "entry_id": 1001,
  "timestamp": "2025-11-12T19:15:00Z",
  "message": "OB entry created successfully"
}
```

### 11. Get OB Entries
```http
GET /ob/entries?shift_id=456&limit=50
```

**Query Parameters:**
- `shift_id` (optional): Filter by shift
- `category` (optional): Filter by category
- `start_date` (optional): From date
- `end_date` (optional): To date
- `limit` (optional): Max results (default: 50)

**Response (200 OK):**
```json
{
  "entries": [
    {
      "entry_id": 1001,
      "category": "visitor",
      "timestamp": "2025-11-12T19:15:00Z",
      "description": "Visitor John Doe from ABC Ltd for delivery",
      "entry_data": {
        "name": "John Doe",
        "company": "ABC Ltd"
      },
      "photo_urls": [],
      "supervisor_reviewed": false
    }
  ],
  "total": 15
}
```

### 12. Get OB Categories
```http
GET /ob/categories
```

**Response (200 OK):**
```json
{
  "categories": [
    {
      "value": "visitor",
      "label": "Visitor Log",
      "icon": "person",
      "fields": ["name", "id_number", "company", "time_in", "time_out", "purpose"]
    },
    {
      "value": "key_handover",
      "label": "Key Handover",
      "icon": "key",
      "fields": ["key_id", "action", "recipient", "signature"]
    },
    {
      "value": "alarm",
      "label": "Alarm Activation",
      "icon": "alarm",
      "fields": ["zone", "type", "response", "reset_time"]
    },
    {
      "value": "patrol",
      "label": "Patrol Completed",
      "icon": "walk",
      "fields": ["route", "checkpoints", "duration_mins", "issues"]
    },
    {
      "value": "equipment",
      "label": "Equipment Status",
      "icon": "tool",
      "fields": ["item", "status", "issue", "reported"]
    },
    {
      "value": "observation",
      "label": "General Observation",
      "icon": "eye",
      "fields": ["observation_type", "details"]
    }
  ]
}
```

### 13. Upload OB Entry Photos
```http
POST /ob/{entry_id}/photos
```

**Request:** `multipart/form-data`
```
photo1: [binary file]
photo2: [binary file]
photo3: [binary file]
```

**Response (200 OK):**
```json
{
  "success": true,
  "photo_urls": [
    "https://storage.guardianos.co.za/ob/1001_photo1.jpg",
    "https://storage.guardianos.co.za/ob/1001_photo2.jpg"
  ],
  "count": 2
}
```

---

## Incident Reports

### 14. Create Incident Report
```http
POST /incidents
```

**Request Body:**
```json
{
  "shift_id": 456,
  "site_id": 12,
  "incident_date": "2025-11-12T20:30:00Z",
  "incident_type": "theft",
  "severity": "high",
  "location_details": "Parking lot, Bay C-12",
  "description": "Attempted vehicle break-in. Suspect fled when challenged.",
  "action_taken": "Pursued suspect, called SAPS, secured crime scene",
  "police_notified": true,
  "police_case_number": "CAS 123/11/2025",
  "police_station": "Sandton SAPS",
  "witness_details": "Security guard at neighbouring building saw suspect",
  "latitude": "-26.107500",
  "longitude": "28.056500"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "incident_id": 567,
  "reference_number": "INC-2025-567",
  "timestamp": "2025-11-12T20:35:00Z",
  "message": "Incident report created successfully"
}
```

### 15. Get My Incident Reports
```http
GET /incidents?limit=20&status=open
```

**Query Parameters:**
- `limit` (optional): Max results (default: 20)
- `status` (optional): Filter by status (open, under_investigation, resolved, closed)
- `start_date` (optional): From date
- `end_date` (optional): To date

**Response (200 OK):**
```json
{
  "incidents": [
    {
      "incident_id": 567,
      "reference_number": "INC-2025-567",
      "incident_type": "theft",
      "severity": "high",
      "incident_date": "2025-11-12T20:30:00Z",
      "status": "under_investigation",
      "supervisor_reviewed": true
    }
  ],
  "total": 3
}
```

### 16. Upload Incident Photos
```http
POST /incidents/{incident_id}/photos
```

**Request:** `multipart/form-data`
```
photo1: [binary file]
photo2: [binary file]
...
photo5: [binary file]
```

**Response (200 OK):**
```json
{
  "success": true,
  "photo_urls": [
    "https://storage.guardianos.co.za/incidents/567_photo1.jpg",
    "https://storage.guardianos.co.za/incidents/567_photo2.jpg"
  ],
  "count": 2
}
```

### 17. Upload Incident Video
```http
POST /incidents/{incident_id}/video
```

**Request:** `multipart/form-data`
```
video: [binary file, max 60 seconds]
```

**Response (200 OK):**
```json
{
  "success": true,
  "video_url": "https://storage.guardianos.co.za/incidents/567_video.mp4",
  "duration_seconds": 45
}
```

### 18. Add Signatures to Incident
```http
POST /incidents/{incident_id}/signatures
```

**Request Body:**
```json
{
  "guard_signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA...",
  "witness_signatures": [
    {
      "name": "Witness 1",
      "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA..."
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "signature_urls": {
    "guard": "https://storage.guardianos.co.za/incidents/567_guard_sig.png",
    "witnesses": [
      "https://storage.guardianos.co.za/incidents/567_witness1_sig.png"
    ]
  }
}
```

---

## Patrols

### 19. Get Patrol Routes
```http
GET /patrols/routes?site_id=12
```

**Query Parameters:**
- `site_id` (optional): Filter by site

**Response (200 OK):**
```json
{
  "routes": [
    {
      "route_id": 1,
      "route_name": "Perimeter Patrol",
      "site_id": 12,
      "site_name": "Sandton Office Park",
      "checkpoints": [
        {
          "checkpoint_id": 1,
          "name": "Main Gate",
          "sequence": 1,
          "qr_code": "QR001",
          "latitude": "-26.107138",
          "longitude": "28.056305"
        },
        {
          "checkpoint_id": 2,
          "name": "Back Entrance",
          "sequence": 2,
          "qr_code": "QR002",
          "latitude": "-26.107500",
          "longitude": "28.056500"
        }
      ],
      "estimated_duration_mins": 20
    }
  ]
}
```

### 20. Scan Checkpoint (QR/NFC)
```http
POST /patrols/scan
```

**Request Body:**
```json
{
  "shift_id": 456,
  "route_id": 1,
  "checkpoint_id": 1,
  "scan_data": "QR001",
  "scan_type": "qr_code",
  "latitude": "-26.107138",
  "longitude": "28.056305",
  "notes": "All clear"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "scan_id": 234,
  "timestamp": "2025-11-12T19:30:00Z",
  "checkpoint_name": "Main Gate",
  "next_checkpoint": {
    "checkpoint_id": 2,
    "name": "Back Entrance",
    "sequence": 2
  },
  "progress": "1/5 checkpoints completed"
}
```

### 21. Get Patrol History
```http
GET /patrols/history?shift_id=456
```

**Query Parameters:**
- `shift_id` (optional): Filter by shift
- `start_date` (optional): From date
- `end_date` (optional): To date
- `limit` (optional): Max results (default: 50)

**Response (200 OK):**
```json
{
  "patrols": [
    {
      "patrol_id": 890,
      "route_name": "Perimeter Patrol",
      "start_time": "2025-11-12T19:25:00Z",
      "end_time": "2025-11-12T19:45:00Z",
      "duration_mins": 20,
      "checkpoints_completed": 5,
      "checkpoints_total": 5,
      "status": "completed"
    }
  ],
  "total": 12
}
```

---

## Supervisor Features

### 22. Get Guards On Duty
```http
GET /supervisor/guards-on-duty
```

**Response (200 OK):**
```json
{
  "guards": [
    {
      "employee_id": 123,
      "full_name": "John Guard",
      "site_name": "Sandton Office Park",
      "shift_id": 456,
      "check_in_time": "2025-11-12T18:02:35Z",
      "status": "on_duty",
      "last_activity": "2025-11-12T19:30:00Z",
      "last_activity_type": "patrol_scan"
    }
  ],
  "total_on_duty": 25
}
```

### 23. Get Guard Locations
```http
GET /supervisor/locations
```

**Response (200 OK):**
```json
{
  "locations": [
    {
      "employee_id": 123,
      "full_name": "John Guard",
      "latitude": "-26.107138",
      "longitude": "28.056305",
      "accuracy": "15.2",
      "timestamp": "2025-11-12T19:35:00Z",
      "site_name": "Sandton Office Park"
    }
  ]
}
```

### 24. Broadcast Message
```http
POST /supervisor/broadcast
```

**Request Body:**
```json
{
  "message": "Security alert: Suspicious activity reported at Building B",
  "priority": "high",
  "recipient_ids": [123, 124, 125],
  "site_ids": [12]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message_id": 456,
  "recipients_count": 3,
  "sent_at": "2025-11-12T19:40:00Z"
}
```

### 25. Get Pending Incident Reviews
```http
GET /supervisor/incidents/pending
```

**Response (200 OK):**
```json
{
  "incidents": [
    {
      "incident_id": 567,
      "reference_number": "INC-2025-567",
      "incident_type": "theft",
      "severity": "high",
      "reported_by": "John Guard",
      "incident_date": "2025-11-12T20:30:00Z",
      "site_name": "Sandton Office Park"
    }
  ],
  "total_pending": 5
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "latitude"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error",
  "error_id": "ERR-2025-123456"
}
```

---

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute
- **Read endpoints** (GET): 100 requests per minute
- **Write endpoints** (POST/PUT/DELETE): 30 requests per minute

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699876543
```

---

## Offline Support

The mobile app should implement offline queueing for:
- Check-ins/check-outs
- OB entries
- Patrol scans
- Incident reports (without media)

When connection is restored, queued items should sync automatically.

---

## Push Notifications

Guards will receive push notifications for:
- Shift reminders (30 mins before start)
- Supervisor broadcasts
- Incident alerts
- Patrol reminders (based on route schedule)

**Notification Payload:**
```json
{
  "type": "shift_reminder",
  "title": "Shift Starting Soon",
  "body": "Your shift at Sandton Office Park starts in 30 minutes",
  "data": {
    "shift_id": 456,
    "site_id": 12
  }
}
```

---

## Implementation Priority

**Week 2 (Current Focus):**
1. ✅ Authentication endpoints (login, PIN, refresh)
2. ✅ Shift endpoints (today, upcoming, details)
3. ✅ Check-in/check-out endpoints
4. ⏳ OB entry endpoints
5. ⏳ Basic incident report endpoints

**Week 3:**
6. Patrol endpoints (routes, scanning)
7. Media upload endpoints (photos, videos)
8. Incident signatures

**Week 4:**
9. Supervisor endpoints
10. Push notifications
11. Offline sync queue

---

**Endpoint Count:** 25 endpoints
**Status:** Ready for implementation
**Next Step:** Create FastAPI router files for mobile API
