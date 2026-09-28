@echo off
setlocal
cd /d "%~dp0"
if not exist "node\node.exe" (
  echo node\node.exe introuvable.
  echo Decompressez tout le ZIP dans un dossier avant de lancer SmartAtelier.
  pause
  exit /b 1
)
set "PATH=%~dp0node;%~dp0ffmpeg;%~dp0tools;%PATH%"
echo SmartAtelier demarre sur http://127.0.0.1:3210
echo Gardez cette fenetre ouverte. Pour arreter : fermez-la ou faites Ctrl+C.
echo.
start "" /b cmd /c "ping -n 6 127.0.0.1 >nul & start http://127.0.0.1:3210"
"node\node.exe" node_modules\next\dist\bin\next start --hostname 127.0.0.1 --port 3210
pause
