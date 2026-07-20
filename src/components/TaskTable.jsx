import { useState } from 'react';

export default function TaskTable({ data, onDelete, onUpdateStatus, loading }) {
  const [updatingId, setUpdatingId] = useState(null);

  const statusLabel = (s) => {
    switch (s) {
      case 'received': return 'Received';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'payment_drafted': return 'Payment Drafted';
      case 'paid': return 'Paid';
      default: return s;
    }
  };

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    await onUpdateStatus(id, status);
    setUpdatingId(null);
  };

  if (!data || data.length === 0) return (
    <div className="empty-state"><h3>No tasks yet</h3><p>Add tasks using the form above.</p></div>
  );

  return (
    <div className="table-container">
      <table className="transaction-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Task #</th>
            <th>Title</th>
            <th>Client</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((t) => (
            <tr key={t.id}>
              <td>{new Date(t.date_received).toLocaleDateString()}</td>
              <td>{t.task_number || '—'}</td>
              <td>{t.title}</td>
              <td>{t.client_name || '—'}</td>
              <td>
                <select value={t.status} onChange={(e) => handleStatusChange(t.id, e.target.value)} disabled={updatingId === t.id}>
                  <option value="received">Received</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="payment_drafted">Payment Drafted</option>
                  <option value="paid">Paid</option>
                </select>
                <div className="status-label">{statusLabel(t.status)}</div>
              </td>
              <td className="td-amount amount-expense">-Rs {Math.round(Number(t.amount) || 0)}</td>
              <td>
                <button className="btn-delete" onClick={() => onDelete(t.id)} title="Delete">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
