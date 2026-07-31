import { useState } from 'react'
import { api, setToken, setUsername } from '../api'

export default function LoginPage({ onLogin }) {
  const [username, setUsernameField] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      setError('请输入用户名和密码')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.login(username.trim(), password)
      setToken(res.token)
      setUsername(res.username)
      onLogin(res.username)
    } catch (err) {
      setError(err.message || '登录失败')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">📖</div>
            <h1 className="text-xl font-bold text-gray-800">时间手账</h1>
            <p className="text-sm text-gray-400 mt-1">月视图 · 时间记录</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsernameField(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-300 mt-4">
          仅限授权账号使用
        </p>
      </div>
    </div>
  )
}
