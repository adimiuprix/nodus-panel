import { NextResponse } from 'next/server'
import si from 'systeminformation'

let cachedStats = {
  cpu: { total: 0 },
  mem: { total: 0 },
  disc: { total: 0 },
}

async function getCpuUsage(): Promise<number> {
  const load = await si.currentLoad()
  return Number(load.currentLoad.toFixed(2))
}

async function getMemUsage(): Promise<number> {
  const mem = await si.mem()
  const usedPercent = (mem.used / mem.total) * 100
  return Number(usedPercent.toFixed(1))
}

async function getDiskUsage(): Promise<number> {
  const disks = await si.fsSize()
  const main = disks.find(d => d.fs.startsWith("C:") || d.mount === "/")
  const usedGB = main.used / (1024 ** 3)
  return Number(usedGB.toFixed(1))
}

async function updateStats() {
  const [cpuUsage, memUsage, discUsage] = await Promise.all([getCpuUsage(), getMemUsage(), getDiskUsage()])

  cachedStats = {
    cpu: { total: cpuUsage },
    mem: { total: memUsage },
    disc: { total: discUsage },
  }
}

setInterval(updateStats, 60000)
updateStats()

export async function GET() {
  return NextResponse.json(cachedStats)
}
