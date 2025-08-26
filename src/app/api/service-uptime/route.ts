// app/api/service-uptime/route.ts
import { NextResponse } from 'next/server'
import si from 'systeminformation'

// Daftar service yang ingin dicek
const serviceNames = ['EventLog']

async function getServiceUptime(serviceName: string) {
  const services = await si.services(serviceName)
  const service = services[0]

  if (!service) return { name: serviceName, running: false, uptime: 'not found' }
  if (!service.running) return { name: service.name, running: false, uptime: 'stopped' }

  // Ambil proses berdasarkan pid
  const procs = await si.processes()
  const proc = procs.list.find(p => p.pid === service.pid)

  if (!proc) return { name: service.name, running: true, uptime: 'unknown' }

  // Hitung uptime dari startTime proses
  const start = new Date(proc.started).getTime()
  const uptimeSec = (Date.now() - start) / 1000
  const days = Math.floor(uptimeSec / 86400)
  const hours = Math.floor((uptimeSec % 86400) / 3600)
  const minutes = Math.floor((uptimeSec % 3600) / 60)
  const seconds = Math.floor(uptimeSec % 60)

  return {
    name: service.name,
    running: true,
    uptime: `${days}d ${hours}h ${minutes}m ${seconds}s`,
  }
}

export async function GET() {
  try {
    const data = await Promise.all(serviceNames.map(getServiceUptime))
    return NextResponse.json({ services: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to get services uptime' }, { status: 500 })
  }
}
