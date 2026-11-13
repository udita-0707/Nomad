import { Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { SignUp } from './pages/SignUp';
import { SignIn } from './pages/SignIn';
import { Dashboard } from './pages/Dashboard';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/signin" element={<SignIn />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
