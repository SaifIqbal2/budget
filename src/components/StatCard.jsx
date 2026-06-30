export default function StatCard({ title, value, icon, trend, trendValue, type }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={`stat-card stat-card--${type || 'default'}`}>
      <div className="stat-card__header">
        <span className="stat-card__icon">{icon}</span>
        <span className="stat-card__title">{title}</span>
      </div>
      <div className="stat-card__value">{formatCurrency(value || 0)}</div>
      {trend && (
        <div className={`stat-card__trend stat-card__trend--${trend}`}>
          <span>{trend === 'up' ? '↑' : '↓'}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
