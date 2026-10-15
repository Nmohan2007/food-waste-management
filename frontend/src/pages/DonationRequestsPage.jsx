import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { HeartHandshake, CheckCircle2, XCircle, Truck, Clock, AlertCircle } from 'lucide-react';

const DonationRequestsPage = () => {
  const { role } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url = statusFilter ? `/donations?status_filter=${statusFilter}` : '/donations';
      const res = await api.get(url);
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/donations/${id}/approve`);
      setMsg('Donation approved! The NGO has been notified to schedule pickup.');
      fetchRequests();
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to decline this request?')) return;
    try {
      await api.post(`/donations/${id}/reject`);
      setMsg('Donation request declined. Listing returned to available marketplace.');
      fetchRequests();
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject request');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this pending donation request?')) return;
    try {
      await api.post(`/donations/${id}/cancel`);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel request');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Donation Requests</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            {role === 'business'
              ? 'Review and approve surplus food allocation claims from recipient organizations'
              : 'Track the approval status of your community donation requests'}
          </p>
        </div>

        <div>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 170 }}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {msg && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.25rem', fontWeight: 500 }}>
          {msg}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem auto' }}></div>
            <p style={{ color: '#64748b' }}>Loading donation records...</p>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <HeartHandshake size={48} color="#94a3b8" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No donation requests found</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {role === 'ngo' ? 'Browse the surplus marketplace to place food donation requests.' : 'New requests from NGOs will appear here.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Food Item</th>
                  <th>{role === 'business' ? 'Recipient NGO' : 'Donor Business'}</th>
                  <th>Requested Quantity</th>
                  <th>Request Date</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>
                      <strong>{r.listing?.food_name || 'Food Batch'}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.listing?.food_category}</div>
                    </td>
                    <td>
                      {role === 'business' ? (
                        <>
                          <strong>{r.ngo_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.ngo_phone}</div>
                        </>
                      ) : (
                        <>
                          <strong>{r.listing?.donor_business_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.listing?.donor_address}</div>
                        </>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{r.requested_quantity}</span> {r.listing?.unit || 'kg'}
                    </td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <RiskBadge status={r.status} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#475569', maxWidth: 220 }}>
                      {r.notes || '—'}
                    </td>
                    <td>
                      {role === 'business' && r.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleApprove(r.id)}
                            title="Approve Donation"
                          >
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleReject(r.id)}
                            title="Decline"
                          >
                            <XCircle size={14} /> Decline
                          </button>
                        </div>
                      )}

                      {role === 'ngo' && r.status === 'Approved' && (
                        <Link
                          to="/pickups"
                          state={{ scheduleForRequest: r }}
                          className="btn btn-sm btn-primary"
                        >
                          <Truck size={14} /> Schedule Pickup
                        </Link>
                      )}

                      {role === 'ngo' && r.status === 'Pending' && (
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ color: '#dc2626' }}
                          onClick={() => handleCancel(r.id)}
                        >
                          Cancel
                        </button>
                      )}

                      {r.status === 'Completed' && (
                        <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                          ✓ Completed
                        </span>
                      )}
                    </td>
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

export default DonationRequestsPage;
