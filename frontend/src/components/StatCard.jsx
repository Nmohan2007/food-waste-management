import React from 'react';

const StatCard = ({ title, value, unit = '', icon: Icon, change, trend = 'up', color = 'primary' }) => {
  return (
    <div className="card stat-card">
      <div>
        <div className="stat-label">{title}</div>
        <div className="stat-value">
          {value}
          {unit && <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748b', marginLeft: '0.25rem' }}>{unit}</span>}
        </div>
        {change && (
          <div style={{ fontSize: '0.8rem', color: trend === 'up' ? '#059669' : '#dc2626', marginTop: '0.35rem', fontWeight: 500 }}>
            {trend === 'up' ? '↑' : '↓'} {change}
          </div>
        )}
      </div>
      {Icon && (
        <div className="stat-icon" style={color === 'danger' ? { backgroundColor: '#fee2e2', color: '#dc2626' } : color === 'warning' ? { backgroundColor: '#ffedd5', color: '#ea580c' } : {}}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
