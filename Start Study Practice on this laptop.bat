@echo off
rem Starts Study Practice on this laptop only, at http://localhost:8766/
rem Close this window (or press Ctrl+C) to stop it.
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python is needed to run Study Practice on the laptop, and it was not found.
  pause
  exit /b 1
)
echo Starting Study Practice. Your browser will open in a moment.
echo Keep this window open while you use it. Close it to stop.
python -I tools\serve.py 8766 --open
pause
