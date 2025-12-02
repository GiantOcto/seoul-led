@echo off
chcp 65001 >nul
title 서울 LED 실행

echo ================================================
echo              서울 LED 실행
echo ================================================
echo.

echo RelayWebApi 실행 중...

if exist RelayWebApi\publish\RelayWebApi.exe (
    cd RelayWebApi\publish
) else if exist publish\RelayWebApi.exe (
    cd publish
) else (
    echo ❌ RelayWebApi.exe를 찾을 수 없습니다!
    echo.
    echo 현재 위치: %CD%
    echo.
    echo 먼저 build.bat를 실행하여 빌드하세요.
    pause
    exit /b 1
)

if not exist RelayWebApi.exe (
    echo ❌ RelayWebApi.exe를 찾을 수 없습니다!
    echo 현재 위치: %CD%
    cd ..
    pause
    exit /b 1
)

echo.
echo ✅ RelayWebApi 서버 시작...
echo API: http://localhost:5130
echo 프론트엔드: http://localhost:5130
echo.
echo 종료하려면 Ctrl+C를 누르세요.
echo.

RelayWebApi.exe

if exist ..\.. (
    cd ..\..
) else if exist .. (
    cd ..
)

