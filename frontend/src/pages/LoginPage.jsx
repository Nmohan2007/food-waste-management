import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Leaf, LogIn, Store, Building2, ShieldCheck, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role === 'business') navigate('/business/dashboard');
      else if (user.role === 'ngo') navigate('/ngo/dashboard');
      else if (user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setSubmitting(true);
    login(demoEmail, demoPassword)
      .then((user) => {
        if (user.role === 'business') navigate('/business/dashboard');
        else if (user.role === 'ngo') navigate('/ngo/dashboard');
        else if (user.role === 'admin') navigate('/admin/dashboard');
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Quick demo login failed.');
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#f8fafc', padding: '2rem 1rem'
    }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
            fontWeight: 800, fontSize: '1.5rem', color: '#0f172a'
          }}>
            <Leaf size={32} color="#059669" />
            <span>NutriLoop AI</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Sign in to access your sustainability portal
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {error && (
            <div style={{
              backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem',
              borderRadius: 8, fontSize: '0.85rem', display: 'flex', alignItems: 'center',
              gap: '0.5rem', marginBottom: '1.25rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="name@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={submitting}
            >
              <LogIn size={18} />
              <span>{submitting ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Quick Demo Logins for Testing & Academic Evaluation */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <div style={{
              fontSize: '0.775rem', fontWeight: 700, textTransform: 'uppercase',
              color: '#64748b', textAlign: 'center', marginBottom: '0.85rem', letterSpacing: '0.04em'
            }}>
              Quick Demo Logins (Pre-configured)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem' }}
                onClick={() => handleQuickLogin('business@freshmart.com', 'Password123!')}
              >
                <Store size={16} color="#059669" />
                <span style={{ textAlign: 'left', flex: 1 }}>
                  <strong>FreshMart Supermarket</strong> (Business Role)
                </span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem' }}
                onClick={() => handleQuickLogin('contact@communitypantry.org', 'Password123!')}
              >
                <Building2 size={16} color="#0ea5e9" />
                <span style={{ textAlign: 'left', flex: 1 }}>
                  <strong>Community Food Bank</strong> (NGO Role)
                </span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem' }}
                onClick={() => handleQuickLogin('admin@foodwaste.org', 'AdminPass123!')}
              >
                <ShieldCheck size={16} color="#8b5cf6" />
                <span style={{ textAlign: 'left', flex: 1 }}>
                  <strong>Platform Administrator</strong> (Admin Role)
                </span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
          Don't have an account yet?{' '}
          <Link to="/register" style={{ color: '#059669', fontWeight: 600 }}>
            Register Organization
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
