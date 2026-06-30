import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import TransactionForm from '../components/TransactionForm';
import TransactionTable from '../components/TransactionTable';
import MonthSelector from '../components/MonthSelector';

export default function Expenses({ onMenuToggle }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth, selectedYear]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) console.error('Categories error:', error);
    setCategories(data || []);
  };

  const fetchExpenses = async () => {
    setLoading(true);
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('expenses')
      .select('*, categories!category_id(name, icon, color)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Expenses error:', error);
      // Fallback: try without join
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      if (fallbackError) console.error('Expenses fallback error:', fallbackError);
      setExpenses(fallbackData || []);
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  const handleAddExpense = async (formData) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        amount: Number(formData.amount),
        category_id: formData.category_id || null,
        description: formData.description,
        date: formData.date,
        payment_method: formData.payment_method,
        user_id: user.id,
      });

      if (error) throw error;
      await fetchExpenses();
    } catch (err) {
      alert('Error adding expense: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(expenses.filter((e) => e.id !== id));
    } catch (err) {
      alert('Error deleting expense: ' + err.message);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
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
        title="Expenses"
        subtitle={`Track your spending for ${MONTHS[selectedMonth]} ${selectedYear}`}
        onMenuToggle={onMenuToggle}
      />

      <MonthSelector
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
      />

      <div className="page-summary">
        <div className="summary-card summary-card--expense">
          <span className="summary-label">Total Expenses</span>
          <span className="summary-value">{formatCurrency(totalExpenses)}</span>
          <span className="summary-count">{expenses.length} transactions</span>
        </div>
      </div>

      <TransactionForm
        type="expense"
        categories={categories}
        onSubmit={handleAddExpense}
        loading={submitting}
      />

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <TransactionTable
          data={expenses}
          type="expense"
          categories={categories}
          onDelete={handleDeleteExpense}
        />
      )}
    </div>
  );
}
