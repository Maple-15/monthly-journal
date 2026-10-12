import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Zap, Pencil, Trash2, X, AlertTriangle, RefreshCw } from 'lucide-react'
import { api } from '../api'

// 类别颜色映射
const CAT_COLORS = {
  '工作': 'bg-blue-100 text-blue-700',
  '学习': 'bg-green-100 text-green-700',
  '运动': 'bg-orange-100 text-orange-700',
  '阅读': 'bg-purple-100 text-purple-700',
  '娱乐': 'bg-pink-100 text-pink-700',
  '休息': 'bg-teal-100 text-teal-700',
  '社交': 'bg-yellow-100 text-yellow-700',
}

const CAT_DOT = {
  '工作': 'bg-blue-500',
  '学习': 'bg-green-500',
  '运动': 'bg-orange-500',
  '阅读': 'bg-purple-500',
  '娱乐': 'bg-pink-500',
  '休息': 'bg-teal-500',
  '社交': 'bg-yellow-500',
}

function formatMinutes(m) {
  if (!m || m === 0) return ''
  const h = Math.floor(m / 60)
  const min = Math.round(m % 60)
  if (h === 0) return `${min}分钟`
  if (min === 0) return `${h}小时`
  return `${h}小时${min}分钟`
}

function formatMinutesShort(m) {
  if (!m || m === 0) return ''
  const h = Math.floor(m / 60)
  const min = Math.round(m % 60)
  if (h === 0) return `${min}m`
  return `${h}h${min > 0 ? min : ''}`
}

