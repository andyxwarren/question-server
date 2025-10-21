@echo off
echo Starting Question Practice App Server...
echo.
echo The app will open in your browser at: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Try Python 3 first
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Starting server with Python 3...
    start http://localhost:8000
    python -m http.server 8000
    goto :end
)

REM Try Python 2 as fallback
python2 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Starting server with Python 2...
    start http://localhost:8000
    python2 -m SimpleHTTPServer 8000
    goto :end
)

REM No Python found
echo ERROR: Python is not installed or not in PATH
echo.
echo Please install Python from https://www.python.org/downloads/
echo Or use an alternative method (see README.md)
pause
exit /b 1

:end
