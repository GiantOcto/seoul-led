@echo off
chcp 65001 > nul
echo Starting 가람LED applications...

:: Node.js 서버 백그라운드로 시작
start /min cmd /c "cd server && node server.js"
timeout /t 2 /nobreak > nul

:: Python 앱 백그라운드로 시작
start /min cmd /c "cd python && python app.py"
timeout /t 2 /nobreak > nul

:: React 앱 시작 (브라우저만 표시)
start /min cmd /c "cd client && npm start"

echo All applications are running in background.
echo Press Ctrl+C to exit all applications.
pause > nul