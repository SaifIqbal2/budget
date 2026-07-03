import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import MonthSelector from '../components/MonthSelector';

export default function Deposits({ onMenuToggle }) {
  const { user } = useAuth();
  const [bankDeposits, setBankDeposits] = useState([]);
  const [cashDeposits, setCashDeposits] = useState([]);
  const [cashToBank, setCashToBank] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [formData, setFormData] = useState({
    type: 'bank', // 'bank', 'cash', 'cash_to_bank'
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchAllDeposits();
  }, [selectedMonth, selectedYear]);

  const fetchAllDeposits = async () => {
    setLoading(true);
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const [bankRes, cashRes, ctbRes] = await Promise.all([
      supabase.from('bank_deposits').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false }),
      supabase.from('cash_deposits').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false }),
      supabase.from('cash_to_bank').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false })
    ]);

    if (bankRes.error) console.error('Bank deposits error:', bankRes.error);
    if (cashRes.error) console.error('Cash deposits error:', cashRes.error);
    if (ctbRes.error) console.error('Cash to Bank error:', ctbRes.error);

    setBankDeposits(bankRes.data || []);
    setCashDeposits(cashRes.data || []);
    setCashToBank(ctbRes.data || []);
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return;
    setSubmitting(true);
    
    let tableName = '';
    if (formData.type === 'bank') tableName = 'bank_deposits';
    else if (formData.type === 'cash') tableName = 'cash_deposits';
    else if (formData.type === 'cash_to_bank') tableName = 'cash_to_bank';

    try {
      const { error } = await supabase.from(tableName).insert({
        amount: Number(formData.amount),
        description: formData.description,
        date: formData.date,
        user_id: user.id,
      });
      if (error) throw error;
      setFormData({
        ...formData,
        amount: '',
        description: '',
      });
      await fetchAllDeposits();
    } catch (err) {
      alert('Error adding entry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, type) => {
    setDeleteId(id);
    setDeleteType(type);
    
    let tableName = '';
    if (type === 'bank') tableName = 'bank_deposits';
    else if (type === 'cash') tableName = 'cash_deposits';
    else if (type === 'cash_to_bank') tableName = 'cash_to_bank';

    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      if (type === 'bank') setBankDeposits(bankDeposits.filter((d) => d.id !== id));
      else if (type === 'cash') setCashDeposits(cashDeposits.filter((d) => d.id !== id));
      else if (type === 'cash_to_bank') setCashToBank(cashToBank.filter((d) => d.id !== id));
    } catch (err) {
      alert('Error deleting entry: ' + err.message);
    } finally {
      setDeleteId(null);
      setDeleteType(null);
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

  const totalBank = bankDeposits.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalCash = cashDeposits.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalCTB = cashToBank.reduce((sum, d) => sum + Number(d.amount), 0);

  const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Combine and sort all transactions for the table
  const allTransactions = [
    ...bankDeposits.map(d => ({ ...d, transType: 'bank' })),
    ...cashDeposits.map(d => ({ ...d, transType: 'cash' })),
    ...cashToBank.map(d => ({ ...d, transType: 'cash_to_bank' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="page">
      <Header
        title="Deposits & Transfers"
        subtitle={`Add funds or transfer — ${MONTHS[selectedMonth]} ${selectedYear}`}
        onMenuToggle={onMenuToggle}
      />

      <MonthSelector
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
      />

      {/* Info Banner */}
      <div className="deposit-info-banner">
        <span className="deposit-info-icon">🏦💵</span>
        <div>
          <strong>Deposits & Transfers</strong>
          <p>
            Yahan se aap apne bank ya cash mein naya paisa add kar sakte hain, ya phir apne cash se bank mein paisa transfer kar sakte hain. Yeh Income se alag hota hai.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="page-summary">
        <div className="summary-card summary-card--deposit">
          <span className="summary-label">Bank Deposits</span>
          <span className="summary-value deposit-amount">{formatCurrency(totalBank)}</span>
        </div>
        <div className="summary-card summary-card--deposit">
          <span className="summary-label">Cash Deposits</span>
          <span className="summary-value deposit-amount" style={{ color: '#10b981' }}>{formatCurrency(totalCash)}</span>
        </div>
        <div className="summary-card summary-card--withdrawal">
          <span className="summary-label">Cash to Bank</span>
          <span className="summary-value withdrawal-amount">{formatCurrency(totalCTB)}</span>
        </div>
      </div>

      {/* Add Form */}
      <div className="transaction-form">
        <h3 className="form-title">➕ Add Deposit / Transfer</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="dep-type">Transaction Type</label>
              <select
                id="dep-type"
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="bank">🏦 Bank Deposit</option>
                <option value="cash">💵 Cash Deposit</option>
                <option value="cash_to_bank">💵 ➡️ 🏦 Cash to Bank</option>
              </select>
            </div>

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
                placeholder="e.g., Opening balance, Family se mila"
              />
            </div>
          </div>
          <button type="submit" className="btn btn-deposit" disabled={submitting}>
            {submitting ? 'Saving...' : '💾 Save Transaction'}
          </button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : allTransactions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h3>No records yet</h3>
          <p>Is mahine koi deposit ya transfer nahi hui</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allTransactions.map((t) => (
                <tr key={`${t.transType}-${t.id}`}>
                  <td className="td-date">{formatDate(t.date)}</td>
                  <td className="td-desc">
                    {t.transType === 'bank' && '🏦 Bank Deposit'}
                    {t.transType === 'cash' && '💵 Cash Deposit'}
                    {t.transType === 'cash_to_bank' && '💵➡️🏦 Cash to Bank'}
                  </td>
                  <td className="td-desc">{t.description || '—'}</td>
                  <td className={`td-amount ${t.transType === 'cash_to_bank' ? 'withdrawal-amount' : 'deposit-amount'}`}>
                    +{formatCurrency(t.amount)}
                  </td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(t.id, t.transType)}
                      disabled={deleteId === t.id && deleteType === t.transType}
                      title="Delete"
                    >
                      {deleteId === t.id && deleteType === t.transType ? '⏳' : '🗑️'}
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
