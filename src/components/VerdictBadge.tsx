import type { Verdict } from '../lib/types'

interface Props {
  verdict: Verdict
  size?: 'sm' | 'md'
}

export default function VerdictBadge({ verdict, size = 'sm' }: Props) {
  const isFail = verdict === 'FAIL'
  const cls = size === 'md' ? 'px-4 py-1.5 text-base' : 'px-3 py-1 text-sm'
  return (
    <span
      className={`inline-flex items-center ${cls} rounded-full font-semibold ${
        isFail
          ? 'bg-red-100 text-red-800 ring-1 ring-red-200'
          : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
      }`}
    >
      {isFail ? '✗ 불량 (FAIL)' : '✓ 양품 (PASS)'}
    </span>
  )
}
