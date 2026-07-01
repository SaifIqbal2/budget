import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import MonthSelector from '../components/MonthSelector';

export default function BankDeposit({ onMenuToggle }) {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState([]);
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
    fetchDeposits();
  }, [selectedMonth, selectedYear]);

  const fetchDeposits = async () => {
    setLoading(true);
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('bank_deposits')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) console.error('Bank deposits error:', error);
    setDeposits(data || []);
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
      const { error } = await supabase.from('bank_deposits').insert({
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
      await fetchDeposits();
    } catch (err) {
      alert('Error adding deposit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    try {
      const { error } = await supabase.from('bank_deposits').delete().eq('id', id);
      if (error) throw error;
      setDeposits(deposits.filter((d) => d.id !== id));
    } catch (err) {
      alert('Error deleting deposit: ' + err.message);
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

  const totalDeposits = deposits.reduce((sum, d) => sum + Number(d.amount), 0);

  const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="page">
      <Header
        title="Bank Deposit"
        subtitle={`Bank mein paisa add karein — ${MONTHS[selectedMonth]} ${selectedYear}`}
        onMenuToggle={onMenuToggle}
      />

      <MonthSelector
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
      />

      {/* Info Banner */}
      <div className="deposit-info-banner">
        <span className="deposit-info-icon">🏦</span>
        <div>
          <strong>Bank Deposit</strong>
          <p>
            Yeh Income/Earnings se <strong>bilkul alag</strong> hai. Sirf Bank Balance aur Total Balance 
            mein add hoga. Jaise opening balance, family se mila paisa, ya koi aur direct deposit.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="page-summary">
        <div className="summary-card summary-card--deposit">
          <span className="summary-label">Total Deposited</span>
          <span className="summary-value deposit-amount">{formatCurrency(totalDeposits)}</span>
          <span className="summary-count">{deposits.length} entries</span>
        </div>
      </div>

      {/* Add Form */}
      <div className="transaction-form">
        <h3 className="form-title">🏦 Add Bank Deposit</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="dep-amount">Amount (PKR)</label>
              <input
                type="number"
                id="dep-amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Enter amount"
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="dep-date">Date</label>
              <input
                type="date"
                id="dep-date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group form-group--full">
              <label htmlFor="dep-description">Description</label>
              <input
                type="text"
                id="dep-description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g., Opening balance, Family se mila, Company bonus"
              />
            </div>
          </div>
          <button type="submit" className="btn btn-deposit" disabled={submitting}>
            {submitting ? 'Adding...' : '🏦 Add to Bank'}
          </button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : deposits.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🏦</span>
          <h3>No deposits yet</h3>
          <p>Is mahine koi bank deposit nahi ki</p>
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
              {deposits.map((d) => (
                <tr key={d.id}>
                  <td className="td-date">{formatDate(d.date)}</td>
                  <td className="td-desc">{d.description || '—'}</td>
                  <td className="td-amount deposit-amount">
                    +{formatCurrency(d.amount)}
                  </td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(d.id)}
                      disabled={deleteId === d.id}
                      title="Delete"
                    >
                      {deleteId === d.id ? '⏳' : '🗑️'}
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
