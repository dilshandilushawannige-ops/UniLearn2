import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DashboardHome from './pages/DashboardHome';
import DashboardResources from './pages/DashboardResources';
import DashboardUpload from './pages/DashboardUpload';
import DashboardStudyPlan from './pages/DashboardStudyPlan';
import Resources from './pages/Resources';
import ResourceRequest from './pages/ResourceRequest';
import ResourceDetails from './pages/ResourceDetails';
import LiveClass from './pages/LiveClass';
import StudyPlan from './pages/StudyPlan';
import MCQ from './pages/MCQ';

const AppContent = () => {
  const location = useLocation();
  const hideNavbarPaths = ['/user-dashboard'];
  const hideNavbar = location.pathname.startsWith('/user-dashboard');

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* User Dashboard with nested routes */}
        <Route path="/user-dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="resources" element={<DashboardResources />} />
          <Route path="resources/:id" element={<ResourceDetails />} />
          <Route path="upload" element={<DashboardUpload />} />
          <Route path="study-plans" element={<DashboardStudyPlan />} />
          <Route path="requests" element={<ResourceRequest />} />
          <Route path="mcq" element={<MCQ />} />
          <Route path="live-class" element={<LiveClass />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Register />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />

        <Route
          path="/resource"
          element={<ProtectedRoute><Resources /></ProtectedRoute>}
        />
        <Route
          path="/resources"
          element={<ProtectedRoute><Resources /></ProtectedRoute>}
        />
        <Route
          path="/resource-request"
          element={<ProtectedRoute><ResourceRequest /></ProtectedRoute>}
        />
        <Route
          path="/live-class"
          element={<ProtectedRoute><LiveClass /></ProtectedRoute>}
        />
        <Route
          path="/study-plan"
          element={<ProtectedRoute><StudyPlan /></ProtectedRoute>}
        />
        <Route
          path="/mcq"
          element={<ProtectedRoute><MCQ /></ProtectedRoute>}
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
