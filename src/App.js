import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import ToastContainer from './components/Toast';
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DirectorDashboard from './pages/DirectorDashboard';
import './styles.css';

function AppContent() {
  const { user } = useAuth();

  if (!user) return <AuthPage />;

  switch (user.role) {
    case 'student': return <StudentDashboard />;
    case 'teacher': return <TeacherDashboard />;
    case 'admin': return <AdminDashboard />;
    case 'director': return <DirectorDashboard />;
    default: return <AuthPage />;
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <ToastContainer />
    </AuthProvider>
  );
}

export default App;
