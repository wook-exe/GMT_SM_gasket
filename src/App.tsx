import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import Live from './pages/Live'
import Inspect from './pages/Inspect'
import History from './pages/History'
import Detail from './pages/Detail'
import MyPage from './pages/MyPage'
import Login from './pages/Login'
import { getCurrentUser } from './lib/auth'

function RequireAuth({ children }: { children: ReactNode }) {
  const user = getCurrentUser()
  const loc = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/live"
          element={
            <RequireAuth>
              <Live />
            </RequireAuth>
          }
        />
        <Route
          path="/inspect"
          element={
            <RequireAuth>
              <Inspect />
            </RequireAuth>
          }
        />
        <Route
          path="/history"
          element={
            <RequireAuth>
              <History />
            </RequireAuth>
          }
        />
        <Route
          path="/history/:id"
          element={
            <RequireAuth>
              <Detail />
            </RequireAuth>
          }
        />
        <Route
          path="/mypage"
          element={
            <RequireAuth>
              <MyPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
