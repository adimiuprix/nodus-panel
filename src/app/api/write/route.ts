import { NextResponse } from "next/server";
import { createShell } from "@oxog/shell-core";

export async function POST() {
    const isiannya = `
    <VirtualHost *:80>
      ServerAdmin webmaster@dummy-host.example.com
      DocumentRoot "tyutujtuj/docs/dummy-host.example.com"
      ServerName dummy-host.example.com
      ServerAlias www.dummy-host.example.com
      ErrorLog "logs/dummy-host.example.com-error.log"
      CustomLog "logs/dummy-host.example.com-access.log" common
    </VirtualHost>
    `

    const shell = createShell()

    await shell.transaction(async (tx) => {
        await tx.writeFile("G:/asawawu.conf", isiannya);
    })

    return NextResponse.json({ message: "File berhasil dibuat!" })
  }
