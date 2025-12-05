# Client Page & Branding Fixes - GuardianOS

## Priority 2: Client Page Fixes

### Issue 1: Hardcoded org_id

**File:** `frontend/src/app/clients/page.tsx`

**Problem:** Line ~50 has hardcoded `org_id: 1`

**Current Code:**
```typescript
body: JSON.stringify({
  ...formData,
  org_id: 1, // TODO: Get from auth context - HARDCODED!
  billing_rate: formData.billing_rate ? Number(formData.billing_rate) : null,
}),
```

**Fix:** Get org_id from AuthContext

```typescript
// At the top of the component, after other hooks:
const { user } = useAuth(); // user should have org_id

// In handleSubmit:
body: JSON.stringify({
  ...formData,
  org_id: user?.org_id || 1, // Fallback to 1 if not available
  billing_rate: formData.billing_rate ? Number(formData.billing_rate) : null,
}),
```

---

### Issue 2: Site Name Field Not Visible

**Problem:** When adding/editing clients, the site name field may not be visible or functional

**Fix:** Ensure the form includes a site_name input

**File:** `frontend/src/app/clients/page.tsx`

Find the form section and ensure it has:

```typescript
// In the client form state:
const [formData, setFormData] = useState({
  client_name: "",
  contact_person: "",
  contact_email: "",
  contact_phone: "",
  billing_rate: "",
  // Add site fields:
  site_name: "",
  site_location: "",
  site_address: "",
});

// In the JSX form:
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    Site Name *
  </label>
  <input
    type="text"
    value={formData.site_name}
    onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
    className="w-full p-2 border rounded"
    required
  />
</div>

<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    Site Location
  </label>
  <input
    type="text"
    value={formData.site_location}
    onChange={(e) => setFormData({ ...formData, site_location: e.target.value })}
    className="w-full p-2 border rounded"
    placeholder="e.g., Pretoria, Gauteng"
  />
</div>

<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    Site Address
  </label>
  <textarea
    value={formData.site_address}
    onChange={(e) => setFormData({ ...formData, site_address: e.target.value })}
    className="w-full p-2 border rounded"
    rows={3}
    placeholder="Full physical address"
  />
</div>
```

---

### Issue 3: Create Site When Adding Client

**Problem:** Need to create a site along with the client

