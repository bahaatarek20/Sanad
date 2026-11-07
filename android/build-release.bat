@echo off
echo ========================================================
echo   Sanad Android Release Builder (APK and AAB)
echo ========================================================
node "%~dp0build-release.js"
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Release build finished successfully!
    echo Artifacts available in \release folder.
) else (
    echo.
    echo [ERROR] Build failed with code %ERRORLEVEL%
)
pause
