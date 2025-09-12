import React from 'react';
import zxcvbn from 'zxcvbn';

function PasswordStrength({ password }) {
  const result = zxcvbn(password);
  const strength = result.score; // 0-4
  const percent = (strength / 4) * 100;
  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

  return (
    <div className="password-strength">
      <div className="password-strength-bar">
        <div
          className={`strength-${strength}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {password && (
        <p className="password-strength-text">{labels[strength]}</p>
      )}
    </div>
  );
}

export default PasswordStrength;
