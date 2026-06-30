import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import TransactionForm from '../components/TransactionForm';
import TransactionTable from '../components/TransactionTable';
import MonthSelector from '../components/MonthSelector';

export default function Income({ onMenuToggle }) {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchIncomes();
  }, [selectedMonth, selectedYear]);

  const fetchIncomes = async () => {
    setLoading(true);
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('incomes')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) console.error('Incomes error:', error);
    setIncomes(data || []);
    setLoading(false);
  };

  const handleAddIncome = async (formData) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('incomes').insert({
        amount: Number(formData.amount),
        source: formData.source,
        description: formData.description,
        date: formData.date,
        payment_method: formData.payment_method,
        user_id: user.id,
      });

      if (error) throw error;
      await fetchIncomes();
    } catch (err) {
      alert('Error adding income: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIncome = async (id) => {
    try {
      const { error } = await supabase.from('incomes').delete().eq('id', id);
      if (error) throw error;
      setIncomes(incomes.filter((i) => i.id !== id));
    } catch (err) {
      alert('Error deleting income: ' + err.message);
    }
  };

  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="page">
      <Header
        title="Income"
        subtitle={`Track your earnings for ${MONTHS[selectedMonth]} ${selectedYear}`}
        onMenuToggle={onMenuToggle}
      />

      <MonthSelector
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
      />

      <div className="page-summary">
        <div className="summary-card summary-card--income">
          <span className="summary-label">Total Income</span>
          <span className="summary-value">{formatCurrency(totalIncome)}</span>
          <span className="summary-count">{incomes.length} transactions</span>
        </div>
      </div>

      <TransactionForm
        type="income"
        onSubmit={handleAddIncome}
        loading={submitting}
      />

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <TransactionTable
          data={incomes}
          type="income"
          onDelete={handleDeleteIncome}
        />
      )}
    </div>
  );
}
