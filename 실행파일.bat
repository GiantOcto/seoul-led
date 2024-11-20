@echo off
chcp 65001 >nul
echo React 앱 실행 준비를 시작합니다...
echo.

:: Node.js 설치 확인
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js가 설치되어 있지 않습니다. 설치를 시작합니다...
    powershell -Command "& {Invoke-WebRequest 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' -OutFile 'node_setup.msi'}"
    start /wait node_setup.msi
    del node_setup.msi
)

:: npm 패키지 설치 확인
if not exist "node_modules" (
    echo node_modules 폴더가 없습니다. 필요한 패키지를 설치합니다...
    call npm install
)

:: react-scripts 설치 확인
if not exist "node_modules\react-scripts" (
    echo react-scripts를 설치합니다...
    call npm install react-scripts
)

:: serve 전역 설치 확인
where serve >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo serve 패키지를 설치합니다...
    call npm install -g serve
)

:: serve 실행
echo.
echo 앱을 실행합니다...
echo 잠시 후 브라우저가 자동으로 열립니다.
echo 종료하려면 이 창에서 Ctrl + C를 누르세요.
echo.
cd %~dp0
start http://localhost:3000
serve -s build
pause