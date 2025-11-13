# PostgreSQL Password Reset Script
# Run this as Administrator

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Password Reset Wizard" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "Step 1: Backing up current configuration..." -ForegroundColor Yellow
$pgHbaPath = "C:\Program Files\PostgreSQL\14\data\pg_hba.conf"
$backupPath = "C:\Program Files\PostgreSQL\14\data\pg_hba.conf.backup_" + (Get-Date -Format "yyyyMMdd_HHmmss")

try {
    Copy-Item $pgHbaPath $backupPath
    Write-Host "✓ Backup created: $backupPath" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create backup: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "Step 2: Modifying authentication to allow passwordless access..." -ForegroundColor Yellow

# Read the file
$content = Get-Content $pgHbaPath

# Replace scram-sha-256 with trust for local connections
$newContent = $content | ForEach-Object {
    if ($_ -match "^host\s+all\s+all\s+127\.0\.0\.1/32\s+scram-sha-256") {
        "host    all             all             127.0.0.1/32            trust"
    }
    elseif ($_ -match "^host\s+all\s+all\s+::1/128\s+scram-sha-256") {
        "host    all             all             ::1/128                 trust"
    }
    else {
        $_
    }
}

try {
    $newContent | Set-Content $pgHbaPath
    Write-Host "✓ Configuration modified" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to modify configuration: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "Step 3: Restarting PostgreSQL service..." -ForegroundColor Yellow

try {
    Restart-Service postgresql-x64-14 -ErrorAction Stop
    Start-Sleep -Seconds 3
    $service = Get-Service postgresql-x64-14
    if ($service.Status -eq "Running") {
        Write-Host "✓ PostgreSQL restarted successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ PostgreSQL service is not running" -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "✗ Failed to restart PostgreSQL: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "Step 4: Setting new password..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Choose a password for the postgres user:" -ForegroundColor Cyan
Write-Host "  1. 'postgres' (recommended for development)" -ForegroundColor White
Write-Host "  2. 'admin'" -ForegroundColor White
Write-Host "  3. Custom password" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Enter your choice (1-3)"

switch ($choice) {
    "1" { $newPassword = "postgres" }
    "2" { $newPassword = "admin" }
    "3" {
        $newPassword = Read-Host "Enter your custom password"
        if ([string]::IsNullOrWhiteSpace($newPassword)) {
            Write-Host "✗ Password cannot be empty" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit
        }
    }
    default {
        Write-Host "✗ Invalid choice" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit
    }
}

Write-Host ""
Write-Host "Setting password to: $newPassword" -ForegroundColor Cyan

# Create SQL command
$sqlCommand = "ALTER USER postgres WITH PASSWORD '$newPassword';"

try {
    & "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -d postgres -c $sqlCommand 2>&1 | Out-Null
    Write-Host "✓ Password changed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to change password: $_" -ForegroundColor Red
    Write-Host "Restoring backup..." -ForegroundColor Yellow
    Copy-Item $backupPath $pgHbaPath -Force
    Restart-Service postgresql-x64-14
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "Step 5: Restoring secure authentication..." -ForegroundColor Yellow

# Restore original authentication
$content = Get-Content $pgHbaPath
$newContent = $content | ForEach-Object {
    if ($_ -match "^host\s+all\s+all\s+127\.0\.0\.1/32\s+trust") {
        "host    all             all             127.0.0.1/32            scram-sha-256"
    }
    elseif ($_ -match "^host\s+all\s+all\s+::1/128\s+trust") {
        "host    all             all             ::1/128                 scram-sha-256"
    }
    else {
        $_
    }
}

try {
    $newContent | Set-Content $pgHbaPath
    Write-Host "✓ Authentication restored" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to restore authentication: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 6: Restarting PostgreSQL with new settings..." -ForegroundColor Yellow

try {
    Restart-Service postgresql-x64-14 -ErrorAction Stop
    Start-Sleep -Seconds 3
    Write-Host "✓ PostgreSQL restarted" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to restart: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 7: Testing new password..." -ForegroundColor Yellow

$env:PGPASSWORD = $newPassword
try {
    $result = & "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -d rostracore_db -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Password test successful!" -ForegroundColor Green
    } else {
        Write-Host "✗ Password test failed" -ForegroundColor Red
        Write-Host "Result: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Connection test failed: $_" -ForegroundColor Red
}
$env:PGPASSWORD = $null

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Password Reset Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your new PostgreSQL password is: " -NoNewline
Write-Host "$newPassword" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update your .env file:" -ForegroundColor White
Write-Host "   DATABASE_URL=postgresql://postgres:$newPassword@localhost:5432/rostracore_db" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Apply migrations:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Yellow
Write-Host "   alembic upgrade head" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"
