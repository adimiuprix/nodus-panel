Set UAC = CreateObject("Shell.Application")

On Error Resume Next
UAC.ShellExecute "node.exe", Chr(34) & "host.js" & Chr(34), "", "runas", 1

If Err.Number <> 0 Then
    MsgBox "❌ Terjadi error saat menjalankan host.js", vbCritical, "Error"
    WScript.Sleep 5000
End If
On Error GoTo 0