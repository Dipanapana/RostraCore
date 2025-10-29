@echo off
echo ========================================
echo Starting RostraCore Backend Server
echo ========================================
echo.

cd backend

echo Activating virtual environment...
call venv\Scripts\activate

echo.
echo Starting FastAPI server on http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
echo Press CTRL+C to stop the server
echo ========================================
echo.

uvicorn app.main:app --reload
