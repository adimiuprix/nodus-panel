"use client"
import { useState } from "react"
import { Home, Server, Database, Folder, Network, Settings, Menu, X } from 'lucide-react'

export const SideBar = () => {
  const [open, setOpen] = useState(false)

  return (
    <>

      {/* Sidebar */}
      <aside
        className={`flex fixed top-0 left-0 z-40 w-64 h-screen bg-gray-50 dark:bg-gray-800 overflow-y-auto transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Navigation */}
        <nav className='mt-2 flex flex-col gap-1 flex-1 p-2 pt-20'>
          <a className='btn btn-ghost justify-start gap-3 w-full bg-primary/10 text-primary'><Home size={18} /><span>Dashboard</span></a>
          <a className='btn btn-ghost justify-start gap-3 w-full'><Server size={18} /><span>Servers</span></a>
          <a className='btn btn-ghost justify-start gap-3 w-full'><Database size={18} /><span>Databases</span></a>
          <a className='btn btn-ghost justify-start gap-3 w-full'><Folder size={18} /><span>Files</span></a>
          <a className='btn btn-ghost justify-start gap-3 w-full'><Network size={18} /><span>Networking</span></a>
          <a className='btn btn-ghost justify-start gap-3 w-full mt-auto'><Settings size={18} /><span>Settings</span></a>
        </nav>
      </aside>

      {/* Tombol toggle sidebar untuk mobile */}
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost btn-square fixed top-4 left-4 z-40"
      >
        {open ? <X /> : <Menu />}
      </button>

    </>
  )
}
