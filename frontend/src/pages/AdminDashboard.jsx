import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatCard from '../components/StatCard';
import RiskBadge from '../components/RiskBadge';
import {
  Users,
  Store,
  Building2,
  Package,
  ShoppingBag,
  Leaf,
  ShieldCheck,
  Activity,
  CheckCircle,
  XCircle
} from 'lucide-react';

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, usersRes, listingsRes] = await Promise.all([
        api.get('/analytics/admin'),
        api.get('/admin/users'),
        api.get('/admin/listings')
      ]);
      setAnalytics(analyticsRes.data);
      setUsers(usersRes.data);
      setListings(listingsRes.data);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId) => {
    try {
      const res = await api.put(`/admin/users/${userId}/toggle-status`);
      setActionMsg(res.data.message);
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_active: res.data.is_active } : u)));
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle user status');
    }
  };

  const deleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing from the platform?')) return;
    try {
      await api.delete(`/admin/listings/${listingId}`);
      setListings(listings.filter((l) => l.id !== listingId));
      setActionMsg('Listing removed successfully.');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete listing');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem auto' }}></div>
        <p style={{ color: '#64748b' }}>Loading administrative telemetry & user controls...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Platform Administration</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>System-wide oversight, user account management, and environmental impact telemetry</p>
      </div>

      {actionMsg && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.25rem', fontWeight: 500 }}>
          {actionMsg}
        </div>
      )}

      {/* Admin Stats Grid */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        <StatCard title="Registered Businesses" value={analytics?.total_businesses || 0} icon={Store} />
        <StatCard title="Registered NGOs" value={analytics?.total_ngos || 0} icon={Building2} />
        <StatCard title="Inventory Records" value={analytics?.total_inventory_records || 0} icon={Package} />
        <StatCard title="Verified Rescued" value={analytics?.total_food_redistributed_kg || 0} unit="kg" icon={Leaf} />
      </div>

      <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
        <StatCard title="Platform CO2e Avoided" value={analytics?.total_co2_savings_kg || 0} unit="kg CO2e" icon={ShieldCheck} />
        <StatCard title="Total Meals Rescued" value={analytics?.total_meals_supported || 0} unit="meals" icon={Users} />
      </div>

      {/* User Management Section */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">User Accounts Directory ({users.length})</h2>
            <p className="card-subtitle">Manage registered businesses, NGOs, and platform administrator accounts</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User / Organization</th>
                <th>Role</th>
                <th>Email Address</th>
                <th>Phone</th>
                <th>Account Status</th>
                <th>Registered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.full_name}</strong>
                    <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
                      {u.business_profile?.business_name || u.ngo_profile?.organization_name || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: u.role === 'admin' ? '#f3e8ff' : u.role === 'business' ? '#ecfdf5' : '#e0f2fe',
                      color: u.role === 'admin' ? '#6b21a8' : u.role === 'business' ? '#065f46' : '#0369a1'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.phone || 'N/A'}</td>
                  <td>
                    {u.is_active ? (
                      <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, fontSize: '0.85rem' }}>
                        <CheckCircle size={14} /> Active
                      </span>
                    ) : (
                      <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, fontSize: '0.85rem' }}>
                        <XCircle size={14} /> Suspended
                      </span>
                    )}
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.is_active ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => toggleUserStatus(u.id)}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform Activity Feed */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Recent System Activity</h2>
            <p className="card-subtitle">Real-time audit records of marketplace listings and redistribution</p>
          </div>
        </div>

        {analytics?.platform_activity?.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            No platform activity logged yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {analytics.platform_activity.map((a, idx) => (
              <div key={idx} style={{ padding: '0.85rem 1rem', border: '1px solid #f1f5f9', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{a.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Actor: {a.actor} • Status: {a.status}
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{a.timestamp}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
