import React from 'react';

function Dashboard() {
  const balance = 5230.75;
  const recentTransactions = [
    { id: 1, date: '2025-05-01', description: 'Grocery Store', amount: -54.23 },
    { id: 2, date: '2025-05-03', description: 'Salary', amount: 1500.0 },
    { id: 3, date: '2025-05-05', description: 'Electric Bill', amount: -120.5 },
  ];
  const budget = { total: 2000, spent: 950 };

  return (
    <div className="dashboard">
      <section className="dashboard-summary">
        <h2>Current Balance</h2>
        <p>${balance.toFixed(2)}</p>
      </section>

      <section className="dashboard-transactions">
        <h3>Recent Transactions</h3>
        <ul>
          {recentTransactions.map((tx) => (
            <li key={tx.id}>
              <span>{tx.date} - {tx.description}</span>
              <span>{tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="dashboard-budget">
        <h3>Budget Summary</h3>
        <p>Total Budget: ${budget.total.toFixed(2)}</p>
        <p>Spent: ${budget.spent.toFixed(2)}</p>
        <p>Remaining: ${(budget.total - budget.spent).toFixed(2)}</p>
      </section>
    </div>
  );
}

export default Dashboard;
