import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getInspection,
  updateMemo,
  deleteInspection,
} from '../lib/history'
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => nav(-1)}
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← 뒤로
      </button>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-100 p-4">
          <img
            src={item.imageDataUrl}
            alt={item.filename}
            className="w-full max-h-96 object-contain mx-auto"
          />
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <VerdictBadge verdict={item.verdict} size="md" />
            <span className="text-sm text-slate-500">
              {new Date(item.timestamp).toLocaleString('ko-KR')}
            </span>
          </div>

          <h2 className="text-lg font-semibold mb-2 break-all">{item.filename}</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm bg-slate-50 rounded-md p-4 mb-6">
            <dt className="text-slate-500">mask_max</dt>
            <dd className="font-mono text-right">{item.maskMax.toFixed(2)}</dd>
            <dt className="text-slate-500">threshold</dt>
            <dd className="font-mono text-right">{item.threshold}</dd>
            <dt className="text-slate-500">검사자</dt>
            <dd className="text-right">{item.user}</dd>
            <dt className="text-slate-500">추론 소스</dt>
            <dd className="text-right text-xs">
              {item.source === 'mock' ? (
                <span className="text-amber-600">mock</span>
              ) : (
                <span className="text-emerald-600">실제 모델</span>
              )}
            </dd>
          </dl>

          {item.heatmapDataUrl && (
            <div className="mb-6">
              <p className="text-xs text-slate-500 mb-1">히트맵</p>
              <img
                src={item.heatmapDataUrl}
                alt="heatmap"
                className="rounded border border-slate-200 max-w-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              메모
              {item.verdict === 'FAIL' && (
                <span className="ml-2 text-red-500 text-xs font-normal">
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
                  ? '예) 우측 상단 미조립 추정 / 라인 3 / 야간 교대조 / 후속조치: 재검사 요청'
                  : '메모를 남길 수 있습니다.'
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm resize-y"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={onSave}
                className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 text-sm font-medium transition"
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
