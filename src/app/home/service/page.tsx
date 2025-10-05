// app/service/page.tsx
import "./service.css";
import Link from "next/link";

export default function ServicePage() {
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

      <main>
        <div className="services-section">
          <div className="service-box">
            <div className="service-text">
              <h2>Personal Finance Tool</h2>
              <p>
                Budget. Track. Automate financial goals.
                <br />
                Get a complete picture of your finances anytime, anywhere!
              </p>
              <Link className="signup-btn" href ="/home/signup1">Sign Up for Free </Link>
            </div>

            <div className="service-image">
              <div className="image-circle">
                <div className="placeholder-img">[ Image ]</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer>
        © 2025 Finance Manager. All rights reserved. CS491 Senior Project –
        California State University, Fullerton
      </footer>
    </>
  );
}
