export const QuickAction = ({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number }>; label: string }) => (
  <button className='btn btn-ghost justify-start w-full gap-3 border border-base-200 hover:bg-base-200/60'>
    <span className='badge badge-primary badge-lg text-base-100 p-0 w-8 h-8 place-items-center grid'>
        <Icon size={16} />
    </span>
    <span className='text-sm'>{label}</span>
  </button>
)
