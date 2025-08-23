import { NextResponse } from "next/server"
import { promises as fs } from "fs"

export async function GET() {
  try {
    const content = await fs.readFile("G:/asawawu.txt", "utf8")
    return NextResponse.json({ success: true, content })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
