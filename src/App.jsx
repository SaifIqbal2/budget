import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import MonthlySummary from './pages/MonthlySummary';
import Withdrawals from './pages/Withdrawals';
import BankDeposit from './pages/BankDeposit';
import CashDeposit from './pages/CashDeposit';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard onMenuToggle={toggleSidebar} />} />
          <Route path="/expenses" element={<Expenses onMenuToggle={toggleSidebar} />} />
          <Route path="/income" element={<Income onMenuToggle={toggleSidebar} />} />
          <Route path="/monthly" element={<MonthlySummary onMenuToggle={toggleSidebar} />} />
          <Route path="/withdrawals" element={<Withdrawals onMenuToggle={toggleSidebar} />} />
          <Route path="/bank-deposit" element={<BankDeposit onMenuToggle={toggleSidebar} />} />
          <Route path="/cash-deposit" element={<CashDeposit onMenuToggle={toggleSidebar} />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
