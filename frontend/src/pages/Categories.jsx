import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [newName, setNewName] = useState('')
  const [newParent, setNewParent] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    const res = await api.getCategories()
    setCategories(res.categories)
  }

  const addSubCategory = async () => {
    if (!newName.trim() || !newParent) return
    const parent = categories.find((c) => c.name === newParent)
    if (!parent) return
    await api.createCategory({ name: newName.trim(), parent_id: parent.id })
    setNewName('')
    setMessage(`已添加「${newName}」到「${newParent}」`)
    setTimeout(() => setMessage(''), 2000)
    loadCategories()
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* 消息提示 */}
      {message && (
        <div className="bg-green-50 text-green-700 text-sm px-4 py-2 rounded-lg">
          {message}
        </div>
      )}

      {/* 添加次类 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-medium text-sm text-gray-600 mb-3">添加次类</h3>
        <div className="flex gap-2">
          <select
            value={newParent}
            onChange={(e) => setNewParent(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="">选择主类</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="次类名称"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            onKeyDown={(e) => e.key === 'Enter' && addSubCategory()}
          />
          <button
            onClick={addSubCategory}
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            添加
          </button>
        </div>
      </div>

      {/* 类别列表 */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-700">{cat.name}</h3>
              <span className="text-xs text-gray-400">{cat.children.length} 个子类</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cat.children.map((sub) => (
                <span
                  key={sub.id}
                  className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                >
                  {sub.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
