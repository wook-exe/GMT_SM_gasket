import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteInspection, getInspection } from '../lib/history'
import VerdictBadge from '../components/VerdictBadge'
import InspectionEditor from '../components/InspectionEditor'
import type { InspectionResult } from '../lib/types'

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [item, setItem] = useState<InspectionResult | null>(null)

  useEffect(() => {
    if (!id) return
    setItem(getInspection(id))
  }, [id])

  if (!item) {
    return (
      <div className="text-center py-16 text-slate-500">
        검사 결과를 찾을 수 없습니다.
      </div>
    )
  }

  const onDelete = () => {
    if (!confirm('이 검사 기록을 삭제하시겠습니까?')) return
    deleteInspection(item.id)
    nav('/history')
  }

  const formatTime = (ts: number) => new Date(ts).toLocaleString('ko-KR')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => nav(-1)}
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← 뒤로
      </button>

      <div className="bg-white ring-1 ring-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <VerdictBadge verdict={item.verdict} size="md" />
              {item.verdictManual && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                  사용자 수정
                </span>
              )}
            </div>
            <span className="text-sm text-slate-500">
              {formatTime(item.timestamp)}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 break-all mb-2">
            {item.productName}
          </h2>
          <div className="text-xs text-slate-500">{item.filename}</div>
        </div>

        <div className="p-6">
          <dl className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-md p-4 ring-1 ring-slate-200">
            <div>
              <dt className="text-slate-600">mask_max</dt>
              <dd className="font-mono text-slate-900 font-semibold">
                {item.maskMax.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">threshold</dt>
              <dd className="font-mono text-slate-700">{item.threshold}</dd>
            </div>
            <div>
              <dt className="text-slate-600">검사자</dt>
              <dd className="text-slate-700">{item.user}</dd>
            </div>
            <div>
              <dt className="text-slate-600">추론 소스</dt>
              <dd className="text-xs">
                {item.source === 'mock' ? (
                  <span className="text-amber-700">mock</span>
                ) : (
                  <span className="text-emerald-700">실제 모델</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <InspectionEditor record={item} onSaved={setItem} onDelete={onDelete} />
    </div>
  )
}
