import { useState } from 'react';

export default function TransactionTable({ data, type, categories, onDelete, loading, showEmployeeColumn = false }) {
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [deleteId, setDeleteId] = useState(null);

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
      year: 'numeric',
    });
  };

  const getCategoryInfo = (categoryId) => {
    const cat = categories?.find((c) => c.id === categoryId);
    return cat || { name: 'Uncategorized', icon: '📁', color: '#64748b' };
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedData = [...(data || [])].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === 'amount') {
      aVal = Number(aVal);
      bVal = Number(bVal);
    }
    if (sortField === 'date') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }
    if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const handleDelete = async (id) => {
    setDeleteId(id);
    await onDelete(id);
    setDeleteId(null);
  };

  const paymentMethodIcons = {
    cash: '💵',
    bank: '🏦',
    other: '📱',
  };

  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">{type === 'expense' ? '💸' : '💰'}</span>
        <h3>No {type === 'expense' ? 'expenses' : 'income'} yet</h3>
        <p>Add your first {type === 'expense' ? 'expense' : 'income'} using the form above</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="transaction-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('date')} className="sortable">
              Date {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            {type === 'expense' ? (
              <>
                <th>Category</th>
                {showEmployeeColumn && <th>Employee</th>}
              </>
            ) : (
              <th onClick={() => handleSort('source')} className="sortable">
                Source {sortField === 'source' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
            )}
            <th>Description</th>
            <th>Method</th>
            <th onClick={() => handleSort('amount')} className="sortable">
              Amount {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => {
            const cat = type === 'expense' ? getCategoryInfo(item.category_id) : null;
            return (
              <tr key={item.id}>
                <td className="td-date">{formatDate(item.date)}</td>
                {type === 'expense' ? (
                  <>
                    <td>
                      <span
                        className="category-badge"
                        style={{ backgroundColor: cat.color + '22', color: cat.color }}
                      >
                        {cat.icon} {cat.name}
                      </span>
                    </td>
                    {showEmployeeColumn && <td>{item.employee_name || '—'}</td>}
                  </>
                ) : (
                  <td className="td-source">{item.source}</td>
                )}
                <td className="td-desc">{item.description || '—'}</td>
                <td>{paymentMethodIcons[item.payment_method] || '💵'}</td>
                <td className={`td-amount ${type === 'expense' ? 'amount-expense' : 'amount-income'}`}>
                  {type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
                </td>
                <td>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(item.id)}
                    disabled={deleteId === item.id}
                    title="Delete"
                  >
                    {deleteId === item.id ? '⏳' : '🗑️'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
