import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App'
import Login from './login'
import Register from './register'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = localStorage.getItem('issuer_user');
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/app"      element={<ProtectedRoute><App /></ProtectedRoute>} />
        <Route path="*"         element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
