@echo off

:loop

echo Starting Workbench Server...

"C:\Users\kiranp\OneDrive - Data Axle\python_scripts_wb_support - Copy\.venv\Scripts\python.exe" ^
"C:\Users\kiranp\OneDrive - Data Axle\python_scripts_wb_support - Copy\wb_manual_regression\run_server.py"

echo Server crashed... restarting in 5 seconds
timeout /t 5

goto loop