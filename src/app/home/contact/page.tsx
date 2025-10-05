// app/contact/page.tsx
import "./contact.css";
import Link from "next/link";

export default function ContactPage() {
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

      <div className="contact-section">
        <div className="contact-box">
          {/* Image Placeholder */}
          <div className="contact-image">
            <div className="image-placeholder">[ Image ]</div>
          </div>

          {/* Contact Form */}
          <div className="contact-form">
            <h2>Contact Us</h2>
            <form>
              <input type="text" name="name" placeholder="Name" required />
              <input type="email" name="email" placeholder="Email" required />
              <textarea
                name="message"
                rows={5}
                placeholder="Message"
                required
              />
              <button type="submit">SUBMIT</button>
            </form>
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
