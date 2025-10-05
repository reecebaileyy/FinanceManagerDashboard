// app/signup/page.tsx
"use client";

import "./signup.css";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@features/auth";
import { SECTION_PATHS } from "@features/navigation";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect") ?? SECTION_PATHS.dashboard;
  const { register } = useSession();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptTerms) {
      setError("You must accept the Terms and Services to continue.");
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    setLoading(true);
    try {
      // The UI exposes roles as "user" | "admin" but the auth API expects
      // the payload role to be one of SignupRole ("individual" | "advisor" | "admin").
      // Map the UI value to the expected shape.
      const payloadRole = role === "user" ? "individual" : ("admin" as const);

      const result = await register({ fullName, email, password, role: payloadRole }, { redirectTo });

      if (result.status === "needs_two_factor") {
        router.push(`${SECTION_PATHS.twoFactor}?redirect=${encodeURIComponent(redirectTo)}`);
        return;
      }

      router.push(redirectTo);
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error during registration");
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
              <Link href="/home/learn">Learn More</Link>
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
        <div className="signup-container">
          <form className="signup-box" onSubmit={handleSubmit}>
            <h2>Create your account</h2>

            {error && <div className="form-error" role="alert">{error}</div>}

            <div className="name-fields">
              <div>
                <label htmlFor="fname">First Name</label>
                <input
                  type="text"
                  id="fname"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  required
                />
              </div>
              <div>
                <label htmlFor="lname">Last Name</label>
                <input
                  type="text"
                  id="lname"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  required
                />
              </div>
            </div>

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
              placeholder="Create a password"
              required
            />

            <label htmlFor="role">Role</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value as "user" | "admin") }>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>

            <div className="checkbox-group">
              <input type="checkbox" id="terms" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
              <label htmlFor="terms">I agree to the Terms and Services</label>
            </div>

            <button type="submit" className="signup-btn" disabled={loading}>
              {loading ? "Creating account..." : "SIGN UP"}
            </button>

            <p className="login-link">
              Already have an account? <Link href="/login">Log in instead</Link>
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
