import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatCard from '../components/StatCard';
import {
  Leaf,
  Utensils,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

const AnalyticsPage = () => {
  const [impact, setImpact] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [impactRes, bizRes] = await Promise.all([
        api.get('/analytics/impact'),
        api.get('/analytics/business').catch(() => ({ data: null }))
      ]);
      setImpact(impactRes.data);
      setAnalytics(bizRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: '#64748b' }}>Computing verified environmental metrics...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Sustainability Impact & Analytics</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Audited metrics quantifying diverted food waste, greenhouse gas mitigation, and community meals provided
        </p>
      </div>

      {/* Verified Sustainability Impact Cards */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        <StatCard
          title="Food Rescued"
          value={impact?.total_redistributed_kg || 0}
          unit="kg"
          icon={Leaf}
        />
        <StatCard
          title="Completed Handoffs"
          value={impact?.completed_donations_count || 0}
          unit="transfers"
          icon={CheckCircle2}
        />
        <StatCard
          title="Estimated Meals Supported"
          value={impact?.estimated_meals_supported || 0}
          unit="meals"
          icon={Utensils}
          trend="up"
          change="~0.5 kg/meal"
        />
        <StatCard
          title="Estimated CO2e Avoided"
          value={impact?.estimated_co2e_savings_kg || 0}
          unit="kg CO2e"
          icon={ShieldCheck}
          trend="up"
          change="2.5 kg CO2/kg"
        />
      </div>

      {/* Methodology Disclaimer Alert */}
      <div className="card" style={{ marginBottom: '1.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <Info size={22} color="#15803d" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>
              Scientific Calculation Methodology & Estimation Notice
            </div>
            <p style={{ color: '#15803d', fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: 1.5 }}>
              {impact?.disclaimer}
            </p>
            <p style={{ color: '#14532d', fontSize: '0.8rem', marginTop: '0.4rem' }}>
              • Duplicate allocation prevention: Strict database transactional integrity enforces non-duplicative accounting.
              Only donations with status "Completed" are incorporated.
            </p>
          </div>
        </div>
      </div>

      {/* Analytical Charts */}
      {analytics && (
        <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Rescued Food by Nutritional Category</h3>
            </div>
            <div style={{ height: 260 }}>
              {analytics.category_distribution?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.category_distribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={50}
                      label
                    >
                      {analytics.category_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Waste Risk Distribution</h3>
            </div>
            <div style={{ height: 260 }}>
              {analytics.waste_risk_distribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.waste_risk_distribution}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Machine Learning vs Rule-Based Architecture Explanation */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          AI/ML Engine Architectural Distinction
        </h3>
        <div className="grid-2" style={{ gap: '1.5rem', fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 8 }}>
            <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
              1. Baseline Waste-Risk Scoring (Rule-Based Heuristic)
            </h4>
            <p>
              Employs transparent, deterministic domain rules assessing shelf-life countdown (40%), stock-to-demand velocity (35%), and historical waste ratios (25%). It provides auditable, explainable risk scores without opaque black-box variance.
            </p>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 8 }}>
            <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
              2. Demand Forecasting Service (Time-Series Machine Learning)
            </h4>
            <p>
              Trained on multi-month daily sales records using Scikit-Learn Ridge Regression with Day-of-Week cyclical encodings, lag features (1-day & 7-day), and rolling trends. Evaluated via train/test split computing MAE, RMSE, and confidence intervals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
