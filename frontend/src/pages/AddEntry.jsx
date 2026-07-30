import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

export default function AddEntry() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    date: today,
    main_category: '工作',
    sub_category: '',
    note: '',
    start_time: '',
    end_time: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getCategories().then((res) => setCategories(res.categories))
    if (isEdit) {
      // 如果是编辑模式，查看每日数据来获取条目
      // 我们会在提交时使用更新接口
    }
  }, [isEdit])

  const mainCats = categories
  const subCats = mainCats.find((c) => c.name === form.main_category)?.children || []

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.start_time || !form.end_time || !form.sub_category) {
      alert('请填写完整信息')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await api.updateEntry(id, form)
      } else {
        await api.createEntry(form)
      }
      navigate('/')
    } catch (e) {
      alert('保存失败: ' + e.message)
    }
    setSaving(false)
  }

  return (
    <div className="max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        {/* 日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">日期</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        {/* 主类 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">主类</label>
          <select
            value={form.main_category}
            onChange={(e) => setForm({ ...form, main_category: e.target.value, sub_category: '' })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            {mainCats.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* 次类 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">次类</label>
          <select
            value={form.sub_category}
            onChange={(e) => setForm({ ...form, sub_category: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="">选择次类</option>
            {subCats.map((sub) => (
              <option key={sub.id} value={sub.name}>{sub.name}</option>
            ))}
          </select>
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">备注</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="例如：炉石、番茄小说..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        {/* 起止时间 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">开始时间</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">结束时间</label>
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
          <div className="text-center text-sm text-gray-500">
            {(function() {
              const [sh, sm] = form.start_time.split(':').map(Number)
              const [eh, em] = form.end_time.split(':').map(Number)
              let mins = (eh * 60 + em) - (sh * 60 + sm)
              if (mins < 0) mins += 24 * 60
              const h = Math.floor(mins / 60)
              const m = mins % 60
              return `⏱ 持续时间：${h}小时${m}分钟`
            })()}
          </div>
        )}

        {/* 提交 */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : isEdit ? '更新记录' : '添加记录'}
        </button>
      </form>
    </div>
  )
}
