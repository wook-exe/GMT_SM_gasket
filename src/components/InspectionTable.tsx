import { Link } from 'react-router-dom'
import type { InspectionResult } from '../lib/types'
import VerdictBadge from './VerdictBadge'

interface Props {
  records: InspectionResult[]
  limit?: number
}

export default function InspectionTable({ records, limit = 10 }: Props) {
  const displayed = records.slice(0, limit)

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="rounded-lg bg-white ring-1 ring-slate-200 border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-slate-600 font-semibold">시간</th>
            <th className="px-4 py-3 text-left text-slate-600 font-semibold">제품</th>
            <th className="px-4 py-3 text-left text-slate-600 font-semibold">검사자</th>
            <th className="px-4 py-3 text-right text-slate-600 font-semibold">점수</th>
            <th className="px-4 py-3 text-center text-slate-600 font-semibold">결과</th>
            <th className="px-4 py-3 text-left text-slate-600 font-semibold">불량유형</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((record) => (
            <tr
              key={record.id}
              className="border-b border-slate-100 hover:bg-slate-50 transition"
            >
              <td className="px-4 py-3 text-slate-700">
                <Link to={`/history/${record.id}`} className="hover:text-slate-900">
                  {formatTime(record.timestamp)}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-700">
                <Link to={`/history/${record.id}`} className="hover:text-slate-900 truncate">
                  {record.productName}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{record.user}</td>
              <td className="px-4 py-3 text-right text-slate-700 font-mono">
                {record.maskMax.toFixed(2)}%
              </td>
              <td className="px-4 py-3 text-center">
                <VerdictBadge verdict={record.verdict} size="sm" />
              </td>
              <td className="px-4 py-3 text-slate-600 text-xs">
                {record.defectType ? (
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                    {record.defectType}
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length === 0 && (
        <div className="p-8 text-center text-slate-500">
          검사 기록이 없습니다.
        </div>
      )}
    </div>
  )
}
