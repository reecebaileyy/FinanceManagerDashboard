import Link from 'next/link';

export default function LearnMorePage() {
  return (
    <>
      {/* Header */}
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

      {/* Content */}
      <main className="mx-auto max-w-screen-xl px-6 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">Learn More</h2>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        © 2025 Finance Manager. All rights reserved. CS491 Senior Project – California State
        University, Fullerton
      </footer>
    </>
  );
}
