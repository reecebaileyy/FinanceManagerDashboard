import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="home-container">
      <section className="hero">
        <h1>Finance Manager Dashboard</h1>
        <p>Track expenses, set budgets, and reach your savings goals.</p>
        <div className="cta-buttons">
          <Link className="button" to="/login">Get Started</Link>
          <Link className="button button-secondary" to="/register">Create Account</Link>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">💰</div>
          <h3>Budget Tracking</h3>
          <p>Stay on top of your spending with categorized budgets.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Visual Reports</h3>
          <p>Understand your habits through charts and summaries.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>Secure Sync</h3>
          <p>Your financial data is safely synced across devices.</p>
        </div>
      </section>
    </div>
  );
}

export default Home;
