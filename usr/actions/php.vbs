Set WshShell = CreateObject("WScript.Shell")
Action = WScript.Arguments(0)
If Action = "start" Then
    ExePath = WScript.Arguments(1)
    WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(ExePath)
    PhpCgi = Replace(ExePath, "php.exe", "php-cgi.exe")
    WshShell.Run Chr(34) & PhpCgi & Chr(34) & " -b 127.0.0.1:9000", 0, False
ElseIf Action = "stop" Then
    WshShell.Run "taskkill /F /IM php-cgi.exe /T", 0, True
End If