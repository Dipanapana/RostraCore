# RostraCore Logo Integration

## Step 1: Save the Logo Image

Please save the RostraCore logo image to the following location:

```
frontend/public/rostracore-logo.png
```

**Instructions:**
1. Right-click on the logo image in this conversation
2. Save the image to your computer
3. Move it to: `frontend/public/rostracore-logo.png`

## Step 2: Code Updates

The following components have been updated to use the logo:

- ✅ Landing Page Navbar (`frontend/src/components/landing/Navbar.tsx`)
- ✅ Dashboard Sidebar (`frontend/src/components/layout/Sidebar.tsx`)
- ✅ Login Page (`frontend/src/app/login/page.tsx`)
- ✅ Register Page (`frontend/src/app/register/page.tsx`)

## Step 3: Verify

After saving the logo and the code updates are applied:

1. Restart the frontend dev server if it's running:
   ```bash
   cd frontend
   npm run dev
   ```

2. Check these pages:
   - Landing page: http://localhost:3000/
   - Login page: http://localhost:3000/login
   - Dashboard: http://localhost:3000/dashboard (after login)

The logo should now appear in place of the shield icon and "G" letter placeholders.

## Logo Specifications

- Format: PNG with transparent background
- Recommended sizes:
  - Full logo: 200x60px (for navbar)
  - Square icon: 48x48px (for sidebar/mobile)
- The logo shows "RostraCore" branding with your custom design

## Notes

- The logo uses Next.js Image component for optimization
- Falls back to text if image is not found
- Responsive sizing for mobile/desktop views
