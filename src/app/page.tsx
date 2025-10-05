import "./Homepage.css";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
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
              <Link href="/home/learn">Learn More</Link>
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

      <main className="page">
        <section className="hero">
          <h1>Smart Tools for Smarter Financial Decisions</h1>
          <p>
            Empower your financial future with smart tools designed to help you
            save smarter, track better, and make confident decisions every step
            of the way.
          </p>

          <div className="placeholder-wrap" aria-hidden="true">
            <Image 
                  src="/image/HomeImage.jpg" 
                  alt="Budget Planner" 
                  width={1000} 
                  height={10000}
                />
            <div className="hero-quote">
              <h2>"Financial freedom begins with smart decisions."</h2>
              <p>From budgeting to goal tracking, our platform helps you make informed choices every step of the way.</p>
            </div>
           </div>
        </section>
      </main>
            <footer>
        © 2025 Finance Manager. All rights reserved. CS491 Senior Project –
        California State University, Fullerton
      </footer>
    </>
  );
}
