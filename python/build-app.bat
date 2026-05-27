@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo app.exe 빌드 (PyInstaller)...
set "PY=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not exist "%PY%" set "PY=python"
"%PY%" -m pip install -r requirements-build.txt -q
"%PY%" -m PyInstaller app.spec --noconfirm
if errorlevel 1 (
  echo 빌드 실패 — Python/PyInstaller 설치 확인
  pause
  exit /b 1
)

copy /Y "dist\app.exe" "..\app.exe"
echo 완료: ..\app.exe
echo 릴리즈 반영: npm run release:win (프로젝트 루트)
pause
