import { useMemo } from 'react'
import StatCard from '../components/StatCard'
import TrendChart from '../components/TrendChart'
import RecentVerdict from '../components/RecentVerdict'
import InspectionTable from '../components/InspectionTable'
import { listHistory } from '../lib/history'
import {
  computeDayStats,
  computeOverallStats,
  computeHourlyTrend,
} from '../lib/stats'

export default function Dashboard() {
  const records = useMemo(() => listHistory(), [])
  const dayStats = useMemo(() => computeDayStats(records), [records])
  const overallStats = useMemo(() => computeOverallStats(records), [records])
  const trend = useMemo(() => computeHourlyTrend(records, 8), [records])

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="오늘 생산"
          value={dayStats.production}
          suffix="개"
          color="cyan"
        />
        <StatCard
          label="오늘 검사"
          value={dayStats.inspected}
          suffix="개"
          color="emerald"
        />
        <StatCard label="오늘 양품" value={dayStats.pass} suffix="개" color="emerald" />
        <StatCard label="오늘 불량" value={dayStats.fail} suffix="개" color="red" />
        <StatCard
          label="오늘 불량률"
          value={dayStats.defectRate}
          suffix="%"
          color="amber"
        />
      </div>

      {/* Trend and recent */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <TrendChart buckets={trend} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">최근 검사</h3>
          <RecentVerdict records={records} />
        </div>
      </div>

      {/* History preview */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">검사 이력</h3>
        <InspectionTable records={records} limit={15} />
      </div>

      {/* Summary stats */}
      <div className="grid md:grid-cols-4 gap-3 p-4 rounded-lg bg-slate-50 ring-1 ring-slate-200 border border-slate-200">
        <div>
          <div className="text-xs text-slate-600 mb-1">누적 검사</div>
          <div className="text-2xl font-bold text-slate-900">
            {overallStats.total}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-600 mb-1">누적 양품</div>
          <div className="text-2xl font-bold text-emerald-700">
            {overallStats.pass}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-600 mb-1">누적 불량</div>
          <div className="text-2xl font-bold text-red-700">{overallStats.fail}</div>
        </div>
        <div>
          <div className="text-xs text-slate-600 mb-1">누적 불량률</div>
          <div className="text-2xl font-bold text-amber-700">
            {overallStats.defectRate.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  )
}
