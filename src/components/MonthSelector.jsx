const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function MonthSelector({ selectedMonth, selectedYear, onChange }) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 2020; y--) {
    years.push(y);
  }

  return (
    <div className="month-selector">
      <div className="year-selector">
        <select
          value={selectedYear}
          onChange={(e) => onChange(selectedMonth, Number(e.target.value))}
          className="year-dropdown"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="month-tabs">
        {MONTHS.map((month, index) => (
          <button
            key={month}
            className={`month-tab ${selectedMonth === index + 1 ? 'active' : ''}`}
            onClick={() => onChange(index + 1, selectedYear)}
          >
            {month}
          </button>
        ))}
      </div>
    </div>
  );
}
