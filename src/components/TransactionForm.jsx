import { useState } from 'react';

export default function TransactionForm({ type, categories, onSubmit, loading, showEmployeeName = false }) {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    employee_name: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    source: '',
    payment_method: 'cash',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return;
    onSubmit(formData);
    setFormData({
      amount: '',
      description: '',
      employee_name: '',
      date: new Date().toISOString().split('T')[0],
      category_id: '',
      source: '',
      payment_method: 'cash',
    });
  };

  return (
    <form className="transaction-form" onSubmit={handleSubmit}>
      <h3 className="form-title">
        {type === 'expense' ? '💸 Add Expense' : '💰 Add Income'}
      </h3>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="amount">Amount (PKR)</label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="Enter amount"
            min="1"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        {type === 'expense' && categories && (
          <div className="form-group">
            <label htmlFor="category_id">Category</label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === 'expense' && showEmployeeName && (
          <div className="form-group">
            <label htmlFor="employee_name">Employee / Vendor</label>
            <input
              type="text"
              id="employee_name"
              name="employee_name"
              value={formData.employee_name}
              onChange={handleChange}
              placeholder="e.g., Ali, vendor name"
            />
          </div>
        )}

        {type === 'income' && (
          <div className="form-group">
            <label htmlFor="source">Source</label>
            <input
              type="text"
              id="source"
              name="source"
              value={formData.source}
              onChange={handleChange}
              placeholder="e.g., Salary, Freelance, Client"
              required
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="payment_method">Payment Method</label>
          <select
            id="payment_method"
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
          >
            <option value="cash">💵 Cash</option>
            <option value="bank">🏦 Bank</option>
            <option value="other">📱 Other</option>
          </select>
        </div>

        <div className="form-group form-group--full">
          <label htmlFor="description">Description</label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter description (optional)"
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? (
          <span className="btn-loading">Adding...</span>
        ) : (
          <span>{type === 'expense' ? '💸 Add Expense' : '💰 Add Income'}</span>
        )}
      </button>
    </form>
  );
}
