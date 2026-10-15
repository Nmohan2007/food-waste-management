import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import {
  ShoppingBag,
  PlusCircle,
  Search,
  Filter,
  MapPin,
  Clock,
  Sparkles,
  HeartHandshake,
  AlertCircle,
  X,
  Thermometer
} from 'lucide-react';

const CATEGORIES = ['All Categories', 'Produce', 'Dairy', 'Bakery', 'Meat', 'Prepared Meals', 'Canned/Dry', 'Beverages'];

const MarketplacePage = () => {
  const { role, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  // Request Donation Modal (NGO)
  const [selectedListing, setSelectedListing] = useState(null);
  const [requestedQty, setRequestedQty] = useState('');
  const [notes, setNotes] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  // Create Listing Modal (Business)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFoodName, setNewFoodName] = useState('');
  const [newCategory, setNewCategory] = useState('Produce');
  const [newQty, setNewQty] = useState(20);
  const [newUnit, setNewUnit] = useState('kg');
  const [newExpiry, setNewExpiry] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newLocation, setNewLocation] = useState(
    user?.business_profile?.address ? `${user.business_profile.address}, ${user.business_profile.city}` : 'Supermarket Back Loading Bay'
  );
  const [newUntil, setNewUntil] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newStorage, setNewStorage] = useState('Refrigerated');
  const [newDesc, setNewDesc] = useState('');
  const [linkedItemId, setLinkedItemId] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Check if navigated from Inventory with an item to list
    if (location.state?.createFromItem) {
      const it = location.state.createFromItem;
      setNewFoodName(it.food_name);
      setNewCategory(it.food_category);
      setNewQty(it.quantity);
      setNewUnit(it.unit);
      setNewExpiry(new Date(it.expiry_date).toISOString().split('T')[0]);
      setNewStorage(it.storage_type);
      setLinkedItemId(it.id);
      setShowCreateModal(true);
    }
    fetchListings();
  }, [location.state]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/listings');
      setListings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/listings', {
        food_name: newFoodName,
        food_category: newCategory,
        available_quantity: parseFloat(newQty),
        unit: newUnit,
        expiry_date: new Date(newExpiry).toISOString(),
        pickup_location: newLocation,
        available_from: new Date().toISOString(),
        available_until: new Date(newUntil).toISOString(),
        storage_requirements: newStorage,
        description: newDesc,
        inventory_item_id: linkedItemId
      });
      setShowCreateModal(false);
      fetchListings();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create listing');
    } finally {
      setCreating(false);
    }
  };

  const handleRequestDonation = async (e) => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');

    if (parseFloat(requestedQty) > selectedListing.available_quantity) {
      setRequestError(`Cannot request more than available quantity (${selectedListing.available_quantity} ${selectedListing.unit}).`);
      return;
    }

    setRequesting(true);
    try {
      await api.post(`/listings/${selectedListing.id}/request`, {
        listing_id: selectedListing.id,
        requested_quantity: parseFloat(requestedQty),
        notes
      });
      setRequestSuccess('Donation request sent successfully! Donor notified.');
      setTimeout(() => {
        setSelectedListing(null);
        fetchListings();
      }, 1500);
    } catch (err) {
      setRequestError(err.response?.data?.detail || 'Failed to submit donation request.');
    } finally {
      setRequesting(false);
    }
  };

  const filteredListings = listings.filter((l) => {
    const matchesSearch = l.food_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.donor_business_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All Categories' || l.food_category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Surplus Food Marketplace</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Browse and rescue high-quality surplus food from verified commercial donors
          </p>
        </div>

        {role === 'business' && (
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <PlusCircle size={18} /> Publish Surplus Listing
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search surplus by food name or donor business..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ width: 200 }}>
            <select
              className="form-control"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem auto' }}></div>
          <p style={{ color: '#64748b' }}>Loading surplus packages...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <ShoppingBag size={48} color="#94a3b8" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No surplus listings found</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Check back shortly or refine your search keywords.
          </p>
        </div>
      ) : (
        <div className="grid-3">
          {filteredListings.map((listing) => (
            <div key={listing.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span className="badge badge-safe">{listing.food_category}</span>
                <RiskBadge status={listing.status} />
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                {listing.food_name}
              </h3>

              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
                Donor: <strong>{listing.donor_business_name}</strong>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#64748b' }}>Available Batch:</span>
                  <strong>{listing.available_quantity} {listing.unit}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#64748b' }}>Expiry:</span>
                  <span style={{ fontWeight: 600, color: listing.days_until_expiry <= 1 ? '#dc2626' : '#0f172a' }}>
                    {new Date(listing.expiry_date).toLocaleDateString()} ({listing.days_until_expiry}d left)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Storage:</span>
                  <span>{listing.storage_requirements}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={14} color="#64748b" />
                  <span>{listing.pickup_location}</span>
                </div>
                {listing.description && (
                  <p style={{ marginTop: '0.35rem', fontStyle: 'italic' }}>"{listing.description}"</p>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                {role === 'ngo' && listing.status === 'Available' && (
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setSelectedListing(listing);
                      setRequestedQty(listing.available_quantity);
                    }}
                  >
                    <HeartHandshake size={16} /> Request Donation
                  </button>
                )}
                {role === 'business' && (
                  <Link
                    to="/business/matching"
                    state={{ listingId: listing.id }}
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                  >
                    <Sparkles size={16} /> Match NGOs
                  </Link>
                )}
                <Link to={`/marketplace/${listing.id}`} className="btn btn-secondary btn-sm">
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Donation Modal (for NGO) */}
      {selectedListing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Request Food Donation</h2>
              <button onClick={() => setSelectedListing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Requesting from <strong>{selectedListing.donor_business_name}</strong> for: <strong>{selectedListing.food_name}</strong>
            </p>

            {requestError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem' }}>
                {requestError}
              </div>
            )}
            {requestSuccess && (
              <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem' }}>
                {requestSuccess}
              </div>
            )}

            <form onSubmit={handleRequestDonation}>
              <div className="form-group">
                <label className="form-label">
                  Requested Quantity ({selectedListing.unit}) * (Available: {selectedListing.available_quantity})
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max={selectedListing.available_quantity}
                  className="form-control"
                  value={requestedQty}
                  onChange={(e) => setRequestedQty(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Beneficiary / Distribution Notes</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="e.g. Preparing 80 hot dinners tonight for families in need."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setSelectedListing(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={requesting}>
                  {requesting ? 'Submitting Request...' : 'Confirm Donation Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Listing Modal (for Business) */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Publish Surplus Food Listing</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateListing}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Food Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newFoodName}
                    onChange={(e) => setNewFoodName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-control"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    {CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Available Quantity *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="form-control"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Measurement Unit *</label>
                  <select className="form-control" value={newUnit} onChange={(e) => setNewUnit(e.target.value)}>
                    <option value="kg">kg</option>
                    <option value="items">items</option>
                    <option value="boxes">boxes</option>
                    <option value="liters">liters</option>
                    <option value="meals">meals</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Expiration Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Available Until Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newUntil}
                    onChange={(e) => setNewUntil(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Pickup Location & Bay *</label>
                <input
                  type="text"
                  className="form-control"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Storage Conditions Required</label>
                <select className="form-control" value={newStorage} onChange={(e) => setNewStorage(e.target.value)}>
                  <option value="Room Temp">Room Temp / Dry Storage</option>
                  <option value="Refrigerated">Refrigerated (Cold Chained)</option>
                  <option value="Frozen">Frozen</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Pickup Notes</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="e.g. Crisp organic produce needing pickup by 6 PM today."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Publishing...' : 'Publish Surplus Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;
