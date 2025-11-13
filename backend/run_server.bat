@echo off
REM RostraCore Backend Server Startup Script for Windows
REM This script starts the FastAPI backend server with uvicorn

echo Starting RostraCore Backend Server...
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please create it first by running: python -m venv venv
    echo Then install dependencies: venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo Please update .env with your configuration before running in production.
    echo.
)

REM Start the server
echo Running uvicorn server...
echo Server will be available at: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

REM If uvicorn fails, show error
if errorlevel 1 (
    echo.
    echo ERROR: Failed to start server!
    echo Make sure all dependencies are installed: venv\Scripts\pip install -r requirements.txt
    pause
)
