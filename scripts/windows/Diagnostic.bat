@echo off
setlocal
cd /d "%~dp0"
set "PATH=%~dp0node;%~dp0ffmpeg;%~dp0tools;%PATH%"
"node\node.exe" scripts\doctor.ts
pause
