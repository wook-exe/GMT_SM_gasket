import type { Verdict } from '../lib/types'

interface Props {
  verdict: Verdict
  size?: 'sm' | 'md'
}

export default function VerdictBadge({ verdict, size = 'sm' }: Props) {
  const isFail = verdict === 'FAIL'
  const cls = size === 'md' ? 'px-4 py-1.5 text-base' : 'px-2.5 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1 ${cls} rounded-full font-semibold ${
        isFail
          ? 'bg-red-100 text-red-700'
          : 'bg-emerald-100 text-emerald-700'
      }`}
    >
      {isFail ? '✗ 불량' : '✓ 양품'}
    </span>
  )
}
