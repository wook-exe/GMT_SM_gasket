import type { TrendBucket } from '../lib/stats'

interface Props {
  buckets: TrendBucket[]
}

export default function TrendChart({ buckets }: Props) {
  const maxCount = Math.max(
    ...buckets.map((b) => b.pass + b.fail),
    1,
  )

  const chartHeight = 200
  const barHeight = chartHeight - 40
  const barWidth = Math.max(20, 100 / buckets.length)
  const spacing = Math.max(4, 100 / buckets.length - barWidth)

  return (
    <div className="p-4 rounded-lg bg-slate-50 ring-1 ring-slate-200 border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">검사 추이 (시간 단위)</h3>
      <svg
        viewBox={`0 0 100 ${chartHeight}`}
        className="w-full h-48"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis */}
        <line
          x1="5"
          y1="10"
          x2="5"
          y2={chartHeight - 20}
          stroke="rgb(203, 213, 225)"
          strokeWidth="0.5"
        />
        {/* X-axis */}
        <line
          x1="5"
          y1={chartHeight - 20}
          x2="100"
          y2={chartHeight - 20}
          stroke="rgb(203, 213, 225)"
          strokeWidth="0.5"
        />

        {/* Grid lines and bars */}
        {buckets.map((bucket, i) => {
          const x = 8 + (i * (barWidth + spacing))
          const passHeight = (bucket.pass / Math.max(maxCount, 1)) * barHeight
          const failHeight = (bucket.fail / Math.max(maxCount, 1)) * barHeight

          return (
            <g key={i}>
              {/* Pass bar (emerald) */}
              <rect
                x={x}
                y={chartHeight - 20 - passHeight}
                width={barWidth}
                height={passHeight}
                fill="rgb(34, 197, 94)"
                opacity="0.8"
              />
              {/* Fail bar (red) stacked on top */}
              <rect
                x={x}
                y={chartHeight - 20 - passHeight - failHeight}
                width={barWidth}
                height={failHeight}
                fill="rgb(239, 68, 68)"
                opacity="0.8"
              />
              {/* Label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - 5}
                textAnchor="middle"
                fontSize="2.5"
                fill="rgb(100, 116, 139)"
              >
                {bucket.label}
              </text>
            </g>
          )
        })}

        {/* Legend */}
        <g>
          <rect x="8" y={chartHeight - 35} width="3" height="3" fill="rgb(34, 197, 94)" />
          <text x="12" y={chartHeight - 32} fontSize="2.5" fill="rgb(100, 116, 139)">
            양품
          </text>
          <rect x="22" y={chartHeight - 35} width="3" height="3" fill="rgb(239, 68, 68)" />
          <text x="26" y={chartHeight - 32} fontSize="2.5" fill="rgb(100, 116, 139)">
            불량
          </text>
        </g>
      </svg>
    </div>
  )
}
