import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Bell, LogOut, CheckCheck } from 'lucide-react';

const Topbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // 15-second refresh
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
      const unread = res.data.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0f172a' }}>
            Welcome back, {user?.full_name}
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {user?.business_profile?.business_name || user?.ngo_profile?.organization_name || 'Food Waste Reduction Portal'}
          </p>
        </div>
      </div>

      <div className="topbar-right">
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              background: 'none', border: '1px solid #e2e8f0', borderRadius: '50%',
              width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative', color: '#334155'
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                backgroundColor: '#ef4444', color: '#ffffff',
                fontSize: '0.7rem', fontWeight: 700, borderRadius: '50%',
                width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div style={{
              position: 'absolute', right: 0, top: 48, width: 340,
              backgroundColor: '#ffffff', borderRadius: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
              border: '1px solid #e2e8f0', zIndex: 100, padding: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: '#059669', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '0.65rem 0.5rem',
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: n.is_read ? 'transparent' : '#f0fdf4',
                        borderRadius: 6,
                        marginBottom: '0.25rem'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.825rem', color: '#0f172a' }}>{n.title}</div>
                      <div style={{ fontSize: '0.775rem', color: '#475569', marginTop: '0.2rem' }}>{n.message}</div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: '0.75rem', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                <Link to="/notifications" onClick={() => setShowDropdown(false)} style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                  View All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Sign Out"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
