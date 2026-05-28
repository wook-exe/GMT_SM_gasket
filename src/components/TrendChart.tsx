import type { TrendBucket } from '../lib/stats'

interface Props {
  buckets: TrendBucket[]
}

export default function TrendChart({ buckets }: Props) {
  const maxCount = Math.max(...buckets.map((b) => b.pass + b.fail), 1)
  const yTicks = buildTicks(maxCount)

  return (
    <div className="p-4 rounded-lg bg-slate-50 ring-1 ring-slate-200 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">검사 추이 (시간 단위)</h3>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
            양품
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500" />
            불량
          </span>
        </div>
      </div>

      <div className="flex h-56">
        {/* Y축 눈금 */}
        <div className="flex flex-col justify-between pr-2 py-1 text-[10px] text-slate-500 text-right tabular-nums">
          {yTicks.map((t) => (
            <div key={t}>{t}</div>
          ))}
        </div>

        {/* 차트 영역 */}
        <div className="flex-1 flex flex-col">
          <div className="relative flex-1 border-l border-b border-slate-200">
            {/* 가로 그리드 라인 */}
            {yTicks.slice(0, -1).map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-slate-200/70"
                style={{ top: `${(i / (yTicks.length - 1)) * 100}%` }}
              />
            ))}

            {/* 막대 */}
            <div className="absolute inset-0 flex items-end justify-around px-1 gap-1">
              {buckets.map((b, i) => {
                const total = b.pass + b.fail
                const totalPct = (total / maxCount) * 100
                const passPct = total === 0 ? 0 : (b.pass / total) * 100
                const failPct = total === 0 ? 0 : (b.fail / total) * 100
                return (
                  <div
                    key={i}
                    className="group relative flex-1 max-w-[44px] flex flex-col justify-end h-full"
                    title={`${b.label} · 양품 ${b.pass} / 불량 ${b.fail}`}
                  >
                    <div
                      className="w-full rounded-t overflow-hidden flex flex-col justify-end transition-all"
                      style={{ height: `${totalPct}%` }}
                    >
                      {b.fail > 0 && (
                        <div
                          className="bg-red-500 w-full"
                          style={{ height: `${failPct}%` }}
                        />
                      )}
                      {b.pass > 0 && (
                        <div
                          className="bg-emerald-500 w-full"
                          style={{ height: `${passPct}%` }}
                        />
                      )}
                    </div>
                    {/* 값 라벨 (호버 시 강조) */}
                    {total > 0 && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-slate-700 tabular-nums opacity-0 group-hover:opacity-100 transition">
                        {total}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* X축 라벨 */}
          <div className="flex justify-around px-1 gap-1 pt-1.5">
            {buckets.map((b, i) => (
              <div
                key={i}
                className="flex-1 max-w-[44px] text-center text-[10px] text-slate-500 tabular-nums"
              >
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function buildTicks(max: number): number[] {
  const step = niceStep(max)
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = top; v >= 0; v -= step) ticks.push(v)
  return ticks
}

function niceStep(max: number): number {
  if (max <= 4) return 1
  if (max <= 10) return 2
  if (max <= 20) return 5
  if (max <= 50) return 10
  if (max <= 100) return 20
  const pow = Math.pow(10, Math.floor(Math.log10(max)))
  return Math.ceil(max / (pow * 5)) * pow
}
