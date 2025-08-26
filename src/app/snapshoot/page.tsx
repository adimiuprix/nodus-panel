'use client'
import { useState } from 'react'

import React from 'react'
import { Database, Plus, Upload, Users, MoreHorizontal, Bell, HelpCircle } from 'lucide-react'
import { Container } from '../components/container'
import { StatCard } from '../components/StatCard'
import { QuickAction } from '../components/QuickAction'
import { SideBar } from '../components/SideBar'

const ServiceRow = ({ name, uptime }: { name: string; uptime: string }) => (
  <tr className='hover'>
    <td className='font-medium'>{name}</td>
    <td><span className='badge badge-success badge-outline'>Running</span></td>
    <td className='text-sm text-base-content/70'>{uptime}</td>
    <td className='text-right'><button className='btn btn-ghost btn-sm'><MoreHorizontal size={18} /></button></td>
  </tr>
)

export default function Copmol() {
  const [showAlert, setShowAlert] = useState(false)

  function handleClick(){
    setShowAlert(true)
    setTimeout(() => setShowAlert(false), 3000)
  }

  return (
    <div className='min-h-screen bg-base-200'>
      <div className='flex'>

        {/* Main */}
        <main className='flex-1'>
          {/* Topbar */}
          <div className='px-6 pt-6'>

            <div className='flex items-center justify-between'>
              <div className='w-full max-w-3xl'>
                <SideBar />
              </div>
              <div className='flex items-center gap-4 ml-6'>
                <button className='btn btn-ghost btn-circle'><HelpCircle /></button>
                <button className='btn btn-ghost btn-circle'><Bell /></button>
                <div className='avatar placeholder'>
                  <div className='bg-neutral text-neutral-content rounded-full w-9'>
                    <span>🧑</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className='px-6 pb-10'>
            <h1 className='text-3xl font-semibold mt-6'>Dashboard</h1>

            {/* Stats cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6'>
              <StatCard title='Total Vhost' value='24' />
              <StatCard title='CPU Usage' value='60%' ring={60} />
              <StatCard title='Memory Usage' value='72%' ring={72} />
              <StatCard title='Storage Usage' value='930 GB' ring={68} />
            </div>

            {/* Resource + Quick actions */}
            <Container>
              <div className='card bg-base-100 shadow-sm border border-base-200'>
                <div className='card-body p-6'>
                  <div className='text-lg font-medium'>Quick Actions</div>
                  <div className='mt-4 flex flex-col gap-3'>
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
              <div className='card bg-base-100 shadow-sm border border-base-200 xl:col-span-2'>
                <div className='card-body p-6'>
                  <div className='text-lg font-medium'>Services</div>
                  <div className='overflow-x-auto mt-4'>
                    <table className='table table-zebra'>
                      <thead>
                        <tr>
                          <th className='text-base-content/60'>Name</th>
                          <th className='text-base-content/60'>Status</th>
                          <th className='text-base-content/60'>Uptime</th>
                          <th className='text-base-content/60 text-right'>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <ServiceRow name='apache' uptime='12d 4h' />
                        <ServiceRow name='mysql' uptime='23d 5h' />
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </Container>

          </div>

        </main>
      </div>
    </div>
  )
}
