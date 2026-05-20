import { Link } from 'react-router-dom'
import type { InspectionResult } from '../lib/types'
import VerdictBadge from './VerdictBadge'

interface Props {
  records: InspectionResult[]
}

export default function RecentVerdict({ records }: Props) {
  const recent = records.slice(0, 4)
  const latest = recent[0]

  if (!latest) {
    return (
      <div className="p-6 rounded-lg bg-slate-50 ring-1 ring-slate-200 border border-slate-200 text-center text-slate-500">
        최근 검사 기록이 없습니다.
      </div>
    )
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="rounded-lg bg-white ring-1 ring-slate-200 border border-slate-200 overflow-hidden">
      {/* Latest */}
      <Link
        to={`/history/${latest.id}`}
        className="block p-4 border-b border-slate-200 hover:bg-slate-50 transition"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-slate-500">방금 전</div>
          <VerdictBadge verdict={latest.verdict} size="md" />
        </div>
        <div className="text-sm font-semibold text-slate-900 truncate mb-1">
          {latest.productName}
        </div>
        <div className="text-xs text-slate-600">
          {latest.user} · {latest.maskMax.toFixed(2)}% · {formatTime(latest.timestamp)}
        </div>
        {latest.defectType && (
          <div className="text-xs mt-2 bg-red-100 text-red-700 px-2 py-1 rounded w-fit">
            {latest.defectType}
          </div>
        )}
      </Link>

      {/* Recent list */}
      {recent.length > 1 && (
        <div className="divide-y divide-slate-100 bg-slate-50">
          {recent.slice(1).map((record) => (
            <Link
              key={record.id}
              to={`/history/${record.id}`}
              className="block p-3 hover:bg-slate-100 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-700 truncate">
                    {record.productName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatTime(record.timestamp)}
                  </div>
                </div>
                <VerdictBadge verdict={record.verdict} size="sm" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
