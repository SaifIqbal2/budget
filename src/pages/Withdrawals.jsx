import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import MonthSelector from '../components/MonthSelector';

export default function Withdrawals({ onMenuToggle }) {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchWithdrawals();
  }, [selectedMonth, selectedYear]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('cash_withdrawals')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) console.error('Withdrawals error:', error);
    setWithdrawals(data || []);
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('cash_withdrawals').insert({
        amount: Number(formData.amount),
        description: formData.description,
        date: formData.date,
        user_id: user.id,
      });
      if (error) throw error;
      setFormData({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      await fetchWithdrawals();
    } catch (err) {
      alert('Error adding withdrawal: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    try {
      const { error } = await supabase.from('cash_withdrawals').delete().eq('id', id);
      if (error) throw error;
      setWithdrawals(withdrawals.filter((w) => w.id !== id));
    } catch (err) {
      alert('Error deleting withdrawal: ' + err.message);
    } finally {
      setDeleteId(null);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

  const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="page">
      <Header
        title="Cash Withdrawals"
        subtitle={`Bank se cash transfer — ${MONTHS[selectedMonth]} ${selectedYear}`}
        onMenuToggle={onMenuToggle}
      />

      <MonthSelector
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
      />

      {/* Info Banner */}
      <div className="withdrawal-info-banner">
        <span className="withdrawal-info-icon">🏦➡️💵</span>
        <div>
          <strong>Cash Withdrawal</strong>
          <p>Bank se paisa nikalain. Bank balance kam hoga, Cash balance zyada hoga. Yeh expense nahi hai — sirf transfer hai.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="page-summary">
        <div className="summary-card summary-card--withdrawal">
          <span className="summary-label">Total Withdrawn</span>
          <span className="summary-value withdrawal-amount">{formatCurrency(totalWithdrawals)}</span>
          <span className="summary-count">{withdrawals.length} transactions</span>
        </div>
      </div>

      {/* Add Form */}
      <div className="transaction-form">
        <h3 className="form-title">🏧 Add Cash Withdrawal</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="wd-amount">Amount (PKR)</label>
              <input
                type="number"
                id="wd-amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Enter amount"
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="wd-date">Date</label>
              <input
                type="date"
                id="wd-date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group form-group--full">
              <label htmlFor="wd-description">Description (optional)</label>
              <input
                type="text"
                id="wd-description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g., ATM withdrawal, ghar ka kharcha"
              />
            </div>
          </div>
          <button type="submit" className="btn btn-withdrawal" disabled={submitting}>
            {submitting ? 'Adding...' : '🏧 Add Withdrawal'}
          </button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🏧</span>
          <h3>No withdrawals yet</h3>
          <p>Is mahine koi cash withdrawal nahi ki</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id}>
                  <td className="td-date">{formatDate(w.date)}</td>
                  <td className="td-desc">{w.description || '—'}</td>
                  <td className="td-amount withdrawal-amount">
                    🏦→💵 {formatCurrency(w.amount)}
                  </td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(w.id)}
                      disabled={deleteId === w.id}
                      title="Delete"
                    >
                      {deleteId === w.id ? '⏳' : '🗑️'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
