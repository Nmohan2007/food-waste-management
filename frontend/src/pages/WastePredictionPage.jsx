import React, { useState, useEffect } from 'react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { AlertOctagon, Sparkles, HelpCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

const CATEGORIES = ['Produce', 'Dairy', 'Bakery', 'Meat', 'Prepared Meals', 'Canned/Dry', 'Beverages', 'Seafood'];

const WastePredictionPage = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');

  // Form parameters
  const [category, setCategory] = useState('Produce');
  const [currentStock, setCurrentStock] = useState(45);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState(2);
  const [dailySales, setDailySales] = useState(6);
  const [wasteRatio, setWasteRatio] = useState(0.18);
  const [perishability, setPerishability] = useState('High');

  const [scoreResult, setScoreResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    // Fetch business inventory items for quick selection
    api.get('/inventory')
      .then((res) => setInventoryItems(res.data))
      .catch((err) => console.error(err));

    // Run initial calculation
    calculateScore();
  }, []);

  const handleItemSelect = (e) => {
    const id = e.target.value;
    setSelectedItemId(id);
    if (!id) return;

    const item = inventoryItems.find((i) => i.id === parseInt(id, 10));
    if (item) {
      setCategory(item.food_category);
      setCurrentStock(item.quantity);
      setDaysUntilExpiry(item.days_until_expiry);
      setPerishability(
        ['Produce', 'Dairy', 'Meat', 'Seafood'].includes(item.food_category) ? 'High' : 'Medium'
      );
    }
  };

  const calculateScore = async (e) => {
    if (e) e.preventDefault();
    setCalculating(true);
    try {
      const payload = {
        food_category: category,
        current_stock: parseFloat(currentStock),
        days_until_expiry: parseInt(daysUntilExpiry, 10),
        average_daily_sales: parseFloat(dailySales),
        historical_waste_ratio: parseFloat(wasteRatio),
        perishability
      };
      if (selectedItemId) {
        payload.inventory_item_id = parseInt(selectedItemId, 10);
      }

      const res = await api.post('/ai/waste-risk', payload);
      setScoreResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>AI Waste-Risk Prediction Engine</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Configurable multi-factor risk scoring evaluating shelf-life velocity, anticipated demand, and loss probability
        </p>
      </div>

      <div className="grid-2">
        {/* Left: Interactive Input Panel */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Risk Scoring Simulator</h2>
              <p className="card-subtitle">Select an inventory item or configure custom parameters</p>
            </div>
          </div>

          <form onSubmit={calculateScore}>
            <div className="form-group">
              <label className="form-label">Preload from Business Inventory</label>
              <select className="form-control" value={selectedItemId} onChange={handleItemSelect}>
                <option value="">-- Or enter custom values below --</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.food_name} ({item.quantity} {item.unit}) - Expires in {item.days_until_expiry}d
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Food Category</label>
                <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Perishability Level</label>
                <select className="form-control" value={perishability} onChange={(e) => setPerishability(e.target.value)}>
                  <option value="High">High (Produce, Meat, Dairy)</option>
                  <option value="Medium">Medium (Prepared, Bread)</option>
                  <option value="Low">Low (Canned, Dry, Beverages)</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Current Stock Quantity</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  className="form-control"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Days Until Expiration</label>
                <input
                  type="number"
                  className="form-control"
                  value={daysUntilExpiry}
                  onChange={(e) => setDaysUntilExpiry(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Estimated Daily Sales (Velocity)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  className="form-control"
                  value={dailySales}
                  onChange={(e) => setDailySales(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Historical Category Waste Ratio</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  className="form-control"
                  value={wasteRatio}
                  onChange={(e) => setWasteRatio(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>e.g. 0.15 = 15% historical loss rate</span>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={calculating}>
              <Sparkles size={18} />
              <span>{calculating ? 'Evaluating...' : 'Compute Waste Risk Score'}</span>
            </button>
          </form>
        </div>

        {/* Right: Results & Factor Breakdown */}
        <div>
          {scoreResult && (
            <div className="card" style={{ height: '100%' }}>
              <div className="card-header">
                <div>
                  <h2 className="card-title">Waste-Risk Assessment</h2>
                  <p className="card-subtitle">Transparent factor evaluation and decision matrix</p>
                </div>
                <RiskBadge status={scoreResult.risk_category} />
              </div>

              {/* Big Score Display */}
              <div style={{
                textAlign: 'center', padding: '1.5rem', backgroundColor: '#f8fafc',
                borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Composite Risk Score
                </div>
                <div style={{
                  fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1,
                  color: scoreResult.risk_score >= 80 ? '#dc2626' : scoreResult.risk_score >= 60 ? '#ea580c' : scoreResult.risk_score >= 30 ? '#ca8a04' : '#059669',
                  margin: '0.5rem 0'
                }}>
                  {scoreResult.risk_score}
                  <span style={{ fontSize: '1.5rem', color: '#94a3b8', fontWeight: 500 }}>/100</span>
                </div>
                <div style={{ fontWeight: 600, color: '#334155' }}>
                  {scoreResult.risk_category}
                </div>
              </div>

              {/* Weighted Breakdown Components */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.75rem' }}>
                  Component Factor Breakdown
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span>1. Expiry Window Risk (Weight: 40%)</span>
                      <strong>{scoreResult.expiry_risk}/100</strong>
                    </div>
                    <div style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${scoreResult.expiry_risk}%`, height: '100%', backgroundColor: '#ef4444' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span>2. Stock Over-Supply Risk (Weight: 35%)</span>
                      <strong>{scoreResult.stock_risk}/100</strong>
                    </div>
                    <div style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${scoreResult.stock_risk}%`, height: '100%', backgroundColor: '#f97316' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span>3. Historical Waste Ratio (Weight: 25%)</span>
                      <strong>{scoreResult.waste_history_risk}/100</strong>
                    </div>
                    <div style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${scoreResult.waste_history_risk}%`, height: '100%', backgroundColor: '#eab308' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explanation & Actionable Recommendation */}
              <div style={{
                padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: 8,
                border: '1px solid #bbf7d0', marginBottom: '1rem'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#166534', marginBottom: '0.35rem' }}>
                  System Analysis:
                </div>
                <p style={{ fontSize: '0.85rem', color: '#15803d', lineHeight: 1.5 }}>
                  {scoreResult.explanation}
                </p>
              </div>

              <div style={{
                padding: '1rem', backgroundColor: '#eff6ff', borderRadius: 8,
                border: '1px solid #bfdbfe'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.35rem' }}>
                  Operational Recommendation:
                </div>
                <p style={{ fontSize: '0.85rem', color: '#1d4ed8', lineHeight: 1.5 }}>
                  {scoreResult.recommendation}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WastePredictionPage;
