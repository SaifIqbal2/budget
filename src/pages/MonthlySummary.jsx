import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import MonthSelector from '../components/MonthSelector';
import Charts from '../components/Charts';

export default function MonthlySummary({ onMenuToggle }) {
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const [expRes, incRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('*, categories!category_id(name, icon, color)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false }),
      supabase
        .from('incomes')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false }),
    ]);

    if (expRes.error) console.error('Monthly expenses error:', expRes.error);
    if (incRes.error) console.error('Monthly incomes error:', incRes.error);

    if (expRes.error) {
      const { data } = await supabase.from('expenses').select('*')
        .gte('date', startDate).lte('date', endDate).order('date', { ascending: false });
      setExpenses(data || []);
    } else {
      setExpenses(expRes.data || []);
    }
    setIncomes(incRes.data || []);
    setLoading(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const stats = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;

    const cashExpenses = expenses.filter(e => e.payment_method === 'cash').reduce((s, e) => s + Number(e.amount), 0);
    const cashIncome = incomes.filter(i => i.payment_method === 'cash').reduce((s, i) => s + Number(i.amount), 0);
    const bankExpenses = expenses.filter(e => e.payment_method === 'bank').reduce((s, e) => s + Number(e.amount), 0);
    const bankIncome = incomes.filter(i => i.payment_method === 'bank').reduce((s, i) => s + Number(i.amount), 0);

    return {
      totalExpenses, totalIncome, balance, savingsRate,
      cashBalance: cashIncome - cashExpenses,
      bankBalance: bankIncome - bankExpenses,
    };
  }, [expenses, incomes]);

  // Income by source
  const incomeSources = useMemo(() => {
    const map = {};
    incomes.forEach((i) => {
      if (!map[i.source]) map[i.source] = 0;
      map[i.source] += Number(i.amount);
    });
    return Object.entries(map)
      .map(([source, total]) => ({ source, total }))
      .sort((a, b) => b.total - a.total);
  }, [incomes]);

  // Top expenses
  const topExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5);
  }, [expenses]);

  const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="page">
      <Header
        title="Monthly Summary"
        subtitle={`${MONTHS[selectedMonth]} ${selectedYear} detailed report`}
        onMenuToggle={onMenuToggle}
      />

      <MonthSelector
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
      />

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="monthly-overview">
            <div className="overview-card">
              <div className="overview-card__header">
                <span>💰</span>
                <span>Total Income</span>
              </div>
              <div className="overview-card__value amount-income">
                {formatCurrency(stats.totalIncome)}
              </div>
              <div className="overview-card__detail">{incomes.length} entries</div>
            </div>

            <div className="overview-card">
              <div className="overview-card__header">
                <span>💸</span>
                <span>Total Expenses</span>
              </div>
              <div className="overview-card__value amount-expense">
                {formatCurrency(stats.totalExpenses)}
              </div>
              <div className="overview-card__detail">{expenses.length} entries</div>
            </div>

            <div className="overview-card">
              <div className="overview-card__header">
                <span>⚖️</span>
                <span>Net Balance</span>
              </div>
              <div className={`overview-card__value ${stats.balance >= 0 ? 'amount-income' : 'amount-expense'}`}>
                {formatCurrency(stats.balance)}
              </div>
              <div className="overview-card__detail">
                Savings rate: {stats.savingsRate}%
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-card__header">
                <span>💵</span>
                <span>Cash Balance</span>
              </div>
              <div className="overview-card__value">
                {formatCurrency(stats.cashBalance)}
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-card__header">
                <span>🏦</span>
                <span>Bank Balance</span>
              </div>
              <div className="overview-card__value">
                {formatCurrency(stats.bankBalance)}
              </div>
            </div>
          </div>

          <Charts
            expenses={expenses}
            incomes={incomes}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />

          {/* Income Sources & Top Expenses side by side */}
          <div className="monthly-details">
            <div className="detail-card">
              <h3 className="section-title">💰 Income Sources</h3>
              {incomeSources.length === 0 ? (
                <div className="chart-empty">No income this month</div>
              ) : (
                <div className="source-list">
                  {incomeSources.map((s) => (
                    <div key={s.source} className="source-item">
                      <span className="source-name">{s.source}</span>
                      <span className="source-amount amount-income">
                        {formatCurrency(s.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="detail-card">
              <h3 className="section-title">🔝 Top Expenses</h3>
              {topExpenses.length === 0 ? (
                <div className="chart-empty">No expenses this month</div>
              ) : (
                <div className="source-list">
                  {topExpenses.map((e) => (
                    <div key={e.id} className="source-item">
                      <div className="source-info">
                        <span className="source-name">
                          {e.categories?.icon || '💸'} {e.categories?.name || 'Other'}
                        </span>
                        <span className="source-desc">{e.description || ''}</span>
                      </div>
                      <span className="source-amount amount-expense">
                        -{formatCurrency(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
