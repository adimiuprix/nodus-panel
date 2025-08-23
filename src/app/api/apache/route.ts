import { createShell } from "@oxog/shell-core";
import { NextResponse } from "next/server";

const shell = createShell();
const START_VBS = "D:\\nodus-panel\\automation\\start_apache.vbs";
const STOP_VBS = "D:\\nodus-panel\\automation\\stop_apache.vbs";

export async function POST(req: Request) {
  try {
    const { action } = await req.json();

    if (action === "start") {
      await shell.exec(`cscript //nologo "${START_VBS}"`);
      return NextResponse.json({ message: "💖 Apache sudah jalan!" });
    }

    if (action === "stop") {
      await shell.exec(`cscript //nologo "${STOP_VBS}"`);
      return NextResponse.json({ message: "💔 Apache sudah berhenti!" });
    }

    if (action === "status") {
      const result = await shell.exec('tasklist', { silent: true, fatal: false });
      const running = result.stdout.split('\n').some(line => line.toLowerCase().includes('httpd.exe'));
      return NextResponse.json({ message: running ? "💖 Apache sedang jalan" : "💔 Apache mati" });
    }
    
    return NextResponse.json({ message: "Action tidak dikenal" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ message: `Error: ${e.message}` }, { status: 500 });
  }
}
