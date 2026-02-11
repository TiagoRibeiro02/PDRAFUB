import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './login';
import Register from './register';
import Wallet from './Wallet';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/wallet" element={<Wallet />} />
    </Routes>
  );
}