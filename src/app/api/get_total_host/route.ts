import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET() {
  const dirPath = path.join(process.cwd(), "etc", "site-enabled")

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name)

    return NextResponse.json({ status: "ok", files, count: Number(files.length)  })
  } catch (err) {
    return NextResponse.json({ status: "error", message: err.message })
  }
}
