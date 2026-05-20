import { useMemo, useState } from 'react'
import { listHistory } from '../lib/history'
import type { Verdict } from '../lib/types'
import InspectionTable from '../components/InspectionTable'

type Filter = 'all' | Verdict

export default function History() {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const items = useMemo(() => {
    const all = listHistory()
    return all.filter((r) => {
      if (filter !== 'all' && r.verdict !== filter) return false
      if (query && !r.productName.toLowerCase().includes(query.toLowerCase())) {
        return false
      }
      return true
    })
  }, [filter, query])

  const filters: Filter[] = ['all', 'PASS', 'FAIL']

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">검사 이력</h1>
        <p className="text-sm text-slate-600 mt-1">
          모든 검사 결과를 확인하세요.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex bg-white rounded-md ring-1 ring-slate-200 border border-slate-200 overflow-hidden">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium transition ${
                filter === f
                  ? 'bg-cyan-50 text-cyan-700'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? '전체' : f === 'PASS' ? '양품' : '불량'}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="제품명 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
        />
        <div className="text-sm text-slate-600 ml-auto">{items.length}건</div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-lg border border-slate-200 ring-1 ring-slate-200 text-slate-500">
          {filter === 'all' && !query
            ? '검사 이력이 없습니다.'
            : '조건에 맞는 결과가 없습니다.'}
        </div>
      ) : (
        <InspectionTable records={items} limit={100} />
      )}
    </div>
  )
}
