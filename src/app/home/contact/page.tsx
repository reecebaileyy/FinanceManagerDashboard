// app/contact/page.tsx
import './contact.css';
import Image from 'next/image';
import Link from 'next/link';

export default function ContactPage() {
  return (
    <>
      {/* Use the same header layout as the Learn page for consistent styling */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-screen-xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-blue-800 font-bold text-white">
              FM
            </div>
            <Link href="/" className="text-2xl font-semibold text-gray-900">
              Finance Manager
            </Link>
          </div>

          <ul className="hidden items-center gap-8 font-medium text-gray-800 md:flex">
            <li>
              <Link href="/" className="transition hover:text-blue-600">
                Home
              </Link>
            </li>
            <li>
              <Link href="/home/service" className="transition hover:text-blue-600">
                Service
              </Link>
            </li>
            <li>
              <Link href="/home/learn" className="transition hover:text-blue-600">
                Learn
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="transition hover:text-blue-600">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/home/contact" className="transition hover:text-blue-600">
                Contact
              </Link>
            </li>
          </ul>

          <div className="flex gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
            >
              Sign Up
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-gray-300 px-4 py-2 font-semibold transition hover:bg-gray-100"
            >
              Log In
            </Link>
          </div>
        </nav>
      </header>

      <div className="contact-section">
        <div className="contact-box">
          {/* Image Placeholder */}
          <div className="contact-image">
            <Image
              src="/image/contactImage.jpg"
              alt="Contact"
              width={600}
              height={320}
              className="image-placeholder"
            />
          </div>

          {/* Contact Form */}
          <div className="contact-form">
            <h2>Contact Us</h2>
            <form>
              <input type="text" name="name" placeholder="Name" required />
              <input type="email" name="email" placeholder="Email" required />
              <textarea name="message" rows={5} placeholder="Message" required />
              <button type="submit">SUBMIT</button>
            </form>
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        © 2025 Finance Manager. All rights reserved. CS491 Senior Project – California State
        University, Fullerton
      </footer>
    </>
  );
}
