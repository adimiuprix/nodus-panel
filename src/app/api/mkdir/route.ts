import { NextResponse } from "next/server"
import { createShell } from "@oxog/shell-core"

export async function POST() {
  const shell = createShell();
  await shell.mkdir("G:/data/suli", { recursive: true })
  return NextResponse.json({ message: "Directory created" })
}
