#!/bin/bash
# RostraCore Backend Server Startup Script for Linux/Mac
# This script starts the FastAPI backend server with uvicorn

set -e

echo "Starting RostraCore Backend Server..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "ERROR: Virtual environment not found!"
    echo "Please create it first by running: python -m venv venv"
    echo "Then install dependencies: venv/bin/pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "WARNING: .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "Please update .env with your configuration before running in production."
    echo ""
fi

# Start the server
echo "Running uvicorn server..."
echo "Server will be available at: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
