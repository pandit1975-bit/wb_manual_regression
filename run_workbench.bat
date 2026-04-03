@echo off

:loop

cd "C:\Users\kiranp\OneDrive - Data Axle\python_scripts_wb_support - Copy\wb_manual_regression"

call .venv\Scripts\activate

echo Starting Workbench Server...

python run_server.py

echo Server crashed... restarting in 5 seconds
timeout /t 5

goto loop