import { useMemo } from 'react';

export default function Charts({ expenses, incomes, selectedMonth, selectedYear }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Category-wise breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    const map = {};
    expenses.forEach((exp) => {
      const catName = exp.categories?.name || 'Other';
      const catIcon = exp.categories?.icon || '📁';
      const catColor = exp.categories?.color || '#64748b';
      if (!map[catName]) {
        map[catName] = { name: catName, icon: catIcon, color: catColor, total: 0 };
      }
      map[catName].total += Number(exp.amount);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [expenses]);

  // Total for percentage calculation
  const totalExpenses = categoryBreakdown.reduce((sum, cat) => sum + cat.total, 0);

  // Daily income vs expense for the month
  const dailyData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayExpenses = (expenses || [])
        .filter((e) => e.date === dateStr)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const dayIncomes = (incomes || [])
        .filter((i) => i.date === dateStr)
        .reduce((sum, i) => sum + Number(i.amount), 0);
      if (dayExpenses > 0 || dayIncomes > 0) {
        days.push({ day: d, expenses: dayExpenses, incomes: dayIncomes });
      }
    }
    return days;
  }, [expenses, incomes, selectedMonth, selectedYear]);

  const maxDailyValue = Math.max(
    ...dailyData.map((d) => Math.max(d.expenses, d.incomes)),
    1
  );

  return (
    <div className="charts-container">
      {/* Category Breakdown */}
      <div className="chart-card">
        <h3 className="chart-title">📊 Expense Breakdown</h3>
        {categoryBreakdown.length === 0 ? (
          <div className="chart-empty">No expense data for this period</div>
        ) : (
          <div className="category-bars">
            {categoryBreakdown.map((cat) => {
              const percentage = totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0;
              return (
                <div key={cat.name} className="category-bar-item">
                  <div className="category-bar-header">
                    <span className="category-bar-label">
                      {cat.icon} {cat.name}
                    </span>
                    <span className="category-bar-value">
                      {formatCurrency(cat.total)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="category-bar-track">
                    <div
                      className="category-bar-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Chart */}
      <div className="chart-card">
        <h3 className="chart-title">📈 Daily Activity</h3>
        {dailyData.length === 0 ? (
          <div className="chart-empty">No activity data for this period</div>
        ) : (
          <div className="daily-chart">
            <div className="daily-chart-legend">
              <span className="legend-item">
                <span className="legend-dot legend-dot--income"></span> Income
              </span>
              <span className="legend-item">
                <span className="legend-dot legend-dot--expense"></span> Expense
              </span>
            </div>
            <div className="daily-bars">
              {dailyData.map((d) => (
                <div key={d.day} className="daily-bar-group">
                  <div className="daily-bar-wrapper">
                    <div
                      className="daily-bar daily-bar--income"
                      style={{ height: `${(d.incomes / maxDailyValue) * 100}%` }}
                      title={`Income: ${formatCurrency(d.incomes)}`}
                    ></div>
                    <div
                      className="daily-bar daily-bar--expense"
                      style={{ height: `${(d.expenses / maxDailyValue) * 100}%` }}
                      title={`Expense: ${formatCurrency(d.expenses)}`}
                    ></div>
                  </div>
                  <span className="daily-bar-label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
