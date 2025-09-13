import React, { useState } from 'react';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    date: '',
    notes: '',
  });
  const [editingId, setEditingId] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ type: 'expense', amount: '', category: '', date: '', notes: '' });
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.category || !formData.date) return;

    if (editingId !== null) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === editingId ? { ...formData, id: editingId } : t))
      );
    } else {
      setTransactions((prev) => [...prev, { ...formData, id: Date.now() }]);
    }
    resetForm();
  };

  const handleEdit = (id) => {
    const txn = transactions.find((t) => t.id === id);
    if (!txn) return;
    setFormData({
      type: txn.type,
      amount: txn.amount,
      category: txn.category,
      date: txn.date,
      notes: txn.notes,
    });
    setEditingId(id);
  };

  const handleDelete = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  return (
    <div>
      <h2>Transactions</h2>
      <form onSubmit={handleSubmit} className="transaction-form">
        <label>
          Type
          <select name="type" value={formData.type} onChange={handleChange}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>
        <label>
          Amount
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Category
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Date
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Notes
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
          />
        </label>
        <button type="submit">{editingId !== null ? 'Update' : 'Add'} Transaction</button>
        {editingId !== null && (
          <button type="button" onClick={resetForm}>
            Cancel
          </button>
        )}
      </form>
      {transactions.length > 0 && (
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Date</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.type}</td>
                <td>{t.amount}</td>
                <td>{t.category}</td>
                <td>{t.date}</td>
                <td>{t.notes}</td>
                <td>
                  <button type="button" onClick={() => handleEdit(t.id)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(t.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Transactions;
