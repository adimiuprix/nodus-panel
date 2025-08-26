export const QuickAction = ({ icon: Icon, label, onClick, }: { icon: React.ComponentType<{ size?: number }>; label: string, onClick?: () => void }) => (
  <button onClick={onClick} className="btn btn-ghost w-full justify-start gap-3 border border-base-200 hover:bg-base-200/50">
    <div className="badge badge-primary w-8 h-8 p-0 grid place-items-center">
      <Icon size={16} />
    </div>
    <span className="text-sm">{label}</span>
  </button>
)
