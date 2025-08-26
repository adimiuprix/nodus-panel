@echo off
title Apache Server Control

echo Menyalakan Apache...
"D:\nodus-panel\bin\apache\httpd-2.4.65\bin\httpd.exe"

if %errorlevel% neq 0 (
    echo Gagal menyalakan Apache!
) else (
    echo Apache sudah dijalankan.
    echo Tekan Ctrl+C atau tutup jendela ini untuk menghentikan.
)

pause
