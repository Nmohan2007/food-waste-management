import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import {
  Sparkles,
  Building2,
  MapPin,
  Users,
  CheckCircle2,
  Info,
  Layers,
  ChevronRight
} from 'lucide-react';

const DonationMatchingPage = () => {
  const location = useLocation();
  const [myListings, setMyListings] = useState([]);
  const [selectedListingId, setSelectedListingId] = useState(location.state?.listingId || '');
  const [matchResult, setMatchResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch business listings
    api.get('/listings')
      .then((res) => {
        setMyListings(res.data);
        if (!selectedListingId && res.data.length > 0) {
          setSelectedListingId(res.data[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedListingId) {
      runMatching(selectedListingId);
    }
  }, [selectedListingId]);

  const runMatching = async (listingId) => {
    try {
      setLoading(true);
      const res = await api.get(`/matching/recommendations?listing_id=${listingId}`);
      setMatchResult(res.data);
    } catch (err) {
      console.error('Matching engine error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>AI Donation Matching Engine</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Multi-criteria algorithmic matchmaking ranking the most suitable recipient NGOs for surplus batches
        </p>
      </div>

      {/* Listing Selector Card */}
      <div className="card" style={{ marginBottom: '1.75rem', padding: '1.5rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="#059669" />
            <span>Select Active Surplus Batch to Match</span>
          </label>
          <select
            className="form-control"
            value={selectedListingId}
            onChange={(e) => setSelectedListingId(e.target.value)}
          >
            {myListings.map((l) => (
              <option key={l.id} value={l.id}>
                #{l.id} — {l.food_name} ({l.available_quantity} {l.unit}) • {l.food_category} • Status: {l.status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Matching Results */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem auto' }}></div>
          <p style={{ color: '#64748b' }}>Executing multi-criteria compatibility matrix...</p>
        </div>
      ) : matchResult ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              Ranked Recipient Recommendations ({matchResult.recommendations?.length || 0})
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Batch: <strong>{matchResult.food_name}</strong> ({matchResult.quantity} {matchResult.unit})
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {matchResult.recommendations?.map((rec, idx) => (
              <div
                key={rec.ngo_id}
                className="card"
                style={{
                  borderLeft: `5px solid ${idx === 0 ? '#10b981' : idx === 1 ? '#3b82f6' : '#cbd5e1'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                        Rank #{idx + 1}
                      </span>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{rec.ngo_name}</h3>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                      <span>Type: <strong>{rec.organization_type}</strong></span>
                      <span>City: <strong>{rec.city}</strong></span>
                      {rec.distance_km !== null && (
                        <span>Distance: <strong>{rec.distance_km} km</strong></span>
                      )}
                      <span>Capacity: <strong>{rec.beneficiary_count} beneficiaries</strong></span>
                    </div>
                  </div>

                  {/* Compatibility Score Circle */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '1.85rem', fontWeight: 800,
                      color: rec.compatibility_score >= 80 ? '#059669' : rec.compatibility_score >= 60 ? '#0284c7' : '#d97706'
                    }}>
                      {rec.compatibility_score}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                      Compatibility
                    </div>
                  </div>
                </div>

                {/* Score Breakdown Bars */}
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 8, marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.775rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.6rem' }}>
                    Score Component Weights
                  </div>
                  <div className="grid-2" style={{ gap: '0.75rem', fontSize: '0.825rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span>Category Compatibility (30%)</span>
                        <strong>{rec.breakdown.category_match}%</strong>
                      </div>
                      <div style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 2 }}>
                        <div style={{ width: `${rec.breakdown.category_match}%`, height: '100%', backgroundColor: '#059669' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span>Quantity Scale (25%)</span>
                        <strong>{rec.breakdown.quantity_match}%</strong>
                      </div>
                      <div style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 2 }}>
                        <div style={{ width: `${rec.breakdown.quantity_match}%`, height: '100%', backgroundColor: '#0284c7' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span>Location Proximity (20%)</span>
                        <strong>{rec.breakdown.location_proximity}%</strong>
                      </div>
                      <div style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 2 }}>
                        <div style={{ width: `${rec.breakdown.location_proximity}%`, height: '100%', backgroundColor: '#8b5cf6' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span>Cold Chain & Storage (10%)</span>
                        <strong>{rec.breakdown.storage_compatibility}%</strong>
                      </div>
                      <div style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 2 }}>
                        <div style={{ width: `${rec.breakdown.storage_compatibility}%`, height: '100%', backgroundColor: '#f59e0b' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Algorithmic Reason */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#166534', backgroundColor: '#f0fdf4', padding: '0.65rem 0.85rem', borderRadius: 6 }}>
                  <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                  <span><strong>Matching Rationale:</strong> {rec.recommendation_reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DonationMatchingPage;
