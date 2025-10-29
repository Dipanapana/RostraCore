@echo off
echo ========================================
echo Starting PostgreSQL Database
echo ========================================
echo.

cd backend

echo Checking if Docker is available...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop or use local PostgreSQL
    echo.
    pause
    exit /b 1
)

echo Starting PostgreSQL container...
docker-compose up -d

echo.
echo Checking container status...
docker-compose ps

echo.
echo ========================================
echo PostgreSQL is running on localhost:5432
echo Database: rostracore
echo User: rostracore_user
echo.
echo To stop: docker-compose down
echo ========================================
echo.
pause
