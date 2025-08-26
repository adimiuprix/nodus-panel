import { NextResponse } from "next/server"
import { createShell } from "@oxog/shell-core"

export async function POST(req: Request) {
  const { domain } = await req.json()

  // config virtual host
  const config = `
# HTTP
<VirtualHost *:80>
    ServerName ${domain}
    DocumentRoot "D://nodus-panel/webroots/${domain}"
    <Directory "D://nodus-panel/webroots/${domain}">
        AllowOverride All
        Require all granted
    </Directory>
    ErrorLog "logs/error.log"
    CustomLog "logs/access.log" combined
</VirtualHost>
`

  const shell = createShell({
    cwd: "D:/nodus-panel/",
    verbose: true
  })

  try {
    await shell.transaction(async (tx) => {
      // Membuat file .conf untuk virtual host
      await tx.writeFile(`etc/site-enabled/${domain}.conf`, config)

      // Membuat folder root directory
      await shell.mkdir(`webroots/${domain}`, { recursive: true })

      // Membuat host di System32

      // Mengaktifkan SSL dengan mkcert
      // Update file virtual host
    })

    return NextResponse.json({ success: true, domain })
    
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create vhost' },
      { status: 500 }
    )
  }
}
