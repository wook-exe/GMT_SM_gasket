import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getInspection, updateMemo, deleteInspection } from '../lib/history'
import VerdictBadge from '../components/VerdictBadge'
import type { InspectionResult } from '../lib/types'

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [item, setItem] = useState<InspectionResult | null>(null)
  const [memo, setMemo] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!id) return
    const r = getInspection(id)
    setItem(r)
    setMemo(r?.memo ?? '')
  }, [id])

  if (!item) {
    return (
      <div className="text-center py-16 text-slate-500">
        검사 결과를 찾을 수 없습니다.
      </div>
    )
  }

  const onSave = () => {
    updateMemo(item.id, memo.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const onDelete = () => {
    if (!confirm('이 검사 기록을 삭제하시겠습니까?')) return
    deleteInspection(item.id)
    nav('/history')
  }

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString('ko-KR')
  }

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
            <VerdictBadge verdict={item.verdict} size="md" />
            <span className="text-sm text-slate-500">
              {formatTime(item.timestamp)}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 break-all mb-2">
            {item.productName}
          </h2>
          <div className="text-xs text-slate-500">
            {item.filename}
          </div>
        </div>

        <div className="p-6">
          <dl className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-md p-4 mb-6 ring-1 ring-slate-200">
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

          {item.defectType && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-xs text-slate-600 mb-1">불량 유형</div>
              <div className="text-sm text-red-700 font-semibold">
                {item.defectType}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              메모
              {item.verdict === 'FAIL' && (
                <span className="ml-2 text-red-600 text-xs font-normal">
                  (불량 원인 기록 권장)
                </span>
              )}
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              placeholder={
                item.verdict === 'FAIL'
                  ? '예) 우측 상단 미조립 추정 / 라인 3 / 야간 교대조'
                  : '메모를 남길 수 있습니다.'
              }
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm resize-y transition"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={onSave}
                className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 text-sm font-medium transition"
              >
                {saved ? '✓ 저장됨' : '메모 저장'}
              </button>
              <button
                onClick={onDelete}
                className="ml-auto px-4 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm transition"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
