import { useMemo } from 'react'
import { getCurrentUser } from '../lib/auth'
import StatCard from '../components/StatCard'
import InspectionTable from '../components/InspectionTable'
import { listHistory } from '../lib/history'
import {
  computeDayStats,
  computeOverallStats,
  computeDefectBreakdown,
} from '../lib/stats'

export default function MyPage() {
  const user = getCurrentUser()
  const records = useMemo(() => listHistory(), [])
  const dayStats = useMemo(() => computeDayStats(records), [records])
  const overallStats = useMemo(() => computeOverallStats(records), [records])
  const defects = useMemo(() => computeDefectBreakdown(records), [records])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">검사 현황</h1>
        <p className="text-sm text-slate-400 mt-1">
          안녕하세요, <span className="font-medium text-cyan-300">{user?.username}</span>님
        </p>
      </div>

      {/* Today's focus */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">오늘 현황</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="생산수량"
            value={dayStats.production}
            suffix="개"
            color="cyan"
          />
          <StatCard
            label="검사수량"
            value={dayStats.inspected}
            suffix="개"
            color="emerald"
          />
          <StatCard
            label="양품"
            value={dayStats.pass}
            suffix="개"
            color="emerald"
          />
          <StatCard
            label="불량"
            value={dayStats.fail}
            suffix="개"
            color="red"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <StatCard
            label="불량률"
            value={dayStats.defectRate}
            suffix="%"
            color="amber"
          />
          <StatCard
            label="검사율"
            value={(
              (dayStats.inspected / dayStats.production) *
              100
            ).toFixed(0) as any}
            suffix="%"
            color="cyan"
          />
        </div>
      </div>

      {/* Cumulative stats */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">누적 통계</h2>
        <div className="p-4 rounded-lg bg-slate-900/40 ring-1 ring-slate-700 border border-slate-800">
          <div className="grid md:grid-cols-5 gap-4">
            <div>
              <div className="text-xs text-slate-400 mb-1">누적 검사</div>
              <div className="text-2xl font-bold text-slate-100">
                {overallStats.total}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">누적 양품</div>
              <div className="text-2xl font-bold text-emerald-400">
                {overallStats.pass}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">누적 불량</div>
              <div className="text-2xl font-bold text-red-400">
                {overallStats.fail}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">누적 불량률</div>
              <div className="text-2xl font-bold text-amber-400">
                {overallStats.defectRate.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">누적 양품률</div>
              <div className="text-2xl font-bold text-emerald-400">
                {(100 - overallStats.defectRate).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Defect breakdown */}
      {defects.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">불량 유형별 (오늘)</h2>
          <div className="p-4 rounded-lg bg-slate-900/40 ring-1 ring-slate-700 border border-slate-800">
            <div className="space-y-2">
              {defects.map((d) => (
                <div key={d.type} className="flex items-center justify-between">
                  <div className="text-sm text-slate-300">{d.type}</div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (d.count / Math.max(...defects.map((x) => x.count), 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-sm font-semibold text-red-400 w-8 text-right">
                      {d.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent inspections */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">최근 검사 기록</h2>
        <InspectionTable records={records} limit={10} />
      </div>
    </div>
  )
}
