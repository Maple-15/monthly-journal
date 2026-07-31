import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Clock, Calendar, StickyNote, Save } from 'lucide-react'
import { api } from '../api'

const LAST_FORM_KEY = 'journal_last_form'

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AddEntry() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    date: today(),
    main_category: '',
    sub_category: '',
    note: '',
    start_time: '',
    end_time: '',
  })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api.getCategories().then((res) => setCategories(res.categories))

    if (isEdit) {
      // 编辑模式：从月度数据找该条
      const d = new Date()
      api
        .getMonthly(d.getFullYear(), d.getMonth() + 1)
        .then((res) => {
          for (const day of res.days) {
            const entry = day.entries.find((e) => e.id === Number(id))
            if (entry) {
              setForm({
                date: day.date,
                main_category: entry.main_category,
                sub_category: entry.sub_category,
                note: entry.note,
                start_time: entry.start_time.slice(0, 5),
                end_time: entry.end_time.slice(0, 5),
              })
              break
            }
          }
          setLoaded(true)
        })
        .catch(() => setLoaded(true))
    } else {
      // 新增模式：记住上次，或默认当前时间
      try {
        const last = JSON.parse(localStorage.getItem(LAST_FORM_KEY) || 'null')
        if (last && last.main_category) {
          setForm({
            ...last,
            date: today(),
            start_time: last.start_time || nowTime(),
            end_time: last.end_time || nowTime(),
          })
        } else {
          setForm((f) => ({ ...f, start_time: nowTime(), end_time: nowTime() }))
        }
      } catch {
        setForm((f) => ({ ...f, start_time: nowTime(), end_time: nowTime() }))
      }
      setLoaded(true)
    }
  }, [isEdit, id])

  const mainCats = categories
  const subCats = mainCats.find((c) => c.name === form.main_category)?.children || []

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.main_category || !form.sub_category || !form.start_time || !form.end_time) {
      alert('请选择主类、次类，并填写起止时间')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await api.updateEntry(id, form)
      } else {
        await api.createEntry(form)
        // 记住本次表单，方便下次
        localStorage.setItem(
          LAST_FORM_KEY,
          JSON.stringify({
            main_category: form.main_category,
            sub_category: form.sub_category,
            start_time: form.start_time,
            end_time: form.end_time,
          })
        )
      }
      navigate('/')
    } catch (e) {
      alert('保存失败: ' + e.message)
    }
    setSaving(false)
  }

  if (!loaded) {
    return <div className="text-center text-gray-400 py-20">加载中...</div>
  }

  return (
    <div className="max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 space-y-5">
        {/* 主类按钮 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">主类</label>
          <div className="grid grid-cols-4 gap-2">
            {mainCats.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setForm({ ...form, main_category: cat.name, sub_category: '' })}
                className={`py-2.5 rounded-lg text-sm border transition-colors ${
                  form.main_category === cat.name
                    ? 'bg-primary-500 text-white border-primary-500 font-medium'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 次类按钮 */}
        {form.main_category && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">次类</label>
            <div className="flex flex-wrap gap-2">
              {subCats.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setForm({ ...form, sub_category: sub.name })}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    form.sub_category === sub.name
                      ? 'bg-primary-100 text-primary-700 border-primary-300 font-medium'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            <span className="inline-flex items-center gap-1"><Calendar size={14} /> 日期</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        {/* 起止时间 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              <span className="inline-flex items-center gap-1"><Clock size={14} /> 开始</span>
            </label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              <span className="inline-flex items-center gap-1"><Clock size={14} /> 结束</span>
            </label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
        </div>

        {/* 实时计算时长 */}
        {form.start_time && form.end_time && (
          <div className="text-center text-sm text-gray-500 bg-gray-50 rounded-lg py-2">
            {(function () {
              const [sh, sm] = form.start_time.split(':').map(Number)
              const [eh, em] = form.end_time.split(':').map(Number)
              let mins = eh * 60 + em - (sh * 60 + sm)
              if (mins < 0) mins += 24 * 60
              const h = Math.floor(mins / 60)
              const m = mins % 60
              return `持续时长：${h}小时${m ? m + '分钟' : ''}`
            })()}
          </div>
        )}

        {/* 备注 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            <span className="inline-flex items-center gap-1"><StickyNote size={14} /> 备注</span>
          </label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="例如：炉石、番茄小说..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        {/* 提交 */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={16} />
          {saving ? '保存中...' : isEdit ? '更新记录' : '添加记录'}
        </button>
      </form>
    </div>
  )
}
