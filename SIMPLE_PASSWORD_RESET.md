# Simple PostgreSQL Password Reset

## The Easiest Method - Use the PowerShell Script

I've created an automated script that does everything for you!

### Steps:

1. **Right-click on Windows PowerShell** and select **"Run as Administrator"**

2. **Navigate to the project folder:**
   ```powershell
   cd "C:\Users\USER\Documents\Master Plan\RostraCore"
   ```

3. **Run the password reset script:**
   ```powershell
   .\reset_postgres_password.ps1
   ```

4. **Follow the prompts:**
   - Choose option `1` for password: `postgres` (recommended for development)
   - The script will automatically:
     - Backup your config
     - Temporarily allow passwordless access
     - Reset the password
     - Restore security settings
     - Test the new password

5. **Done!** The script will tell you what to do next.

---

## Alternative: Manual Method (if script doesn't work)

If you get an error like "execution of scripts is disabled", follow these steps:

### Step 1: Open PowerShell as Administrator

Right-click Start → Windows PowerShell (Admin)

### Step 2: Allow script execution (one-time):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

Then run the script again.

---

## Alternative: Command-Line Method

If you prefer to type commands manually:

### 1. Open Notepad as Administrator

- Press Windows key
- Type "Notepad"
- Right-click → Run as Administrator

### 2. Open the config file

File → Open → Navigate to:
```
C:\Program Files\PostgreSQL\14\data\pg_hba.conf
```

Make sure to select "All Files (*.*)" in the file type dropdown.

### 3. Find and change these lines:

Look for (around line 82-84):
```
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
```

Change to:
```
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
```

Save the file (Ctrl+S).

### 4. Restart PostgreSQL

Open PowerShell as Administrator and run:
```powershell
Restart-Service postgresql-x64-14
```

### 5. Change the password

```powershell
cd "C:\Program Files\PostgreSQL\14\bin"
.\psql.exe -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

### 6. Change config back

Open the config file in Notepad again and change `trust` back to `scram-sha-256`.

Save the file.

### 7. Restart again

```powershell
Restart-Service postgresql-x64-14
```

### 8. Test it

```powershell
$env:PGPASSWORD="postgres"
.\psql.exe -U postgres -d rostracore_db -c "SELECT version();"
```

If you see the PostgreSQL version, success!

---

## Update Your .env File

Once the password is reset, update your backend `.env` file:

1. Open: `C:\Users\USER\Documents\Master Plan\RostraCore\backend\.env`

2. Change line 3 to:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rostracore_db
   ```
   (Use whatever password you set)

3. Save the file

---

## Apply Migrations

Now you can run the migrations:

```bash
cd "C:\Users\USER\Documents\Master Plan\RostraCore\backend"
alembic upgrade head
```

You should see:
```
INFO  [alembic.runtime.migration] Running upgrade 110e433d0604 -> add_multi_tenancy
INFO  [alembic.runtime.migration] Running upgrade add_multi_tenancy -> add_psira_grades
INFO  [alembic.runtime.migration] Running upgrade add_psira_grades -> add_multi_guard_config
INFO  [alembic.runtime.migration] Running upgrade add_multi_guard_config -> add_shift_groups
```

Success! 🎉

---

## Troubleshooting

### "Access denied" when editing config file
- Make sure you opened Notepad **as Administrator**

### "Cannot open service" error
- Make sure PowerShell is running **as Administrator**

### Script won't run
- Allow script execution: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process`

### Still stuck?
- Check that PostgreSQL service is running: `Get-Service postgresql-x64-14`
- Try stopping antivirus temporarily
- Reboot your computer and try again
