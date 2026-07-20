import { useState } from 'react';

export default function TaskForm({ onSubmit, loading, defaults = {} }) {
  const [formData, setFormData] = useState({
    title: defaults.title || '',
    description: defaults.description || '',
    client_name: defaults.client_name || '',
    amount: defaults.amount || '',
    date_received: defaults.date_received || new Date().toISOString().split('T')[0],
    due_date: defaults.due_date || '',
    status: defaults.status || 'received',
    payment_method: defaults.payment_method || 'cash',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) return alert('Title is required');
    onSubmit(formData);
    setFormData({
      task_number: '',
      title: '',
      description: '',
      client_name: '',
      amount: '',
      date_received: new Date().toISOString().split('T')[0],
      due_date: '',
      status: 'received',
      payment_method: 'cash',
    });
  };

  return (
    <form className="transaction-form" onSubmit={handleSubmit}>
      <h3 className="form-title">🧾 Add Task</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Title</label>
          <input name="title" value={formData.title} onChange={handleChange} placeholder="Task title" required />
        </div>
        <div className="form-group">
          <label>Client</label>
          <input name="client_name" value={formData.client_name} onChange={handleChange} placeholder="Client name" />
        </div>
        <div className="form-group">
          <label>Amount (PKR)</label>
          <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="0" min="0" />
        </div>

        <div className="form-group">
          <label>Date Received</label>
          <input type="date" name="date_received" value={formData.date_received} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Due Date</label>
          <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Status</label>
          <select name="status" value={formData.status} onChange={handleChange}>
            <option value="received">Received</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="payment_drafted">Payment Drafted</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="form-group">
          <label>Payment Method</label>
          <select name="payment_method" value={formData.payment_method} onChange={handleChange}>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group form-group--full">
          <label>Description</label>
          <input name="description" value={formData.description} onChange={handleChange} placeholder="Details (optional)" />
        </div>
      </div>

      <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Task'}</button>
    </form>
  );
}
