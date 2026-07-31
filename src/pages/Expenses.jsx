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

    let categoriesList = data || [];
    const requiredCategories = [
      { name: 'Employee Payment', icon: '👷', color: '#f97316' },
      { name: 'Savings', icon: '🏦', color: '#0ea5e9' },
      { name: 'Investment', icon: '📈', color: '#8b5cf6' },
    ];

    for (const category of requiredCategories) {
      if (!categoriesList.some((cat) => cat.name === category.name)) {
        const { error: upsertError } = await supabase.from('categories').upsert([category], { onConflict: 'name' });
        if (upsertError) {
          console.error(`${category.name} category error:`, upsertError);
        }
      }
    }

    const { data: refreshedData, error: refreshError } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (refreshError) {
      console.error('Categories refresh error:', refreshError);
    } else {
      categoriesList = refreshedData || [];
    }

    if (error) console.error('Categories error:', error);
    setCategories(categoriesList);
    return categoriesList;
  };

  const fetchExpenses = async () => {
    setLoading(true);
    const categoriesList = categories.length ? categories : await fetchCategories();
    const employeeCategoryId = categoriesList.find((cat) => cat.name === 'Employee Payment')?.id;

    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let query = supabase
      .from('expenses')
      .select('*, categories!category_id(name, icon, color)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (employeeCategoryId) {
      query = query.not('category_id', 'eq', employeeCategoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Expenses error:', error);
      // Fallback: try without join
      let fallbackQuery = supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (employeeCategoryId) {
        fallbackQuery = fallbackQuery.not('category_id', 'eq', employeeCategoryId);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
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
      const categoriesList = await fetchCategories();
      const entryType = formData.entry_type || 'expense';
      const specialCategoryName = entryType === 'savings' ? 'Savings' : entryType === 'investment' ? 'Investment' : null;
      const categoryId = specialCategoryName
        ? categoriesList.find((cat) => cat.name === specialCategoryName)?.id || null
        : formData.category_id || null;

      const { error } = await supabase.from('expenses').insert({
        amount: Number(formData.amount),
        category_id: categoryId,
        description: formData.description,
        employee_name: formData.employee_name || null,
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

  const regularExpenses = expenses.filter((entry) => !['Savings', 'Investment'].includes(entry.categories?.name));
  const savingsEntries = expenses.filter((entry) => entry.categories?.name === 'Savings');
  const investmentEntries = expenses.filter((entry) => entry.categories?.name === 'Investment');
  const totalExpenses = regularExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalSavings = savingsEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalInvestments = investmentEntries.reduce((sum, e) => sum + Number(e.amount), 0);
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
          <span className="summary-label">Regular Expenses</span>
          <span className="summary-value">{formatCurrency(totalExpenses)}</span>
          <span className="summary-count">{regularExpenses.length} entries</span>
        </div>
        <div className="summary-card summary-card--income">
          <span className="summary-label">Savings</span>
          <span className="summary-value">{formatCurrency(totalSavings)}</span>
          <span className="summary-count">{savingsEntries.length} entries</span>
        </div>
        <div className="summary-card summary-card--expense">
          <span className="summary-label">Investments</span>
          <span className="summary-value">{formatCurrency(totalInvestments)}</span>
          <span className="summary-count">{investmentEntries.length} entries</span>
        </div>
      </div>

      <TransactionForm
        type="expense"
        categories={categories.filter((cat) => !['Employee Payment', 'Savings', 'Investment'].includes(cat.name))}
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
