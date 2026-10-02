@echo off
cd /d "%~dp0"
py -3.8 start_local.py
if errorlevel 1 pause
