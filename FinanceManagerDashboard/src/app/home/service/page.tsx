// app/service/page.tsx
import './service.css';
import Image from 'next/image';
import Link from 'next/link';

export default function ServicePage() {
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

      <main>
        <div className="mx-auto max-w-screen-xl px-6 py-12">
          <div className="relative overflow-hidden rounded-xl">
            {/* background image */}
            <div className="absolute inset-0">
              <Image
                src="/image/personal_finance.jpg"
                alt="Personal Finance"
                fill
                sizes="(min-width:1024px) 900px, 100vw"
                className="object-cover"
              />
            </div>

            {/* subtle dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/25" />

            {/* foreground content */}
            <div className="relative z-10 px-8 py-16">
              <div className="max-w-4xl">
                <h2 className="text-3xl font-bold text-white md:text-4xl">Personal Finance Tool</h2>
                <p className="mt-4 max-w-xl text-white/90">
                  Budget. Track. Automate financial goals. Get a complete picture of your finances
                  anytime, anywhere!
                </p>
                <div className="mt-6">
                  <Link
                    href="/signup"
                    className="inline-block rounded-lg bg-white/90 px-5 py-2 font-semibold text-gray-900 hover:bg-white"
                  >
                    Sign Up for Free
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        © 2025 Finance Manager. All rights reserved. CS491 Senior Project – California State
        University, Fullerton
      </footer>
    </>
  );
}
