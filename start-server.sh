#!/bin/bash

echo "Starting Question Practice App Server..."
echo ""
echo "The app will open in your browser at: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Try Python 3 first
if command -v python3 &> /dev/null; then
    echo "Starting server with Python 3..."
    open http://localhost:8000 2>/dev/null || xdg-open http://localhost:8000 2>/dev/null || echo "Please open http://localhost:8000 in your browser"
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "Starting server with Python..."
    open http://localhost:8000 2>/dev/null || xdg-open http://localhost:8000 2>/dev/null || echo "Please open http://localhost:8000 in your browser"
    python -m http.server 8000
else
    echo "ERROR: Python is not installed"
    echo ""
    echo "Please install Python from https://www.python.org/downloads/"
    echo "Or use an alternative method (see README.md)"
    exit 1
fi
