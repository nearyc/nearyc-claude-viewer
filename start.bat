@echo off
title Claude Viewer Launcher
echo ========================================
echo   Claude Viewer Launcher
echo ========================================
echo.

REM Check PowerShell
powershell -Command "Get-Host" >nul 2>&1
if errorlevel 1 (
    echo [Error] PowerShell not found
    pause
    exit /b 1
)

REM Run PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0start-app.ps1"

pause
