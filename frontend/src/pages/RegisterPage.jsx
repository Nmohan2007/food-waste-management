import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Leaf, Store, Building2, UserPlus, AlertCircle } from 'lucide-react';

const RegisterPage = () => {
  const [role, setRole] = useState('business');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('Supermarket');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('San Francisco');
  const [state, setState] = useState('CA');
  const [zipCode, setZipCode] = useState('94105');
  const [beneficiaryCount, setBeneficiaryCount] = useState(60);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setOrgType(newRole === 'business' ? 'Supermarket' : 'Food Bank');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const user = await register({
        full_name: fullName,
        email,
        password,
        role,
        phone,
        organization_name: orgName,
        organization_type: orgType,
        address,
        city,
        state,
        zip_code: zipCode,
        beneficiary_count: role === 'ngo' ? parseInt(beneficiaryCount, 10) : undefined,
      });

      if (user.role === 'business') navigate('/business/dashboard');
      else if (user.role === 'ngo') navigate('/ngo/dashboard');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#f8fafc', padding: '3rem 1rem'
    }}>
      <div style={{ maxWidth: 600, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
            fontWeight: 800, fontSize: '1.5rem', color: '#0f172a'
          }}>
            <Leaf size={32} color="#059669" />
            <span>NutriLoop AI</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Register your food business or NGO redistribution organization
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {/* Role Selection Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => handleRoleChange('business')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.75rem', borderRadius: 8, border: '2px solid',
                borderColor: role === 'business' ? '#059669' : '#e2e8f0',
                backgroundColor: role === 'business' ? '#ecfdf5' : '#ffffff',
                color: role === 'business' ? '#065f46' : '#64748b',
                fontWeight: 600, cursor: 'pointer'
              }}
            >
              <Store size={18} />
              <span>Food Business / Donor</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('ngo')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.75rem', borderRadius: 8, border: '2px solid',
                borderColor: role === 'ngo' ? '#059669' : '#e2e8f0',
                backgroundColor: role === 'ngo' ? '#ecfdf5' : '#ffffff',
                color: role === 'ngo' ? '#065f46' : '#64748b',
                fontWeight: 600, cursor: 'pointer'
              }}
            >
              <Building2 size={18} />
              <span>NGO / Recipient</span>
            </button>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem',
              borderRadius: 8, fontSize: '0.85rem', display: 'flex', alignItems: 'center',
              gap: '0.5rem', marginBottom: '1.25rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Contact Person Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="+1-555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Organization Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={role === 'business' ? 'e.g. Metro Supermarket' : 'e.g. Community Hope Kitchen'}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {role === 'business' ? 'Business Type' : 'NGO Facility Type'}
                </label>
                <select
                  className="form-control"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                >
                  {role === 'business' ? (
                    <>
                      <option value="Supermarket">Supermarket / Grocery</option>
                      <option value="Bakery">Artisan Bakery</option>
                      <option value="Restaurant">Restaurant / Bistro</option>
                      <option value="Hotel">Hotel / Catering</option>
                      <option value="Distributor">Wholesale Distributor</option>
                    </>
                  ) : (
                    <>
                      <option value="Food Bank">Food Bank / Pantry</option>
                      <option value="Soup Kitchen">Soup Kitchen</option>
                      <option value="Shelter">Homeless Shelter</option>
                      <option value="Community Fridge">Community Fridge Hub</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {role === 'ngo' && (
              <div className="form-group">
                <label className="form-label">Beneficiary Daily Meal Capacity</label>
                <input
                  type="number"
                  className="form-control"
                  value={beneficiaryCount}
                  onChange={(e) => setBeneficiaryCount(e.target.value)}
                  min="1"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Street Address</label>
              <input
                type="text"
                className="form-control"
                placeholder="123 Main Street"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-control"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  className="form-control"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Postal / Zip Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
              disabled={submitting}
            >
              <UserPlus size={18} />
              <span>{submitting ? 'Registering...' : 'Complete Registration'}</span>
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#059669', fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
