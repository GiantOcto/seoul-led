@echo off
chcp 65001 >nul
title 가람LED 프로그램

echo ================================================
echo                가람LED 프로그램
echo ================================================
echo.
echo 프로그램을 시작합니다...
echo.

:: Python 앱 실행
start /min "" "app.exe"
timeout /t 2 /nobreak > nul

:: Node.js 서버 실행
start /min "" "server.exe"
timeout /t 2 /nobreak > nul

:: React 앱을 위한 웹 서버 실행
start http://localhost:3000
cd build && start /min "" serve -s .

echo 프로그램이 실행되었습니다.
echo 종료하려면 아무 키나 누르세요...
pause > nul