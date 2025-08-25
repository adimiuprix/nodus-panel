import { createShell } from "@oxog/shell-core";
import { NextResponse } from "next/server";

const shell = createShell({
    cwd: "D:/nodus-panel/automation/",
    verbose: true
});

export async function POST() {
  try {
    const result = await shell.exec(`cmd /c "mkcert.exe -help -client"`);
    return NextResponse.json({ message: result.stdout });
    
  } catch (e: unknown) {
    let message = "Unknown error";

    if (e instanceof Error) {
        message = e.message; // aman, karena TypeScript tahu ini Error
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
