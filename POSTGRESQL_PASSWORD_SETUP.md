# PostgreSQL Password Setup Guide

## Current Status
- PostgreSQL 14 is installed at: `C:\Program Files\PostgreSQL\14`
- PostgreSQL service is **RUNNING**
- Database `rostracore_db` exists
- Authentication method: `scram-sha-256` (requires password)

## Method 1: Try Common Passwords (Quickest)

Try these common PostgreSQL passwords in order:

```bash
# Test with password 'postgres'
psql -U postgres -d rostracore_db -c "SELECT version();" -W
# When prompted, enter: postgres

# Test with password 'admin'
# When prompted, enter: admin

# Test with password 'password'
# When prompted, enter: password
```

If any of these work, skip to **Step 4: Update .env File**.

## Method 2: Reset Password Using Trust Authentication

If you don't know the password, follow these steps:

### Step 1: Modify Authentication Config

1. **Open PowerShell as Administrator** (Right-click Start → Windows PowerShell (Admin))

2. **Edit the pg_hba.conf file**:
   ```powershell
   notepad "C:\Program Files\PostgreSQL\14\data\pg_hba.conf"
   ```

3. **Find these lines** (around line 80-85):
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            scram-sha-256
   # IPv6 local connections:
   host    all             all             ::1/128                 scram-sha-256
   ```

4. **Change `scram-sha-256` to `trust`**:
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            trust
   # IPv6 local connections:
   host    all             all             ::1/128                 trust
   ```

5. **Save the file** (Ctrl+S) and close Notepad

### Step 2: Restart PostgreSQL Service

In the same PowerShell (Admin) window:

```powershell
# Restart PostgreSQL
Restart-Service postgresql-x64-14

# Verify it's running
Get-Service postgresql-x64-14
```

### Step 3: Reset the Password

Now you can connect without a password and reset it:

```powershell
# Connect to PostgreSQL (no password needed now)
cd "C:\Program Files\PostgreSQL\14\bin"
.\psql.exe -U postgres

# Inside psql, run this command to set a new password:
ALTER USER postgres WITH PASSWORD 'your_new_password';

# Exit psql
\q
```

**Important**: Replace `your_new_password` with your desired password. For development, you can use: `postgres` or `admin`

### Step 4: Restore Authentication Config

1. **Open the pg_hba.conf file again**:
   ```powershell
   notepad "C:\Program Files\PostgreSQL\14\data\pg_hba.conf"
   ```

2. **Change `trust` back to `scram-sha-256`**:
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            scram-sha-256
   # IPv6 local connections:
   host    all             all             ::1/128                 scram-sha-256
   ```

3. **Save and close**

4. **Restart PostgreSQL again**:
   ```powershell
   Restart-Service postgresql-x64-14
   ```

### Step 5: Test New Password

```powershell
cd "C:\Program Files\PostgreSQL\14\bin"
.\psql.exe -U postgres -d rostracore_db -W
# Enter your new password when prompted
```

If you see the `rostracore_db=#` prompt, success!

## Method 3: Using pgAdmin GUI (Alternative)

1. **Open pgAdmin 4**:
   - Start Menu → PostgreSQL 14 → pgAdmin 4

2. **If you can connect** (it may remember the password):
   - Right-click on "postgres" user (under Login/Group Roles)
   - Select "Properties"
   - Go to "Definition" tab
   - Enter new password
   - Click Save

## Step 4: Update .env File

Once you know the password, update your RostraCore configuration:

1. **Open the .env file**:
   ```powershell
   notepad "C:\Users\USER\Documents\Master Plan\RostraCore\backend\.env"
   ```

2. **Update the DATABASE_URL line**:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/rostracore_db
   ```

   Replace `YOUR_PASSWORD` with your actual password.

   Example:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rostracore_db
   ```

3. **Save the file** (Ctrl+S)

## Step 5: Test Database Connection

```bash
# From your RostraCore backend directory
cd "C:\Users\USER\Documents\Master Plan\RostraCore\backend"

# Test connection with Python
python -c "from sqlalchemy import create_engine; import os; from dotenv import load_dotenv; load_dotenv(); engine = create_engine(os.getenv('DATABASE_URL')); conn = engine.connect(); print('✓ Database connection successful!'); conn.close()"
```

If you see "✓ Database connection successful!", you're ready to proceed!

## Step 6: Apply Migrations

```bash
cd backend
alembic upgrade head
```

## Troubleshooting

### Error: "Access is denied" when editing pg_hba.conf
- Solution: Make sure you're running PowerShell or Command Prompt **as Administrator**

### Error: "Permission denied" when restarting service
- Solution: Run PowerShell as Administrator

### Error: "Could not connect to server"
- Check service is running: `Get-Service postgresql-x64-14`
- If stopped, start it: `Start-Service postgresql-x64-14`

### Error: "password authentication failed" after reset
- Make sure you changed pg_hba.conf back to `scram-sha-256`
- Make sure you restarted the service after changing the password
- Try the password you set (check for typos)

## Quick Reference: Common Commands

```powershell
# Check PostgreSQL service status
Get-Service postgresql-x64-14

# Start service
Start-Service postgresql-x64-14

# Stop service
Stop-Service postgresql-x64-14

# Restart service
Restart-Service postgresql-x64-14

# Connect to database
cd "C:\Program Files\PostgreSQL\14\bin"
.\psql.exe -U postgres -d rostracore_db

# Connect with password prompt
.\psql.exe -U postgres -d rostracore_db -W
```

## Recommended Password for Development

For local development, I recommend using a simple password like:
- **Password**: `postgres`
- **DATABASE_URL**: `postgresql://postgres:postgres@localhost:5432/rostracore_db`

This makes it easy to remember and is fine for local development (never use this in production!).

## Next Steps After Password Setup

1. Update `.env` with the correct password
2. Run migrations: `alembic upgrade head`
3. Test APIs at `http://localhost:8000/docs`
4. Verify organizations table created
5. Continue with Phase 2 implementation

## Need Help?

If you're stuck:
1. Check that PostgreSQL service is running
2. Verify pg_hba.conf changes were saved
3. Make sure you restarted the service after changes
4. Try resetting password again with "trust" authentication
5. Check Windows Event Viewer → Windows Logs → Application for PostgreSQL errors
