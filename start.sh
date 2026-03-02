#!/bin/bash
echo "Starting Backend..."
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 &
cd ..

echo "Starting Frontend..."
cd frontend
npm install
npm run dev