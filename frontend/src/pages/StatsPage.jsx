import { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, CalendarDays } from 'lucide-react'
import { api } from '../api'

const CAT_COLORS = {
  '工作': '#3b82f6',
  '学习': '#22c55e',
  '运动': '#f97316',
  '阅读': '#a855f7',
  '娱乐': '#ec4899',
  '休息': '#14b8a6',
  '社交': '#eab308',
}

const HEAT_COLORS = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127']

function fmt(m) {
  if (!m || m === 0) return '0分钟'
  const h = Math.floor(m / 60)
  const min = Math.round(m % 60)
  if (h === 0) return `${min}分钟`
  if (min === 0) return `${h}小时`
  return `${h}小时${min}分钟`
}

function fmtShort(m) {
  if (!m || m === 0) return '0'
  const h = Math.floor(m / 60)
  const min = Math.round(m % 60)
  return h === 0 ? `${min}m` : `${h}h${min > 0 ? min : ''}`
}

function dateOf(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function StatsPage() {
  const now = new Date()
  const year = now.getFullYear()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [yearData, setYearData] = useState(null)
  const [monthData, setMonthData] = useState(null)
  const [tab, setTab] = useState('month')
  const [heatHover, setHeatHover] = useState(null)

  useEffect(() => {
    api.getYear(year).then(setYearData).catch(console.error)
  }, [year])

  useEffect(() => {
    api.getMonthly(year, month).then(setMonthData).catch(console.error)
  }, [year, month])

  // 全年每天的总分钟映射
  const yearDayMap = useMemo(() => {
    const m = {}
    if (yearData) {
      for (const d of yearData.days) {
        m[d.date] = d.total_minutes
      }
    }
    return m
  }, [yearData])

  // 月度图表数据
  const pieData = useMemo(() => {
    if (!monthData) return []
    const totals = {}
    for (const d of monthData.days) {
      for (const [cat, mins] of Object.entries(d.category_summary)) {
        totals[cat] = (totals[cat] || 0) + mins
      }
    }
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 5).map(([name, value]) => ({ name, value: Math.round(value) }))
    const rest = sorted.slice(5).reduce((s, [, v]) => s + v, 0)
    if (rest > 0) top.push({ name: '其他', value: Math.round(rest) })
    return top
  }, [monthData])

  const barData = useMemo(() => {
    if (!monthData) return []
    return monthData.days.map((d) => ({
      date: d.date.slice(8),
      minutes: Math.round(d.total_minutes),
    }))
  }, [monthData])

  // 周报：本周 vs 上周
  const weekReport = useMemo(() => {
    if (!yearData) return null
    const today = new Date()
    const dow = (today.getDay() + 6) % 7 // 周一=0
    const thisStart = new Date(today)
    thisStart.setDate(today.getDate() - dow)
    const lastStart = new Date(thisStart)
    lastStart.setDate(thisStart.getDate() - 7)

    const sumWeek = (start) => {
      let total = 0
      let activeDays = 0
      const catTotals = {}
      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        const key = dateOf(d.getFullYear(), d.getMonth() + 1, d.getDate())
        const mins = yearDayMap[key]
        if (mins > 0) {
          total += mins
          activeDays++
        }
      }
      return { total, activeDays }
    }

    const thisWeek = sumWeek(thisStart)
    const lastWeek = sumWeek(lastStart)
    const diff = thisWeek.total - lastWeek.total
    const diffPct = lastWeek.total > 0 ? Math.round((diff / lastWeek.total) * 100) : (diff > 0 ? 100 : 0)

    // 本周分类排行
    const catTotals = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(thisStart)
      d.setDate(thisStart.getDate() + i)
      const key = dateOf(d.getFullYear(), d.getMonth() + 1, d.getDate())
      const day = yearData.days.find((x) => x.date === key)
      if (day) {
        for (const e of day.entries) {
          catTotals[e.main_category] = (catTotals[e.main_category] || 0) + e.duration_minutes
        }
      }
    }
    const catRank = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5)

    return { thisWeek, lastWeek, diff, diffPct, catRank }
  }, [yearData, yearDayMap])

  // 热力图格子
  const heatCells = useMemo(() => {
    const cells = []
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31)
    // 第一列从周日开始对齐（GitHub 风格：周日=0）
    let col = []
    const cols = []
    const day = new Date(start)
    while (day <= end) {
      col.push(new Date(day))
      if (col.length === 7 || day >= end) {
        cols.push(col)
        col = []
      }
      day.setDate(day.getDate() + 1)
    }
    return cols
  }, [year])

  const heatLevel = (mins) => {
    if (!mins || mins === 0) return 0
    if (mins < 60) return 1
    if (mins < 180) return 2
    if (mins < 360) return 3
    return 4
  }

  const monthNames = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)

  return (
    <div className="space-y-4">
      {/* Tab 切换 */}
      <div className="flex bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
        {[
          { key: 'month', label: '月度' },
          { key: 'week', label: '周报' },
          { key: 'heat', label: '年度热力图' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
              tab === t.key ? 'bg-primary-500 text-white font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 月度图表 */}
      {tab === 'month' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
            >
              {monthNames.map((mn, i) => (
                <option key={mn} value={i + 1}>{year}年{mn}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600 mb-3">分类占比</h3>
            {pieData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#9ca3af'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-16 text-sm">本月暂无数据</div>
            )}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
              {pieData.map((p) => (
                <span key={p.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CAT_COLORS[p.name] || '#9ca3af' }} />
                  {p.name} {fmtShort(p.value)}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600 mb-3">每日时长</h3>
            {barData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={2} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} width={28} />
                    <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => `${month}月${l}日`} />
                    <Bar dataKey="minutes" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-16 text-sm">本月暂无数据</div>
            )}
          </div>
        </div>
      )}

      {/* 周报 */}
      {tab === 'week' && weekReport && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600 mb-3">本周概览</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-xl py-3">
                <div className="text-lg font-bold text-gray-800">{fmtShort(weekReport.thisWeek.total)}</div>
                <div className="text-xs text-gray-400 mt-0.5">本周总时长</div>
              </div>
              <div className="bg-gray-50 rounded-xl py-3">
                <div className="text-lg font-bold text-gray-800">{weekReport.thisWeek.activeDays}天</div>
                <div className="text-xs text-gray-400 mt-0.5">活跃天数</div>
              </div>
              <div className="bg-gray-50 rounded-xl py-3">
                <div className="flex items-center justify-center gap-1 text-lg font-bold text-gray-800">
                  {weekReport.diff >= 0 ? (
                    <TrendingUp size={16} className="text-green-500" />
                  ) : (
                    <TrendingDown size={16} className="text-red-500" />
                  )}
                  {weekReport.diff >= 0 ? '+' : ''}{weekReport.diffPct}%
                </div>
                <div className="text-xs text-gray-400 mt-0.5">较上周</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2 text-center">
              上周 {fmt(weekReport.lastWeek.total)} · 本周 {fmt(weekReport.thisWeek.total)}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600 mb-3">本周分类排行</h3>
            {weekReport.catRank.length > 0 ? (
              <div className="space-y-2.5">
                {weekReport.catRank.map(([cat, mins], idx) => (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="w-4 text-xs text-gray-400 text-right">{idx + 1}</span>
                    <span className="w-12 text-sm text-gray-700">{cat}</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(8, (mins / weekReport.catRank[0][1]) * 100)}%`,
                          background: CAT_COLORS[cat] || '#6366f1',
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-14 text-right">{fmtShort(mins)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8 text-sm">本周暂无记录</div>
            )}
          </div>
        </div>
      )}

      {/* 年度热力图 */}
      {tab === 'heat' && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
              <CalendarDays size={15} />
              {year} 年记录热力图
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              少
              {HEAT_COLORS.map((c) => (
                <span key={c} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              ))}
              多
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="min-w-[640px]">
              <div className="flex text-[10px] text-gray-400 mb-1">
                <span className="w-6" />
                {monthNames.map((mn, i) => (
                  <span key={mn} className="flex-1">{mn}</span>
                ))}
              </div>
              <div className="flex gap-[3px]">
                {heatCells.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-[3px]">
                    {col.map((d) => {
                      const key = dateOf(d.getFullYear(), d.getMonth() + 1, d.getDate())
                      const mins = yearDayMap[key]
                      const lvl = heatLevel(mins)
                      return (
                        <div
                          key={key}
                          className="w-[11px] h-[11px] rounded-[2px] cursor-pointer"
                          style={{ background: HEAT_COLORS[lvl] }}
                          onMouseEnter={() => setHeatHover({ date: key, mins })}
                          onMouseLeave={() => setHeatHover(null)}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-gray-400 mt-2 h-5">
            {heatHover
              ? `${heatHover.date} · ${fmt(heatHover.mins || 0)}`
              : '悬停任意格子查看当天记录'}
          </div>
        </div>
      )}
    </div>
  )
}
