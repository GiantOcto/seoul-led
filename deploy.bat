@echo off
chcp 65001 >nul
title 서울 LED 배포 스크립트

echo ================================================
echo              서울 LED 배포 스크립트
echo ================================================
echo.

set DEPLOY_DIR=deploy

echo [1/3] 빌드 중...
echo.

echo [1-1] React 프론트엔드 빌드 중...
cd client
if not exist node_modules (
    echo node_modules가 없습니다. npm install을 실행합니다...
    call npm install
)
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ React 빌드 실패!
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✅ React 빌드 완료!
echo.

echo [1-2] RelayWebApi 빌드 중...
cd RelayWebApi
echo Self-contained 배포로 빌드 중... (.NET 설치 불필요)
dotnet publish -c Release -o ./publish --self-contained true -r win-x64
if errorlevel 1 (
    echo.
    echo ❌ RelayWebApi 빌드 실패!
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✅ RelayWebApi 빌드 완료! (Self-contained)
echo.

echo [2/3] 배포 폴더 생성 중...
if exist %DEPLOY_DIR% (
    echo 기존 배포 폴더 삭제 중...
    rmdir /s /q %DEPLOY_DIR%
)
mkdir %DEPLOY_DIR%
mkdir %DEPLOY_DIR%\build
mkdir %DEPLOY_DIR%\publish
echo.

echo [3/3] 파일 복사 중...
echo - React 빌드 결과물 복사...
xcopy /E /I /Y client\build\* %DEPLOY_DIR%\build\
echo - RelayWebApi 빌드 결과물 복사...
xcopy /E /I /Y RelayWebApi\publish\* %DEPLOY_DIR%\publish\
echo - 실행 스크립트 복사...
copy run.bat %DEPLOY_DIR%\ >nul
echo.

echo ================================================
echo              배포 완료!
echo ================================================
echo.
echo 배포 폴더: %DEPLOY_DIR%\
echo.
echo 실행 방법:
echo   1. %DEPLOY_DIR% 폴더로 이동
echo   2. run.bat 실행
echo.
pause

