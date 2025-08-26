'use client'
import React, { useState, useEffect } from 'react'
import { Database, Plus, Upload } from 'lucide-react'
import { Container } from './components/container'
import { StatCard } from './components/StatCard'
import { QuickAction } from './components/QuickAction'
import { TopBar } from './components/topBar'
import { ServiceRow } from './components/ServiceRow'

export default function Home(){
    const [showAlert, setShowAlert] = useState(false)
    const [stats, setStats] = useState(null)

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/snapshoot')
                const data = await res.json()
                setStats(data)
            } catch (err) {
            console.error('Failed to fetch stats', err)
            }
        }
    
        fetchStats()
        const interval = setInterval(fetchStats, 1000)

        return () => clearInterval(interval)
    }, [])

    const cpu_usage: number = stats?.cpu?.total ?? 0
    const mem_usage: number = stats?.mem?.total ?? 0
    const disc_usage: number = stats?.disc?.total ?? 0

    function handleClick(){
        setShowAlert(true)
        setTimeout(() => setShowAlert(false), 3000)
    }

    return(
        <>
            <TopBar />

            {/* Content */}
            <div className="px-6 pb-10">
            <h1 className="text-3xl font-semibold mt-6">Dashboard</h1>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
                <StatCard title="Total Vhost" value="24" />
                <StatCard title='CPU Usage (Avg)' value={`${cpu_usage.toString()}%`} ring={cpu_usage} />
                <StatCard title='Memory Usage' value={`${mem_usage.toString()}%`} ring={mem_usage} />
                <StatCard title='Disc Usage' value={`${disc_usage.toString()}Gb`} />
            </div>

            {/* Resource + Quick actions */}
            <Container>
                <div className="card bg-base-100 shadow-sm border border-base-200">
                    <div className="card-body p-6">
                        <div className="text-lg font-medium">Quick Actions</div>
                        <div className="mt-4 flex flex-col gap-3">
                            <QuickAction onClick={handleClick} icon={Plus} label='Create vhost' />
                            <QuickAction onClick={handleClick} icon={Database} label='Add Database' />
                            <QuickAction onClick={handleClick} icon={Upload} label='Upload Files' />
                        </div>
                    </div>
                </div>
            </Container>

            {showAlert && (
            <div className="toast toast-top toast-end">
                <div className="alert alert-success">
                <span>Quick aksi</span>
                </div>
            </div>
            )}
            {/* Services + Scheduler */}
            <Container>
                <div className="card bg-base-100 shadow-sm border border-base-200">
                <div className="card-body p-6">
                    <div className="text-lg font-medium">Services</div>
                    <div className="overflow-x-auto mt-4">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th className="text-base-content/60">Name</th>
                                    <th className="text-base-content/60">Status</th>
                                    <th className="text-base-content/60">Uptime</th>
                                    <th className="text-base-content/60 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                            <ServiceRow name="apache" uptime="12d 4h" />
                            <ServiceRow name="mysql" uptime="23d 5h" />
                            </tbody>
                        </table>
                    </div>
                    </div>
                </div>
            </Container>
            </div>
        </>
    )

}