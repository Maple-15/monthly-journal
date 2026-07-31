const BASE = '/api'

// token 管理
export function getToken() {
  return localStorage.getItem('journal_token')
}

export function setToken(token) {
  localStorage.setItem('journal_token', token)
}

export function getUsername() {
  return localStorage.getItem('journal_username') || ''
}

export function setUsername(name) {
  localStorage.setItem('journal_username', name)
}

export function clearAuth() {
  localStorage.removeItem('journal_token')
  localStorage.removeItem('journal_username')
}

export function isLoggedIn() {
  return Boolean(getToken())
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    clearAuth()
    if (!path.startsWith('/auth/')) {
      window.location.href = '/'
    }
    throw new Error('登录已过期，请重新登录')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `请求失败: ${res.status}`)
  }
  return res.json()
}

export const api = {
  // 登录
  login(username, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },

  // 月度数据
  getMonthly(year, month) {
    return request(`/entries/monthly?year=${year}&month=${month}`)
  },

  // 年度数据（热力图）
  getYear(year) {
    return request(`/entries/year?year=${year}`)
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
    const headers = {}
    const token = getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(`${BASE}/import/excel`, {
      method: 'POST',
      headers,
      body: form,
    }).then(async (r) => {
      if (r.status === 401) {
        clearAuth()
        window.location.href = '/'
        throw new Error('登录已过期')
      }
      return r.json()
    })
  },
}
