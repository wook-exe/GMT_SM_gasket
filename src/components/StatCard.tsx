import { useCountUp } from '../lib/useCountUp'

interface Props {
  label: string
  value: number
  suffix?: string
  color: 'cyan' | 'emerald' | 'red' | 'amber'
}

const colorMap = {
  cyan: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    ring: 'ring-cyan-200',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    ring: 'ring-red-200',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-200',
  },
}

export default function StatCard({ label, value, suffix = '', color }: Props) {
  const animated = useCountUp(value)
  const c = colorMap[color]

  return (
    <div className={`p-4 rounded-lg ring-1 ${c.bg} ${c.ring} border border-slate-200`}>
      <div className="text-sm text-slate-600 mb-2">{label}</div>
      <div className={`text-3xl font-bold ${c.text}`}>
        {Math.round(animated)}
        {suffix && <span className="text-xl ml-1">{suffix}</span>}
      </div>
    </div>
  )
}
