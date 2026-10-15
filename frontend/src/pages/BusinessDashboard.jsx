import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatCard from '../components/StatCard';
import RiskBadge from '../components/RiskBadge';
import {
  Package,
  AlertTriangle,
  AlertOctagon,
  ShoppingBag,
  HeartHandshake,
  TrendingUp,
  Leaf,
  PlusCircle,
  Sparkles,
  ArrowRight
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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#64748b'];

const BusinessDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [highRiskItems, setHighRiskItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, highRiskRes] = await Promise.all([
        api.get('/analytics/business'),
        api.get('/ai/high-risk-items')
      ]);
      setAnalytics(analyticsRes.data);
      setHighRiskItems(highRiskRes.data);
    } catch (err) {
      console.error('Failed to load business dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem auto' }}></div>
        <p style={{ color: '#64748b' }}>Analyzing inventory records & risk predictions...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Business Sustainability Hub</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Real-time inventory expiry monitoring, waste prevention, and redistribution tracking</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/business/inventory/add" className="btn btn-primary">
            <PlusCircle size={18} /> Add Stock
          </Link>
          <Link to="/business/forecasting" className="btn btn-secondary">
            <TrendingUp size={18} /> Forecast Demand
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        <StatCard
          title="Total Stock On-Hand"
          value={analytics?.total_inventory_quantity || 0}
          unit="units"
          icon={Package}
        />
        <StatCard
          title="Approaching Expiry"
          value={analytics?.items_approaching_expiry || 0}
          unit="items"
          icon={AlertTriangle}
          color={analytics?.items_approaching_expiry > 0 ? 'warning' : 'primary'}
        />
        <StatCard
          title="Critical Risk"
          value={analytics?.critical_risk_items_count || 0}
          unit="items"
          icon={AlertOctagon}
          color={analytics?.critical_risk_items_count > 0 ? 'danger' : 'primary'}
        />
        <StatCard
          title="Rescued Food"
          value={analytics?.total_food_redistributed_kg || 0}
          unit="kg"
          icon={Leaf}
          trend="up"
          change="Verified Donations"
        />
      </div>

      {/* High-Risk Alerts Action Table */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} color="#ea580c" />
              <span>Priority Expiry Alerts ({highRiskItems.length})</span>
            </h2>
            <p className="card-subtitle">Items at critical or elevated risk of waste. Immediate marketplace listing or discounting recommended.</p>
          </div>
          <Link to="/business/inventory?expiry_status=Critical" style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>
            View All →
          </Link>
        </div>

        {highRiskItems.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            🎉 Great job! No critical or high-risk inventory items identified.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Food Item</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Days Left</th>
                  <th>Waste Risk Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {highRiskItems.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.food_name}</strong></td>
                    <td>{item.food_category}</td>
                    <td>{item.quantity} {item.unit}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: item.days_until_expiry <= 1 ? '#dc2626' : '#ea580c' }}>
                        {item.days_until_expiry <= 0 ? 'Expired' : `${item.days_until_expiry} day(s)`}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, maxWidth: 60, overflow: 'hidden' }}>
                          <div style={{
                            width: `${item.waste_risk_score}%`, height: '100%',
                            backgroundColor: item.waste_risk_score >= 80 ? '#ef4444' : '#f97316'
                          }}></div>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.waste_risk_score}</span>
                      </div>
                    </td>
                    <td>
                      <RiskBadge status={item.expiry_status} />
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate('/marketplace', { state: { createFromItem: item } })}
                      >
                        <Sparkles size={14} /> List Surplus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
        {/* Category Breakdown */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Stock Volume by Food Category</h3>
              <p className="card-subtitle">Distribution of inventory quantity across categories</p>
            </div>
          </div>
          <div style={{ height: 260 }}>
            {analytics?.category_distribution?.length > 0 ? (
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
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                No category records available
              </div>
            )}
          </div>
        </div>

        {/* Expiry Risk Distribution */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Expiry Risk Status Profile</h3>
              <p className="card-subtitle">Current stock health categorized by shelf-life urgency</p>
            </div>
          </div>
          <div style={{ height: 260 }}>
            {analytics?.expiry_status_distribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.expiry_status_distribution}>
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

      {/* Recent Redistribution Log */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Recent Completed Donations</h3>
            <p className="card-subtitle">Verified food packages handed off to local community organizations</p>
          </div>
          <Link to="/donations" style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>
            Donation Records →
          </Link>
        </div>

        {analytics?.recent_donations?.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            No completed donations yet. Publish surplus listings to begin redirecting meals to NGOs.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Food Item</th>
                  <th>Quantity Rescued</th>
                  <th>Beneficiary NGO</th>
                  <th>Completion Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recent_donations.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.food_name}</strong></td>
                    <td>{d.quantity} {d.unit}</td>
                    <td>{d.ngo_name}</td>
                    <td>{d.date}</td>
                    <td><RiskBadge status="Completed" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessDashboard;
