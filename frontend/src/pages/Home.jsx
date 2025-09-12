import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="home-container">
      <h1>Finance Manager Dashboard</h1>
      <p>Track expenses, set budgets, and reach your savings goals.</p>
      <div className="cta-buttons">
        <Link className="button" to="/login">Get Started</Link>
        <Link className="button button-secondary" to="/register">Create Account</Link>
      </div>
    </div>
  );
}

export default Home;
