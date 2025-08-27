import { createShell, Shell } from "@oxog/shell-core";
import { NextResponse } from "next/server";

export async function POST() {
  const shell: Shell = createShell({
    cwd: process.cwd(),
    verbose: true,
    silent: false,
  })

  console.log(process.cwd())

  try {

    return NextResponse.json({ message: "Berhasil menambahkan hosts & jalankan VBS" });
  } catch (e: unknown) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
