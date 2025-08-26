
export const StatCard = ({ title, value, ring }: { title: string; value: string; ring?: number }) => (
  <div className='card card-dash bg-base-100 shadow-sm border border-base-200'>
    <div className='card-body p-5 gap-3'>
      <div className='card-title text-sm text-base-content/60'>{title}</div>
      <div className='flex items-center justify-between'>
        <div>
          <div className='text-4xl font-semibold tracking-tight'>{value}</div>
        </div>
        {typeof ring === 'number' && (
        <div className='radial-progress text-primary' style={{
            ['--value' as keyof React.CSSProperties]: ring,
            ['--size' as keyof React.CSSProperties]: '64px',
            ['--thickness' as keyof React.CSSProperties]: '6px'
            }}
            aria-label={`${ring}%`}
        >
            {ring}%
        </div>
        )}
      </div>
    </div>
  </div>
)
