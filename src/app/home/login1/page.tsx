// app/login/page.tsx

"use client";

import "./login.css";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@features/auth";
import { SECTION_PATHS } from "@features/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect") ?? SECTION_PATHS.dashboard;
  const { signIn } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn({ email, password }, { redirectTo });

      if (result.status === "needs_two_factor") {
        router.push(`${SECTION_PATHS.twoFactor}?redirect=${encodeURIComponent(redirectTo)}`);
        return;
      }

      // authenticated
      router.push(redirectTo);
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error during sign-in");
    } finally {
      setLoading(false);
    }
  };

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
        </nav>
      </header>

      <main>
        <div className="login-container">
          <form className="login-box" onSubmit={handleSubmit}>
            <h2>Welcome Back!</h2>

            {error && <div className="form-error" role="alert">{error}</div>}

            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <div className="forgot-password">
              <Link href="#">Forgot password?</Link>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Signing in..." : "LOG IN"}
            </button>

            <p className="signup-link">
              Want to sign up instead? {" "}
              <Link href="/signup">Create an account</Link>
            </p>
          </form>
        </div>
      </main>

      <footer>
        © 2025 Finance Manager. All rights reserved. CS491 Senior Project –
        California State University, Fullerton
      </footer>
    </>
  );
}
