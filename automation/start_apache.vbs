Dim fso, file, line, apachePath, delay, scriptFolder
Set fso = CreateObject("Scripting.FileSystemObject")
scriptFolder = fso.GetParentFolderName(WScript.ScriptFullName)

If Not fso.FileExists(scriptFolder & "\config.ini") Then MsgBox "config.ini tidak ditemukan!", vbExclamation: WScript.Quit

Set file = fso.OpenTextFile(scriptFolder & "\config.ini")
Do Until file.AtEndOfStream
    line = Trim(file.ReadLine)
    If line <> "" And Left(line,1) <> "[" And Left(line,1) <> ";" And InStr(line,"=") Then
        Dim parts: parts = Split(line,"=")
        Select Case Trim(parts(0))
            Case "path": apachePath = Trim(parts(1))
            Case "delay": If IsNumeric(Trim(parts(1))) Then delay = CInt(Trim(parts(1)))
        End Select
    End If
Loop
file.Close

If apachePath = "" Then MsgBox "Path Apache tidak ditemukan di config.ini!", vbExclamation: WScript.Quit
If delay = 0 Then delay = 1000

CreateObject("WScript.Shell").Run """" & apachePath & """", 0
WScript.Sleep delay
