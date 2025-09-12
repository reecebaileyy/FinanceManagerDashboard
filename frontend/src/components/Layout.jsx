import React, { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';

function Layout() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  return (
    <div className="app-container">
      <header className="top-nav">
        <nav>
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
          </ul>
        </nav>
        <button
          className="dark-mode-toggle"
          onClick={() => setDarkMode((prev) => !prev)}
        >
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </header>
      <div className="content-wrapper">
        <aside className="sidebar">
          <ul>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/transactions">Transactions</Link></li>
            <li><Link to="/budgets">Budgets</Link></li>
          </ul>
        </aside>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
