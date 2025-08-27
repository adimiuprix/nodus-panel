import { NextResponse } from "next/server"
import { createShell, Shell, Transaction } from "@oxog/shell-core"
import { spawn } from "child_process"

interface PostBody {
  domain: string;
}

interface SuccessResponse {
  success: true;
  domain: string;
}

interface ErrorResponse {
  error: string;
  status?: number;
}

export async function POST(req: Request): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return NextResponse.json({ error: "Request body invalid" }, { status: 400 });
  }

  const { domain } = body;
  if (!domain) {
    return NextResponse.json({ error: "Domain tidak boleh kosong" }, { status: 400 });
  }

  const rootPath = `${process.cwd()}\webroots\${domain}`;
  const configPath = `etc/site-enabled/${domain}.conf`;

  const config = `
<VirtualHost *:80>
    ServerName ${domain}
    DocumentRoot "${rootPath}"
    <Directory "${rootPath}">
        AllowOverride All
        Require all granted
    </Directory>
    ErrorLog "logs/error.log"
    CustomLog "logs/access.log" combined
</VirtualHost>
`

  const shell: Shell = createShell({
    cwd: process.cwd(),
    verbose: true,
    silent: false
  })

  // cek Apache jalan
  const check = await shell.exec('tasklist | findstr httpd.exe', { fatal: false })
  if (!check.stdout?.includes('httpd.exe')) {
    return NextResponse.json({ error: "Apache belum jalan", status: 400 }, { status: 400 })
  }

  const command = `Add-Content -Path 'C:\\Windows\\System32\\drivers\\etc\\hosts' -Value ([Environment]::NewLine + '127.0.0.1 ${domain} #Magic Nodus panel!')`
  
  // Membuat host
  await new Promise<void>((resolve, reject) => {
    spawn(
      "powershell",
      ["-Command", `Start-Process powershell -ArgumentList "${command.replace(/"/g, '""')}" -Verb RunAs`],
      { stdio: "inherit" }
    ).on("exit", (code) => (code === 0 ? resolve() : reject(new Error("Gagal atau dibatalkan UAC."))));
  })

  try {
    await shell.transaction(async (tx: Transaction) => {
      // Membuat config vhost
      await tx.writeFile(configPath, config)

      // Membuat directory root
      await tx.mkdir(rootPath, { recursive: true })
    })
    return NextResponse.json({ success: true, domain })
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string }
    if (e.code === "EEXIST") {
      return NextResponse.json({ error: "Folder atau file sudah ada", status: 400 }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || "Gagal membuat vhost", status: 500 }, { status: 500 })
  }
}
