import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUser } from '../lib/auth'
import { listHistory } from '../lib/history'

export default function MyPage() {
  const user = getCurrentUser()
  const items = useMemo(() => listHistory(user?.username), [user])

  const total = items.length
  const fails = items.filter((r) => r.verdict === 'FAIL').length
  const passes = total - fails
  const passRate = total === 0 ? 0 : (passes / total) * 100

  const recentFails = items.filter((r) => r.verdict === 'FAIL').slice(0, 5)

  // 최근 7일 일별 카운트
  const dailyStats = useMemo(() => {
    const now = new Date()
    const map = new Map<string, { pass: number; fail: number }>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      map.set(key, { pass: 0, fail: 0 })
    }
    items.forEach((r) => {
      const key = new Date(r.timestamp).toISOString().slice(0, 10)
      const bucket = map.get(key)
      if (bucket) {
        if (r.verdict === 'PASS') bucket.pass++
        else bucket.fail++
      }
    })
    return Array.from(map.entries()).map(([date, counts]) => ({ date, ...counts }))
  }, [items])

  const maxDay = Math.max(1, ...dailyStats.map((d) => d.pass + d.fail))

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">마이 페이지</h1>
        <p className="text-sm text-slate-500 mt-1">
          안녕하세요,{' '}
          <span className="font-medium text-slate-900">{user?.username}</span>님
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="총 검사" value={total.toString()} />
        <Stat label="양품" value={passes.toString()} accent="green" />
        <Stat label="불량" value={fails.toString()} accent="red" />
        <Stat label="양품률" value={`${passRate.toFixed(1)}%`} />
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="font-semibold mb-4 text-slate-900">최근 7일 검사 추이</h2>
        <div className="flex items-end justify-between gap-2 h-32">
          {dailyStats.map((d) => {
            const total = d.pass + d.fail
            const heightPct = (total / maxDay) * 100
            const failPct = total === 0 ? 0 : (d.fail / total) * 100
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full bg-emerald-200 rounded-t overflow-hidden flex flex-col-reverse"
                    style={{ height: `${heightPct}%` }}
                  >
                    {failPct > 0 && (
                      <div
                        className="bg-red-400"
                        style={{ height: `${failPct}%` }}
                      />
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {d.date.slice(5)}
                </div>
                <div className="text-[10px] text-slate-400">
                  {total > 0 ? total : ''}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-emerald-200 rounded-sm" /> 양품
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-400 rounded-sm" /> 불량
          </span>
        </div>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">최근 불량 5건</h2>
          {fails > 5 && (
            <Link
              to="/history"
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              전체 보기 →
            </Link>
          )}
        </div>
        {recentFails.length === 0 ? (
          <p className="text-sm text-slate-500">불량 이력이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentFails.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/history/${r.id}`}
                  className="flex items-center gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded transition"
                >
                  <img
                    src={r.imageDataUrl}
                    alt=""
                    className="w-10 h-10 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{r.filename}</div>
                    <div className="text-xs text-slate-500">
                      score {r.maskMax.toFixed(2)} ·{' '}
                      {new Date(r.timestamp).toLocaleDateString('ko-KR')}
                      {r.memo ? ' · 메모 있음' : ''}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'red' | 'green'
}) {
  const color =
    accent === 'red'
      ? 'text-red-600'
      : accent === 'green'
        ? 'text-emerald-600'
        : 'text-slate-900'
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  )
}
