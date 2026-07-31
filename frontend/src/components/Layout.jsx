import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Calendar, Plus, Tags, Upload, BarChart3, LogOut, BookOpen } from 'lucide-react'

const navItems = [
  { to: '/', label: '月视图', icon: Calendar },
  { to: '/add', label: '记录', icon: Plus },
  { to: '/categories', label: '类别', icon: Tags },
  { to: '/import', label: '导入', icon: Upload },
  { to: '/stats', label: '统计', icon: BarChart3 },
]

const pageTitles = {
  '/': '月视图',
  '/add': '新增记录',
  '/categories': '类别管理',
  '/import': '导入数据',
  '/stats': '统计分析',
}

export default function Layout({ username, onLogout }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary-600" />
            <h1 className="text-lg font-bold text-primary-600">时间手账</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:inline">
              {pageTitles[location.pathname] || ''}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{username}</span>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-md px-2 py-1"
              >
                <LogOut size={12} />
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主体 */}
      <main className="max-w-4xl mx-auto px-2 sm:px-4 pb-24 pt-4">
        <Outlet />
      </main>

      {/* 底部导航（移动端） */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 sm:hidden z-10">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 text-xs ${
                  isActive ? 'text-primary-600' : 'text-gray-400'
                }`
              }
            >
              <item.icon size={20} />
              <span className="mt-0.5">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* PC 端侧边浮动导航 */}
      <div className="hidden sm:flex fixed left-4 top-1/2 -translate-y-1/2 flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  )
}
