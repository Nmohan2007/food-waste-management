import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#f8fafc', padding: '2rem', textAlign: 'center'
    }}>
      <div style={{ maxWidth: 450 }}>
        <div style={{
          fontSize: '5rem', fontWeight: 900, color: '#059669', lineHeight: 1, marginBottom: '1rem'
        }}>
          404
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
          Page Not Found
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
          The requested page route does not exist or may have been relocated.
        </p>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={18} /> Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
