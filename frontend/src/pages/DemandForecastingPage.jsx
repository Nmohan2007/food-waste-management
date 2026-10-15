import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatCard from '../components/StatCard';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BarChart2,
  CheckCircle2,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';

const CATEGORIES = ['Produce', 'Dairy', 'Bakery', 'Meat', 'Prepared Meals', 'Canned/Dry'];

const DemandForecastingPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('Produce');
  const [forecastDays, setForecastDays] = useState(14);
  const [leadTimeDays, setLeadTimeDays] = useState(2);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecast();
  }, [selectedCategory, forecastDays, leadTimeDays]);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const res = await api.post('/ai/demand-forecast', {
        category: selectedCategory,
        forecast_days: parseInt(forecastDays, 10),
        lead_time_days: parseInt(leadTimeDays, 10)
      });
      setForecastData(res.data);
    } catch (err) {
      console.error('Forecast request failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>AI Demand Forecasting Engine</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Time-series machine learning model estimating future consumption and identifying surplus risks
          </p>
        </div>

        {/* Category Selector */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: 180, fontWeight: 600 }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem auto' }}></div>
          <p style={{ color: '#64748b' }}>Running Ridge time-series regression and confidence interval bounds...</p>
        </div>
      ) : forecastData ? (
        <>
          {/* Key Metric Highlights */}
          <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
            <StatCard
              title="Current Category Stock"
              value={forecastData.current_stock}
              unit="units"
              icon={Package}
            />
            <StatCard
              title="Projected Surplus Risk"
              value={forecastData.projected_surplus_quantity}
              unit="units"
              icon={AlertTriangle}
              color={forecastData.projected_surplus_quantity > 0 ? 'warning' : 'primary'}
            />
            <StatCard
              title="Recommended Reorder"
              value={forecastData.recommended_reorder_quantity}
              unit="units"
              icon={RotateCcw}
            />
            <StatCard
              title="Test Split MAE"
              value={forecastData.test_metrics?.mae || '0.0'}
              unit="error"
              icon={TrendingUp}
            />
          </div>

          {/* Model Specification Card */}
          <div className="card" style={{ marginBottom: '1.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <Info size={22} color="#15803d" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>
                  Model Pipeline: {forecastData.model_used}
                </div>
                <p style={{ color: '#15803d', fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: 1.5 }}>
                  {forecastData.insight}
                </p>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.8rem', color: '#14532d' }}>
                  <span>Historical Data Days: <strong>{forecastData.historical_days_evaluated}</strong></span>
                  <span>Mean Absolute Error (MAE): <strong>{forecastData.test_metrics?.mae}</strong></span>
                  <span>Root Mean Squared Error (RMSE): <strong>{forecastData.test_metrics?.rmse}</strong></span>
                  <span>MAPE: <strong>{forecastData.test_metrics?.mape}%</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Forecast Line Chart with Confidence Interval */}
          <div className="card" style={{ marginBottom: '1.75rem' }}>
            <div className="card-header">
              <div>
                <h2 className="card-title">Daily Predicted Demand & 90% Confidence Interval</h2>
                <p className="card-subtitle">Projected daily consumption rate for {selectedCategory} over next 14 days</p>
              </div>
            </div>

            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData.daily_forecast}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="upper_bound"
                    stroke="#93c5fd"
                    fill="#dbeafe"
                    name="Upper Confidence Bound"
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted_demand"
                    stroke="#059669"
                    fill="#10b981"
                    name="Predicted Daily Demand"
                  />
                  <Area
                    type="monotone"
                    dataKey="lower_bound"
                    stroke="#93c5fd"
                    fill="#eff6ff"
                    name="Lower Confidence Bound"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Projections Chart */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Aggregated Weekly Demand Projections</h3>
                <p className="card-subtitle">Strategic weekly replenishment guidance</p>
              </div>
            </div>

            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastData.weekly_forecast}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="predicted_demand" fill="#0ea5e9" name="Weekly Demand" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default DemandForecastingPage;
