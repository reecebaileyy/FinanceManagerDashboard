import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-screen-xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-sm bg-gradient-to-br from-blue-600 to-blue-800 text-lg font-bold text-white">
              FM
            </div>
            <span className="text-2xl font-semibold text-gray-900">Finance Manager</span>
          </div>

          <ul className="hidden space-x-8 font-medium text-gray-800 md:flex">
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

      {/* Hero Section */}
      <main className="mx-auto max-w-screen-xl px-6 py-16 text-center">
        <section className="flex w-full flex-col items-center">
          <h1 className="text-4xl font-extrabold text-gray-900 md:text-5xl">
            Smart Tools for Smarter Financial Decisions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-center leading-relaxed text-gray-600">
            Empower your financial future with smart tools designed to help you save smarter, track
            better, and make confident decisions every step of the way.
          </p>

          <div className="relative mx-auto mt-12 max-w-4xl">
            <Image
              src="/image/HomeImage.jpg"
              alt="Budget Planner"
              width={1000}
              height={600}
              className="h-auto w-full rounded-xl object-cover shadow-md"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/30 text-white">
              <h2 className="mb-2 text-2xl font-bold drop-shadow-lg md:text-3xl">
                &ldquo;Financial freedom begins with smart decisions.&rdquo;
              </h2>
              <p className="max-w-xl text-gray-200 italic">
                From budgeting to goal tracking, our platform helps you make informed choices every
                step of the way.
              </p>
            </div>
          </div>
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
