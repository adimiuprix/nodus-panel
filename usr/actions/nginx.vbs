Set WshShell = CreateObject("WScript.Shell")
Action = WScript.Arguments(0)
If Action = "start" Then
    ExePath = WScript.Arguments(1)
    WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(ExePath)
    WshShell.Run Chr(34) & ExePath & Chr(34), 0, False
ElseIf Action = "stop" Then
    WshShell.Run "taskkill /F /IM nginx.exe /T", 0, True
End If