@echo off
chcp 65001 >nul
title 가람LED 프로그램

echo ================================================
echo                가람LED 프로그램
echo ================================================
echo.

echo 필요한 패키지를 확인합니다...
echo.

:: serve 패키지 확인 및 설치
where serve >nul 2>&1
if %errorlevel% neq 0 (
    echo serve 패키지를 설치합니다...
    call npm install -g serve
    if errorlevel 1 (
        echo serve 패키지 설치 중 오류가 발생했습니다.
        pause
        exit /b
    )
    echo serve 패키지가 설치되었습니다.
) else (
    echo serve 패키지가 이미 설치되어 있습니다.
)
echo.

:: socket.io-client 확인 및 설치
call npm list socket.io-client --depth=0 >nul 2>&1
if %errorlevel% neq 0 (
    echo socket.io-client 패키지를 설치합니다...
    call npm install socket.io-client
    if errorlevel 1 (
        echo socket.io-client 패키지 설치 중 오류가 발생했습니다.
        pause
        exit /b
    )
    echo socket.io-client 패키지가 설치되었습니다.
) else (
    echo socket.io-client 패키지가 이미 설치되어 있습니다.
)
echo.

echo 프로그램을 시작합니다...
echo.

:: Python 앱 실행
start /min "" "app.exe"
if errorlevel 1 (
    echo app.exe 실행 중 오류가 발생했습니다.
    pause
    exit /b
)
timeout /t 3 /nobreak > nul

:: Node.js 서버 실행
start /min "" "server.exe"
if errorlevel 1 (
    echo server.exe 실행 중 오류가 발생했습니다.
    pause
    exit /b
)
timeout /t 3 /nobreak > nul

:: React 앱을 위한 웹 서버 실행
start http://localhost:3000
cd build && start /min "" serve -s .

echo 프로그램이 실행되었습니다.
echo 종료하려면 아무 키나 누르세요...
pause > nul