@echo off
setlocal
cd /d "%~dp0"
set "PATH=%~dp0node;%~dp0ffmpeg;%~dp0tools;%PATH%"
echo Connexion a un assistant IA (compte officiel, aucune cle API)
echo.
echo   1. ChatGPT (Codex)
echo   2. Claude (Claude Code)
echo   3. Gemini (Gemini CLI)
echo.
choice /c 123 /n /m "Votre choix [1-3] : "
if errorlevel 3 (set "PROVIDER=gemini") else if errorlevel 2 (set "PROVIDER=claude") else (set "PROVIDER=codex")
"node\node.exe" scripts\connect.mjs %PROVIDER%
pause
