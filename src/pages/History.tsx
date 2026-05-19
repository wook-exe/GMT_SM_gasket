import { useMemo, useState } from 'react'
import { listHistory } from '../lib/history'
import { getCurrentUser } from '../lib/auth'
import HistoryRow from '../components/HistoryRow'
import type { Verdict } from '../lib/types'

type Filter = 'all' | Verdict

export default function History() {
  const user = getCurrentUser()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const items = useMemo(() => {
    const all = listHistory(user?.username)
    return all.filter((r) => {
      if (filter !== 'all' && r.verdict !== filter) return false
      if (query && !r.filename.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [user, filter, query])

  const filters: Filter[] = ['all', 'PASS', 'FAIL']

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">검사 이력</h1>
        <p className="text-sm text-slate-500 mt-1">
          {user?.username}님의 모든 검사 결과가 표시됩니다.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex bg-white rounded-md border border-slate-200 overflow-hidden">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium transition ${
                filter === f
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {f === 'all' ? '전체' : f === 'PASS' ? '양품' : '불량'}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="파일명 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <div className="text-sm text-slate-500 ml-auto">{items.length}건</div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-slate-200 text-slate-500">
          {filter === 'all' && !query
            ? '검사 이력이 없습니다. 검사 메뉴에서 시작하세요.'
            : '조건에 맞는 결과가 없습니다.'}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <HistoryRow key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  )
}
