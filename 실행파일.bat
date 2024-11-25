@echo off
chcp 65001 >nul

:: 현재 스크립트의 전체 경로 저장
set SCRIPT_PATH=%~dp0

echo React 앱 실행 준비를 시작합니다...
echo 실행 경로: %SCRIPT_PATH%
echo.

:: Node.js 설치 확인
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js가 설치되어 있지 않습니다. 설치를 시작합니다...
    powershell -Command "& {Invoke-WebRequest 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' -OutFile 'node_setup.msi'}"
    start /wait node_setup.msi
    del node_setup.msi
)

:: serve 전역 설치 확인
where serve >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo serve 패키지를 설치합니다...
    npm install -g serve
)

:: 서버 의존성 확인 및 설치
echo.
echo 서버 의존성을 확인합니다...
cd /d "%SCRIPT_PATH%server"
if not exist "package.json" (
    echo package.json이 없습니다. 새로 생성합니다...
    call npm init -y
)

:: node_modules 폴더나 필수 모듈 확인
if not exist "node_modules" (
    echo 필요한 모듈을 설치합니다...
    call npm install express cors axios
) else (
    echo 서버 의존성이 이미 설치되어 있습니다.
)

:: 서버 백그라운드 실행
echo.
echo 서버를 시작합니다... (포트: 5000)
start /min "LED Seoul Server" cmd /c "cd /d "%SCRIPT_PATH%server" && node server.js"

:: 잠시 대기
timeout /t 3

:: serve 실행
echo.
echo 앱을 실행합니다...
echo 프론트엔드: http://localhost:3000
echo 백엔드: http://localhost:5000
echo 종료하려면 이 창에서 Ctrl + C를 누르세요.
echo.
start http://localhost:3000
cd /d "%SCRIPT_PATH%"
serve -s build

pause