function minutesAgo(mins) {
  const d = new Date(Date.now() - mins * 60000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MonthlyView() {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedDate, setSelectedDate] = useState(null)
  const [toast, setToast] = useState('')
  const [quickCats, setQuickCats] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getMonthly(year, month)
      setData(res)
      setLoadError('')
    } catch (e) {
      console.error(e)
      setLoadError(e.message || '加载失败')
    }
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 统计常用活动（当月高频主类+次类组合，Top 4）
  useEffect(() => {
    if (!data || !data.days) return
    const freq = {}
    for (const d of data.days) {
      for (const e of d.entries) {
        const key = `${e.main_category}|${e.sub_category}`
        freq[key] = (freq[key] || 0) + 1
      }
    }
    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([key]) => {
        const [main, sub] = key.split('|')
        return { main, sub }
      })
    setQuickCats(sorted)
  }, [data])

  // 一键记录 1 小时
  const quickRecord = async (main, sub) => {
    try {
      await api.createEntry({
        date: todayStr(),
        main_category: main,
        sub_category: sub,
        note: '',
        start_time: minutesAgo(60),
        end_time: minutesAgo(0),
      })
      setToast(`已记录：${main}-${sub} 1小时`)
      fetchData()
      setTimeout(() => setToast(''), 2500)
    } catch (e) {
      alert('记录失败: ' + e.message)
    }
  }

  // 删除条目
  const handleDelete = async (entryId) => {
    if (!window.confirm('确定删除这条记录吗？')) return
    try {
      await api.deleteEntry(entryId)
      setSelectedDate(null)
      fetchData()
    } catch (e) {
      alert('删除失败: ' + e.message)
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay() // 0=Sun
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const dayMap = {}
  if (data) {
    for (const d of data.days) {
      dayMap[d.date] = d
    }
  }

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const todayStrValue = todayStr()

  const cells = []
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[80px]" />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayData = dayMap[dateStr]
    const isToday = dateStr === todayStrValue
    const isSelected = dateStr === selectedDate

    cells.push(
      <div
        key={dateStr}
        onClick={() => setSelectedDate(isSelected ? null : dateStr)}
        className={`
          min-h-[60px] sm:min-h-[80px] p-1 rounded cursor-pointer border
          transition-colors relative
          ${isToday ? 'border-primary-400 bg-primary-50' : 'border-gray-100 hover:border-primary-200'}
          ${isSelected ? 'ring-2 ring-primary-400' : ''}
        `}
      >
        <div className={`text-xs sm:text-sm font-medium mb-0.5 ${isToday ? 'text-primary-600' : 'text-gray-600'}`}>
          {d}
        </div>
        {dayData && (
          <div className="space-y-0.5">
            {Object.entries(dayData.category_summary || {}).slice(0, 3).map(([cat, mins]) => (
              <div
                key={cat}
                className={`text-[10px] sm:text-xs px-1 py-0.5 rounded ${CAT_COLORS[cat] || 'bg-gray-100 text-gray-600'}`}
              >
                {cat} {formatMinutesShort(mins)}
              </div>
            ))}
            {Object.keys(dayData.category_summary || {}).length > 3 && (
              <div className="text-[10px] text-gray-400">+{Object.keys(dayData.category_summary).length - 3}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  const selectedDayData = selectedDate ? dayMap[selectedDate] : null

  let totalMinutes = 0
  const catTotals = {}
  if (data) {
    for (const d of data.days) {
      totalMinutes += d.total_minutes
      for (const [cat, mins] of Object.entries(d.category_summary)) {
        catTotals[cat] = (catTotals[cat] || 0) + mins
      }
    }
  }

  return (
    <div>
      {/* 提示条 */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {/* 加载失败提示：明确区分「连不上云端」和「真的没有数据」 */}
      {loadError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm text-red-700">
            <div className="font-medium">数据加载失败，不是记录丢了</div>
            <div className="text-red-600/80 text-xs mt-0.5">
              云端数据库暂时连不上（{loadError}）。稍后重试即可，已保存的记录不会消失。
            </div>
            <button
              onClick={fetchData}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-700 border border-red-300 hover:bg-red-100 px-2.5 py-1 rounded-md transition-colors"
            >
              <RefreshCw size={12} /> 重新加载
            </button>
          </div>
        </div>
      )}

      {/* 常用活动快捷记录 */}
      {quickCats.length > 0 && (
        <div className="bg-white rounded-xl p-3 mb-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <Zap size={13} />
            常用活动 · 点一下直接记录 1 小时
          </div>
          <div className="flex flex-wrap gap-2">
            {quickCats.map((q) => (
              <button
                key={`${q.main}-${q.sub}`}
                onClick={() => quickRecord(q.main, q.sub)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-gray-200 bg-gray-50 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${CAT_DOT[q.main] || 'bg-gray-400'}`} />
                {q.main}-{q.sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={20} className="text-gray-500" />
        </button>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="text-lg font-bold border-none bg-transparent cursor-pointer"
          >
            {Array.from({ length: 10 }, (_, i) => now.getFullYear() - 3 + i).map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <span className="text-lg font-bold">{month}月</span>
        </div>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight size={20} className="text-gray-500" />
        </button>
      </div>

      {/* 月度统计 */}
      <div className="bg-white rounded-xl p-3 sm:p-4 mb-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">
            总耗时：<strong className="text-gray-800">{formatMinutes(totalMinutes)}</strong>
          </span>
          {Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([cat, mins]) => (
            <span key={cat} className={`text-xs px-2 py-0.5 rounded-full ${CAT_COLORS[cat] || 'bg-gray-100'}`}>
              {cat} {formatMinutesShort(mins)}
            </span>
          ))}
        </div>
      </div>

      {/* 日历网格 */}
      {loading ? (
        <div className="flex justify-center py-12 text-gray-400">加载中...</div>
      ) : (
        <>
          <div className="calendar-grid mb-1">
            {weekDays.map((wd) => (
              <div key={wd} className="text-center text-xs sm:text-sm font-medium text-gray-400 py-1">
                {wd}
              </div>
            ))}
          </div>
          <div className="calendar-grid">{cells}</div>
        </>
      )}

      {/* 选中日期详情抽屉 */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/30 z-20 flex items-end sm:items-center justify-center" onClick={() => setSelectedDate(null)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[75vh] overflow-y-auto p-4 sm:m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{selectedDate}</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">
                  合计 {selectedDayData ? formatMinutesShort(selectedDayData.total_minutes) : ''}
                </span>
                <button onClick={() => setSelectedDate(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
            </div>

            {selectedDayData && selectedDayData.entries.length > 0 ? (
              <div className="space-y-2">
                {selectedDayData.entries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg">
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${CAT_DOT[entry.main_category] || 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{entry.sub_category}</span>
                        <span className="text-xs text-gray-400">{entry.main_category}</span>
                      </div>
                      {entry.note && <div className="text-xs text-gray-500 truncate">{entry.note}</div>}
                      <div className="text-xs text-gray-400">
                        {entry.start_time} - {entry.end_time}
                        <span className="ml-2">{formatMinutesShort(entry.duration_minutes)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => navigate(`/edit/${entry.id}`)}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-primary-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8 text-sm">这一天没有记录</div>
            )}

            <button
              onClick={() => setSelectedDate(null)}
              className="w-full mt-3 py-2 text-center text-sm text-gray-400 hover:text-gray-600"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
