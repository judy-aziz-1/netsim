import { useState } from 'react';
import { loginUser, registerUser } from '../api/client';
import { useAuthStore } from '../store/authStore';

function AuthForm() {
  const setToken = useAuthStore((state) => state.setToken);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = () => {
    setError(null);
    loginUser(email, password)
      .then((data) => {
        if (data.token) {
          setToken(data.token);
        } else {
          setError(data.message || 'Login failed');
        }
      })
      .catch(() => setError('Login failed'));
  };

  const handleRegister = () => {
    setError(null);
    registerUser(name, email, password)
      .then((data) => {
        if (data.token) {
          setToken(data.token);
        } else {
          setError(data.message || 'Registration failed');
        }
      })
      .catch(() => setError('Registration failed'));
  };

  return (
    <div className="section">
      <h2>Login / Register</h2>

      {error && <p className="error-text">{error}</p>}

      <div className="field-row">
        <input
          type="text"
          placeholder="Name (for register)"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="field-row">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="field-row">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <div className="field-row">
        <button className="btn" onClick={handleLogin}>Login</button>
        <button className="btn" onClick={handleRegister}>Register</button>
      </div>
    </div>
  );
}

export default AuthForm;
