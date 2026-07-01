import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onToggle }) {
  const { signOut, user } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/expenses', label: 'Expenses', icon: '💸' },
    { path: '/income', label: 'Income', icon: '💰' },
    { path: '/withdrawals', label: 'Cash Withdrawal', icon: '🏧' },
    { path: '/bank-deposit', label: 'Bank Deposit', icon: '🏦' },
    { path: '/cash-deposit', label: 'Cash Deposit', icon: '💵' },
    { path: '/monthly', label: 'Monthly Summary', icon: '📅' },
  ];

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onToggle}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">💎</span>
            <span className="logo-text">BudgetPro</span>
          </div>
          <button className="sidebar-close" onClick={onToggle}>✕</button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              onClick={() => window.innerWidth < 768 && onToggle()}
              end={item.path === '/'}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {location.pathname === item.path && (
                <span className="nav-indicator"></span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="user-details">
              <span className="user-name">Admin</span>
              <span className="user-email">{user?.email || 'admin'}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={signOut}>
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
