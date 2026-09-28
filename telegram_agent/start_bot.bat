@echo off
echo ====================================
echo   Telegram AI Bot Agent ishga tushdi
echo ====================================
echo.

REM Virtual muhit mavjudligini tekshirish
if not exist "venv\Scripts\activate.bat" (
    echo Virtual muhit topilmadi. Yaratilmoqda...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Kutubxonalar o'rnatilmoqda...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

echo Bot ishga tushmoqda...
python main.py

pause
