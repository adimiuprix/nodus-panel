Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "taskkill /IM httpd.exe /F", 0
