import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Bell, CheckCheck, Clock, AlertTriangle, Truck, HeartHandshake, Shield } from 'lucide-react';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    if (type === 'expiry_alert') return <AlertTriangle size={20} color="#ea580c" />;
    if (type === 'pickup_update') return <Truck size={20} color="#0ea5e9" />;
    if (type === 'donation_request' || type === 'donation_status') return <HeartHandshake size={20} color="#059669" />;
    return <Bell size={20} color="#8b5cf6" />;
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Notification Center</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Real-time alerts for expiry timelines, donation claims, and pickup logistics</p>
        </div>

        <button onClick={handleMarkAllRead} className="btn btn-secondary btn-sm">
          <CheckCheck size={16} /> Mark All as Read
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#64748b' }}>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Bell size={48} color="#94a3b8" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>All caught up!</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              No alerts or pending notifications at this time.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '1rem',
                  borderRadius: 8,
                  border: '1px solid #f1f5f9',
                  backgroundColor: n.is_read ? '#ffffff' : '#f0fdf4',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  {getIcon(n.type)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{n.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem', lineHeight: 1.5 }}>
                    {n.message}
                  </p>
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
