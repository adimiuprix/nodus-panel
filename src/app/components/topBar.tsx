import { SideBar } from "./SideBar"
import { Bell, HelpCircle } from 'lucide-react'

export const TopBar = () => {
    return(
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
    )
}