import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import {
  Truck,
  PlusCircle,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  User,
  X
} from 'lucide-react';

const PickupSchedulingPage = () => {
  const { role, user } = useAuth();
  const location = useLocation();

  const [pickups, setPickups] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Schedule Modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [scheduledTime, setScheduledTime] = useState(
    new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [contactName, setContactName] = useState(user?.full_name || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '+1-555-0199');
  const [vehicleInfo, setVehicleInfo] = useState('Standard Cargo Van');
  const [notes, setNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPickups();
    if (role === 'ngo') {
      fetchApprovedRequests();
    }
  }, []);

  useEffect(() => {
    if (location.state?.scheduleForRequest) {
      setSelectedRequestId(location.state.scheduleForRequest.id);
      setShowScheduleModal(true);
    }
  }, [location.state]);

  const fetchPickups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pickups');
      setPickups(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedRequests = async () => {
    try {
      const res = await api.get('/donations?status_filter=Approved');
      setApprovedRequests(res.data);
      if (!selectedRequestId && res.data.length > 0) {
        setSelectedRequestId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setScheduling(true);

    try {
      await api.post('/pickups', {
        request_id: parseInt(selectedRequestId, 10),
        scheduled_time: new Date(scheduledTime).toISOString(),
        pickup_contact_name: contactName,
        pickup_contact_phone: contactPhone,
        vehicle_info: vehicleInfo,
        notes
      });
      setSuccess('Pickup successfully scheduled! The donor has been notified.');
      setTimeout(() => {
        setShowScheduleModal(false);
        fetchPickups();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to schedule pickup.');
    } finally {
      setScheduling(false);
    }
  };

  const handleUpdateStatus = async (pickupId, newStatus) => {
    try {
      await api.put(`/pickups/${pickupId}`, { status: newStatus });
      fetchPickups();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update pickup status.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Pickup Coordination</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Schedule and verify vehicle pickup transfers for approved surplus food donations
          </p>
        </div>

        {role === 'ngo' && (
          <button onClick={() => setShowScheduleModal(true)} className="btn btn-primary">
            <PlusCircle size={18} /> Schedule New Pickup
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem auto' }}></div>
            <p style={{ color: '#64748b' }}>Refreshing pickup schedules...</p>
          </div>
        ) : pickups.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Truck size={48} color="#94a3b8" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No pickup schedules on record</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Once donation requests are approved, transport pickups will appear here.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pickup ID</th>
                  <th>Food Rescued</th>
                  <th>Donor Business</th>
                  <th>Recipient NGO</th>
                  <th>Pickup Location</th>
                  <th>Scheduled Window</th>
                  <th>Driver Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pickups.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>
                      <strong>{p.food_name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {p.quantity} {p.unit}
                      </div>
                    </td>
                    <td>{p.donor_name}</td>
                    <td>{p.ngo_name}</td>
                    <td style={{ fontSize: '0.85rem', maxWidth: 180 }}>{p.pickup_location}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {new Date(p.scheduled_time).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                        {new Date(p.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div>{p.pickup_contact_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.pickup_contact_phone}</div>
                    </td>
                    <td>
                      <RiskBadge status={p.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {p.status === 'Scheduled' && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleUpdateStatus(p.id, 'Picked Up')}
                          >
                            Mark En Route
                          </button>
                        )}
                        {['Scheduled', 'Picked Up'].includes(p.status) && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleUpdateStatus(p.id, 'Completed')}
                          >
                            Mark Completed
                          </button>
                        )}
                        {p.status === 'Completed' && (
                          <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                            ✓ Verified Delivery
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Pickup Modal */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Schedule Donation Pickup</h2>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem' }}>
                {success}
              </div>
            )}

            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group">
                <label className="form-label">Approved Donation Request *</label>
                <select
                  className="form-control"
                  value={selectedRequestId}
                  onChange={(e) => setSelectedRequestId(e.target.value)}
                  required
                >
                  <option value="">-- Select an approved donation --</option>
                  {approvedRequests.map((req) => (
                    <option key={req.id} value={req.id}>
                      #{req.id}: {req.listing?.food_name} ({req.requested_quantity} {req.listing?.unit}) from {req.listing?.donor_business_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Pickup Date & Time *</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Driver / Contact Person *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Driver Phone Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Info</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Refrigerated Transit Van (Plate: 8ABC12)"
                  value={vehicleInfo}
                  onChange={(e) => setVehicleInfo(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pickup Instructions / Bay Notes</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="e.g. Arriving with insulated coolers."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowScheduleModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={scheduling}>
                  {scheduling ? 'Scheduling...' : 'Confirm Pickup Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickupSchedulingPage;
