// app/page.tsx
import "./HomePage.css";
import Link from "next/link";

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
              <Link href="/service">Service</Link>
            </li>
            <li>
              <Link href="/learn-more">Learn</Link>
            </li>
            <li>
              <Link href="/Dash">Dashboard</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>

          <div className="actions">
            <Link className="btn btn-primary" href="/signup">
              Sign Up
            </Link>
            <Link className="btn btn-outline" href="/login">
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
            <div className="placeholder">IMAGE</div>
          </div>
        </section>
      </main>
    </>
  );
}
