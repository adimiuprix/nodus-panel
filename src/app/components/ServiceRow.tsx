import { MoreHorizontal } from 'lucide-react'

export const ServiceRow = ({ name, uptime }: { name: string; uptime: string }) => (
    <tr className='hover'>
        <td className='font-medium'>{name}</td>
        <td><span className='badge badge-success badge-outline'>Running</span></td>
        <td className='text-sm text-base-content/70'>{uptime}</td>
        <td className='text-right'>
            <button className='btn btn-ghost btn-sm'>
                <MoreHorizontal size={18} />
            </button>
        </td>
    </tr>
)
