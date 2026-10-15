import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import {
  Package,
  PlusCircle,
  Download,
  Upload,
  Search,
  Filter,
  Trash2,
  Edit,
  Sparkles,
  AlertTriangle,
  X
} from 'lucide-react';

const CATEGORIES = [
  'All Categories',
  'Produce',
  'Dairy',
  'Bakery',
  'Meat',
  'Prepared Meals',
  'Canned/Dry',
  'Beverages',
  'Seafood'
];

const EXPIRY_STATUSES = [
  'All Statuses',
  'Critical',
  'High Risk',
  'Medium Risk',
  'Safe',
  'Expired'
];

const InventoryList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All Categories');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('expiry_status') || 'All Statuses');
  const [sortBy, setSortBy] = useState('expiry_date');
  const [order, setOrder] = useState('asc');

  // CSV Import Modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, [selectedCategory, selectedStatus, sortBy, order]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'All Categories') params.append('category', selectedCategory);
      if (selectedStatus !== 'All Statuses') params.append('expiry_status', selectedStatus);
      params.append('sort_by', sortBy);
      params.append('order', order);

      const res = await api.get(`/inventory?${params.toString()}`);
      setItems(res.data);
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInventory();
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this inventory record?')) return;
    try {
      await api.delete(`/inventory/${itemId}`);
      setItems(items.filter((i) => i.id !== itemId));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete inventory item.');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/inventory/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export inventory CSV.');
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await api.post('/inventory/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to import CSV.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Inventory Management</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Track food shelf-life, prevent perishability losses, and manage storage stocks</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleExportCSV} className="btn btn-secondary">
            <Download size={18} /> Export CSV
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn btn-secondary">
            <Upload size={18} /> Import CSV
          </button>
          <Link to="/business/inventory/add" className="btn btn-primary">
            <PlusCircle size={18} /> Add Stock Item
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by food name or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ width: 180 }}>
            <select
              className="form-control"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ width: 160 }}>
            <select
              className="form-control"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {EXPIRY_STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div style={{ width: 160 }}>
            <select
              className="form-control"
              value={`${sortBy}-${order}`}
              onChange={(e) => {
                const [sb, ord] = e.target.value.split('-');
                setSortBy(sb);
                setOrder(ord);
              }}
            >
              <option value="expiry_date-asc">Expiry Date (Earliest)</option>
              <option value="expiry_date-desc">Expiry Date (Latest)</option>
              <option value="quantity-desc">Quantity (Highest)</option>
              <option value="food_name-asc">Name (A-Z)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            <Search size={18} /> Filter
          </button>
        </form>
      </div>

      {/* Inventory Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem auto' }}></div>
            <p style={{ color: '#64748b' }}>Refreshing inventory items...</p>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Package size={48} color="#94a3b8" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>No inventory items found</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Try adjusting your search filters or click "Add Stock Item" to register new products.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Food Item</th>
                  <th>Category</th>
                  <th>Available Quantity</th>
                  <th>Purchase Date</th>
                  <th>Expiry Date</th>
                  <th>Shelf-Life Status</th>
                  <th>Storage</th>
                  <th>Waste Risk</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.food_name}</strong>
                      {item.supplier_name && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Supplier: {item.supplier_name}</div>
                      )}
                    </td>
                    <td>{item.food_category}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{item.quantity}</span> {item.unit}
                    </td>
                    <td>{new Date(item.purchase_date).toLocaleDateString()}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: item.days_until_expiry <= 1 ? '#dc2626' : '#0f172a' }}>
                        {new Date(item.expiry_date).toLocaleDateString()}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {item.days_until_expiry <= 0 ? 'Expired' : `${item.days_until_expiry} days remaining`}
                      </div>
                    </td>
                    <td>
                      <RiskBadge status={item.expiry_status} />
                    </td>
                    <td>{item.storage_type}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: 45, height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            width: `${item.waste_risk_score}%`, height: '100%',
                            backgroundColor: item.waste_risk_score >= 80 ? '#ef4444' : item.waste_risk_score >= 60 ? '#f97316' : item.waste_risk_score >= 30 ? '#eab308' : '#10b981'
                          }}></div>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.waste_risk_score}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {item.days_until_expiry > 0 && item.quantity > 0 && (
                          <button
                            title="Publish Surplus Listing"
                            className="btn btn-sm btn-outline"
                            onClick={() => navigate('/marketplace', { state: { createFromItem: item } })}
                          >
                            <Sparkles size={14} />
                          </button>
                        )}
                        <Link
                          to={`/business/inventory/edit/${item.id}`}
                          className="btn btn-sm btn-secondary"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </Link>
                        <button
                          title="Delete"
                          className="btn btn-sm btn-secondary"
                          style={{ color: '#dc2626' }}
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Import Inventory from CSV</h2>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Upload a standard CSV file with headers: <code>food_name, food_category, quantity, unit, purchase_date, expiry_date, storage_type, purchase_price, supplier_name</code>.
            </p>

            <form onSubmit={handleImportSubmit}>
              <div className="form-group">
                <input
                  type="file"
                  accept=".csv"
                  className="form-control"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  required
                />
              </div>

              {importResult && (
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem',
                  backgroundColor: importResult.imported_count > 0 ? '#ecfdf5' : '#fee2e2',
                  color: importResult.imported_count > 0 ? '#065f46' : '#991b1b'
                }}>
                  Imported {importResult.imported_count} records.
                  {importResult.errors?.length > 0 && (
                    <ul style={{ marginTop: '0.4rem', paddingLeft: '1.25rem' }}>
                      {importResult.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowImportModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={importing}>
                  {importing ? 'Importing...' : 'Upload & Process CSV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
