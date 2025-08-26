import { createShell } from "@oxog/shell-core"
import { NextResponse } from "next/server"

const shell = createShell()

export async function POST() {
  try {
    await shell.exec("tasklist | findstr httpd.exe", { fatal: false })
    return NextResponse.json({ message: 'apach belum jalan' })
    
  } catch (e: unknown) {
    let message = "Unknown error"

    if (e instanceof Error) {
        message = e.message
    }
    return NextResponse.json({ message }, { status: 500 })
  }
}
