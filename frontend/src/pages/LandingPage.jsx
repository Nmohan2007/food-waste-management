import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ArrowRight, ShieldCheck, TrendingUp, Sparkles, Truck, HeartHandshake, CheckCircle } from 'lucide-react';

const LandingPage = () => {
  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', color: '#0f172a' }}>
      {/* Navbar */}
      <nav style={{
        maxWidth: 1200, margin: '0 auto', padding: '1.5rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '1.25rem' }}>
          <Leaf size={28} color="#059669" />
          <span>NutriLoop AI</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/login" className="btn btn-secondary">Sign In</Link>
          <Link to="/register" className="btn btn-primary">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        maxWidth: 1100, margin: '4rem auto 3rem auto', padding: '0 2rem', textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          backgroundColor: '#ecfdf5', color: '#059669', padding: '0.4rem 1rem',
          borderRadius: 9999, fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.5rem'
        }}>
          <Sparkles size={16} /> AI-Powered Surplus Identification & Redistribution
        </div>

        <h1 style={{
          fontSize: '3.25rem', fontWeight: 800, lineHeight: 1.15,
          letterSpacing: '-0.02em', color: '#0f172a', marginBottom: '1.5rem'
        }}>
          Prevent Food Waste. Feed Communities. Powered by AI.
        </h1>

        <p style={{
          fontSize: '1.2rem', color: '#475569', maxWidth: 760, margin: '0 auto 2.5rem auto', lineHeight: 1.6
        }}>
          A full-stack sustainability platform connecting food businesses with local NGOs.
          Harnessing machine-learning demand forecasting, real-time expiry risk scoring, and intelligent donation matching.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login" className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }}>
            <span>Explore Demo Platform</span>
            <ArrowRight size={18} />
          </Link>
          <Link to="/register" className="btn btn-secondary" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }}>
            Register Organization
          </Link>
        </div>
      </section>

      {/* Impact Stats Banner */}
      <section style={{ backgroundColor: '#f8fafc', padding: '3rem 2rem', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#059669' }}>100%</div>
            <div style={{ color: '#64748b', fontWeight: 500, marginTop: '0.25rem' }}>Auditable Redistribution</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#059669' }}>2.5 kg</div>
            <div style={{ color: '#64748b', fontWeight: 500, marginTop: '0.25rem' }}>CO2e Saved Per Rescued Kg</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#059669' }}>2 Meals</div>
            <div style={{ color: '#64748b', fontWeight: 500, marginTop: '0.25rem' }}>Supported Per Kg Distributed</div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section style={{ maxWidth: 1100, margin: '5rem auto', padding: '0 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700 }}>Four Pillars of Intelligent Food Rescue</h2>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>End-to-end integration from supermarket inventory to community dinner tables</p>
        </div>

        <div className="grid-2">
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <TrendingUp size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>AI Time-Series Demand Forecasting</h3>
            <p style={{ color: '#64748b', lineHeight: 1.6 }}>
              Ridge regression with rolling trends and day-of-week seasonality predicts daily demand, flags imminent surplus, and recommends optimal reorder quantities.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Transparent Waste Risk Engine</h3>
            <p style={{ color: '#64748b', lineHeight: 1.6 }}>
              Rule-based scoring combines shelf-life countdown, stock-to-demand velocity, and historical loss metrics to categorize items as Low, Medium, High, or Critical risk.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#faf5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Sparkles size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Multi-Criteria NGO Matching</h3>
            <p style={{ color: '#64748b', lineHeight: 1.6 }}>
              Ranks prospective NGOs considering dietary categories, beneficiary capacity, real geographical distance, expiry timeline, and cold-storage compatibility.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Truck size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Pickup Scheduling & Verified Impact</h3>
            <p style={{ color: '#64748b', lineHeight: 1.6 }}>
              Coordinated pickup schedules with vehicle validation. Calculates verified carbon reduction and meals supported strictly upon confirmed handoff.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e2e8f0', padding: '2.5rem 2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
        <p>© 2026 NutriLoop AI — Food Waste Management & Surplus Redistribution Platform.</p>
        <p style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>Designed for Academic Internship & Sustainability Research Demonstration.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
