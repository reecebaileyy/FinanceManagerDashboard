import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Invalid email address';
    }
    if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      // TODO: integrate with backend login API
      console.log('Logging in', { email, password });
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {errors.email && <p className="error">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {errors.password && <p className="error">{errors.password}</p>}
        </div>
        <button type="submit">Login</button>
      </form>
      <p>
        Need an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}

export default Login;