**Fix:** Update the API call to create both client and site

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const { user } = useAuth();

    // Step 1: Create/Update Client
    const clientUrl = editingClient
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/clients/${editingClient.client_id}`
      : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/clients`;

    const clientMethod = editingClient ? "PUT" : "POST";

    const clientResponse = await fetch(clientUrl, {
      method: clientMethod,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        client_name: formData.client_name,
        contact_person: formData.contact_person,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        org_id: user?.org_id || 1,
        billing_rate: formData.billing_rate ? Number(formData.billing_rate) : null,
      }),
    });

    if (!clientResponse.ok) {
      const errorData = await clientResponse.json();
      throw new Error(errorData.detail || "Failed to save client");
    }

    const clientData = await clientResponse.json();
    const clientId = clientData.client_id;

    // Step 2: Create Site if site_name is provided and not editing
    if (formData.site_name && !editingClient) {
      const siteResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sites`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            client_id: clientId,
            site_name: formData.site_name,
            location: formData.site_location,
            address: formData.site_address,
          }),
        }
      );

      if (!siteResponse.ok) {
        console.error("Failed to create site, but client was created");
        // Continue anyway - client was created
      }
    }

    setShowModal(false);
    setFormData({
      client_name: "",
      contact_person: "",
      contact_email: "",
      contact_phone: "",
      billing_rate: "",
      site_name: "",
      site_location: "",
      site_address: "",
    });
    fetchClients(); // Refresh client list

  } catch (error: any) {
    console.error("Error saving client:", error);
    alert(error.message || "Failed to save client");
  }
};
```

---

### Issue 4: Display Sites for Each Client

**Problem:** Client list should show associated sites

**Fix:** Fetch and display sites for each client

```typescript
// Add to the client type definition:
interface Client {
  client_id: number;
  client_name: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  billing_rate: number | null;
  sites?: Site[]; // Add this
}

interface Site {
  site_id: number;
  site_name: string;
  location: string;
  address: string;
}

// In fetchClients, include sites:
const fetchClients = async () => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/clients?include_sites=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    setClients(data);
  } catch (error) {
    console.error("Error fetching clients:", error);
  }
};

// In the client card display:
{clients.map((client) => (
  <div key={client.client_id} className="border rounded-lg p-4">
    <h3 className="text-lg font-bold">{client.client_name}</h3>
    <p className="text-sm text-gray-600">{client.contact_person}</p>
    <p className="text-sm">{client.contact_email}</p>

    {/* Display sites */}
    {client.sites && client.sites.length > 0 && (
      <div className="mt-3 pt-3 border-t">
        <p className="text-sm font-semibold mb-2">Sites:</p>
        <ul className="space-y-1">
          {client.sites.map((site) => (
            <li key={site.site_id} className="text-sm">
              📍 {site.site_name} - {site.location}
            </li>
          ))}
        </ul>
      </div>
    )}

    <div className="mt-4 flex gap-2">
      <button onClick={() => handleEdit(client)}>Edit</button>
      <button onClick={() => handleDelete(client.client_id)}>Delete</button>
    </div>
  </div>
))}
```

---

### Backend Changes Required

**File:** `backend/app/routers/clients.py`

Ensure the GET clients endpoint returns sites:

```python
@router.get("/", response_model=List[ClientOut])
async def get_clients(
    include_sites: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all clients for the user's organization"""
    clients = db.query(Client).filter(
        Client.org_id == current_user.org_id
    ).all()

    if include_sites:
        # Eagerly load sites
        for client in clients:
            client.sites  # This triggers loading of sites relationship

    return clients
```

Ensure the Client schema includes sites:

```python
# In backend/app/schemas/client.py
class ClientOut(BaseModel):
    client_id: int
    client_name: str
    contact_person: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    billing_rate: Optional[float]
    sites: List[SiteOut] = []  # Add this

    class Config:
        from_attributes = True
```

---

## Priority 3: Update Branding to GuardianOS

### Files to Update:

#### 1. Backend Configuration

**File:** `backend/app/config.py`

```python
# Application Settings
APP_NAME = "GuardianOS"  # Change from "RostraCore"
APP_VERSION = "1.0.0"
```

#### 2. Frontend Page Titles

**File:** `frontend/src/app/layout.tsx`

```typescript
export const metadata: Metadata = {
  title: "GuardianOS - Security Workforce Management",
  description: "AI-powered security guard management and rostering system",
};
```

#### 3. Navigation Header

**File:** `frontend/src/components/Navigation.tsx` or similar

```typescript
<nav>
  <div className="logo">
    <h1>GuardianOS</h1> {/* Change from RostraCore */}
  </div>
  {/* rest of nav */}
</nav>
```

#### 4. Login Page

**File:** `frontend/src/app/login/page.tsx`

```typescript
<div className="login-container">
  <h1 className="text-3xl font-bold mb-6">GuardianOS</h1>
  <p className="text-gray-600 mb-8">Security Workforce Management</p>
  {/* rest of login form */}
</div>
```

#### 5. Dashboard Header

**File:** `frontend/src/app/dashboard/page.tsx`

```typescript
<h1 className="text-2xl font-bold">GuardianOS Dashboard</h1>
```

#### 6. API Documentation

**File:** `backend/app/main.py`

```python
app = FastAPI(
    title="GuardianOS API",  # Change from "RostraCore API"
    description="Security Guard Management and Rostering System",
    version="1.0.0"
)
```

#### 7. README Files

**Files:** `README.md`, `QUICKSTART.md`, etc.

Search and replace:
- "RostraCore" → "GuardianOS"
- "rostracore" → "guardianos"

```bash
# Run this in the root directory:
find . -type f \( -name "*.md" -o -name "*.txt" \) -exec sed -i 's/RostraCore/GuardianOS/g' {} +
find . -type f \( -name "*.md" -o -name "*.txt" \) -exec sed -i 's/rostracore/guardianos/g' {} +
```

#### 8. Database Names (Optional - for new deployments)

If starting fresh:
- Database: `guardianos_db` instead of `rostracore_db`
- User: `guardianos_user` instead of `rostracore_user`

**Note:** For existing deployments, keep database names as-is to avoid migration issues.

#### 9. Environment Variables

**File:** `backend/.env`

```bash
# Keep DATABASE_URL as is (don't rename database)
DATABASE_URL=postgresql://rostracore_user:password@localhost:5432/rostracore_db

# Update app name
APP_NAME=GuardianOS
```

#### 10. Package Names (Optional)

**File:** `frontend/package.json`

```json
{
  "name": "guardianos-frontend",
  "description": "GuardianOS Security Management Frontend"
}
```

**File:** `backend/setup.py` (if exists)

```python
setup(
    name="guardianos-backend",
    description="GuardianOS Security Management Backend",
)
```

---

### Quick Branding Update Script

Create this script to automate branding updates:

**File:** `update_branding.sh`

```bash
#!/bin/bash

echo "Updating RostraCore -> GuardianOS branding..."

# Update markdown files
find . -type f -name "*.md" -exec sed -i 's/RostraCore/GuardianOS/g' {} +
find . -type f -name "*.md" -exec sed -i 's/rostracore/guardianos/g' {} +

# Update Python files (careful with imports)
find ./backend -type f -name "*.py" -exec sed -i 's/RostraCore/GuardianOS/g' {} +

# Update TypeScript/TSX files
find ./frontend/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/RostraCore/GuardianOS/g' {} +

# Update config files
sed -i 's/RostraCore/GuardianOS/g' ./backend/app/config.py
sed -i 's/rostracore/guardianos/g' ./frontend/package.json

echo "Branding update complete!"
echo "Manual review needed for:"
echo "  - Database connection strings (keep as rostracore_db)"
echo "  - Import statements in Python (keep as app.* not guardianos.*)"
echo "  - Docker container names"
```

---

## Testing Checklist

After making these changes:

### Client Page:
- [ ] Can add new client with site information
- [ ] Site name field is visible and required
- [ ] Site location and address fields work
- [ ] Client list shows all sites for each client
- [ ] org_id is correctly fetched from user context
- [ ] Edit client works correctly
- [ ] Delete client works correctly

### Branding:
- [ ] Login page shows "GuardianOS"
- [ ] Dashboard header shows "GuardianOS"
- [ ] Browser tab title shows "GuardianOS"
- [ ] API docs show "GuardianOS API"
- [ ] Navigation shows "GuardianOS" logo/name
- [ ] No references to "RostraCore" visible to users

---

## Common Issues and Solutions

### Issue: org_id is undefined

**Solution:** Ensure the User model includes org_id and it's returned in the auth response:

```python
# backend/app/schemas/user.py
class UserOut(BaseModel):
    user_id: int
    username: str
    email: Optional[str]
    org_id: int  # Make sure this is included
    role: str
```

### Issue: Sites not showing for clients

**Solution:** Check the Client model has the sites relationship:

```python
# backend/app/models/client.py
class Client(Base):
    __tablename__ = "clients"

    # ... other fields ...

    # Relationships
    sites = relationship("Site", back_populates="client")
```

### Issue: Branding changes not visible

**Solution:**
1. Clear browser cache (Ctrl+Shift+Del)
2. Restart frontend dev server: `npm run dev`
3. Restart backend server: `uvicorn app.main:app --reload`

---

## Next Steps

After completing these fixes:

1. Test client creation end-to-end
2. Verify roster generation works for specific clients/sites
3. Confirm all branding is updated
4. Move to Priority 4: UI Redesign (Donezo style)
