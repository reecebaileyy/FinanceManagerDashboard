import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center">
            <Link href="/">
              <h1 className="font-[Playfair_Display] text-3xl font-bold text-gray-900 drop-shadow-sm">
                Finance Manager
              </h1>
            </Link>
          </div>

          <ul className="hidden space-x-8 font-medium text-gray-800 md:flex">
            <li>
              <Link href="/home/service" className="transition hover:text-blue-600">
                Service
              </Link>
            </li>
            <li>
              <Link href="/home/learn" className="transition hover:text-blue-600">
                Learn More
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
              href="/home/signup1"
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
            >
              Sign Up
            </Link>
            <Link
              href="/home/login1"
              className="rounded-lg border border-gray-300 px-4 py-2 font-semibold transition hover:bg-gray-100"
            >
              Log In
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-6 py-16 text-center">
        <section className="space-y-4">
          <h1 className="text-4xl font-extrabold text-gray-900">
            Smart Tools for Smarter Financial Decisions
          </h1>
          <p className="mx-auto max-w-2xl text-gray-500">
            Empower your financial future with smart tools designed to help you save smarter, track
            better, and make confident decisions every step of the way.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        © 2025 Finance Manager. All rights reserved. CS491 Senior Project – California State
        University, Fullerton
      </footer>
    </>
  );
}
