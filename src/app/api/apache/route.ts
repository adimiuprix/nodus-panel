import { createShell } from "@oxog/shell-core"
import { NextResponse } from "next/server"

const shell = createShell();

export async function POST(req: Request) {
  try {
    const { action } = await req.json()

    if (action === "start") {
      await shell.exec(`cmd /c start "" /B "D:/nodus-panel/bin/apache/httpd-2.4.65/bin/httpd.exe"`)
      return NextResponse.json({ message: "💖 Apache sudah jalan di background!" })
    }

    if (action === "stop") {
      // Stop Apache
      await shell.exec("taskkill /IM httpd.exe /F")
      
      // Cek apakah php-cgi.exe ada
      const check = await shell.exec("tasklist | findstr php-cgi.exe");

      if (check.stdout && check.stdout.includes("php-cgi.exe")) {
        await shell.exec("taskkill /IM php-cgi.exe /F");
        return NextResponse.json({ message: "💔 Apache & FastCGI sudah dimatikan!" });
      } else {
        return NextResponse.json({ message: "💔 Apache dimatikan, FastCGI tidak ditemukan." });
      }
    }

    if (action === "status") {
      const result = await shell.exec('tasklist', { silent: true, fatal: false });
      const running = result.stdout.split('\n').some(line => line.toLowerCase().includes('httpd.exe'))
      return NextResponse.json({ message: running ? "💖 Apache sedang jalan" : "💔 Apache mati" })
    }
    
    return NextResponse.json({ message: "Action tidak dikenal" }, { status: 400 })
  } catch (e: unknown) {
    if (e instanceof Error) {
      return NextResponse.json({ message: `Error: ${e.message}` }, { status: 500 })
    }
    return NextResponse.json({ message: "Error: Unknown error" }, { status: 500 })  }
}
