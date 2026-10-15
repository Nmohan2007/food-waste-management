import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  AlertOctagon,
  TrendingUp,
  RotateCcw,
  ShoppingBag,
  HeartHandshake,
  Sparkles,
  Truck,
  BarChart3,
  User,
  ShieldCheck,
  Leaf
} from 'lucide-react';

const Sidebar = () => {
  const { role, user } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Leaf size={26} color="#10b981" />
        <span>NutriLoop AI</span>
      </div>

      <nav className="sidebar-nav">
        {/* Role-based Dashboard */}
        {role === 'business' && (
          <NavLink to="/business/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Business Dashboard</span>
          </NavLink>
        )}
        {role === 'ngo' && (
          <NavLink to="/ngo/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>NGO Dashboard</span>
          </NavLink>
        )}
        {role === 'admin' && (
          <NavLink to="/admin/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <ShieldCheck size={20} />
            <span>Admin Control</span>
          </NavLink>
        )}

        {/* Business Modules */}
        {(role === 'business' || role === 'admin') && (
          <>
            <div className="sidebar-section-title">Inventory & AI</div>
            <NavLink to="/business/inventory" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Package size={20} />
              <span>Inventory Tracker</span>
            </NavLink>
            <NavLink to="/business/inventory/add" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <PlusCircle size={20} />
              <span>Add Stock</span>
            </NavLink>
            <NavLink to="/business/waste-risk" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <AlertOctagon size={20} />
              <span>Waste Risk AI</span>
            </NavLink>
            <NavLink to="/business/forecasting" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <TrendingUp size={20} />
              <span>Demand Forecast</span>
            </NavLink>
            <NavLink to="/business/reorder" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <RotateCcw size={20} />
              <span>Reorder Insights</span>
            </NavLink>
          </>
        )}

        {/* Redistribution & Marketplace Modules */}
        <div className="sidebar-section-title">Redistribution</div>
        <NavLink to="/marketplace" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <ShoppingBag size={20} />
          <span>Surplus Market</span>
        </NavLink>
        {role === 'business' && (
          <NavLink to="/business/matching" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Sparkles size={20} />
            <span>AI NGO Matching</span>
          </NavLink>
        )}
        <NavLink to="/donations" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <HeartHandshake size={20} />
          <span>Donation Requests</span>
        </NavLink>
        <NavLink to="/pickups" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Truck size={20} />
          <span>Pickup Schedules</span>
        </NavLink>

        {/* Platform & Analytics */}
        <div className="sidebar-section-title">Insights</div>
        <NavLink to="/analytics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <BarChart3 size={20} />
          <span>Impact & Analytics</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <User size={20} />
          <span>Profile & Org</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', backgroundColor: '#1e293b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#10b981', fontWeight: 600, fontSize: '0.9rem'
          }}>
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: '#f8fafc', fontSize: '0.875rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {user?.full_name}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              {role}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
