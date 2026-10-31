import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { errorMessage } from '../lib/api';
import { useAuth } from '../state/auth';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';

const logo = '/images.jpg';

export function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(sessionStorage.getItem('dexa_session_message') || '');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={user.role === 'HRD_ADMIN' ? '/hrd' : '/employee'} replace />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await login(email, password);
      nav(result.role === 'HRD_ADMIN' ? '/hrd' : '/employee', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-intro">
        <img src={logo} alt="Dexa Group" />
        <div>
          <div className="eyebrow">EMPLOYEE PORTAL</div>
          <h1>
            WFH attendance
            <br />
            made simple.
          </h1>
          <p>
            Record your workday, upload proof photos, and view your attendance history in one place.
          </p>
        </div>
        <div className="login-footer">Dexa Group · Employee Attendance</div>
      </div>
      <div className="login-form-wrap">
        <form className="login-card" onSubmit={submit}>
          <div className="mobile-logo">
            <img src={logo} alt="Dexa Group" />
          </div>
          <div className="eyebrow">WELCOME</div>
          <h2>Sign in to your account</h2>
          <p>Use the account provided by HR.</p>
          {error && <Notice>{error}</Notice>}
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="username"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <div className="login-password-field">
            <label htmlFor="login-password">Password</label>
            <div className="password-input">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} />
          </Button>
        </form>
      </div>
    </div>
  );
}
