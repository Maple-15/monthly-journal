const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `请求失败: ${res.status}`)
  }
  return res.json()
}

export const api = {
  // 月度数据
  getMonthly(year, month) {
    return request(`/entries/monthly?year=${year}&month=${month}`)
  },

  // 每日数据
  getDaily(date) {
    return request(`/entries/daily/${date}`)
  },

  // 新增条目
  createEntry(data) {
    return request('/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 更新条目
  updateEntry(id, data) {
    return request(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // 删除条目
  deleteEntry(id) {
    return request(`/entries/${id}`, { method: 'DELETE' })
  },

  // 清空所有
  clearAll() {
    return request('/entries', { method: 'DELETE' })
  },

  // 分类
  getCategories() {
    return request('/categories')
  },

  createCategory(data) {
    return request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  deleteCategory(id) {
    return request(`/categories/${id}`, { method: 'DELETE' })
  },

  // 导入 Excel
  importExcel(file) {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${BASE}/import/excel`, { method: 'POST', body: form }).then(
      (r) => r.json()
    )
  },
}
