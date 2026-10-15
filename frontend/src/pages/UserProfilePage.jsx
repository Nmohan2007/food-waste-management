import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Store, Building2, MapPin, Phone, Mail, Shield, CheckCircle } from 'lucide-react';

const UserProfilePage = () => {
  const { user, role } = useAuth();
  const profile = user?.business_profile || user?.ngo_profile;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Organization Profile</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Account credentials, verified facility locations, and distribution capabilities</p>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.75rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', backgroundColor: '#ecfdf5',
            color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 700
          }}>
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>{user?.full_name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
              <span className="badge badge-safe">{role?.toUpperCase()}</span>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Account ID #{user?.id}</span>
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Email Address</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={16} color="#64748b" /> {user?.email}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Phone Number</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Phone size={16} color="#64748b" /> {user?.phone || 'Not configured'}
            </div>
          </div>
        </div>
      </div>

      {profile && (
        <div className="card" style={{ padding: '2rem' }}>
          <div className="card-header" style={{ marginBottom: '1.25rem' }}>
            <h3 className="card-title">
              {role === 'business' ? 'Commercial Business Details' : 'Non-Profit Organization Details'}
            </h3>
          </div>

          <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                {role === 'business' ? 'Business Entity Name' : 'NGO Organization Name'}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                {profile.business_name || profile.organization_name}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Facility Type
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginTop: '0.25rem' }}>
                {profile.business_type || profile.organization_type}
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 8, marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Physical Address & Geographic Coordinates
            </div>
            <div style={{ fontSize: '0.95rem', color: '#1e293b', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={16} color="#059669" />
              <span>{profile.address}, {profile.city}, {profile.state} {profile.zip_code}</span>
            </div>
            {profile.latitude && profile.longitude && (
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem', marginLeft: '1.4rem' }}>
                Coordinates: {profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)} (Used for AI proximity matching)
              </div>
            )}
          </div>

          {role === 'ngo' && (
            <div className="grid-2" style={{ gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Beneficiary Capacity</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                  {profile.beneficiary_count} individuals daily
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Storage Capabilities</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', marginTop: '0.25rem' }}>
                  {profile.storage_capabilities}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;
