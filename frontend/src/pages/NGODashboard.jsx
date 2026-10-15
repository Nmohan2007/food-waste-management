import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatCard from '../components/StatCard';
import RiskBadge from '../components/RiskBadge';
import {
  ShoppingBag,
  HeartHandshake,
  Truck,
  Utensils,
  Leaf,
  Users,
  Clock,
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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

const NGODashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [availableListings, setAvailableListings] = useState([]);
  const [upcomingPickups, setUpcomingPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, listingsRes, pickupsRes] = await Promise.all([
        api.get('/analytics/ngo'),
        api.get('/listings?only_available=true'),
        api.get('/pickups?status_filter=Scheduled')
      ]);
      setAnalytics(analyticsRes.data);
      setAvailableListings(listingsRes.data);
      setUpcomingPickups(pickupsRes.data);
    } catch (err) {
      console.error('Failed to load NGO dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem auto' }}></div>
        <p style={{ color: '#64748b' }}>Loading community donation feeds...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Community NGO Portal</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Locate surplus food donations, coordinate scheduled pickups, and track meals delivered</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/marketplace" className="btn btn-primary">
            <ShoppingBag size={18} /> Browse Surplus Market
          </Link>
          <Link to="/pickups" className="btn btn-secondary">
            <Truck size={18} /> Manage Pickups
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        <StatCard
          title="Available Surplus"
          value={analytics?.available_listings_count || availableListings.length}
          unit="listings"
          icon={ShoppingBag}
        />
        <StatCard
          title="Upcoming Pickups"
          value={analytics?.upcoming_pickups_count || 0}
          unit="active"
          icon={Truck}
          color="warning"
        />
        <StatCard
          title="Rescued Food"
          value={analytics?.total_food_received_kg || 0}
          unit="kg"
          icon={Leaf}
        />
        <StatCard
          title="Meals Supported"
          value={analytics?.estimated_meals_served || 0}
          unit="meals"
          icon={Utensils}
          trend="up"
          change="Beneficiary impact"
        />
      </div>

      {/* Live Available Food Market Highlights */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Available Food Ready for Rescue ({availableListings.length})</h2>
            <p className="card-subtitle">Local businesses offering verified surplus batches available for donation request</p>
          </div>
          <Link to="/marketplace" style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>
            Marketplace View →
          </Link>
        </div>

        {availableListings.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            No surplus listings are currently published in your area. Check back shortly.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Food Name</th>
                  <th>Category</th>
                  <th>Available Quantity</th>
                  <th>Donor Business</th>
                  <th>Days Left</th>
                  <th>Storage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {availableListings.slice(0, 5).map((l) => (
                  <tr key={l.id}>
                    <td><strong>{l.food_name}</strong></td>
                    <td>{l.food_category}</td>
                    <td>{l.available_quantity} {l.unit}</td>
                    <td>{l.donor_business_name}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: l.days_until_expiry <= 1 ? '#dc2626' : '#ea580c' }}>
                        {l.days_until_expiry <= 0 ? 'Expires today' : `${l.days_until_expiry} day(s)`}
                      </span>
                    </td>
                    <td>{l.storage_requirements}</td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/marketplace/${l.id}`)}
                      >
                        Request Food
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid: Upcoming Pickups & Category Breakdown */}
      <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
        {/* Upcoming Pickups */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Scheduled Pickups ({upcomingPickups.length})</h3>
              <p className="card-subtitle">Upcoming coordination times and donor pickup bays</p>
            </div>
            <Link to="/pickups" style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>
              Calendar View →
            </Link>
          </div>

          {upcomingPickups.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
              No pickups scheduled. Once a donation request is approved, schedule your vehicle pickup here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcomingPickups.map((p) => (
                <div key={p.id} style={{
                  padding: '1rem', border: '1px solid #e2e8f0', borderRadius: 8,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.food_name} ({p.quantity} {p.unit})</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                      Donor: <strong>{p.donor_name}</strong> • Bay: {p.pickup_location}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, marginTop: '0.2rem' }}>
                      Time: {new Date(p.scheduled_time).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <Link to="/pickups" className="btn btn-secondary btn-sm">
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Categories Rescued PieChart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Food Categories Received</h3>
              <p className="card-subtitle">Nutritional rescue diversity across community shipments</p>
            </div>
          </div>
          <div style={{ height: 260 }}>
            {analytics?.category_breakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.category_breakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={50}
                    label
                  >
                    {analytics.category_breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Complete donation pickups to generate category distribution.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NGODashboard;
