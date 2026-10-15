import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Package,
  Thermometer,
  Sparkles,
  HeartHandshake,
  Building2,
  Phone,
  AlertCircle
} from 'lucide-react';

const ListingDetailsPage = () => {
  const { id } = useParams();
  const { role } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestedQty, setRequestedQty] = useState('');
  const [notes, setNotes] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/listings/${id}`)
      .then((res) => {
        setListing(res.data);
        setRequestedQty(res.data.available_quantity);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRequestDonation = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (parseFloat(requestedQty) > listing.available_quantity) {
      setError(`Requested quantity cannot exceed available quantity (${listing.available_quantity} ${listing.unit}).`);
      return;
    }

    setRequesting(true);
    try {
      await api.post(`/listings/${listing.id}/request`, {
        listing_id: listing.id,
        requested_quantity: parseFloat(requestedQty),
        notes
      });
      setMsg('Donation request sent! The donor business has been alerted.');
      setTimeout(() => navigate('/donations'), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit request.');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: '#64748b' }}>Loading surplus listing details...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h3>Listing not found</h3>
        <Link to="/marketplace" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link to="/marketplace" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} /> Back to Marketplace
        </Link>
        <span style={{ color: '#94a3b8' }}>/</span>
        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Listing #{listing.id}</span>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <span className="badge badge-safe" style={{ marginBottom: '0.5rem' }}>{listing.food_category}</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{listing.food_name}</h1>
            <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.25rem' }}>
              Donor: <strong>{listing.donor_business_name}</strong>
            </div>
          </div>
          <RiskBadge status={listing.status} />
        </div>

        {/* Highlight Grid */}
        <div className="grid-3" style={{ marginBottom: '1.5rem', marginTop: '1.25rem' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 8 }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Available Batch</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
              {listing.available_quantity} {listing.unit}
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 8 }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Expiry Deadline</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: listing.days_until_expiry <= 1 ? '#dc2626' : '#0f172a', marginTop: '0.25rem' }}>
              {new Date(listing.expiry_date).toLocaleDateString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{listing.days_until_expiry} days remaining</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 8 }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Required Storage</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
              {listing.storage_requirements}
            </div>
          </div>
        </div>

        {/* Location & Times */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#334155', fontSize: '0.9rem' }}>
            <MapPin size={18} color="#059669" />
            <span>Pickup Bay Location: <strong>{listing.pickup_location}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#334155', fontSize: '0.9rem' }}>
            <Clock size={18} color="#0ea5e9" />
            <span>
              Available Window: {new Date(listing.available_from).toLocaleString()} through {new Date(listing.available_until).toLocaleString()}
            </span>
          </div>

          {listing.donor_phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#334155', fontSize: '0.9rem' }}>
              <Phone size={18} color="#8b5cf6" />
              <span>Donor Contact: <strong>{listing.donor_phone}</strong></span>
            </div>
          )}

          {listing.description && (
            <div style={{ marginTop: '0.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 8 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Description</div>
              <p style={{ fontSize: '0.875rem', color: '#334155', marginTop: '0.25rem' }}>{listing.description}</p>
            </div>
          )}
        </div>

        {role === 'business' && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
            <Link to="/business/matching" state={{ listingId: listing.id }} className="btn btn-primary">
              <Sparkles size={18} /> Run AI Matching for this Listing
            </Link>
          </div>
        )}
      </div>

      {/* NGO Request Section */}
      {role === 'ngo' && listing.status === 'Available' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Request Food Donation</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Submit a donation claim to receive this food for your community kitchen or food pantry.
          </p>

          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          {msg && (
            <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem' }}>
              {msg}
            </div>
          )}

          <form onSubmit={handleRequestDonation}>
            <div className="form-group">
              <label className="form-label">Requested Quantity ({listing.unit}) *</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max={listing.available_quantity}
                className="form-control"
                value={requestedQty}
                onChange={(e) => setRequestedQty(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Distribution & Pickup Purpose</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="How this food will be utilized..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={requesting}>
              <HeartHandshake size={18} />
              <span>{requesting ? 'Submitting Claim...' : 'Submit Donation Request'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ListingDetailsPage;
