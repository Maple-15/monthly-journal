import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import MonthlyView from './pages/MonthlyView'
import AddEntry from './pages/AddEntry'
import Categories from './pages/Categories'
import ImportPage from './pages/ImportPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<MonthlyView />} />
        <Route path="/add" element={<AddEntry />} />
        <Route path="/edit/:id" element={<AddEntry />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
