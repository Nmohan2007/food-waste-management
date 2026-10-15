import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { RotateCcw, AlertCircle, CheckCircle, Clock, ShoppingCart } from 'lucide-react';

const ReorderRecommendationsPage = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ai/reorder-recommendations')
      .then((res) => setRecommendations(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Optimal Reorder & Replenishment</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          AI-driven inventory replenishment calculating safety stock, lead-time velocity, and surplus avoidance
        </p>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem auto' }}></div>
            <p style={{ color: '#64748b' }}>Evaluating replenishment thresholds...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            No inventory items recorded to generate reorder advice.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Food Product</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Est. Daily Demand</th>
                  <th>Days Left</th>
                  <th>Recommended Reorder</th>
                  <th>Replenishment Status</th>
                  <th>Operational Rationale</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec) => {
                  const isFreeze = rec.urgency.includes('Surplus') || rec.urgency.includes('Freeze');
                  const isUrgent = rec.urgency.includes('Urgent');

                  return (
                    <tr key={rec.inventory_item_id}>
                      <td><strong>{rec.food_name}</strong></td>
                      <td>{rec.food_category}</td>
                      <td>{rec.current_stock} {rec.unit}</td>
                      <td>{rec.predicted_daily_demand} {rec.unit}/day</td>
                      <td>{rec.days_until_expiry} days</td>
                      <td>
                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: isFreeze ? '#dc2626' : '#059669' }}>
                          {rec.recommended_reorder} {rec.unit}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{
                          backgroundColor: isFreeze ? '#fee2e2' : isUrgent ? '#ffedd5' : '#ecfdf5',
                          color: isFreeze ? '#991b1b' : isUrgent ? '#c2410c' : '#065f46'
                        }}>
                          {rec.urgency}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.825rem', color: '#475569', maxWidth: 280 }}>
                        {rec.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReorderRecommendationsPage;
