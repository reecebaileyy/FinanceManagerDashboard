import Image from "next/image";
import "./Dashboard.css";

// app/page.js
export default function DashboardPage() {
  return (
    <div className="shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">FM</div>
          <h1>Finance Manager</h1>
        </div>

        <nav className="nav">
          <a href="/home" className="active">
            🏠 Home
          </a>
          <a href="/login">🔐 Login</a>
          <a href="/signup">✨ Create Account</a>
          <div id="protectedLinks">
            <a href="/dashboard">💬 AI Assistant</a>
            <a href="/dashboard">📊 Dashboard</a>
            <a href="/transactions">🧾 Transactions</a>
            <a href="/budgets">🎯 Budget Plan</a>
            <a href="/settings">⚙️ Settings</a>
          </div>
        </nav>

        <div id="tipBox" className="aside-card"></div>
      </aside>

      {/* Main content */}
      <main>
        <div className="topbar">
          <div className="search">
            <input
              aria-label="Search"
              placeholder="Search transactions, categories, notes…"
            />
            <a className="btn" href="/transactions">
              Search
            </a>
          </div>
          <button id="themeToggle" className="btn">
            🌙 Dark
          </button>
          <div className="user-chip">
            <span>👤</span>
            <span>Guest</span>
          </div>
        </div>

        {/* Example landing section */}
        <section id="home" className="page default">
          <div className="hero">
            <div>
              <h2>
                Take control of your money with a clean, focused dashboard.
              </h2>
              <p>Track spending, set budgets, and visualize your cashflow.</p>
              <div className="cta">
                <a className="btn primary" href="/signup">
                  Get Started
                </a>
                <a className="btn" href="/dashboard">
                  Preview Dashboard
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer>
          © 2025 Finance Manager. All rights reserved. CS491 Senior Project –
          CSUF
        </footer>
      </main>
    </div>
  );
}
