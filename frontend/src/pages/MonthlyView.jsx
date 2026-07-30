import { useState, useEffect, useCallback } from 'react'
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

export default function MonthlyView() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getMonthly(year, month)
      setData(res)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay() // 0=Sun
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  // 构建日期 -> 数据映射
  const dayMap = {}
  if (data) {
    for (const d of data.days) {
      dayMap[d.date] = d
    }
  }

  const prevMonth = () => {
    if (month === 1) {
      setYear(y => y - 1)
      setMonth(12)
    } else {
      setMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      setYear(y => y + 1)
      setMonth(1)
    } else {
      setMonth(m => m + 1)
    }
  }

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // 生成日历格子
  const cells = []
  // 空白填充
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[80px]" />)
  }
  // 日期
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayData = dayMap[dateStr]
    const isToday = dateStr === todayStr
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

  // 选中日期的详情
  const selectedDayData = selectedDate ? dayMap[selectedDate] : null

  // 月度统计
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
      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-lg">
          ◀
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
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-lg">
          ▶
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
          {/* 星期头 */}
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

      {/* 选中日期的详情弹窗 */}
      {selectedDate && selectedDayData && (
        <div className="fixed inset-0 bg-black/30 z-20 flex items-end sm:items-center justify-center" onClick={() => setSelectedDate(null)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[70vh] overflow-y-auto p-4 sm:m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{selectedDate}</h3>
              <span className="text-sm text-gray-400">
                合计 {formatMinutesShort(selectedDayData.total_minutes)}
              </span>
            </div>

            <div className="space-y-2">
              {selectedDayData.entries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    entry.main_category === '工作' ? 'bg-blue-500' :
                    entry.main_category === '学习' ? 'bg-green-500' :
                    entry.main_category === '运动' ? 'bg-orange-500' :
                    entry.main_category === '阅读' ? 'bg-purple-500' :
                    entry.main_category === '娱乐' ? 'bg-pink-500' :
                    entry.main_category === '休息' ? 'bg-teal-500' : 'bg-yellow-500'
                  }`} />
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
                </div>
              ))}
            </div>

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
