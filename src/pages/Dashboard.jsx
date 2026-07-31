import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import Charts from '../components/Charts';
import MonthSelector from '../components/MonthSelector';

export default function Dashboard({ onMenuToggle }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [cashDeposits, setCashDeposits] = useState([]);
  const [cashToBank, setCashToBank] = useState([]);
  const [openingBalances, setOpeningBalances] = useState({ cash: 0, bank: 0 });
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
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevMonthLastDay).padStart(2, '0')}`;
    const isJuly2026 = selectedMonth === 7 && selectedYear === 2026;

    const [expRes, incRes, wdRes, depRes, cashDepRes, ctbRes, prevExpRes, prevIncRes, prevWdRes, prevDepRes, prevCashDepRes, prevCtbRes] = await Promise.all([
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
      supabase
        .from('cash_withdrawals')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false }),
      supabase
        .from('bank_deposits')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false }),
      supabase
        .from('cash_deposits')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false }),
      supabase
        .from('cash_to_bank')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false }),
      supabase
        .from('expenses')
        .select('*, categories!category_id(name, icon, color)')
        .gte('date', prevStartDate)
        .lte('date', prevEndDate)
        .order('date', { ascending: false }),
      supabase
        .from('incomes')
        .select('*')
        .gte('date', prevStartDate)
        .lte('date', prevEndDate)
        .order('date', { ascending: false }),
      supabase
        .from('cash_withdrawals')
        .select('*')
        .gte('date', prevStartDate)
        .lte('date', prevEndDate)
        .order('date', { ascending: false }),
      supabase
        .from('bank_deposits')
        .select('*')
        .gte('date', prevStartDate)
        .lte('date', prevEndDate)
        .order('date', { ascending: false }),
      supabase
        .from('cash_deposits')
        .select('*')
        .gte('date', prevStartDate)
        .lte('date', prevEndDate)
        .order('date', { ascending: false }),
      supabase
        .from('cash_to_bank')
        .select('*')
        .gte('date', prevStartDate)
        .lte('date', prevEndDate)
        .order('date', { ascending: false }),
    ]);

    if (expRes.error) console.error('Dashboard expenses error:', expRes.error);
    if (incRes.error) console.error('Dashboard incomes error:', incRes.error);
    if (prevExpRes.error) console.error('Previous month expenses error:', prevExpRes.error);
    if (prevIncRes.error) console.error('Previous month incomes error:', prevIncRes.error);
    if (prevWdRes.error) console.error('Previous month withdrawals error:', prevWdRes.error);
    if (prevDepRes.error) console.error('Previous month bank deposits error:', prevDepRes.error);
    if (prevCashDepRes.error) console.error('Previous month cash deposits error:', prevCashDepRes.error);
    if (prevCtbRes.error) console.error('Previous month cash to bank error:', prevCtbRes.error);

    // If join fails, fallback without join
    if (expRes.error) {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      setExpenses(data || []);
    } else {
      setExpenses(expRes.data || []);
    }
    setIncomes(incRes.data || []);
    if (wdRes.error) console.error('Withdrawals error:', wdRes.error);
    setWithdrawals(wdRes.data || []);
    if (depRes.error) console.error('Bank deposits error:', depRes.error);
    setDeposits(depRes.data || []);
    if (cashDepRes.error) console.error('Cash deposits error:', cashDepRes.error);
    setCashDeposits(cashDepRes.data || []);
    if (ctbRes.error) console.error('Cash to Bank error:', ctbRes.error);
    if (prevCtbRes.error) console.error('Previous Cash to Bank error:', prevCtbRes.error);

    const [previousExpenses, previousIncomes, previousWithdrawals, previousDeposits, previousCashDeposits, previousCashToBank] = [
      prevExpRes.error ? [] : prevExpRes.data || [],
      prevIncRes.error ? [] : prevIncRes.data || [],
      prevWdRes.error ? [] : prevWdRes.data || [],
      prevDepRes.error ? [] : prevDepRes.data || [],
      prevCashDepRes.error ? [] : prevCashDepRes.data || [],
      prevCtbRes.error ? [] : prevCtbRes.data || [],
    ];

    const previousExpensesRegular = previousExpenses.filter((entry) => !['Savings', 'Investment'].includes(entry.categories?.name));
    const previousSavingsEntries = previousExpenses.filter((entry) => entry.categories?.name === 'Savings');
    const previousCashExpenses = previousExpensesRegular
      .filter((e) => e.payment_method === 'cash')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const previousCashSavings = previousSavingsEntries
      .filter((e) => e.payment_method === 'cash')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const previousCashIncome = previousIncomes
      .filter((i) => i.payment_method === 'cash')
      .reduce((sum, i) => sum + Number(i.amount), 0);
    const previousBankExpenses = previousExpensesRegular
      .filter((e) => e.payment_method === 'bank')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const previousBankSavings = previousSavingsEntries
      .filter((e) => e.payment_method === 'bank')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const previousBankIncome = previousIncomes
      .filter((i) => i.payment_method === 'bank')
      .reduce((sum, i) => sum + Number(i.amount), 0);
    const previousWithdrawn = previousWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
    const previousDeposited = previousDeposits.reduce((sum, d) => sum + Number(d.amount), 0);
    const previousCashDepositedTotal = previousCashDeposits.reduce((sum, d) => sum + Number(d.amount), 0);
    const previousCashToBankTotal = previousCashToBank.reduce((sum, d) => sum + Number(d.amount), 0);

    const openingCash = previousCashIncome - previousCashExpenses + previousWithdrawn + previousCashDepositedTotal - previousCashToBankTotal - previousCashSavings;
    const openingBank = previousBankIncome - previousBankExpenses - previousWithdrawn + previousDeposited + previousCashToBankTotal - previousBankSavings;

    setOpeningBalances({ cash: openingCash, bank: openingBank });
    setLoading(false);
  };

  const stats = useMemo(() => {
    const regularExpenses = expenses.filter((entry) => !['Savings', 'Investment'].includes(entry.categories?.name));
    const savingsEntries = expenses.filter((entry) => entry.categories?.name === 'Savings');
    const investmentEntries = expenses.filter((entry) => entry.categories?.name === 'Investment');
    const totalExpenses = regularExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalSavings = savingsEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalInvestments = investmentEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
    const totalDeposited = deposits.reduce((sum, d) => sum + Number(d.amount), 0);
    const totalCashDeposited = cashDeposits.reduce((sum, d) => sum + Number(d.amount), 0);
    const totalCashToBank = cashToBank.reduce((sum, d) => sum + Number(d.amount), 0);

    // Month Balance = sirf Earnings - Expenses hoga
    const balance = totalIncome - totalExpenses;

    const cashExpenses = regularExpenses
      .filter((e) => e.payment_method === 'cash')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const cashSavings = savingsEntries
      .filter((e) => e.payment_method === 'cash')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const cashIncome = incomes
      .filter((i) => i.payment_method === 'cash')
      .reduce((sum, i) => sum + Number(i.amount), 0);
    // Withdrawals add to cash balance, Cash deposits add to cash balance, Cash to bank subtracts from cash
    const cashBalance = openingBalances.cash + cashIncome - cashExpenses + totalWithdrawn + totalCashDeposited - totalCashToBank - cashSavings;

    const bankExpenses = regularExpenses
      .filter((e) => e.payment_method === 'bank')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const bankSavings = savingsEntries
      .filter((e) => e.payment_method === 'bank')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const bankIncome = incomes
      .filter((i) => i.payment_method === 'bank')
      .reduce((sum, i) => sum + Number(i.amount), 0);
    // Bank deposits ADD to bank balance, withdrawals REDUCE bank balance, Cash to bank ADDs to bank balance
    const bankBalance = openingBalances.bank + bankIncome - bankExpenses - totalWithdrawn + totalDeposited + totalCashToBank - bankSavings;
    const totalWithdrawals = totalWithdrawn;
    const totalEmployeePayments = regularExpenses
      .filter((e) => e.categories?.name === 'Employee Payment')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return { totalExpenses, totalIncome, balance, cashBalance, bankBalance, totalWithdrawals, totalDeposited, totalCashDeposited, totalCashToBank, totalEmployeePayments, totalSavings, totalInvestments };
  }, [expenses, incomes, withdrawals, deposits, cashDeposits, cashToBank, openingBalances]);

  const recentTransactions = useMemo(() => {
    const all = [
      ...expenses.map((e) => ({ ...e, type: 'expense' })),
      ...incomes.map((i) => ({ ...i, type: 'income' })),
    ];
    return all.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  }, [expenses, incomes]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="page">
      <Header
        title="Dashboard"
        subtitle={`${MONTHS[selectedMonth]} ${selectedYear} Overview`}
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
          <div className="stats-grid">
            <StatCard
              title="Total Balance"
              value={stats.cashBalance + stats.bankBalance}
              icon="⚖️"
              type={(stats.cashBalance + stats.bankBalance) >= 0 ? 'success' : 'danger'}
            />
            <StatCard
              title="Earnings"
              value={stats.totalIncome}
              icon="💰"
              type="income"
            />
            <StatCard
              title="Expenses"
              value={stats.totalExpenses}
              icon="💸"
              type="expense"
            />
            <StatCard
              title="Bank Balance"
              value={stats.bankBalance}
              icon="🏦"
              type="info"
            />
            <StatCard
              title="Cash"
              value={stats.cashBalance}
              icon="💵"
              type="cash"
            />
            <StatCard
              title="Month Balance"
              value={stats.balance}
              icon="📅"
              type={stats.balance >= 0 ? 'success' : 'danger'}
            />
            <StatCard
              title="Cash Withdrawn"
              value={stats.totalWithdrawals}
              icon="🏧"
              type="withdrawal"
            />
            <StatCard
              title="Bank Deposited"
              value={stats.totalDeposited}
              icon="🏦"
              type="deposit"
            />
            <StatCard
              title="Cash Deposited"
              value={stats.totalCashDeposited}
              icon="💵"
              type="deposit"
            />
            <StatCard
              title="Savings"
              value={stats.totalSavings}
              icon="🏦"
              type="income"
            />
            <StatCard
              title="Investments"
              value={stats.totalInvestments}
              icon="📈"
              type="expense"
            />
            <StatCard
              title="Employee Payments"
              value={stats.totalEmployeePayments}
              icon="👷"
              type="expense"
            />
          </div>

          <Charts
            expenses={expenses}
            incomes={incomes}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />

          {/* Recent Transactions */}
          <div className="recent-transactions">
            <h3 className="section-title">🕐 Recent Transactions</h3>
            {recentTransactions.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <p>No transactions this month</p>
              </div>
            ) : (
              <div className="recent-list">
                {recentTransactions.map((t) => (
                  <div key={t.id} className={`recent-item recent-item--${t.type}`}>
                    <div className="recent-item__icon">
                      {t.type === 'expense'
                        ? (t.categories?.icon || '💸')
                        : '💰'}
                    </div>
                    <div className="recent-item__info">
                      <span className="recent-item__title">
                        {t.type === 'expense'
                          ? (t.categories?.name || 'Expense')
                          : t.source}
                      </span>
                      <span className="recent-item__date">{formatDate(t.date)}</span>
                    </div>
                    <div className={`recent-item__amount ${t.type === 'expense' ? 'amount-expense' : 'amount-income'}`}>
                      {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
