import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Package, ArrowLeft, Save, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  'Produce',
  'Dairy',
  'Bakery',
  'Meat',
  'Prepared Meals',
  'Canned/Dry',
  'Beverages',
  'Seafood'
];

const STORAGE_TYPES = ['Room Temp', 'Refrigerated', 'Frozen'];

const UNITS = ['kg', 'items', 'boxes', 'liters', 'loaves', 'meals'];

const InventoryForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [foodName, setFoodName] = useState('');
  const [foodCategory, setFoodCategory] = useState('Produce');
  const [quantity, setQuantity] = useState(10);
  const [unit, setUnit] = useState('kg');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [storageType, setStorageType] = useState('Room Temp');
  const [purchasePrice, setPurchasePrice] = useState(2.50);
  const [sellingPrice, setSellingPrice] = useState(4.99);
  const [supplierName, setSupplierName] = useState('');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      api.get(`/inventory/${id}`)
        .then((res) => {
          const item = res.data;
          setFoodName(item.food_name);
          setFoodCategory(item.food_category);
          setQuantity(item.quantity);
          setUnit(item.unit);
          setPurchaseDate(new Date(item.purchase_date).toISOString().split('T')[0]);
          setExpiryDate(new Date(item.expiry_date).toISOString().split('T')[0]);
          setStorageType(item.storage_type);
          setPurchasePrice(item.purchase_price);
          setSellingPrice(item.selling_price || '');
          setSupplierName(item.supplier_name || '');
        })
        .catch((err) => {
          setError(err.response?.data?.detail || 'Failed to load item for editing.');
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (new Date(expiryDate) < new Date(purchaseDate)) {
      setError('Expiry date cannot be prior to the purchase date.');
      return;
    }

    setSaving(true);
    const payload = {
      food_name: foodName,
      food_category: foodCategory,
      quantity: parseFloat(quantity),
      unit,
      purchase_date: new Date(purchaseDate).toISOString(),
      expiry_date: new Date(expiryDate).toISOString(),
      storage_type: storageType,
      purchase_price: parseFloat(purchasePrice),
      selling_price: sellingPrice ? parseFloat(sellingPrice) : null,
      supplier_name: supplierName || null,
    };

    try {
      if (isEdit) {
        await api.put(`/inventory/${id}`, payload);
      } else {
        await api.post('/inventory', payload);
      }
      navigate('/business/inventory');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save inventory item.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: '#64748b' }}>Loading item details...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link to="/business/inventory" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} /> Back to Inventory
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
          {isEdit ? 'Edit Inventory Item' : 'Add Food Inventory Item'}
        </h1>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {error && (
          <div style={{
            backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem',
            borderRadius: 8, fontSize: '0.85rem', display: 'flex', alignItems: 'center',
            gap: '0.5rem', marginBottom: '1.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Food Product Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Organic Gala Apples"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Food Category *</label>
              <select
                className="form-control"
                value={foodCategory}
                onChange={(e) => setFoodCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="form-control"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Measurement Unit *</label>
              <select
                className="form-control"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Purchase / Receipt Date *</label>
              <input
                type="date"
                className="form-control"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Expiration Date *</label>
              <input
                type="date"
                className="form-control"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Storage Environment *</label>
              <select
                className="form-control"
                value={storageType}
                onChange={(e) => setStorageType(e.target.value)}
              >
                {STORAGE_TYPES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Purchase Unit Cost ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Selling Retail Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                placeholder="Optional"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Supplier / Distributor Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Pacific Coast Fresh Produce"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Link to="/business/inventory" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={18} />
              <span>{saving ? 'Saving Item...' : isEdit ? 'Update Item' : 'Add Item to Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryForm;
