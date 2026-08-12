@echo off
setlocal
cd /d "%~dp0"
title SHIPDESK + LabelOnZeWay POS80C Gateway
where py >nul 2>nul
if %errorlevel%==0 (
  set "PY=py -3"
) else (
  where python >nul 2>nul
  if errorlevel 1 (
    echo Python 3 is required. Install it from https://www.python.org/downloads/
    pause
    exit /b 1
  )
  set "PY=python"
)
findstr /c:"USERNAME.github.io" gateway-config.json >nul 2>nul
if %errorlevel%==0 (
  echo One-time GitHub Pages address setup:
  %PY% configure_gateway.py
  if errorlevel 1 (pause & exit /b 1)
  echo.
)
%PY% -u hosted_pos80c_gateway.py
echo.
echo Gateway stopped.
pause
