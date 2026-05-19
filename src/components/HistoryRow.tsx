import { Link } from 'react-router-dom'
import type { InspectionResult } from '../lib/types'
import VerdictBadge from './VerdictBadge'

export default function HistoryRow({ r }: { r: InspectionResult }) {
  const date = new Date(r.timestamp)
  return (
    <Link
      to={`/history/${r.id}`}
      className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md hover:border-slate-300 transition"
    >
      <img
        src={r.imageDataUrl}
        alt=""
        className="w-16 h-16 object-cover rounded-md bg-slate-100 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <VerdictBadge verdict={r.verdict} />
          <span className="text-xs text-slate-500 font-mono">
            {r.maskMax.toFixed(2)} / {r.threshold}
          </span>
        </div>
        <div className="text-sm text-slate-700 truncate">{r.filename}</div>
        <div className="text-xs text-slate-500">
          {date.toLocaleString('ko-KR')}
          {r.memo ? <span className="ml-2 text-slate-400">· 메모</span> : null}
          {r.source === 'mock' ? <span className="ml-2 text-amber-600">· mock</span> : null}
        </div>
      </div>
      <span className="text-slate-400">→</span>
    </Link>
  )
}
