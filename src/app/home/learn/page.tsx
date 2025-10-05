// app/learn-more/page.tsx
import "./learn.css";
import Link from "next/link";
import Image from "next/image";


export default function LearnMorePage() {
  return (
    <>
      <header>
        <nav className="navbar">
          <div className="logo">
            <Link href="/">
              <h1>Finance Manager</h1>
            </Link>
          </div>

          <ul className="menu" id="myTopnav">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/home/service">Service</Link>
            </li>
            <li>
              <Link href="/home/learn">Learn</Link>
            </li>
            <li>
              <Link href="/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link href="/home/contact">Contact</Link>
            </li>
          </ul>

          <div className="actions">
            <Link className="btn btn-primary" href="/home/signup1">
              Sign Up
            </Link>
            <Link className="btn btn-outline" href="/home/login1">
              Log In
            </Link>
          </div>
        </nav>
      </header>

      <div className="learn-more-section">
        <h2 className="section-title">Learn More</h2>

        <div className="cards-container">
          {/* Card 1 */}
          <div className="info-card">
            <div className="placeholder-img">
                     <Image 
                src="/image/ExpenseTracker.jpeg" 
                alt="Budget Planner" 
                width={300} 
                height={150}
              />
            </div>
            <h3>Expense & Income Tracker</h3>
            <ul>
              <li>Easily log your income and expenses in one place.</li>
              <li>Get a visual breakdown of where your money goes.</li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="info-card">
            <div className="placeholder-img">
                <Image 
                src="/image/Monthly.png" 
                alt="Budget Planner" 
                width={700} 
                height={500}
              />
              </div>
            <h3>Monthly Budget Planner</h3>
            <ul>
              <li>Set spending limits for different categories.</li>
              <li>Receive alerts when you're close to exceeding the budget.</li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="info-card">
            <div className="placeholder-img">
              <Image 
                src="/image/savingGoals.jpg" 
                alt="Budget Planner" 
                width={300} 
                height={150}
              />
            </div>
            <h3>Savings Goal Calculator</h3>
            <ul>
              <li>Set financial goals (e.g., vacation or emergency fund).</li>
              <li>Get insights on how much to save monthly.</li>
            </ul>
          </div>
        </div>
      </div>

      <footer>
        © 2025 Finance Manager. All rights reserved. CS491 Senior Project –
        California State University, Fullerton
      </footer>
    </>
  );
}
