import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BusinessDashboard from './pages/BusinessDashboard';
import NGODashboard from './pages/NGODashboard';
import AdminDashboard from './pages/AdminDashboard';
import InventoryList from './pages/InventoryList';
import InventoryForm from './pages/InventoryForm';
import WastePredictionPage from './pages/WastePredictionPage';
import DemandForecastingPage from './pages/DemandForecastingPage';
import ReorderRecommendationsPage from './pages/ReorderRecommendationsPage';
import MarketplacePage from './pages/MarketplacePage';
import ListingDetailsPage from './pages/ListingDetailsPage';
import DonationRequestsPage from './pages/DonationRequestsPage';
import DonationMatchingPage from './pages/DonationMatchingPage';
import PickupSchedulingPage from './pages/PickupSchedulingPage';
import NotificationsPage from './pages/NotificationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UserProfilePage from './pages/UserProfilePage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes for All Authenticated Users */}
          <Route element={<ProtectedRoute />}>
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/marketplace/:id" element={<ListingDetailsPage />} />
            <Route path="/donations" element={<DonationRequestsPage />} />
            <Route path="/pickups" element={<PickupSchedulingPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
          </Route>

          {/* Business & Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['business', 'admin']} />}>
            <Route path="/business/dashboard" element={<BusinessDashboard />} />
            <Route path="/business/inventory" element={<InventoryList />} />
            <Route path="/business/inventory/add" element={<InventoryForm />} />
            <Route path="/business/inventory/edit/:id" element={<InventoryForm />} />
            <Route path="/business/waste-risk" element={<WastePredictionPage />} />
            <Route path="/business/forecasting" element={<DemandForecastingPage />} />
            <Route path="/business/reorder" element={<ReorderRecommendationsPage />} />
            <Route path="/business/matching" element={<DonationMatchingPage />} />
          </Route>

          {/* NGO & Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ngo', 'admin']} />}>
            <Route path="/ngo/dashboard" element={<NGODashboard />} />
          </Route>

          {/* Admin Exclusive Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
