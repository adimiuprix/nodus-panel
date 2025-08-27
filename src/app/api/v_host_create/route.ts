import { NextResponse } from "next/server"
import { createShell, Shell, Transaction } from "@oxog/shell-core"

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
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody
  } catch {
    return NextResponse.json({ error: "Request body invalid" }, { status: 400 });
  }

  const { domain } = body;
  if (!domain) {
    return NextResponse.json({ error: "Domain tidak boleh kosong" }, { status: 400 });
  }

  const rootPath = `D:/nodus-panel/webroots/${domain}`;
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
    cwd: "D:/nodus-panel/",
    verbose: true,
    silent: false
  })

  // cek Apache jalan
  const check = await shell.exec('tasklist | findstr httpd.exe', { fatal: false })
  if (!check.stdout?.includes('httpd.exe')) {
    return NextResponse.json({ error: "Apache belum jalan", status: 400 }, { status: 400 })
  }

  const injector = `
  import { execSync } from "child_process";

  execSync(
    "powershell -Command \\"Add-Content -Path 'C:\\\\Windows\\\\System32\\\\drivers\\\\etc\\\\hosts' -Value ([Environment]::NewLine + '127.0.0.1     ${domain}')\\"",
    { stdio: "inherit" }
  )
  `

  const filePath = "D:/nodus-panel/automation/host.js"

  try {
    await shell.transaction(async (tx: Transaction) => {
      await tx.writeFile(configPath, config)
      await tx.mkdir(rootPath, { recursive: true })
      await tx.writeFile(filePath, injector)
      await tx.exec('cscript //nologo "D:\\nodus-panel\\automation\\host.vbs"')
      await tx.remove("D:\\nodus-panel\\automation\\host.js")
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
