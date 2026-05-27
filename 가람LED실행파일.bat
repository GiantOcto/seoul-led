@echo off
chcp 65001 >nul
title 가람LED 프로그램
cd /d "%~dp0"

echo ================================================
echo                가람LED 프로그램
echo ================================================
echo.

set "GARAM_PORT=8000"
if exist "%~dp0server\.env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%~dp0server\.env") do (
    if /i "%%a"=="PORT" set "GARAM_PORT=%%b"
  )
)
set "GARAM_URL=http://localhost:%GARAM_PORT%"

echo [1/3] Node 서버 시작...
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo Node.js 가 설치되어 있지 않습니다.
  pause
  exit /b 1
)
start /min cmd /c "cd /d %~dp0server && node server.js"
echo Node 서버 준비 대기...
powershell -NoProfile -Command "$p=%GARAM_PORT%; $deadline=(Get-Date).AddSeconds(30); while((Get-Date) -lt $deadline){ try { $r=Invoke-WebRequest -Uri ('http://localhost:'+$p+'/api/status') -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){ exit 0 } } catch {} Start-Sleep -Seconds 1 }; exit 0"

echo [2/3] app.exe (Python 시리얼, 트레이) 시작...
if exist "%~dp0app.exe" (
  start "" "%~dp0app.exe"
  timeout /t 2 /nobreak > nul
) else (
  echo [경고] app.exe 없음 — 수위 센서 미동작
)

echo [3/3] Chrome 키오스크 (%GARAM_URL%)...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window --start-fullscreen --kiosk "%GARAM_URL%"

echo.
echo 프로그램이 실행되었습니다.
echo 종료하려면 아무 키나 누르세요...
pause > nul
