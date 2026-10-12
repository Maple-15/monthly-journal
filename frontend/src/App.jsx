import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import MonthlyView from './pages/MonthlyView'
import AddEntry from './pages/AddEntry'
import Categories from './pages/Categories'
import ImportPage from './pages/ImportPage'
import StatsPage from './pages/StatsPage'
import { isLoggedIn, clearAuth, getUsername } from './api'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())

  const handleLogin = () => setLoggedIn(true)
  const handleLogout = () => {
    clearAuth()
    setLoggedIn(false)
  }

  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <Routes>
      <Route element={<Layout username={getUsername()} onLogout={handleLogout} />}>
        <Route path="/" element={<MonthlyView />} />
        <Route path="/add" element={<AddEntry />} />
        <Route path="/edit/:id" element={<AddEntry />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
