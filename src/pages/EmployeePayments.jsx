import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import TransactionForm from '../components/TransactionForm';
import TransactionTable from '../components/TransactionTable';
import MonthSelector from '../components/MonthSelector';

export default function EmployeePayments({ onMenuToggle }) {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const employeeCategoryName = 'Employee Payment';

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    let categoriesList = data || [];

    if (!categoriesList.some((cat) => cat.name === employeeCategoryName)) {
      const { error: upsertError } = await supabase.from('categories').upsert(
        [{ name: employeeCategoryName, icon: '👷', color: '#f97316' }],
        { onConflict: 'name' }
      );

      if (upsertError) {
        console.error('Employee Payment category error:', upsertError);
      } else {
        const { data: refreshedData, error: refreshError } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        if (refreshError) {
          console.error('Categories refresh error:', refreshError);
        } else {
          categoriesList = refreshedData || [];
        }
      }
    }

    if (error) console.error('Categories error:', error);
    setCategories(categoriesList);
    return categoriesList;
  };

  const fetchPayments = async () => {
    setLoading(true);
    const categoriesList = await fetchCategories();
    const employeeCategory = categoriesList.find((cat) => cat.name === employeeCategoryName);

    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let query = supabase
      .from('expenses')
      .select('*, categories!category_id(name, icon, color)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (employeeCategory) {
      query = query.eq('category_id', employeeCategory.id);
    } else {
      query = query.eq('category_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Employee Payments error:', error);
      setPayments([]);
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, [selectedMonth, selectedYear]);

  const handleAddPayment = async (formData) => {
    setSubmitting(true);
    try {
      const employeeCategory = categories.find((cat) => cat.name === employeeCategoryName);
      if (!employeeCategory) {
        throw new Error('Employee Payment category not found');
      }

      const { error } = await supabase.from('expenses').insert({
        amount: Number(formData.amount),
        category_id: employeeCategory.id,
        description: formData.description,
        employee_name: formData.employee_name || null,
        date: formData.date,
        payment_method: formData.payment_method,
        user_id: user.id,
      });

      if (error) throw error;
      await fetchPayments();
    } catch (err) {
      alert('Error adding employee payment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async (id) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setPayments(payments.filter((p) => p.id !== id));
    } catch (err) {
      alert('Error deleting payment: ' + err.message);
    }
  };

  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
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
        title="Employee Payments"
        subtitle={`Track employee/vendor payments for ${MONTHS[selectedMonth]} ${selectedYear}`}
        onMenuToggle={onMenuToggle}
      />

      <MonthSelector
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
      />

      <div className="page-summary">
        <div className="summary-card summary-card--expense">
          <span className="summary-label">Total Payments</span>
          <span className="summary-value">{formatCurrency(totalPayments)}</span>
          <span className="summary-count">{payments.length} transactions</span>
        </div>
      </div>

      <TransactionForm
        type="expense"
        categories={categories.filter((cat) => cat.name === employeeCategoryName)}
        showEmployeeName={true}
        onSubmit={handleAddPayment}
        loading={submitting}
      />

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <TransactionTable
          data={payments}
          type="expense"
          categories={categories}
          onDelete={handleDeletePayment}
        />
      )}
    </div>
  );
}
